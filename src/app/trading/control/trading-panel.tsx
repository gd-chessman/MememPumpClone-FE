"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getMasterTrading, getMyConnects, getMyGroups, submitSignedPhantomTransaction } from "@/services/api/MasterTradingService"
import { createTrading, getTokenAmount, getTradeAmount } from "@/services/api/TradingService"
import { useSearchParams } from "next/navigation"
import { useLang } from "@/lang/useLang"
import { getPriceSolona, getTokenInforByAddress } from "@/services/api/SolonaTokenService"
import notify from "@/app/components/notify"
import { TradingPanelProps, TradingMode } from "./types"
import { STYLE_TEXT_BASE } from "./constants/styles"
import { useLocalStorage } from "./hooks/useLocalStorage"
import { PercentageButtons } from "./components/PercentageButtons"
import { AmountButtons } from "./components/AmountButtons"
import { GroupSelect } from "./components/GroupSelect"
import { getInforWallet } from "@/services/api/TelegramWalletService"
import { useTradingState } from './hooks/useTradingState'
import { useConnectListStore } from "@/hooks/useConnectListStore"
import { getTokenBalancePhantom } from "@/services/api/OnChainService"
import { Transaction, VersionedTransaction } from '@solana/web3.js'

// Phantom wallet type declaration
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (params?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
      signTransaction: (transaction: Transaction) => Promise<Transaction>;
    };
  }
}

export default function TradingPanel({
    defaultMode = "buy",
    currency,
    isConnected,
}: Omit<TradingPanelProps, 'selectedGroups' | 'setSelectedGroups' | 'selectedConnections' | 'setSelectedConnections'>) {
    const { getConnectList, selectedConnections, setSelectedConnections, selectedGroups, setSelectedGroups, refetchConnections } = useConnectListStore()
    const { t } = useLang()
    const searchParams = useSearchParams()
    const address = searchParams?.get("address")
    const queryClient = useQueryClient()

    const { data: myConnects = [], isLoading: isLoadingConnects, refetch: refetchMyConnects } = useQuery({
        queryKey: ["myConnects"],
        queryFn: () => getMyConnects(),
        refetchOnWindowFocus: false,
        staleTime: 0, // Always consider data stale to allow refetching
        refetchOnMount: true,
    })

    const {
        handleTradeSubmit,
        refreshAllData,
        forceRefreshBalances
    } = useTradingState(myConnects || [])

    const { data: groups } = useQuery({
        queryKey: ["groups"],
        queryFn: getMyGroups,
    })

    // Check if user is logged in with Phantom wallet
    const [isPhantomUser, setIsPhantomUser] = useState(false)
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsPhantomUser(!!localStorage.getItem("phantomPublicKey"))
        }
    }, [])

    const { data: tradeAmount, refetch: refetchTradeAmount } = useQuery({
        queryKey: ["tradeAmount", address],
        queryFn: () => getTradeAmount(address),
        enabled: !isPhantomUser, // Only fetch if not Phantom user
    })

    const {data: balanceSolanaPhantom, refetch: refetchBalanceSolanaPhantom} = useQuery({
        queryKey: ["balanceSolanaPhantom", address],
        queryFn: () => {
            const phantomPublicKey = typeof window !== 'undefined' ? localStorage.getItem("phantomPublicKey") : null
            return getTokenBalancePhantom(phantomPublicKey || "", "So11111111111111111111111111111111111111112")
        },
        enabled: isPhantomUser, // Only fetch if Phantom user
    })

    console.log("balanceSolanaPhantom", balanceSolanaPhantom)


    const { data: walletInfor } = useQuery({
        queryKey: ["wallet-infor"],
        queryFn: getInforWallet,
    });

    const { data: solPrice } = useQuery({
        queryKey: ["sol-price"],
        queryFn: () => getPriceSolona(),
    })
    const { data: tokenInfor, refetch } = useQuery({
        queryKey: ["token-infor", address],
        queryFn: () => getTokenInforByAddress(address),
    });

    const { data: tokenBalance, refetch: refetchTokenBalance } = useQuery({
        queryKey: ["tokenBalance", address],
        queryFn: () => {
            const phantomPublicKey = typeof window !== 'undefined' ? localStorage.getItem("phantomPublicKey") : null
            return getTokenBalancePhantom(phantomPublicKey || "", address || "")
        },
        enabled: isPhantomUser && !!address, // Only fetch if Phantom user and address exists
    })
    console.log(tokenBalance)

    const { data: tokenAmount, refetch: refetchTokenAmount } = useQuery({
        queryKey: ["tokenAmount", address],
        queryFn: () => getTokenAmount(address),
    })

    const [mode, setMode] = useState<TradingMode>(defaultMode)
    const [amount, setAmount] = useState("0.00")
    const [percentage, setPercentage] = useState(0)
    const [amountUSD, setAmountUSD] = useState("0.00")
    const [isDirectAmountInput, setIsDirectAmountInput] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [windowHeight, setWindowHeight] = useState(800)
    const [amountError, setAmountError] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)
    const [isPhantomConnected, setIsPhantomConnected] = useState(false)
    const timeoutIdRef = useRef<NodeJS.Timeout | undefined>(undefined)

    // Use custom hook for localStorage
    const [percentageValues, setPercentageValues] = useLocalStorage<number[]>(
        'tradingPercentageValues',
        [25, 50, 75, 100]
    )
    const [amountValues, setAmountValues] = useLocalStorage<number[]>(
        'tradingAmountValues',
        [0.1, 0.5, 1, 2]
    )

    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editValue, setEditValue] = useState<string>("")
    const [editingAmountIndex, setEditingAmountIndex] = useState<number | null>(null)
    const [editAmountValue, setEditAmountValue] = useState<string>("")

    // Memoize exchange rate
    const exchangeRate = useMemo(() => solPrice?.priceUSD || 0, [solPrice?.priceUSD])

    // Calculate balances based on login type
    const calculatedBalances = useMemo(() => {
        if (isPhantomUser) {
            // For Phantom users, use balanceSolanaPhantom for SOL balance and tokenBalance for token balance
            const solBalance = balanceSolanaPhantom?.data?.balance || 0
            const tokenBalanceValue = tokenBalance?.data?.balance || 0
            
            return {
                sol_balance: solBalance,
                token_balance: tokenBalanceValue
            }
        } else {
            // For non-Phantom users, use tradeAmount
            return {
                sol_balance: tradeAmount?.sol_balance || 0,
                token_balance: tradeAmount?.token_balance || 0
            }
        }
    }, [isPhantomUser, balanceSolanaPhantom, tokenBalance, tradeAmount])

    // Add isButtonDisabled state
    const isButtonDisabled = useMemo(() => {
        const numericAmount = Number(amount)
        
        // For Phantom users, check if Phantom is connected
        if (isPhantomUser) {
            return amountError !== "" || numericAmount <= 0 || !isPhantomConnected
        }
        
        // For non-Phantom users, check regular connection
        return amountError !== "" || numericAmount <= 0 || !isConnected
    }, [amount, amountError, isConnected, isPhantomUser, isPhantomConnected])

    useEffect(() => {
        setIsMounted(true)
        setWindowHeight(window.innerHeight)

        const handleResize = () => {
            setWindowHeight(window.innerHeight)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Check Phantom connection status
    useEffect(() => {
        if (isPhantomUser) {
            const checkPhantomConnection = () => {
                const isConnected = !!(window.solana?.isPhantom && window.solana?.publicKey)
                setIsPhantomConnected(isConnected)
                
                // Clear amount error if Phantom gets disconnected
                if (!isConnected) {
                    setAmountError("")
                }
            }
            
            checkPhantomConnection()
            
            // Listen for Phantom connection changes
            const handlePhantomConnectionChange = () => {
                checkPhantomConnection()
            }
            
            window.addEventListener('focus', handlePhantomConnectionChange)
            return () => window.removeEventListener('focus', handlePhantomConnectionChange)
        }
    }, [isPhantomUser])

    // Use default height during SSR
    const height = isMounted ? windowHeight : 800

    const validateAmount = useCallback((value: number): boolean => {
        const balance = mode === "buy" ? calculatedBalances.sol_balance : calculatedBalances.token_balance
        if (value > balance) {
            setAmountError(t('trading.panel.insufficient_balance'))
            return false
        }
        if (value <= 0) {
            setAmountError(t('trading.panel.invalid_amount'))
            return false
        }
        setAmountError("")
        return true
    }, [mode, calculatedBalances, t])

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newAmount = e.target.value
        setAmount(newAmount)
        setIsDirectAmountInput(true)
        setPercentage(0)

        const numericAmount = Number.parseFloat(newAmount) || 0
        validateAmount(numericAmount)
        setAmountUSD((numericAmount * exchangeRate).toFixed(2))
    }, [exchangeRate, validateAmount])

    const handleSetAmount = useCallback((value: number) => {
        setAmount(value.toString())
        setIsDirectAmountInput(true)
        setPercentage(0)
        validateAmount(value)
        setAmountUSD((value * exchangeRate).toFixed(2))
    }, [exchangeRate, validateAmount])

    const handlePercentageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newPercentage = Number.parseInt(e.target.value)
        setPercentage(newPercentage)
        setIsDirectAmountInput(false)
        const balance = mode === "buy" ? calculatedBalances.sol_balance : calculatedBalances.token_balance
        const newAmount = ((balance * newPercentage) / 100).toFixed(6)
        setAmount(newAmount)
        
        // Validate the new amount and clear error if valid
        const numericAmount = Number(newAmount)
        if (numericAmount > 0 && numericAmount <= balance) {
            setAmountError("")
        }
        
        // Calculate amountUSD using the newAmount we just calculated
        if (mode === "buy") {
            setAmountUSD((numericAmount * exchangeRate).toFixed(2))
        }
    }, [mode, calculatedBalances, exchangeRate])

    const handleSetPercentage = useCallback((percent: number) => {
        setPercentage(percent)
        setIsDirectAmountInput(false)

        // Check if user is connected (either regular or Phantom)
        const isUserConnected = isPhantomUser 
            ? isPhantomConnected
            : isConnected

        if (isUserConnected) {
            const balance = mode === "buy" ? calculatedBalances.sol_balance : calculatedBalances.token_balance
            const newAmount = ((balance * percent) / 100).toFixed(6)
            setAmount(newAmount)
            
            // Validate the new amount and clear error if valid
            const numericAmount = Number(newAmount)
            if (numericAmount > 0 && numericAmount <= balance) {
                setAmountError("")
            }
            
            // Calculate amountUSD using the newAmount we just calculated
            if (mode === "buy") {
                setAmountUSD((numericAmount * exchangeRate).toFixed(2))
            }
        }
    }, [isConnected, mode, calculatedBalances, exchangeRate, isPhantomUser, isPhantomConnected])

    const handleEditClick = useCallback((index: number) => {
        setEditingIndex(index)
        setEditValue(percentageValues[index].toString())
    }, [percentageValues])

    const handleEditSave = useCallback((index: number) => {
        const newValue = Number(editValue)
        if (!isNaN(newValue) && newValue > 0 && newValue <= 100) {
            const newValues = [...percentageValues]
            newValues[index] = newValue
            newValues.sort((a, b) => a - b)
            setPercentageValues(newValues)
        }
        setEditingIndex(null)
    }, [editValue, percentageValues, setPercentageValues])

    const handleEditKeyPress = useCallback((e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter') {
            handleEditSave(index)
        } else if (e.key === 'Escape') {
            setEditingIndex(null)
        }
    }, [handleEditSave])

    const handleAmountEditClick = useCallback((index: number) => {
        setEditingAmountIndex(index)
        setEditAmountValue(amountValues[index].toString())
    }, [amountValues])

    const handleAmountEditSave = useCallback((index: number) => {
        const newValue = Number(editAmountValue)
        if (!isNaN(newValue) && newValue > 0) {
            const newValues = [...amountValues]
            newValues[index] = newValue
            newValues.sort((a, b) => a - b)
            setAmountValues(newValues)
        }
        setEditingAmountIndex(null)
    }, [editAmountValue, amountValues, setAmountValues])

    const handleAmountEditKeyPress = useCallback((e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter') {
            handleAmountEditSave(index)
        } else if (e.key === 'Escape') {
            setEditingAmountIndex(null)
        }
    }, [handleAmountEditSave])

    const timeoutHandle = useCallback(() => {
        // Clear any existing timeout
        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current)
        }
        // Set new timeout
        timeoutIdRef.current = setTimeout(() => {
            setIsLoading(false)
        }, 2000)
    }, [])
    // Cleanup timeout when component unmounts
    useEffect(() => {
        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current)
            }
        }
    }, [])

    // Handle Phantom wallet transaction
    const handlePhantomTransaction = useCallback(async (numericAmount: number) => {
        try {
            // Check if Phantom is connected
            if (!window.solana?.isPhantom || !window.solana?.publicKey) {
                notify({
                    message: 'Please connect Phantom wallet first',
                    type: 'error'
                })
                return false
            }

            const walletAddress = window.solana.publicKey.toString()
            
            // Step 1: Create transaction
            const createTransactionData = {
                order_trade_type: mode,
                order_type: "market",
                order_token_name: tokenAmount?.token_address || tokenInfor.symbol,
                order_token_address: tokenAmount?.token_address || tokenInfor.address,
                order_price:
                    mode === "sell"
                        ? numericAmount * (tokenAmount?.token_price || 0)
                        : numericAmount * (solPrice?.priceUSD || 0),
                order_qlty: numericAmount,
                user_wallet_address: walletAddress
            }

            console.log('Creating Phantom transaction:', createTransactionData)
            
            const createRes = await getMasterTrading(createTransactionData)

            if (createRes.status !== 201 || !createRes.data) {
                const errorData = createRes.data
                throw new Error(`Failed to create transaction: ${errorData?.message || 'Unknown error'}`)
            }

            const createData = createRes.data
            console.log('Transaction created:', createData)

            if (!createData.data?.serialized_transaction || !createData.data?.order_id) {
                throw new Error('Invalid response from create transaction API')
            }

            // Step 2: Sign transaction with Phantom
            const serializedTransaction = createData.data.serialized_transaction
            const orderId = createData.data.order_id.toString()

            console.log('Signing transaction with Phantom...')
            
            // Deserialize transaction
            let bytes: Uint8Array
            
            if (serializedTransaction.includes(',')) {
                // Comma-separated format
                const numbers = serializedTransaction.split(',').map((num: string) => parseInt(num.trim()))
                bytes = new Uint8Array(numbers)
            } else {
                // Base64 format
                try {
                    const decoded = atob(serializedTransaction)
                    bytes = new Uint8Array(decoded.length)
                    for (let i = 0; i < decoded.length; i++) {
                        bytes[i] = decoded.charCodeAt(i)
                    }
                } catch (error) {
                    throw new Error('Invalid serialized transaction format')
                }
            }

            // Create Transaction object
            let transaction
            try {
                transaction = Transaction.from(bytes)
            } catch (error) {
                transaction = VersionedTransaction.deserialize(bytes)
            }

            // Sign with Phantom
            let signedTransaction: Transaction | VersionedTransaction
            
            if (transaction instanceof Transaction) {
                signedTransaction = await window.solana.signTransaction(transaction)
            } else {
                // For VersionedTransaction, cast to avoid type issues
                signedTransaction = await window.solana.signTransaction(transaction as unknown as Transaction)
            }
            
            console.log('Transaction signed successfully')

            // Serialize signed transaction
            const serializedBytes = signedTransaction.serialize()
            const signedTransactionBase64 = Buffer.from(serializedBytes).toString('base64')
            
            // Extract signature from the first few bytes of the serialized transaction
            // Solana transaction signatures are typically at the beginning
            let signatureBase64 = ''
            try {
                // For regular transactions, signature is usually the first 64 bytes
                if (serializedBytes.length >= 64) {
                    const signatureBytes = serializedBytes.slice(0, 64)
                    signatureBase64 = Buffer.from(signatureBytes).toString('base64')
                }
            } catch (error) {
                console.warn('Failed to extract signature from serialized transaction:', error)
            }
            
            console.log('Extracted signature:', signatureBase64)
            console.log('Signature length:', signatureBase64.length)
            console.log('Serialized transaction length:', serializedBytes.length)

            // Step 3: Submit signed transaction
            const submitData = {
                order_id: orderId,
                signature: signatureBase64,
                signed_transaction: signedTransactionBase64
            }

            console.log('Submit data:', {
                order_id: submitData.order_id,
                signature_length: submitData.signature.length,
                signed_transaction_length: submitData.signed_transaction.length
            })

            console.log('Submitting signed transaction...')
            
            const submitRes = await submitSignedPhantomTransaction(submitData)

            if (submitRes.status !== 201 || !submitRes.data) {
                const errorData = submitRes.data
                throw new Error(`Failed to submit transaction: ${errorData?.message || 'Unknown error'}`)
            }

            const submitDataResponse = submitRes.data
            console.log('Transaction submitted successfully:', submitDataResponse)

            return true

        } catch (error) {
            console.error('Phantom transaction error:', error)
            notify({
                message: `Phantom transaction failed: ${(error as Error).message}`,
                type: 'error'
            })
            return false
        }
    }, [mode, tokenAmount, tokenInfor, solPrice])

    const handleSubmit = useCallback(async () => {
        const numericAmount = Number(amount)
        setIsLoading(true)
        timeoutHandle()
        if (!validateAmount(numericAmount)) {
            notify({
                message: amountError,
                type: 'error'
            })
            return
        }

        let success = false

        if (isPhantomUser) {
            // Use Phantom wallet transaction flow
            success = await handlePhantomTransaction(numericAmount)
        } else {
            // Use regular trading flow
            const submitTrade = async () => {
                return await createTrading({
                    order_trade_type: mode,
                    order_type: "market",
                    order_token_name: tokenAmount?.token_address || tokenInfor.symbol,
                    order_token_address: tokenAmount?.token_address || tokenInfor.address,
                    order_price:
                        mode === "sell"
                            ? Number(amount) * (tokenAmount?.token_price || 0)
                            : Number(amount) * (solPrice?.priceUSD || 0),
                    order_qlty: Number(amount),
                    member_list: selectedConnections.map(id => Number(id))
                })
            }

            const result = await handleTradeSubmit(submitTrade)
            success = result.success
        }

        if (success) {
            setAmount("0.00")
            setPercentage(0)
            setAmountUSD("0.00")
            setIsDirectAmountInput(false)
            
            // Add a small delay to ensure blockchain is updated
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Refresh data based on login type
            if (isPhantomUser) {
                console.log('Refreshing Phantom balances after successful transaction...')
                await refetchBalanceSolanaPhantom()
                await refetchTokenBalance()
                console.log('Phantom balances refreshed successfully')
            } else {
                console.log('Refreshing regular trade amount after successful transaction...')
                await refetchTradeAmount()
                console.log('Regular trade amount refreshed successfully')
            }
            
            notify({
                message: t('trading.panel.success'),
                type: 'success'
            })
            // Refresh all trading data using useTradingState hook
            forceRefreshBalances()
        } else {
            setAmount("0.00")
            setPercentage(0)
            setAmountUSD("0.00")
            setIsDirectAmountInput(false)
            if (!isPhantomUser) {
                notify({
                    message: t('trading.panel.error'),
                    type: 'error'
                })
            }
        }
    }, [mode, amount, tokenAmount, solPrice, selectedConnections, handleTradeSubmit, validateAmount, amountError, tokenInfor, queryClient, refetchConnections, refreshAllData, isPhantomUser, refetchBalanceSolanaPhantom, refetchTokenBalance, refetchTradeAmount, handlePhantomTransaction])

    // Reset amount and percentage when mode changes
    useEffect(() => {
        setAmount("0.00")
        setPercentage(0)
        setIsDirectAmountInput(false)
        setAmountError("") // Clear error when mode changes
    }, [mode])

    // Update amount when balance changes
    useEffect(() => {
        if (!isDirectAmountInput && percentage > 0) {
            const balance = mode === "buy" ? calculatedBalances.sol_balance : calculatedBalances.token_balance
            const newAmount = ((balance * percentage) / 100).toFixed(6)
            setAmount(newAmount)
            
            // Clear error if the new amount is valid
            const numericAmount = Number(newAmount)
            if (numericAmount > 0 && numericAmount <= balance) {
                setAmountError("")
            }
        }
    }, [calculatedBalances, mode, percentage, isDirectAmountInput])

    const handleSelectConnection = useCallback((groups: string[]) => {
        setSelectedGroups(groups)
        const connectionsFilter = myConnects.filter((connect: any) => groups.some((group: any) => connect.joined_groups.some((joinedGroup: any) => joinedGroup.group_id.toString() === group))).map((connect: any) => connect.member_id.toString())
        setSelectedConnections(connectionsFilter)
    }, [setSelectedGroups, setSelectedConnections, myConnects, selectedConnections])
   
   
    return (
        <div className="h-full flex flex-col">
            {/* Mode Tabs */}
            <div className="flex group bg-gray-100 dark:bg-theme-neutral-1000 rounded-xl 2xl:h-[30px] h-[25px] mb-1">
                <button
                    className={`flex-1 rounded-3xl 2xl:text-sm text-xs cursor-pointer uppercase text-center ${mode === "buy" ? "border-green-500 text-green-600 dark:text-theme-green-200 border-1 bg-green-50 dark:bg-theme-green-100 font-semibold" : "text-gray-500 dark:text-neutral-400"}`}
                    onClick={() => setMode("buy")}
                >
                    {t('trading.panel.buy')}
                </button>
                <button
                    className={`flex-1 rounded-3xl cursor-pointer 2xl:text-sm text-xs uppercase text-center ${mode === "sell" ? "border-red-500 text-red-600 dark:text-theme-red-100 border-1 bg-red-50 dark:bg-theme-red-300 font-semibold" : "text-gray-500 dark:text-neutral-400"}`}
                    onClick={() => setMode("sell")}
                >
                    {t('trading.panel.sell')}
                </button>
            </div>

            <div className="rounded-lg flex flex-col 2xl:gap-1.5 gap-1 h-full overflow-y-auto">
                {/* Amount Input */}
                <div className="relative mt-2">
                    <div className={`bg-gray-50 dark:bg-neutral-900 rounded-full border ${amountError ? 'border-red-500' : 'border-blue-200 dark:border-blue-500'} px-3  flex justify-between items-center ${height > 700 ? 'py-1.5' : '2xl:h-[30px] h-[25px]'}`}>
                        <input
                            type="number"
                            value={amount}
                            onChange={handleAmountChange}
                            className="bg-transparent w-full text-gray-900 dark:text-neutral-200 font-medium 2xl:text-base text-xs focus:outline-none"
                        />
                        {!isDirectAmountInput && (
                            <span className={`${STYLE_TEXT_BASE} text-blue-600 dark:text-theme-primary-300`}>
                                {percentage.toFixed(2)}%
                            </span>
                        )}
                    </div>
                    {amountError && (
                        <div className="text-red-500 text-sm mt-2">
                            {amountError}
                        </div>
                    )}

                    {/* USD Value and Balance */}
                    <div className="flex flex-wrap justify-between text-sm mt-2">
                        {mode === "buy" ? (
                            <div className={STYLE_TEXT_BASE}>~ ${amountUSD}</div>
                        ) : (
                            <div className={STYLE_TEXT_BASE}>~ ${(tokenInfor?.price * Number(amount)).toFixed(4)}</div>
                        )}
                        <div className={STYLE_TEXT_BASE}>
                            {t('trading.panel.balance')}: {mode === "buy"
                                ? calculatedBalances.sol_balance.toFixed(3) + "  " + currency.symbol
                                : calculatedBalances.token_balance.toFixed(6) + " " + tokenInfor?.symbol}
                        </div>
                    </div>

                    {/* Percentage Controls */}
                    {(!isDirectAmountInput || mode !== "buy") && (
                        <div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={percentage}
                                onChange={handlePercentageChange}
                                className="w-full"
                            />
                        </div>
                    )}
                </div>

                {/* Percentage Buttons */}
                <PercentageButtons
                    percentageValues={percentageValues}
                    percentage={percentage}
                    onSetPercentage={handleSetPercentage}
                    onEditClick={handleEditClick}
                    onEditSave={handleEditSave}
                    editingIndex={editingIndex}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    onEditKeyPress={handleEditKeyPress}
                />

                {/* Quick Amount Buttons */}
                {mode === "buy" && (
                    <AmountButtons
                        amountValues={amountValues}
                        onSetAmount={handleSetAmount}
                        onEditClick={handleAmountEditClick}
                        onEditSave={handleAmountEditSave}
                        editingIndex={editingAmountIndex}
                        editValue={editAmountValue}
                        setEditValue={setEditAmountValue}
                        onEditKeyPress={handleAmountEditKeyPress}
                    />
                )}

                {/* Group Select */}
                {walletInfor?.role == "master" && <GroupSelect
                    groups={groups || []}
                    selectedGroups={selectedGroups}
                    setSelectedGroups={handleSelectConnection}
                />}


                {/* Action Button */}
                <div className="mt-3">
                    <button
                        onClick={handleSubmit}
                        disabled={isButtonDisabled || isLoading}
                        className={`w-full py-1.5 rounded-full text-white font-semibold text-sm transition-colors relative ${isButtonDisabled || isLoading
                            ? "bg-gray-400 cursor-not-allowed dark:bg-gray-600"
                            : mode === "buy"
                                ? "bg-green-500 hover:bg-green-600 dark:bg-theme-green-200 dark:hover:bg-theme-green-200/90"
                                : "bg-red-500 hover:bg-red-600 dark:bg-theme-red-100 dark:hover:bg-theme-red-100/90"
                            }`}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                {t('trading.panel.processing')}
                            </div>
                        ) : (
                            mode === "buy" ? t('trading.panel.buy') : t('trading.panel.sell')
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
