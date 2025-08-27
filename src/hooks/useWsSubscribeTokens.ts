import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { io, Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Token {
  id: number;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  logoUrl: string;
  coingeckoId: string | null;
  tradingviewSymbol: string | null;
  isVerified: boolean;
  marketCap: number;
  liquidity: any;
  program: string;
  createdAt: string;
}

interface SubscribeParams {
  page?: number;
  limit?: number;
  verified?: boolean;
  random?: boolean;
}

// Cache for preloaded images
const imageCache = new Map<string, HTMLImageElement>();

// Function to preload an image
const preloadImage = (url: string, shouldCache: boolean = false): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (imageCache.has(url)) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (shouldCache) {
        imageCache.set(url, img);
      }
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
};

// Function to preload multiple images
const preloadImages = async (tokens: Token[], shouldCache: boolean = false) => {
  const preloadPromises = tokens.map((token, index) => 
    token.logoUrl ? preloadImage(token.logoUrl, shouldCache && index === 0) : Promise.resolve()
  );
  await Promise.all(preloadPromises);
};

export function useWsSubscribeTokens(params?: SubscribeParams) {
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const mountedRef = useRef(true);
  const pathname = usePathname();
  const isTradingPage = pathname?.startsWith('/trading');
  const isDashboardPage = pathname?.startsWith('/dashboard');
  const isInitialLoadRef = useRef(true);

  // Buffer system for tokens
  const tokenBufferRef = useRef<Token[]>([]);
  const displayedTokensRef = useRef<Token[]>([]);
  const bufferIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const targetLimit = params?.limit || 24;
  const bufferLimit = targetLimit * 5; // Store 5x more data

  const { data: tokens = [], isLoading } = useQuery<Token[]>({
    queryKey: ['wsTokens', params],
    queryFn: async () => {
      return [];
    },
    initialData: [],
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const convertToken = (token: any): Token => {
    const logoUrl = token.slt_logo_url || token.logoUrl;
    const optimizedLogoUrl = logoUrl ? 
      (logoUrl.startsWith('http') ? logoUrl : `https://${logoUrl}`) : 
      '/placeholder.png';

    return {
      id: token.slt_id,
      name: token.slt_name || token.name,
      symbol: token.slt_symbol || token.symbol,
      address: token.slt_address || token.address,
      decimals: token.slt_decimals || token.decimals,
      logoUrl: optimizedLogoUrl,
      liquidity: token.slt_initial_liquidity || token.liquidity,
      coingeckoId: null,
      tradingviewSymbol: null,
      isVerified: token.slt_is_verified || token.isVerified,
      marketCap: token.slt_market_cap || token.marketCap,
      program: token.slt_program || token.slt_program,
      createdAt: token.slt_created_at || token.createdAt,
    };
  };

  // Function to process buffer and display tokens
  const processBuffer = () => {
    if (tokenBufferRef.current.length > 0) {
      const newToken = tokenBufferRef.current.shift();
      if (newToken) {
        // Add new token to the beginning and maintain the limit
        displayedTokensRef.current = [newToken, ...displayedTokensRef.current].slice(0, targetLimit);
        queryClient.setQueryData(['wsTokens', params], [...displayedTokensRef.current]);
        
        // Preload image for the new token
        setTimeout(() => {
          preloadImage(newToken.logoUrl, true).catch(console.error);
        }, 0);
        
        console.log(`Buffer processed: ${tokenBufferRef.current.length} tokens remaining in buffer`);
      }
    } else {
      // Stop processing if buffer is empty
      stopBufferProcessing();
    }
  };

  // Start buffer processing interval
  const startBufferProcessing = () => {
    if (bufferIntervalRef.current) {
      clearInterval(bufferIntervalRef.current);
    }
    bufferIntervalRef.current = setInterval(processBuffer, 1000); // Process every 1 second
  };

  // Stop buffer processing interval
  const stopBufferProcessing = () => {
    if (bufferIntervalRef.current) {
      clearInterval(bufferIntervalRef.current);
      bufferIntervalRef.current = null;
    }
  };

  const connect = () => {
    if (!mountedRef.current) return;

    try {
      const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL}/token`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000
      });

      newSocket.on('connect', () => {
        console.log("✅ Connected to Socket.IO server - useWsSubscribeTokens");
        setIsConnected(true);
        setError(null);
        // Request 5x more data from backend
        const bufferParams = { ...params, limit: bufferLimit };
        newSocket.emit('subscribeTokens', bufferParams);
      });

      newSocket.on('disconnect', (reason) => {
        console.log("❌ Disconnected from Socket.IO server:", reason);
        setIsConnected(false);
        stopBufferProcessing();
        if (reason === 'io server disconnect') {
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error("Socket.IO connection error:", error);
        if (mountedRef.current) {
          setError("Socket.IO connection error");
        }
      });

      newSocket.on('tokenUpdate', (data) => {
        if (mountedRef.current) {
          try {
            const rawTokens = data.data?.tokens || [];
            const convertedTokens = rawTokens.map(convertToken);

            if (isInitialLoadRef.current) {
              // Initial load: display first batch immediately, then start buffer processing
              const initialDisplayTokens = convertedTokens.slice(0, targetLimit);
              const remainingTokens = convertedTokens.slice(targetLimit);
              
              // Set initial display
              displayedTokensRef.current = initialDisplayTokens;
              queryClient.setQueryData(['wsTokens', params], initialDisplayTokens);
              
              // Add remaining tokens to buffer
              tokenBufferRef.current = remainingTokens;
              
              isInitialLoadRef.current = false;
              console.log('Initial load:', initialDisplayTokens.length, 'tokens displayed,', remainingTokens.length, 'tokens in buffer');
              
              // Start processing buffer for remaining tokens
              if (remainingTokens.length > 0) {
                startBufferProcessing();
              }
              
              // Preload images for all tokens
              setTimeout(() => {
                preloadImages(convertedTokens, false).catch(console.error);
              }, 0);
            } else {
              // Update: add new tokens to buffer
              const existingAddresses = new Set([
                ...displayedTokensRef.current.map(token => token.address),
                ...tokenBufferRef.current.map(token => token.address)
              ]);
              
              const uniqueNewTokens = convertedTokens.filter((token: Token) => 
                !existingAddresses.has(token.address)
              );
              
              // Add new tokens to buffer
              tokenBufferRef.current = [...uniqueNewTokens, ...tokenBufferRef.current];
              
              // Keep buffer size manageable
              if (tokenBufferRef.current.length > bufferLimit * 2) {
                tokenBufferRef.current = tokenBufferRef.current.slice(0, bufferLimit);
              }
              
              // Restart buffer processing if it was stopped and we have new tokens
              if (uniqueNewTokens.length > 0 && !bufferIntervalRef.current) {
                startBufferProcessing();
              }
              
              console.log(`Buffer updated: ${tokenBufferRef.current.length} tokens in buffer, ${displayedTokensRef.current.length} displayed`);
            }
          } catch (error) {
            console.error("Error processing token data:", error);
          }
        }
      });

      newSocket.on('ping', () => {
        newSocket.emit('pong');
      });

      setSocket(newSocket);
    } catch (error) {
      console.error("Error creating Socket.IO connection:", error);
      if (mountedRef.current) {
        setError("Failed to create Socket.IO connection");
      }
    }
  };

  useEffect(() => {
    if (isTradingPage || isDashboardPage) {
      isInitialLoadRef.current = true;
      // Clear previous state
      tokenBufferRef.current = [];
      displayedTokensRef.current = [];
      stopBufferProcessing();
      connect();
    } else {
      if (socket) {
        socket.emit('unSubscribeTokens');
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      stopBufferProcessing();
    }
  }, [isTradingPage, isDashboardPage]);

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      stopBufferProcessing();
      if (socket) {
        socket.emit('unSubscribeTokens');
        socket.disconnect();
      }
    };
  }, []);

  const sendMessage = (message: object) => {
    if (socket && socket.connected) {
      socket.emit('message', message);
    } else {
      console.warn("Cannot send message - Socket.IO is not connected");
    }
  };

  return { socket, tokens, sendMessage, error, isConnected, isLoading };
}