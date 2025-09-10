"use client"

import { useState, useEffect } from "react"
import { Check, Copy, ChevronDown } from "lucide-react"
import { toast } from 'react-hot-toast';
import React from "react";
import { createMultiTokenTransaction, getTransactionHistory } from "@/services/api/HistoryTransactionWallet";
import { useLang } from "@/lang/useLang";
import { useQuery } from "@tanstack/react-query";
import { getInforWallet, getListBuyToken } from "@/services/api/TelegramWalletService";
import { useAuth } from "@/hooks/useAuth";

// Token type definition
interface TokenOption {
  token_address: string;
  token_name: string;
  token_symbol: string;
  token_logo_url: string;
  token_decimals: number;
  token_balance: number;
  token_balance_usd: number;
  token_price_usd: number;
  token_price_sol: number;
  is_verified: boolean;
}

export default function WithdrawWallet({ walletInfor }: { walletInfor: any }) {
  const { isAuthenticated } = useAuth();
  const { data: walletInforAccount, refetch: refetchWalletInforAccount } = useQuery({
    queryKey: ["wallet-infor"],
    queryFn: getInforWallet,
  });
  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactionHistory(),
  });

  // Fetch available tokens dynamically
  const { data: availableTokens, refetch: refetchAvailableTokens } = useQuery({
    queryKey: ["available-tokens"],
    queryFn: getListBuyToken,
    enabled: isAuthenticated,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  const { t } = useLang();

  // State management
  const [amount, setAmount] = useState<string>("0")
  const [recipientWallet, setRecipientWallet] = useState<string>("")
  const [isSending, setIsSending] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [recipientError, setRecipientError] = useState<string>("")
  const [copied, setCopied] = useState(false);
  const [googleAuthCode, setGoogleAuthCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [googleAuthError, setGoogleAuthError] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);

  // Set default selected token when available tokens are loaded
  useEffect(() => {
    if (availableTokens?.tokens && availableTokens.tokens.length > 0 && !selectedToken) {
      setSelectedToken(availableTokens.tokens[0]);
    }
  }, [availableTokens, selectedToken]);

  // Get current token balance from availableTokens
  const getCurrentTokenBalance = () => {
    if (!selectedToken || !availableTokens?.tokens) return "0";

    // Find the selected token in availableTokens to get current balance
    const tokenData = availableTokens.tokens.find((token: TokenOption) => token.token_symbol === selectedToken.token_symbol);
    return tokenData?.token_balance?.toString() || "0";
  };

  // Kiểm tra điều kiện disable
  const isDisabled = React.useMemo(() => {
    if (!selectedToken) return { send: true, input: true };

    const numAmount = Number.parseFloat(amount);
    const balance = parseFloat(getCurrentTokenBalance());

    return {
      send: isSending ||
        !walletInfor?.solana_address ||
        numAmount > balance ||
        !!error,
      input: isSending,
      copy: isSending || !walletInfor?.solana_address
    };
  }, [amount, walletInfor, isSending, error, selectedToken, availableTokens]);
  console.log("amount", amount)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setAmount(value);
      setError("");

      // Validate amount after setting it
      if (value !== "") {
        validateAmount();
      }
    }
  };

  const validateAmount = () => {
    if (!selectedToken) return;

    const numValue = parseFloat(amount);
    const balance = parseFloat(getCurrentTokenBalance());

    if (selectedToken && numValue > balance) {
      setError(`${t('universal_account.amount_cannot_exceed_balance', { balance })}`);
    } else {
      setError("");
    }
  };

  const handleTokenSelect = (token: TokenOption) => {
    setSelectedToken(token);
    setAmount("0");
    setError("");
    setShowTokenDropdown(false);
  };

  const handleCopyAddress = () => {
    if (isDisabled.copy) return;
    navigator.clipboard.writeText(walletInfor.solana_address);
    setCopied(true);
    toast.success('Wallet address copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Function to handle Google Auth code input
  const handleGoogleAuthChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...googleAuthCode];
    newCode[index] = value;
    setGoogleAuthCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`google-auth-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Function to handle Google Auth paste
  const handleGoogleAuthPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setGoogleAuthCode(newCode);
  };

  // Function to handle Google Auth keydown
  const handleGoogleAuthKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !googleAuthCode[index] && index > 0) {
      const prevInput = document.getElementById(`google-auth-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSend = async () => {
    if (!selectedToken) {
      toast.error(t('universal_account.please_select_token_first'));
      return;
    }

    if (isDisabled.send) return;

    // Validate recipient wallet
    if (!recipientWallet.trim()) {
      setRecipientError(t('universal_account.recipient_address_required'));
      return;
    }

    // Validate Google Auth if required
    if (walletInforAccount?.isGGAuth) {
      const code = googleAuthCode.join('');
      if (code.length !== 6) {
        setGoogleAuthError(t('universal_account.google_auth_required'));
        return;
      }
      setGoogleAuthError("");
    }

    setRecipientError("");
    setIsSending(true);

    try {
      const response = await createMultiTokenTransaction({
        wallet_address_to: recipientWallet,
        amount: Number(amount),
        type: "withdraw",
        token_symbol: selectedToken.token_symbol.length > 0 ? selectedToken.token_symbol : t('universal_account.not_available'),
        token_mint_address: selectedToken.token_address || undefined,
        google_auth_token: walletInforAccount?.isGGAuth ? googleAuthCode.join('') : undefined
      });

      console.log("response", response);
      setAmount("0");
      setRecipientWallet("");
      setGoogleAuthCode(["", "", "", "", "", ""]);
      refetchTransactions();
      refetchAvailableTokens();
      toast.success(t('universal_account.errors.transaction_success'));
    } catch (error: any) {
      // Handle different types of errors
      if (error.code === 'ERR_NETWORK') {
        toast.error(t('universal_account.errors.network_error'));
      } else if (error.response?.status === 401) {
        toast.error(t('universal_account.errors.unauthorized'));
      } else if (error.response?.data?.message === t('universal_account.errors.user_wallet_not_found_api')) {
        toast.error(t('universal_account.errors.user_wallet_not_found'));
      } else if (error.response?.data?.message?.includes(t('universal_account.errors.google_authenticator_text'))) {
        toast.error(t('universal_account.errors.invalid_google_auth'));
        setGoogleAuthError(t('universal_account.errors.invalid_google_auth'));
      } else if (error.response?.data?.message === "Insufficient SOL balance for transaction fee") {
        toast.error(t('universal_account.errors.insufficient_sol_balance'));
      } else if (error.response?.data?.message === "Source token account not found") {
        toast.error(t('universal_account.errors.source_token_account_not_found'));
      } else if (error.response?.data?.message === "Sender and receiver wallet addresses must be different") {
        toast.error(t('universal_account.errors.sender_and_receiver_wallet_addresses_must_be_different'));
      } else if (error.response?.data?.message === "Insufficient wallet balance for transaction fee") {
        toast.error(t('universal_account.errors.insufficient_wallet_balance_for_transaction_fee'));
      } else if (error.response?.data?.message === "Token mint address is required for SPL tokens") {
        toast.error(t('universal_account.errors.token_mint_address_required'));
      }
      else if (error.response?.data?.message === "Google Auth token is required for withdrawal") {
        toast.error(t('universal_account.errors.google_auth_required'));
      } else if (error.response?.data?.message === "Error creating multi-token deposit/withdraw") {
        toast.error(t('universal_account.errors.transaction_failed_multi_token'));
      } else if (error.response?.data?.message.includes("Insufficient SOL for ATA creation")) {
        toast.error(t('universal_account.errors.insufficient_sol_for_ata_creation'));
      }
      else if (error.response?.data?.message === "Invalid Solana wallet address") {
        toast.error(t('universal_account.errors.invalid_solana_wallet_address'));
      } else {
        toast.error(error.response?.data?.message || t('universal_account.errors.transaction_failed'));
      }
      console.error('Transaction error:', error);
    } finally {
      setIsSending(false);
    }
  };
  console.log("recipientWallet", recipientWallet)
  // Loading state for tokens
  if (!availableTokens || !availableTokens.tokens) {
    return (
      <div className="flex flex-col gap-6 items-center">
        <div className="w-full max-w-[600px] text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-purple-200 mx-auto mb-4"></div>
          <p className="text-gray-500">{t('universal_account.loading.tokens')}</p>
        </div>
      </div>
    );
  }

  // No tokens available
  if (availableTokens.tokens.length === 0) {
    return (
      <div className="flex flex-col gap-6 items-center">
        <div className="w-full max-w-[600px] text-center py-8">
          <p className="text-gray-500">{t('universal_account.no_tokens')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      {/* Token Selection */}
      <div className="w-full max-w-[600px]">
        <label className="block md:text-sm lg:text-base font-normal dark:text-neutral-100 text-black mb-1 text-xs">
          {t('universal_account.select_token')} <span className="text-theme-red-200">*</span>
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTokenDropdown(!showTokenDropdown)}
            className="w-full bg-white dark:bg-theme-black-200 border border-gray-500 rounded-md px-3 py-2 text-left flex items-center justify-between hover:border-theme-purple-200 transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <img src={selectedToken?.token_logo_url} alt={selectedToken?.token_symbol} className="w-6 h-6" />
              <span className="font-medium">{selectedToken?.token_symbol}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showTokenDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showTokenDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-theme-black-200 border border-gray-300 rounded-md shadow-lg z-10">
              {availableTokens?.tokens?.filter((token: TokenOption) => token.token_balance > 0).map((token: TokenOption) => (
                <button
                  key={token.token_symbol}
                  onClick={() => handleTokenSelect(token)}
                  className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  <div className="flex items-center gap-2">
                    <img src={token.token_logo_url} alt={token.token_symbol} className="w-6 h-6" />
                    <span>{token.token_symbol}</span>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>{token.token_balance} {token.token_symbol}</div>
                    {token.token_balance_usd > 0 && (
                      <div>${token.token_balance_usd.toFixed(2)}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Amount Input */}
      <div className={`p-[1px] rounded-md bg-gray-500 w-full max-w-[600px] group transition-all duration-300 ${isDisabled.input ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className="bg-white dark:bg-theme-black-200 p-4 sm:p-6 rounded-md group-hover:border-theme-purple-200 transition-all duration-300 ">
          <div className="w-full">
            <div className="text-center mb-1">
              <p className="text-sm dark:text-gray-400 text-black group-hover:text-black dark:group-hover:text-white transition-colors duration-300">
                {isDisabled.input ? t('universal_account.transaction_progress') : t('universal_account.enter_amount')}
              </p>
            </div>
            <div className="text-center mb-2 relative">
              <div className="flex items-center justify-center gap-2 ml-[9%]">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={handleAmountChange}
                  disabled={isDisabled.input}
                  className={`bg-transparent text-center text-3xl max-w-[200px] font-bold w-full focus:outline-none transition-colors duration-300 ${error ? 'text-red-500' : 'group-hover:text-black dark:group-hover:text-white'} ${isDisabled.input ? 'cursor-not-allowed opacity-50' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (selectedToken && availableTokens?.tokens) {
                      const tokenData = availableTokens.tokens.find((token: TokenOption) => token.token_symbol === selectedToken.token_symbol);
                      if (tokenData?.token_balance) {
                        setAmount(tokenData.token_balance.toString());
                      }
                    }
                  }}
                  disabled={isDisabled.input || !selectedToken || !availableTokens?.tokens}
                  className="px-3 py-1 text-xs font-medium bg-theme-purple-100 hover:bg-theme-purple-200 text-theme-purple-600 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('universal_account.max_button')}
                </button>
              </div>
              <span className={`absolute md:flex hidden inset-y-0 right-0  items-center pr-3 transition-colors duration-300 ${error ? 'text-red-500' : 'text-gray-500 group-hover:text-gray-300'} ${isDisabled.input ? 'opacity-50' : ''}`}>
                {selectedToken?.token_symbol}
              </span>
            </div>
            <div className="text-center text-xs text-gray-500 mb-1 group-hover:text-gray-400 transition-colors duration-300">
              {t('universal_account.available', { amount: getCurrentTokenBalance() })}
              {availableTokens?.tokens && selectedToken && (() => {
                const tokenData = availableTokens.tokens.find((token: TokenOption) => token.token_symbol === selectedToken.token_symbol);
                return tokenData?.token_balance_usd ? ` ($${tokenData.token_balance_usd.toFixed(2)})` : '';
              })()}
            </div>
            {/* <div className="text-center text-xs text-gray-400 mb-1">
              Min: {getTokenLimits(selectedToken?.token_symbol || 'SOL').minAmount} | Max: {getTokenLimits(selectedToken?.token_symbol || 'SOL').maxAmount} {selectedToken?.token_symbol}
            </div> */}
            {availableTokens?.tokens && selectedToken && (() => {
              const tokenData = availableTokens.tokens.find((token: TokenOption) => token.token_symbol === selectedToken.token_symbol);
              return tokenData?.token_price_usd ? (
                <div className="text-center text-xs text-gray-400 mb-1">
                  {t('wallet.price')}: ${tokenData.token_price_usd.toFixed(6)} USD
                </div>
              ) : null;
            })()}
            {error && (
              <div className="text-center text-xs text-red-500 mt-1">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recipient Address */}
      <div className="w-full max-w-[600px] ">
        <label htmlFor="name" className={"block md:text-sm lg:text-base font-normal dark:text-neutral-100 text-black mb-1 text-xs"}>
          {t('universal_account.recipient_address')} <span className="text-theme-red-200">*</span>
        </label>
        <div className={`p-[1px] rounded-md bg-transparent w-full group hover:from-theme-purple-200 hover:to-theme-gradient-linear-end transition-all duration-300`}>
          <div className="bg-white dark:bg-theme-black-200 border border-gray-500 rounded-md group-hover:border-theme-purple-200 transition-all duration-300">
            <input
              type="text"
              value={recipientWallet}
              onChange={(e) => setRecipientWallet(e.target.value)}
              className="w-full bg-transparent h-10 rounded-md pl-3 text-sm font-normal focus:outline-none transition-colors duration-300"
              placeholder={t('universal_account.recipient_placeholder')}
            />
          </div>
          {recipientError && (
            <div className="text-xs text-red-500 mt-1 pl-3">
              {recipientError}
            </div>
          )}
        </div>
      </div>

      {/* Google Authenticator Input */}
      {walletInforAccount?.isGGAuth && (
        <div className="w-full max-w-[600px]">
          <label className="block md:text-sm lg:text-base font-normal dark:text-neutral-100 text-black mb-1 text-xs">
            {t('universal_account.google_auth_code')} <span className="text-theme-red-200">*</span>
          </label>
          <div className="p-[1px] rounded-md bg-gradient-to-t from-theme-purple-100 to-theme-gradient-linear-end w-full group hover:from-theme-purple-200 hover:to-theme-gradient-linear-end transition-all duration-300">
            <div className="bg-white dark:bg-theme-black-200 border border-theme-gradient-linear-start rounded-md group-hover:border-theme-purple-200 transition-all duration-300 p-4">
              <div className="flex justify-center gap-2">
                {googleAuthCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`google-auth-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleGoogleAuthChange(index, e.target.value)}
                    onPaste={handleGoogleAuthPaste}
                    onKeyDown={(e) => handleGoogleAuthKeyDown(index, e)}
                    className="w-10 h-10 text-center text-lg font-bold border border-theme-blue-100 rounded-lg focus:outline-none focus:border-theme-blue-200"
                    disabled={isSending}
                  />
                ))}
              </div>
              {googleAuthError && (
                <div className="text-xs text-red-500 mt-2 text-center">
                  {googleAuthError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={isDisabled.send || recipientWallet.length === 0 || !selectedToken || Number(amount) === 0}
        className={`lg:max-w-auto min-w-[160px] group relative bg-theme-primary-500 py-1.5 md:py-2 px-3 md:px-4 lg:px-6 rounded-full text-[11px] md:text-sm text-theme-neutral-100 transition-all duration-500 hover:from-theme-blue-100 hover:to-theme-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 w-full md:w-auto ${(isDisabled.send || recipientWallet.length === 0 || !selectedToken || Number(amount) === 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {isSending ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('universal_account.sending')}
          </span>
        ) : (
          t('universal_account.send')
        )}
      </button>
    </div>
  )
}
