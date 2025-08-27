import { useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getWalletBalanceByAddress } from '@/services/api/TelegramWalletService'

export interface BalanceData {
    sol_balance: number
    sol_balance_usd: number
}

interface Group {
    group_id: number | string
    [key: string]: any
}

type SetSelectedGroupsType = string[] | ((prev: string[]) => string[])
type SetSelectedConnectionsType = string | ((prev: string[]) => string[])

export const useTradingState = (connections: any[] = []) => {
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [selectedConnections, setSelectedConnections] = useState<string[]>([])
    const [balances, setBalances] = useState<Record<string, BalanceData>>({})
    const [isLoadingBalances, setIsLoadingBalances] = useState(false)
    const queryClient = useQueryClient()

    // Update connections when groups change
    useEffect(() => {
        if (!connections.length) return

        const getConnectionsFromGroups = (groups: string[]) => {
            return connections
                .filter(conn => conn.status === "connect")
                .filter(conn => 
                    conn.joined_groups.some((group: Group) => 
                        groups.includes(group.group_id.toString())
                    )
                )
                .map(conn => conn.member_id.toString())
        }

        if (selectedGroups.length === 0) {
            setSelectedConnections([])
        } else {
            const newConnections = getConnectionsFromGroups(selectedGroups)
            if (JSON.stringify(newConnections) !== JSON.stringify(selectedConnections)) {
                setSelectedConnections(newConnections)
            }
        }
    }, [selectedGroups, connections])

    // Handle group selection
    const handleSetSelectedGroups = useCallback((value: SetSelectedGroupsType) => {
        const newGroups = typeof value === 'function' ? value(selectedGroups) : value
        setSelectedGroups(newGroups)
    }, [selectedGroups])

    // Handle connection selection
    const handleSetSelectedConnections = useCallback((value: SetSelectedConnectionsType) => {
        if (typeof value === 'string') {
            setSelectedConnections(prev => {
                const newConnections = prev.includes(value)
                    ? prev.filter(id => id !== value)
                    : [...prev, value]

                // Update groups based on selected connections
                const selectedGroupsFromConnections = connections
                    .filter(conn => newConnections.includes(conn.member_id.toString()))
                    .flatMap(conn => 
                        conn.joined_groups.map((group: Group) => group.group_id.toString())
                    )
                    .filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates

                setSelectedGroups(selectedGroupsFromConnections)
                return newConnections
            })
        } else {
            setSelectedConnections(value)
        }
    }, [connections])

    const getBalance = async (address: string) => {
        try {
            const balance = await getWalletBalanceByAddress(address)
            return balance
        } catch (error) {
            console.error(`Error fetching balance for ${address}:`, error)
            return {
                sol_balance: 0,
                sol_balance_usd: 0
            }
        }
    }

    // Fetch all balances when connections change
    useEffect(() => {
        const fetchAllBalances = async () => {
            if (!connections.length) return

            setIsLoadingBalances(true)
            const newBalances: Record<string, BalanceData> = {}
            const filteredConnections = connections.filter((connection) => connection.status === "connect")

            try {
                // Fetch balances in parallel for better performance
                const balancePromises = filteredConnections.map(async (connection) => {
                    const balance = await getBalance(connection.member_address)
                    return {
                        id: connection.member_id,
                        balance: {
                            sol_balance: balance?.sol_balance || 0,
                            sol_balance_usd: balance?.sol_balance_usd || 0
                        }
                    }
                })

                const results = await Promise.all(balancePromises)
                
                // Convert array to record
                results.forEach(({ id, balance }) => {
                    newBalances[id] = balance
                })

                setBalances(newBalances)
            } catch (error) {
                console.error('Error fetching balances:', error)
            } finally {
                setIsLoadingBalances(false)
            }
        }

        fetchAllBalances()
    }, [connections])

    const refreshBalance = useCallback(async (memberId: string, address: string) => {
        try {
            const balance = await getBalance(address)
            setBalances(prev => ({
                ...prev,
                [memberId]: {
                    sol_balance: balance?.sol_balance || 0,
                    sol_balance_usd: balance?.sol_balance_usd || 0
                }
            }))
            console.log(`Refreshed balance for ${memberId}:`, balance)
        } catch (error) {
            console.error(`Error refreshing balance for ${address}:`, error)
        }
    }, [])

    const refreshTradingData = useCallback(async () => {
        try {
            console.log('refreshTradingData: Starting...')
            
            // Invalidate and refetch all relevant queries
            console.log('refreshTradingData: Invalidating queries...')
            queryClient.invalidateQueries({ queryKey: ['groups'] })
            queryClient.invalidateQueries({ queryKey: ['myConnects'] })
            queryClient.invalidateQueries({ queryKey: ['tokenAmount'] })
            queryClient.invalidateQueries({ queryKey: ['tradeAmount'] })
            queryClient.invalidateQueries({ queryKey: ['wallet-infor'] })
            queryClient.invalidateQueries({ queryKey: ['sol-price'] })
            queryClient.invalidateQueries({ queryKey: ['token-infor'] })
            
            // Invalidate queries with address parameter (will invalidate all instances)
            queryClient.invalidateQueries({ 
                predicate: (query) => 
                    Array.isArray(query.queryKey) && 
                    (query.queryKey[0] === 'tokenAmount' || 
                     query.queryKey[0] === 'tradeAmount' || 
                     query.queryKey[0] === 'token-infor')
            })
            
            // Force refetch balances for all connections
            if (connections.length > 0) {
                const filteredConnections = connections.filter((connection) => connection.status === "connect")
                console.log(`refreshTradingData: Refreshing balances for ${filteredConnections.length} connections...`)
                await Promise.all(
                    filteredConnections.map(async (connection) => {
                        await refreshBalance(connection.member_id.toString(), connection.member_address)
                    })
                )
                console.log('refreshTradingData: Balances refreshed')
            }
            
            console.log('refreshTradingData: Completed')
        } catch (error) {
            console.error("Error in refreshTradingData:", error)
        }
    }, [queryClient, connections, refreshBalance])

    const forceRefreshBalances = useCallback(async () => {
        try {
            if (connections.length > 0) {
                const filteredConnections = connections.filter((connection) => connection.status === "connect")
                console.log(`Force refreshing balances for ${filteredConnections.length} connections`)
                
                // Clear existing balances first
                setBalances({})
                
                // Fetch all balances in parallel
                const balancePromises = filteredConnections.map(async (connection) => {
                    const balance = await getBalance(connection.member_address)
                    return {
                        id: connection.member_id.toString(),
                        balance: {
                            sol_balance: balance?.sol_balance || 0,
                            sol_balance_usd: balance?.sol_balance_usd || 0
                        }
                    }
                })
                
                const results = await Promise.all(balancePromises)
                
                // Update balances state
                const newBalances: Record<string, BalanceData> = {}
                results.forEach(({ id, balance }) => {
                    newBalances[id] = balance
                })
                
                setBalances(newBalances)
                console.log('Force refresh balances completed:', newBalances)
            }
        } catch (error) {
            console.error("Error in forceRefreshBalances:", error)
        }
    }, [connections])

    const refreshAllData = useCallback(async () => {
        try {
            console.log('refreshAllData: Starting...')
            
            // First refresh trading data
            console.log('refreshAllData: Calling refreshTradingData...')
            await refreshTradingData()
            
            // Then force refetch specific queries that might need immediate update
            console.log('refreshAllData: Refetching queries...')
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ['myConnects'] }),
                queryClient.refetchQueries({ queryKey: ['groups'] }),
                queryClient.refetchQueries({ queryKey: ['wallet-infor'] })
            ])
            
            // Force refresh all balances
            console.log('refreshAllData: Calling forceRefreshBalances...')
            await forceRefreshBalances()
            
            console.log('refreshAllData: Completed successfully')
        } catch (error) {
            console.error("Error in refreshAllData:", error)
        }
    }, [refreshTradingData, queryClient, forceRefreshBalances])

    const handleTradeSubmit = useCallback(async (submitFn: () => Promise<any>) => {
        try {
            const response = await submitFn()
            if (response.status == 201 || response.status == 200 || response.message?.includes('successfully')) {
                // Reset selections
                setSelectedGroups([])
                setSelectedConnections([])
                // Refresh all trading data
                await refreshTradingData()
                return { success: true }
            }
            return { success: false }
        } catch (error) {
            return { success: false, error }
        }
    }, [refreshTradingData])

    return {
        selectedGroups,
        setSelectedGroups: handleSetSelectedGroups,
        selectedConnections,
        setSelectedConnections: handleSetSelectedConnections,
        balances,
        isLoadingBalances,
        refreshBalance,
        refreshTradingData,
        refreshAllData,
        forceRefreshBalances,
        handleTradeSubmit
    }
} 