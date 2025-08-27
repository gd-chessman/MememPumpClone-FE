"use client"

import { getHolders, getOrderHistories, getOrderMyHistories } from "@/services/api/OnChainService"
import { getInforWallet, getListBuyToken } from "@/services/api/TelegramWalletService"
import { formatNumberWithSuffix, truncateString } from "@/utils/format"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import { useState, Suspense, useEffect, useMemo } from "react"
import { io as socketIO } from "socket.io-client"
import { useLang } from "@/lang/useLang"
import { getTokenInforByAddress } from "@/services/api/SolonaTokenService"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { ArrowLeftRight } from "lucide-react"

type Transaction = {
  time: string
  type: "BUY" | "SELL"
  price: string
  amount: string
  total: string
  source: string
  hash: string
  status: "COMPLETED" | "PENDING" | "FAILED"
  address: string
}

export default function TransactionHistory() {
  return (
    <Suspense fallback={<div></div>}>
      <TransactionHistoryContent />
    </Suspense>
  )
}

function TransactionHistoryContent() {
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<"all" | "my" | "holder" | "asset">("all")
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realTimeTransactions, setRealTimeTransactions] = useState<any[]>([]);
  const [realTimeTransactionsMy, setRealTimeTransactionsMy] = useState<any[]>([]);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string>("");

  const searchParams = useSearchParams();
  const address = searchParams?.get("address");

  const { data: tokenInfor } = useQuery({
    queryKey: ["token-infor", address],
    queryFn: () => getTokenInforByAddress(address),
  });
  const { data: orderHistories, isLoading: isLoadingOrderHistories, refetch: refetchOrderHistories } = useQuery(
    {
      queryKey: ["orderHistories", address],
      queryFn: () =>
        getOrderHistories({
          address: address || "",
          offset: 0,
          limit: 100,
          sort_by: "block_unix_time",
          sort_type: "desc",
          tx_type: "swap",
        }),
      enabled: !!address,
    }
  );
  const { data: walletInfor, refetch } = useQuery({
    queryKey: ["wallet-infor"],
    queryFn: getInforWallet,
  });

  const { data: holders, refetch: refetchHolders } = useQuery({
    queryKey: ["holders", address],
    queryFn: () => getHolders(address || ""),
    enabled: !!address,
  });

  const { data: orderMyHistories, refetch: refetchOrderMyHistories } = useQuery({
    queryKey: ["orderMyHistories", address],
    queryFn: () => getOrderMyHistories(String(address), String(walletInfor?.solana_address)),
    enabled: !!walletInfor,
  });

  const { data: tokenList, refetch: refetchTokenList, isLoading: isLoadingTokenList } = useQuery({
    queryKey: ["token-buy-list"],
    queryFn: getListBuyToken,
    enabled: isAuthenticated,
  });
  // Filter tokens: SOL/USDT tokens are always shown, others need balance >= 0.005
  const filteredTokens = (tokenList && 'tokens' in tokenList ? tokenList.tokens : []).filter((token: any) =>
    token.token_balance_usd >= 0.005
  );

  // WebSocket connection setup
  useEffect(() => {
    if (typeof window === 'undefined' || !address) return;

    const socketInstance = socketIO(`${process.env.NEXT_PUBLIC_API_URL}/token-txs`, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setError(null);
      socketInstance.emit('subscribe', { tokenAddress: address });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('error', (error) => {
      setError(error.message);
    });

    socketInstance.on('transaction', (transaction: any) => {
      if (transaction?.wallet === walletInfor?.solana_address) {
        setRealTimeTransactionsMy((prev) => [transaction, ...prev].slice(0, 50));
      }
      setRealTimeTransactions((prev) => [transaction, ...prev].slice(0, 50));
    });


    socketInstance.on('subscribed', (data) => {
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.emit('unsubscribe', { tokenAddress: address });
        socketInstance.disconnect();
      }
    };
  }, [address]);

  // Add effect to handle address changes
  useEffect(() => {
    // Reset realtime transactions when address changes
    setRealTimeTransactions([]);

    // Refetch both queries when address changes
    if (address) {
      refetchOrderHistories();
      if (walletInfor?.solana_address) {
        refetchOrderMyHistories();
      }
    }
  }, [address, walletInfor?.solana_address, refetchOrderHistories, refetchOrderMyHistories]);

  // Add state to store combined my transactions
  const [combinedMyTransactions, setCombinedMyTransactions] = useState<any[]>([]);
  // Effect to handle updating my transactions when orderHistories changes
  useEffect(() => {
    if (!orderHistories || !walletInfor?.solana_address) return;

    // Filter new transactions for my wallet
    const newMyTransactions = orderHistories.filter((item: any) => {
      // Log each item's wallet for debugging
      return item.wallet === walletInfor.solana_address;
    });

    // Combine with existing orderMyHistories and remove duplicates
    const existingTransactions = orderMyHistories || [];

    // Sort both arrays by time before combining to ensure proper order
    const sortByTime = (a: any, b: any) => {
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      return timeB - timeA; // Descending order (newest first)
    };

    const sortedExisting = [...existingTransactions].sort(sortByTime);
    const sortedNew = [...newMyTransactions].sort(sortByTime);

    // Combine sorted arrays
    const allTransactions = [...sortedNew, ...sortedExisting];
    console.log("allTransactions", allTransactions);
    // Remove duplicates based on transaction hash (tx)
    const uniqueTransactions = allTransactions.reduce((acc: any[], current: any) => {
      const exists = acc.find(item => item.tx === current.tx);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    // Final sort to ensure proper time order
    const finalSortedTransactions = uniqueTransactions.sort(sortByTime);

    setCombinedMyTransactions(finalSortedTransactions);
  }, [orderHistories, orderMyHistories, walletInfor?.solana_address]);


  // Get the first transaction price
  const lastTransactionPrice = orderHistories && orderHistories.length > 0
    ? orderHistories[0]?.token?.from?.price?.usd
    : undefined;

  // Dispatch event when lastTransactionPrice changes
  useEffect(() => {
    if (typeof window !== 'undefined' && lastTransactionPrice !== undefined) {
      const event = new CustomEvent('lastTransactionPriceUpdate', {
        detail: {
          price: lastTransactionPrice,
          tokenAddress: address
        }
      });
      window.dispatchEvent(event);
    }
  }, [lastTransactionPrice, address]);

  // Combine historical and real-time transactions with proper sorting and deduplication
  const allTransactions = useMemo(() => {
    const combined = [
      ...(realTimeTransactions || []),
      ...(orderHistories || [])
    ];

    // Remove duplicates based on transaction hash (tx)
    const uniqueTransactions = combined.reduce((acc: any[], current: any) => {
      const exists = acc.find(item => item.tx === current.tx);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    // Sort by time in descending order
    return uniqueTransactions.sort((a, b) => {
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      return timeB - timeA;
    });
  }, [realTimeTransactions, orderHistories]);

  const allTransactionsMy = useMemo(() => {
    const combined = [
      ...(realTimeTransactionsMy || []),
      ...(orderMyHistories || [])
    ];

    // Remove duplicates based on transaction hash (tx)
    const uniqueTransactions = combined.reduce((acc: any[], current: any) => {
      const exists = acc.find(item => item.tx === current.tx);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    // Sort by time in descending order
    return uniqueTransactions.sort((a, b) => {
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      return timeB - timeA;
    });
  }, [realTimeTransactionsMy, orderMyHistories]);

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return '0.0';
    return price?.toFixed(6);
  };

  const handleSwapToken = (tokenSymbol: string) => {
    setIsSwapModalOpen(true)
    setSelectedToken(tokenSymbol)
  }

  const renderTransactionCard = (order: any, index: number) => {
    const { t } = useLang();
    return (
      <div key={index} className={`p-3 border-b border-theme-neutral-800/40 dark:border-neutral-800/50 hover:bg-gray-50 dark:hover:bg-neutral-800/30 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-[#1A1A1A]' : 'bg-white dark:bg-[#0F0F0F]'}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded ${order.type === "buy" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
              {order.type === "buy" ? t("transactionHistory.buy") : t("transactionHistory.sell")}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-neutral-400">
              {new Date(order.time).toLocaleString()}
            </span>
          </div>
          <span className={`text-xs font-medium ${order.type === "buy" ? "text-green-400 dark:text-green-300" : "text-pink-500 dark:text-pink-400"}`}>
            ${formatPrice(order.priceUsd)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500 dark:text-neutral-400">{t("transactionHistory.amount")}:</span>
            <span className="ml-1 text-gray-700 dark:text-neutral-200">{formatNumberWithSuffix(order.amount)}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-neutral-400">{t("transactionHistory.total")}:</span>
            <span className={`ml-1 ${order.type === "buy" ? "text-green-400 dark:text-green-300" : "text-pink-500 dark:text-pink-400"}`}>${(order.priceUsd * order.amount).toFixed(6)}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-neutral-400">{t("transactionHistory.source")}:</span>
            <span className="ml-1 text-gray-700 dark:text-neutral-200">{order.program}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-neutral-400">{t("transactionHistory.status")}:</span>
            <span className="ml-1 text-green-500 dark:text-green-400">{t("transactionHistory.completed")}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="flex items-center text-gray-500 dark:text-neutral-400">
            <span className="mr-1">{t("transactionHistory.transactionHash")}:</span>
            <span className="text-gray-700 text-[10px] dark:text-neutral-200 truncate max-w-[120px]">{order.tx}</span>
          </div>
          <div className="flex items-center text-gray-500 dark:text-neutral-400">
            <span className="mr-1">{t("transactionHistory.address")}:</span>
            <span className="text-[#FFB300] dark:text-[#FFB300]">{truncateString(order.wallet, 9)}</span>
            <button className="ml-1 text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAllTransactionsTable = () => {
    const { t } = useLang();
    return (
      <>
        {/* Desktop view */}
        <div className="hidden md:block">
          <table className="w-full text-sm table-fixed">
            <thead className="sticky top-[-1px] z-10 bg-white dark:bg-[#0F0F0F]">
              <tr className="border-b border-gray-200 dark:border-neutral-800">
                <th className="2xl:px-4 px-2 py-1.5 2xl:py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[14%]">{t("transactionHistory.time")}</th>
                <th className="2xl:px-4 px-2 py-1.5 2xl:py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[7%]">{t("transactionHistory.type")}</th>
                <th className="2xl:px-4 px-2 py-1.5 2xl:py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[11%]">{t("transactionHistory.price")}</th>
                <th className="2xl:px-4 px-2 py-1.5 2xl:py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[9%]">{t("transactionHistory.amount")}</th>
                <th className="2xl:px-4 px-2 py-1.5 2xl:py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[12%]">{t("transactionHistory.total")}</th>
                {/* <th className="xl:block hidden 2xl:px-4 px-2 py-1.5 2xl:py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium">{t("transactionHistory.source")}</th> */}
                <th className="2xl:px-4 px-2 py-1.5 2xl:py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[12%]">{t("transactionHistory.transactionHash")}</th>
                <th className="2xl:px-4 px-2 py-1.5 2xl:py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[11%]">{t("transactionHistory.status")}</th>
                <th className="2xl:px-4 px-2 py-1.5 2xl:py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[12%]">{t("transactionHistory.address")}</th>
              </tr>
            </thead>
            <tbody>
              {allTransactions?.map((order: any, index: number) => (
                <tr key={index} className={`hover:bg-gray-100 dark:hover:bg-neutral-800/30 border-b border-gray-100 dark:border-neutral-800/50 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-[#1A1A1A]' : 'bg-white dark:bg-[#0F0F0F]'}`}>
                  <td className="2xl:px-4 px-1 py-2 truncate 2xl:text-xs text-[10px] text-gray-600 dark:text-neutral-300">
                    {new Date(order.time).toLocaleString()}
                  </td>
                  <td className={`2xl:px-4 px-1 2xl:text-xs text-[10px] py-2 font-medium truncate ${order.type === "buy" ? "text-green-600 dark:text-green-500 uppercase" : "text-red-600 dark:text-red-500 uppercase"}`}>
                    {order.type === "buy" ? t("transactionHistory.buy") : t("transactionHistory.sell")}
                  </td>
                  <td className={`2xl:px-4 px-1 2xl:text-xs text-[10px] py-2 font-medium truncate ${order.type === "buy" ? "text-green-400 dark:text-green-300" : "text-pink-500 dark:text-pink-400"}`}>
                    ${formatPrice(order.priceUsd)}
                  </td>
                  <td className="2xl:px-4 px-1 text-gray-600 dark:text-neutral-300 2xl:text-xs text-[10px] py-2 font-medium truncate">
                    {formatNumberWithSuffix(order.amount)}
                  </td>
                  <td className={`2xl:px-4 px-1 2xl:text-xs text-[10px] py-2 font-medium truncate ${order.type === "buy" ? "text-green-400 dark:text-green-300" : "text-pink-500 dark:text-pink-400"}`}>
                    ${(order.priceUsd * order.amount).toFixed(6)}
                  </td>
                  {/* <td className="2xl:px-4 xl:block hidden px-1 text-gray-600 dark:text-neutral-300 2xl:text-xs text-[10px] py-2 font-medium truncate">
                    {order.program}
                  </td> */}
                  <td className="2xl:px-4 px-1 text-gray-600 dark:text-neutral-300 2xl:text-xs text-[10px] py-2 font-medium truncate">
                    {truncateString(order.tx, 10)}<button onClick={() => {
                      navigator.clipboard.writeText(order.tx)
                    }} className="ml-1 text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </td>
                  <td className="2xl:px-4 px-1 text-green-500 dark:text-green-400 2xl:text-xs text-[9px] py-2 font-medium truncate">
                    {t("transactionHistory.completed")}
                  </td>
                  <td className="2xl:px-4 px-1 text-gray-600 dark:text-neutral-300 2xl:text-xs text-[10px] py-2 font-medium flex items-center truncate">
                    <span className="text-[#FFB300] dark:text-[#FFB300]">{truncateString(order.wallet, 9)}</span>
                    <button onClick={() => {
                      navigator.clipboard.writeText(order.wallet)
                    }} className="ml-1 text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile view */}
        <div className="md:hidden">
          {allTransactions?.map((order: any, index: number) => renderTransactionCard(order, index))}
        </div>
      </>
    );
  };

  const renderMyTransactionsTable = () => {
    const { t } = useLang();
    return (
      <>
        {/* Desktop view */}
        <div className="hidden md:block">
          <table className="w-full text-sm table-fixed">
            <thead className="sticky top-[-1px] z-10 bg-white dark:bg-[#0F0F0F]">
              <tr className="border-b border-gray-200 dark:border-neutral-800">
                <th className="2xl:px-4 px-2 py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[15%]">{t("transactionHistory.time")}</th>
                <th className="2xl:px-4 px-2 py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[7%]">{t("transactionHistory.type")}</th>
                <th className="2xl:px-4 px-2 py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[11%]">{t("transactionHistory.price")}</th>
                <th className="2xl:px-4 px-2 py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[9%]">{t("transactionHistory.amount")}</th>
                <th className="2xl:px-4 px-2 py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[10%]">{t("transactionHistory.total")}</th>
                {/* <th className="xl:block hidden 2xl:px-4 px-2 py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[8%]">{t("transactionHistory.source")}</th> */}
                <th className="2xl:px-4 px-2 py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[12%]">{t("transactionHistory.transactionHash")}</th>
                <th className="2xl:px-4 px-2 py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[12%]">{t("transactionHistory.status")}</th>
                <th className="2xl:px-4 px-2 py-2 text-left 2xl:text-xs text-[10px] text-gray-700 dark:text-neutral-200 font-medium w-[12%]">{t("transactionHistory.address")}</th>
              </tr>
            </thead>
            <tbody>
              {allTransactionsMy?.map((order: any, index: number) => (
                <tr key={index} className={`hover:bg-gray-100 dark:hover:bg-neutral-800/30 border-b border-gray-100 dark:border-neutral-800/50 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-[#1A1A1A]' : 'bg-white dark:bg-[#0F0F0F]'}`}>
                  <td className="2xl:px-4 px-1 py-2 truncate 2xl:text-xs text-[10px] text-gray-600 dark:text-neutral-300">
                    {new Date(order.time).toLocaleString()}
                  </td>
                  <td className={`2xl:px-4 px-1 2xl:text-xs text-[10px] py-2 font-medium truncate ${order.type === "buy" ? "text-green-600 dark:text-green-500 uppercase" : "text-red-600 dark:text-red-500 uppercase"}`}>
                    {order.type === "buy" ? t("transactionHistory.buy") : t("transactionHistory.sell")}
                  </td>
                  <td className={`2xl:px-4 px-1 2xl:text-xs text-[10px] py-2 font-medium truncate ${order.type === "buy" ? "text-green-400 dark:text-green-300" : "text-pink-500 dark:text-pink-400"}`}>
                    ${formatPrice(order.priceUsd)}
                  </td>
                  <td className="2xl:px-4 px-1 text-gray-600 dark:text-neutral-300 2xl:text-xs text-[10px] py-2 font-medium truncate">
                    {formatNumberWithSuffix(order.amount)}
                  </td>
                  <td className={`2xl:px-4 px-1 2xl:text-xs text-[10px] py-2 font-medium truncate ${order.type === "buy" ? "text-green-400 dark:text-green-300" : "text-pink-500 dark:text-pink-400"}`}>
                    ${(order.priceUsd * order.amount).toFixed(6)}
                  </td>
                  {/* <td className="2xl:px-4 xl:block hidden px-1 text-gray-600 dark:text-neutral-300 2xl:text-xs text-[10px] py-2 font-medium truncate">
                    {order.program}
                  </td> */}
                  <td className="2xl:px-4 px-1 text-gray-600 dark:text-neutral-300 2xl:text-xs text-[10px] py-2 font-medium truncate">
                    {truncateString(order.tx, 10)}<button onClick={() => {
                      navigator.clipboard.writeText(order.tx)
                    }} className="ml-1 text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </td>
                  <td className="2xl:px-4 px-1 text-green-500 dark:text-green-400 2xl:text-xs text-[9px] py-2 font-medium truncate">
                    {t("transactionHistory.completed")}
                  </td>
                  <td className="2xl:px-4 px-1 text-gray-600 dark:text-neutral-300 2xl:text-xs text-[10px] py-2 font-medium flex items-center truncate">
                    <span className="text-[#FFB300] dark:text-[#FFB300]">{truncateString(order.wallet, 9)}</span>
                    <button onClick={() => {
                      navigator.clipboard.writeText(order.wallet)
                    }} className="ml-1 text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile view */}
        <div className="md:hidden">
          {allTransactionsMy?.map((order: any, index: number) => renderTransactionCard(order, index))}
        </div>
      </>
    );
  };

  const renderHoldersTable = () => {
    const { t } = useLang();
    const marketCap = tokenInfor?.marketCap || 0;

    return (
      <>
        {/* Desktop view */}
        <div className="hidden md:block">
          <table className="w-full text-sm table-fixed">
            <thead className="sticky top-[-1px] z-10 bg-white dark:bg-[#0F0F0F]">
              <tr className="border-b border-gray-200 dark:border-neutral-800">
                <th className="px-4 py-2 text-left text-gray-700 dark:text-neutral-200 font-medium w-[13%]">{t("transactionHistory.address")}</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-neutral-200 font-medium w-[12%]">{t("transactionHistory.amount")}</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-neutral-200 font-medium w-[14%]">{t("transactionHistory.quoteValue")}</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-neutral-200 font-medium w-[12%]">{t("transactionHistory.usdValue")}</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-neutral-200 font-medium w-[14%]">{t("transactionHistory.ownerPercentage")}</th>
              </tr>
            </thead>
            <tbody>
              {holders?.accounts.map((holder: any, index: number) => {
                return (
                  <tr key={index} className={`hover:bg-gray-100 dark:hover:bg-neutral-800/30 border-b border-gray-100 dark:border-neutral-800/50 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-[#1A1A1A]' : 'bg-white dark:bg-[#0F0F0F]'}`}>
                    <td className="px-4 text-gray-600 dark:text-neutral-300 text-xs py-2 font-medium flex items-center truncate">
                      <span className="text-[#FFB300] dark:text-[#FFB300]">{truncateString(holder.wallet, 9)}</span>
                      <button onClick={() => {
                        navigator.clipboard.writeText(holder.wallet)
                      }} className="ml-1 text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 text-gray-600 dark:text-neutral-300 text-xs py-2 font-medium truncate">
                      {formatNumberWithSuffix(holder.amount)}
                    </td>
                    <td className="px-4 text-gray-600 dark:text-neutral-300 text-xs py-2 font-medium truncate">
                      {formatNumberWithSuffix(holder.value.quote)} SOL
                    </td>
                    <td className="px-4 text-gray-600 dark:text-neutral-300 text-xs py-2 font-medium truncate">
                      ${formatNumberWithSuffix(holder.value.usd)}
                    </td>
                    <td className="px-4 text-gray-600 dark:text-neutral-300 text-xs py-2 font-medium truncate">
                      {holder.percentage.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile view */}
        <div className="md:hidden">
          {holders?.accounts.map((holder: any, index: number) => {
            const ownerPercentage = marketCap > 0 ? (holder.value.usd / marketCap) * 100 : 0;
            return (
              <div key={index} className={`p-3 border-b border-theme-neutral-800/40 dark:border-neutral-800/50 hover:bg-gray-50 dark:hover:bg-neutral-800/30 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-[#1A1A1A]' : 'bg-white dark:bg-[#0F0F0F]'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 dark:text-neutral-400">
                      {truncateString(holder.wallet, 9)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">

                    <span className="text-[10px] text-gray-500 dark:text-neutral-400">
                      {t("transactionHistory.ownerPercentage")}: {ownerPercentage.toFixed(4)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-neutral-400">{t("transactionHistory.amount")}:</span>
                    <span className="ml-1 text-gray-700 dark:text-neutral-200">{formatNumberWithSuffix(holder.amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-neutral-400">{t("transactionHistory.quoteValue")}:</span>
                    <span className="ml-1 text-gray-700 dark:text-neutral-200">${formatNumberWithSuffix(holder.value.quote)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-neutral-400">{t("transactionHistory.usdValue")}:</span>
                    <span className="ml-1 text-gray-700 dark:text-neutral-200">${formatNumberWithSuffix(holder.value.usd)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderAssetsTable = () => {
    const { t } = useLang();
    const router = useRouter();

    return (
      <>
        {/* Desktop view */}
        <div className="hidden md:block">
          {!filteredTokens || filteredTokens.length === 0 ? (
            <div className="flex justify-center items-center py-8 text-neutral-600 dark:text-gray-400">
              {t("wallet.noTokens")}
            </div>
          ) : (
            <div>
              {/* Asset Preview Section */}
              <div className="mb-1 p-1.5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  {/* SOL Balance */}
                  <div className="flex-1 flex gap-2 items-center">
                    <div className="2xl:text-sm text-xs text-black dark:text-white ">{t('wallet.solBalance')}</div>
                    <div className="2xl:text-base text-xs font-bold text-blue-600 dark:text-blue-400">
                      {(() => {
                        const solToken = filteredTokens.find((token: any) => token.token_symbol === "SOL");
                        return solToken ? solToken.token_balance.toFixed(4) : "0.0000";
                      })()}
                    </div>
                    <div className="text-xs text-black dark:text-white">
                      ≈ ${(() => {
                        const solToken = filteredTokens.find((token: any) => token.token_symbol === "SOL");
                        return solToken ? (solToken.token_balance * solToken.token_price_usd).toFixed(2) : "0.00";
                      })()} USD
                    </div>
                  </div>

                  {/* USDT Balance */}
                  <div className="flex-1 flex gap-2 items-center">
                    <div className="2xl:text-sm text-xs text-black dark:text-white ">{t('wallet.usdtBalance')}</div>
                    <div className="2xl:text-base text-xs font-bold text-green-600 dark:text-green-400">
                      {(() => {
                        const usdtToken = filteredTokens.find((token: any) => token.token_symbol === "USDT");
                        return usdtToken ? usdtToken.token_balance.toFixed(2) : "0.00";
                      })()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-white">
                      ≈ ${(() => {
                        const usdtToken = filteredTokens.find((token: any) => token.token_symbol === "USDT");
                        return usdtToken ? (usdtToken.token_balance * usdtToken.token_price_usd).toFixed(2) : "0.00";
                      })()} USD
                    </div>
                  </div>

                  {/* Total Portfolio Value */}
                  <div className="flex-1 flex gap-2 items-center">
                    <div className="2xl:text-sm text-xs text-black dark:text-white ">{t('wallet.totalPortfolio')}</div>
                    <div className="2xl:text-base text-xs font-bold text-purple-600 dark:text-purple-400">
                      ${(() => {
                        const totalValue = filteredTokens.reduce((sum: number, token: any) => {
                          return sum + token.token_balance_usd;
                        }, 0);
                        return totalValue.toFixed(2);
                      })()}
                    </div>
                    <div className="2xl:text-sm text-xs text-yellow-500 ml-1">
                      {filteredTokens.length} {t('wallet.tokens')}
                    </div>
                  </div>
                </div>
              </div>
              <table className="w-full text-sm table-fixed">
                <thead className="sticky top-[-1px] z-10 bg-white dark:bg-theme-primary-500/70">
                  <tr className="border-b border-gray-200 dark:border-neutral-800">
                    <th className="px-4 py-2 text-left text-gray-700 dark:text-neutral-200 font-medium w-auto">{t("wallet.token")}</th>
                    <th className="px-4 py-2 text-left text-gray-700 dark:text-neutral-200 font-medium w-[15%]">{t("wallet.balance")}</th>
                    <th className="px-4 py-2 text-left text-gray-700 dark:text-neutral-200 font-medium w-[15%]">{t("wallet.price")}</th>
                    <th className="px-4 py-2 text-left text-gray-700 dark:text-neutral-200 font-medium w-[12%]">{t("wallet.value")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((token: any, index: number) => (
                    <tr key={index} className={`hover:bg-gray-100 dark:hover:bg-neutral-800/30 border-b border-gray-100 dark:border-neutral-800/50 cursor-pointer ${index % 2 === 0 ? 'bg-gray-50 dark:bg-[#1A1A1A]' : 'bg-white dark:bg-[#0F0F0F]'}`} >
                      <td className="px-4 py-2 text-gray-600 dark:text-neutral-300 text-xs font-medium flex-1">
                        <div className="flex items-center gap-2" >
                          {token.token_logo_url && (
                            <img
                              src={token.token_logo_url}
                              alt={token.token_name}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.png';
                              }}
                            />
                          )}
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-theme-neutral-100 text-xs">{token.token_name}</div>
                            <div className="text-[10px] sm:text-xs text-neutral-600 dark:text-gray-400">{token.token_symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-green-600 text-xs font-medium truncate">
                        {token.token_balance.toFixed(4)}
                      </td>
                      <td className="px-4 py-2 text-purple-600 text-xs font-medium truncate">
                        ${token.token_price_usd.toFixed(6)}
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-neutral-300 text-xs font-medium truncate">
                        ${token.token_balance_usd.toFixed(5)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mobile view */}
        <div className="md:hidden">
          {!filteredTokens || filteredTokens.length === 0 ? (
            <div className="flex justify-center items-center py-6 text-neutral-600 dark:text-gray-400 bg-gray-800/60 rounded-md">
              {t("wallet.noTokens")}
            </div>
          ) : (
            filteredTokens.map((token: any, index: number) => (
              <div key={index} className={`p-3 border-b border-theme-neutral-800/40 dark:border-neutral-800/50 hover:bg-gray-50 dark:hover:bg-neutral-800/30 cursor-pointer ${index % 2 === 0 ? 'bg-gray-50 dark:bg-[#1A1A1A]' : 'bg-white dark:bg-[#0F0F0F]'}`} onClick={() => router.push(`/trading?address=${token.token_address}`)}>
                {/* Token Info Header */}
                <div className="flex items-start gap-2 mb-3">
                  <div className="flex items-center gap-2 justify-between flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {token.token_logo_url && (
                        <img
                          src={token.token_logo_url}
                          alt={token.token_name}
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.png';
                          }}
                        />
                      )}
                      <div className="min-w-0 flex gap-2">
                        <div className="font-medium dark:text-theme-neutral-100 text-black text-sm truncate">{token.token_name}</div>
                        <div className="text-xs dark:text-gray-400 text-black">{token.token_symbol}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-xs dark:text-gray-400 text-black mb-1">{t("wallet.balance")}</div>
                    <div className="text-sm sm:text-base font-medium dark:text-theme-neutral-100 text-black">
                      {token.token_balance.toFixed(token.token_decimals)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs dark:text-gray-400 text-black mb-1">{t("wallet.price")}</div>
                    <div className="text-sm sm:text-base font-medium dark:text-theme-neutral-100 text-black">
                      ${token.token_price_usd.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs dark:text-gray-400 text-black mb-1">{t("wallet.value")}</div>
                    <div className="text-sm sm:text-base font-medium dark:text-theme-neutral-100 text-black">
                      ${token.token_balance_usd.toFixed(5)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </>
    );
  };

  return (
    <div className="shadow-inset dark:bg-[#0e0e0e] rounded-md p-2 sm:p-2 lg:overflow-hidden bg-white dark:bg-neutral-1000 flex flex-col w-full h-full ">
      <div className="flex border-gray-200 dark:border-neutral-800 2xl:h-[30px] h-[24px] bg-gray-100  rounded-full dark:bg-[#333] overflow-x-auto md:overflow-x-hidden mb-1">
        <button
          className={`flex-1 rounded-sm text-[9px] 2xl:text-sm cursor-pointer font-medium uppercase text-center ${activeTab === "all" ? "text-white dark:linear-gradient-connect" : "text-gray-500 dark:text-neutral-400"}`}
          onClick={() => setActiveTab("all")}
        >
          {t("transactionHistory.allTransactions")}
        </button>
        <button
          className={`flex-1 rounded-sm cursor-pointer text-[9px] 2xl:text-sm font-medium uppercase text-center ${activeTab === "my" ? "text-white dark:linear-gradient-connect" : "text-gray-500 dark:text-neutral-400"}`}
          onClick={() => setActiveTab("my")}
        >
          {t("transactionHistory.myTransactions")}
        </button>
        <button
          className={`px-5 md:flex-1 rounded-sm cursor-pointer text-[9px] 2xl:text-sm font-medium uppercase text-center ${activeTab === "holder" ? "text-white dark:linear-gradient-connect" : "text-gray-500 dark:text-neutral-400"}`}
          onClick={() => setActiveTab("holder")}
        >
          {t("transactionHistory.holders")}
        </button>
        <button
          className={`px-5 md:flex-1 rounded-sm cursor-pointer text-[9px] 2xl:text-sm font-medium uppercase text-center ${activeTab === "asset" ? "text-white dark:linear-gradient-connect" : "text-red-500 dark:text-red-500"}`}
          onClick={() => setActiveTab("asset")}
        >
          {t("transactionHistory.assets")}
        </button>
      </div>

      <div className="mt-0 2xl:mt-3 bg-gray-50 dark:bg-[#0F0F0F] rounded-sm relative flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          {activeTab === "all" ? renderAllTransactionsTable() :
            activeTab === "my" ? renderMyTransactionsTable() :
              activeTab === "holder" ? renderHoldersTable() :
                renderAssetsTable()}
        </div>
      </div>
    </div>
  )
}
