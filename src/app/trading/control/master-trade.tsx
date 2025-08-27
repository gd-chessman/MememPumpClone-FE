"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getMyConnects } from "@/services/api/MasterTradingService"
import ChatTrading from "./chat"
import ChatAll from "./chat-all"
import { MasterTradeChatProps } from "./types"
import { SearchBar } from "./components/SearchBar"
import { ConnectionList } from "./components/ConnectionList"
import { getInforWallet } from "@/services/api/TelegramWalletService"
import { useTradingChatStore } from "@/store/tradingChatStore"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useLang } from "@/lang"
import { useTradingState } from './hooks/useTradingState'
import { useConnectListStore } from "@/hooks/useConnectListStore"

type TabType = "chat" | "trade" | "chatAll";

export default function MasterTradeChat() {
    const { setConnectList, selectedConnections, setSelectedConnections } = useConnectListStore()
    const searchParams = useSearchParams();
    const tokenAddress = searchParams?.get("address");
    const { token } = useAuth();
    const { lang } = useLang();
    const queryClient = useQueryClient();
    const {
        activeTab,
        setActiveTab,
        unreadCount,
        messages,
        setTokenAddress,
        initializeWebSocket,
        disconnectWebSocket,
    } = useTradingChatStore();

    const { data: myConnects = [], isLoading: isLoadingConnects, refetch: refetchMyConnects } = useQuery({
        queryKey: ["myConnects"],
        queryFn: () => getMyConnects(),
        refetchOnWindowFocus: false,
        staleTime: 0, // Always consider data stale to allow refetching
        refetchOnMount: true,
    })

    const {
        selectedGroups,
        setSelectedGroups,
        refreshTradingData,
        refreshAllData,
        forceRefreshBalances,
        refreshBalance,
        balances
    } = useTradingState(myConnects || [])

    const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [mounted, setMounted] = useState(false);

    // Get translations
    const t = useLang().t;

    // Handle initial mount
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Initialize websocket when token address changes
    useEffect(() => {
        if (!mounted) return;

        if (tokenAddress && token) {
            setTokenAddress(tokenAddress);
            initializeWebSocket(token, lang);
        }
        return () => {
            disconnectWebSocket();
        };
    }, [tokenAddress, token, lang, setTokenAddress, initializeWebSocket, disconnectWebSocket, mounted]);


    const { data: walletInfor, isLoading: isLoadingWallet } = useQuery({
        queryKey: ["wallet-infor"],
        queryFn: getInforWallet,
    });

    // Filter connections based on search query and selected groups
    const filteredConnections = useMemo(() => {
        let filtered = myConnects || []
        console.log("filteredConnections render - myConnects:", myConnects?.length, "filtered:", filtered.length)
        // First filter by selected groups if any groups are selected
        if (selectedGroups.length > 0) {
            filtered = filtered.filter((connect: any) =>
                connect.joined_groups.some((group: any) =>
                    selectedGroups.includes(group.group_id.toString())
                )
            )
        }

        // Then apply search filter if there's a search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim()
            filtered = filtered.filter((connect: any) => {
                const memberName = connect.member_name?.toLowerCase() || ""
                const memberAddress = connect.member_address?.toLowerCase() || ""
                return memberName.includes(query) || memberAddress.includes(query)
            })
        }

        return filtered
    }, [myConnects, selectedGroups, searchQuery])

    useEffect(() => {
        if (walletInfor?.role === "master") {
            setActiveTab("trade")
        } else {
            setActiveTab("chat")
        }
    }, [walletInfor, setActiveTab])

    const handleCopyAddress = useCallback((address: string) => {
        navigator.clipboard.writeText(address)
        setCopiedAddress(address)
        setTimeout(() => setCopiedAddress(null), 2000)
    }, [])

    const handleSelectItem = useCallback((id: string) => {

        // Toggle selection logic
        const newConnections = selectedConnections.includes(id)
            ? selectedConnections.filter(item => item !== id)
            : [...selectedConnections, id];

        console.log("New connections will be:", newConnections)
        setSelectedConnections(newConnections)
        setConnectList(newConnections)
    }, [selectedConnections, setSelectedConnections, setConnectList])

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
    };
    console.log("selectedConnections", selectedConnections)

    // Debug: Track selectedConnections changes
    useEffect(() => {
        console.log("selectedConnections changed:", selectedConnections)
    }, [selectedConnections])

    // Debug: Track balances changes
    useEffect(() => {
        console.log("balances changed:", balances)
    }, [balances])

    // Refetch myConnects when component mounts or when there are cache invalidations
    useEffect(() => {
        if (mounted) {
            console.log("Refetching myConnects on mount")
            refetchMyConnects()
        }
    }, [mounted, refetchMyConnects])

    // Listen for query cache changes and refetch when myConnects is invalidated
    useEffect(() => {
        if (!mounted) return;

        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
            if (event.type === 'updated' && event.query.queryKey[0] === 'myConnects') {
                refetchMyConnects()
            }
        })

        return () => {
            unsubscribe()
        }
    }, [mounted, queryClient, refetchMyConnects])

    // Refetch data when window gains focus
    useEffect(() => {
        if (!mounted) return;

        const handleFocus = () => {
            console.log("Window focused, refetching myConnects")
            refetchMyConnects()
        }

        window.addEventListener('focus', handleFocus)
        return () => {
            window.removeEventListener('focus', handleFocus)
        }
    }, [mounted, refetchMyConnects])

    return (
        <div className="h-full flex flex-col w-full ">
            {/* {isLoading && (
                <div className="absolute inset-0 bg-neutral-1000/50 backdrop-blur-xl z-10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-theme-primary-400"></div>
                    <span className="ml-2">{t("masterTrade.loading")}</span>
                </div>
            )} */}
            {/* Tabs */}
            <div className="flex-none flex h-[25px] bg-gray-300 my-2 mx-3 rounded-full relative dark:bg-theme-neutral-800">
                {walletInfor?.role === "master" ? (
                    <button
                        className={`px-[14%] rounded-xl text-xs cursor-pointer font-medium uppercase text-center ${activeTab === "trade" ? "linear-gradient-connect" : "text-neutral-400"
                            }`}
                        onClick={() => handleTabChange("trade")}
                        data-active-tab={activeTab}
                    >
                        {t("masterTrade.tabs.member")}
                    </button>
                ) : (
                    <button
                        className={`px-[14%] rounded-md text-xs cursor-pointer font-medium uppercase text-center ${activeTab === "chatAll" ? "bg-theme-primary-500" : "text-neutral-400"
                            }`}
                        onClick={() => setActiveTab("chatAll")}
                        data-active-tab={activeTab}
                    >
                        {t("masterTrade.tabs.chatAll")}
                    </button>
                )}
                <button
                    className={`flex-1 rounded-xl cursor-pointer text-xs font-medium uppercase text-center ${activeTab === "chat" ? "linear-gradient-connect" : "text-neutral-400"
                        }`}
                    onClick={() => handleTabChange("chat")}
                    data-active-tab={activeTab}
                >
                    {t("masterTrade.tabs.chatWithToken")}
                    {unreadCount > 0 && activeTab !== "chat" && (
                        <div className="absolute right-1 top-0">
                            <div className="bg-theme-primary-400 text-neutral-100 text-[10px] rounded-full p-[2px]">{unreadCount}</div>
                        </div>
                    )}
                </button>
            </div>

            {activeTab === "trade" ? (
                <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex-none">
                        <div className="flex items-center gap-2 mb-2">
                            <SearchBar
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                            />
                            {/* <button
                                onClick={forceRefreshBalances}
                                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                            >
                                Refresh Balances
                            </button> */}
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <ConnectionList
                            connections={filteredConnections}
                            selectedConnections={selectedConnections}
                            onSelectConnection={handleSelectItem}
                            copiedAddress={copiedAddress}
                            onCopyAddress={handleCopyAddress}
                            isLoading={isLoadingConnects}
                            balances={balances}
                            onRefreshBalance={refreshBalance}
                        />
                    </div>
                </div>
            ) : activeTab === "chatAll" ? <ChatAll /> : (
                <div className="flex-1 min-h-0 overflow-hidden">
                    <ChatTrading />
                </div>
            )}
        </div>
    )
}