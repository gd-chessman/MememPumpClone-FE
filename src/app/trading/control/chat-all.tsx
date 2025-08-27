"use client"

import type React from "react"
import { useState, useRef, useEffect, Suspense } from "react"
import { Smile, Send } from "lucide-react"
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react'
import { useQuery } from "@tanstack/react-query"
import { getChatAllHistories } from "@/services/api/ChatService"
import { useLang } from "@/lang"
import { ChatService } from "@/services/api"
import ChatMessage from "@/app/components/chat/ChatMessage"
import { useWsChatMessage } from "@/hooks/useWsChatMessage"

type Message = {
  id: string
  sender: {
    name: string
    avatar: string
    isCurrentUser: boolean
  }
  text: string
  timestamp: Date
  country: string
}

type ChatHistoryItem = {
  _id: string;
  ch_id: string;
  chat_id: string;
  ch_wallet_address: string;
  ch_content: string;
  chat_type: string;
  ch_status: string;
  ch_is_master: boolean;
  ch_lang: string;
  country: string;
  nick_name: string;
  createdAt: string;
}

type WsMessage = {
  _id: string;
  ch_chat_id: number;
  ch_content: string;
  ch_status: string;
  createdAt: string;
  ch_wallet_address: string;
  nick_name?: string;
  ch_lang?: string;
  country?: string;
}

// Create a client component for the main content
const ChatAllContent = () => {
  const { t, lang } = useLang();
  const [isMounted, setIsMounted] = useState(false);
  const [windowHeight, setWindowHeight] = useState(800);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  const { data: chatAllHistories, refetch: refetchChatAllHistories } = useQuery({
    queryKey: ["chatAllHistories", lang],
    queryFn: () => getChatAllHistories(lang),
  });

  const { message: wsMessage } = useWsChatMessage({
    chatType: 'all'
  });

  // Convert chatAllHistories data to Message format
  useEffect(() => {
    if (chatAllHistories?.data) {
      const convertedMessages: Message[] = chatAllHistories.data.map((chat: ChatHistoryItem) => ({
        id: chat._id,
        sender: {
          name: chat.nick_name || "Anonymous",
          avatar: "/token.png",
          isCurrentUser: chat.ch_wallet_address === "YOUR_WALLET_ADDRESS", // TODO: Replace with actual wallet address
        },
        text: chat.ch_content,
        timestamp: new Date(chat.createdAt),
        country: chat.country || "en"
      }));
      setMessages(convertedMessages);
    }
  }, [chatAllHistories]);

  // Handle new websocket messages
  useEffect(() => {
    if (wsMessage) {
      const wsMsg = wsMessage as WsMessage;
      const newMessage: Message = {
        id: wsMsg._id,
        sender: {
          name: wsMsg.nick_name || "Anonymous",
          avatar: "/token.png",
          isCurrentUser: wsMsg.ch_wallet_address === "YOUR_WALLET_ADDRESS", // TODO: Replace with actual wallet address
        },
        text: wsMsg.ch_content,
        timestamp: new Date(wsMsg.createdAt),
        country: wsMsg.country || "en"
      };
      setMessages(prev => [...prev, newMessage]);
    }
  }, [wsMessage]);

  useEffect(() => {
    setIsMounted(true);
    setWindowHeight(window.innerHeight);

    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use default height during SSR
  const height = isMounted ? windowHeight : 800;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Close pickers when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await ChatService.sendAllMessage(newMessage, lang);
      refetchChatAllHistories(); // Refetch chat history after sending
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="flex flex-col h-full pt-3 dark:bg-[#0e0e0e] pb-1 px-2 rounded-md">
      <div className={`${height > 700 ? 'flex-1' : 'h-[300px]'} overflow-y-auto px-1 rounded-md bg-theme-neutral-100 dark:bg-inherit`}>
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-1 border-t border-gray-100 dark:border-neutral-800 bg-white dark:bg-theme-neutral-1000 shadow-sm">
        <div className="relative">
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-50">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                  width={320}
                  height={400}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t('masterTrade.manage.chat.type_a_message')}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-full px-4 py-2 pr-10 
                                         focus:outline-none focus:ring-2 focus:ring-theme-primary-400/50 
                                         placeholder-gray-400 dark:placeholder-gray-500 text-xs
                                         border border-gray-200 dark:border-neutral-700 h-[30px]
                                         shadow-sm hover:border-theme-primary-400/30 transition-colors placeholder:text-xs"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-gray-400 hover:text-theme-primary-500 dark:text-gray-400 
                                             dark:hover:text-theme-primary-300 transition-colors"
                >
                  <Smile className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className={`rounded-full p-1 transition-colors
                                     ${newMessage.trim()
                  ? 'bg-theme-primary-400 hover:bg-theme-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-neutral-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main component with Suspense
const ChatAll = () => {
  return (
    <Suspense fallback={<div></div>}>
      <ChatAllContent />
    </Suspense>
  );
}

export default ChatAll 