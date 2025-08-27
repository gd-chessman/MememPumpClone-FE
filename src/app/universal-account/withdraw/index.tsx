"use client"

import { useState, useEffect } from "react"
import { Check, Copy, Send, Wallet, AlertCircle, ChevronDown, Search } from "lucide-react"
import { toast } from 'react-hot-toast';
import React from "react";
import { truncateString } from "@/utils/format";
import { createTransaction, getTransactionHistory } from "@/services/api/HistoryTransactionWallet";
import { useLang } from "@/lang/useLang";
import { useQuery } from "@tanstack/react-query";
import { getInforWallet, getMyWallets } from "@/services/api/TelegramWalletService";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";

export default function WithdrawWallet({ walletInfor }: { walletInfor: any }) {
  const { data: walletInforAccount, refetch: refetchWalletInforAccount } = useQuery({
    queryKey: ["wallet-infor"],
    queryFn: getInforWallet,
  });
  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactionHistory(),
  });

  const { data: listWallets = [] } = useQuery({
    queryKey: ['my-wallets'],
    queryFn: getMyWallets,
  });
  const { t } = useLang();
  const [amount, setAmount] = useState<string>("0")
  const [recipientWallet, setRecipientWallet] = useState<string>("")
  const [isSending, setIsSending] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [recipientError, setRecipientError] = useState<string>("")
  const [copied, setCopied] = useState(false);
  const [googleAuthCode, setGoogleAuthCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [googleAuthError, setGoogleAuthError] = useState<string>("");
  
  // Custom dropdown states
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredWallets, setFilteredWallets] = useState<any[]>([]);

  // Kiểm tra điều kiện disable
  const isDisabled = React.useMemo(() => {
    const numAmount = Number.parseFloat(amount);
    const balance = parseFloat(walletInfor?.solana_balance || "0");

    const disabledConditions = {
      isSending,
      noWalletAddress: !walletInfor?.solana_address,
      amountTooSmall: numAmount < 0.001,
      exceedsBalance: numAmount > balance,
      hasError: !!error
    };

    console.log('Button disabled conditions:', {
      ...disabledConditions,
      recipientWalletEmpty: recipientWallet.length === 0,
      finalDisabled: isSending ||
        !walletInfor?.solana_address ||
        numAmount < 0.001 ||
        numAmount > balance ||
        !!error ||
        recipientWallet.length === 0
    });

    return {
      send: isSending ||
        !walletInfor?.solana_address ||
        numAmount < 0.001 ||
        numAmount > balance ||
        !!error,
      input: isSending,
      copy: isSending || !walletInfor?.solana_address
    };
  }, [amount, walletInfor, isSending, error, recipientWallet]);

  // Filter wallets based on input
  useEffect(() => {
    if (recipientWallet.trim() === '') {
      setFilteredWallets(listWallets);
    } else {
      const filtered = listWallets.filter((wallet: any) => 
        wallet.wallet_nick_name.toLowerCase().includes(recipientWallet.toLowerCase()) ||
        wallet.wallet_name.toLowerCase().includes(recipientWallet.toLowerCase()) ||
        wallet.solana_address.toLowerCase().includes(recipientWallet.toLowerCase()) ||
        wallet.eth_address.toLowerCase().includes(recipientWallet.toLowerCase())
      );
      setFilteredWallets(filtered);
    }
  }, [recipientWallet, listWallets]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled.input) return;

    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      const numValue = parseFloat(value);
      setAmount(value);

      const balance = parseFloat(walletInfor?.solana_balance || "0");

      if (numValue > balance) {
        setError(`${t('universal_account.amount_cannot_exceed_balance', { balance })}`);
      } else if (numValue < 0.001 && value !== "") {
        setError(`${t('universal_account.minimum_withdrawal_amount', { amount: 0.001 })}`);
      } else {
        setError("");
      }
    }
  };

  console.log("walletInfor", walletInfor)

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
    if (isDisabled.send) return;

    if (!recipientWallet.trim()) {
      setRecipientError(t('universal_account.recipient_address_required'));
      return;
    }

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
      const response = await createTransaction({
        type: "withdraw",
        amount: Number(amount),
        wallet_address_to: recipientWallet,
        google_auth_token: walletInforAccount?.isGGAuth ? googleAuthCode.join('') : undefined
      });
      console.log("response", response)
      setAmount("0");
      setRecipientWallet("");
      setGoogleAuthCode(["", "", "", "", "", ""]);
      refetchTransactions();
      toast.success(t('universal_account.errors.transaction_success'));
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK') {
        toast.error(t('universal_account.errors.network_error'));
      } else if (error.response?.status === 401) {
        toast.error(t('universal_account.errors.unauthorized'));
      } else if (error.response?.data?.message === "User wallet not found") {
        toast.error(t('universal_account.errors.user_wallet_not_found'));
      } else if (error.response?.data?.message?.includes("Google Authenticator")) {
        toast.error(t('universal_account.errors.invalid_google_auth'));
        setGoogleAuthError(t('universal_account.errors.invalid_google_auth'));
      } else {
        toast.error(t('universal_account.errors.transaction_failed'));
      }
      console.error('Transaction error:', error);
    } finally {
      setIsSending(false);
    }
  };

  const selectWallet = (address: string) => {
    setRecipientWallet(address);
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col gap-6 items-center">
      {/* Amount Input */}
      <div className={`p-[1px] rounded-xl bg-gradient-to-t from-theme-purple-100 to-theme-gradient-linear-end w-full max-w-[600px] group hover:from-theme-purple-200 hover:to-theme-gradient-linear-end transition-all duration-300 ${isDisabled.input ? 'opacity-50 cursor-not-allowed' : ''
        }`}>
        <div className="bg-white dark:bg-theme-black-200 border border-theme-gradient-linear-start p-4 sm:p-6 rounded-xl group-hover:border-theme-purple-200 transition-all duration-300 ">
          <div className="w-full">
            <div className="text-center mb-1">
              <p className="text-sm dark:text-gray-400 text-black group-hover:text-black dark:group-hover:text-white transition-colors duration-300">
                {isDisabled.input ? t('universal_account.transaction_progress') : t('universal_account.enter_amount')}
              </p>
            </div>
            <div className="text-center mb-2 relative">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                disabled={isDisabled.input}
                className={`bg-transparent text-center text-3xl max-w-[200px] font-bold w-full focus:outline-none transition-colors duration-300 ${error ? 'text-red-500' : 'group-hover:text-black dark:group-hover:text-white'
                  } ${isDisabled.input ? 'cursor-not-allowed opacity-50' : ''}`}
              />
              <span className={`absolute inset-y-0 right-0 flex items-center pr-3 transition-colors duration-300 ${error ? 'text-red-500' : 'text-gray-500 group-hover:text-gray-300'
                } ${isDisabled.input ? 'opacity-50' : ''}`}>SOL</span>
            </div>
            <div className="text-center text-xs text-gray-500 mb-1 group-hover:text-gray-400 transition-colors duration-300">
              {t('universal_account.available', { amount: walletInfor?.solana_balance })}
            </div>
            {error && (
              <div className="text-center text-xs text-red-500 mt-1">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recipient Address Card */}
      <Card className="border-0 shadow-lg  w-full max-w-[600px] ">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {t('universal_account.recipient_address')} <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <div className="relative">
              <Input
                type="text"
                value={recipientWallet}
                onChange={(e) => {
                  setRecipientWallet(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="h-12 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 pr-10"
                placeholder={t('universal_account.recipient_placeholder')}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            
            {/* Custom Styled Dropdown */}
            {showDropdown && filteredWallets.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredWallets.map((wallet: any) => (
                  <div key={wallet.wallet_id} className="space-y-1">
                    {/* Solana Address Option */}
                    <div
                      onClick={() => selectWallet(wallet.solana_address)}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {wallet.wallet_nick_name} &ensp;•&ensp; {wallet.wallet_country?.toUpperCase()}
                          </span>
                          <Badge variant="outline" className="text-xs ml-3 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                            {t(`listWalletss.walletType.${wallet.wallet_type}`)}
                          </Badge>
                        </div>
                        <div className="text-xs text-yellow-500 italic ml-4">
                          {truncateString(wallet.solana_address, 10)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {recipientError && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
              {recipientError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Authenticator Card */}
      {walletInforAccount?.isGGAuth && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t('universal_account.google_auth_code')} <span className="text-red-500">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-3">
              {googleAuthCode.map((digit, index) => (
                <Input
                  key={index}
                  id={`google-auth-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleGoogleAuthChange(index, e.target.value)}
                  onPaste={handleGoogleAuthPaste}
                  onKeyDown={(e) => handleGoogleAuthKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-bold border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                  disabled={isSending}
                />
              ))}
            </div>
            {googleAuthError && (
              <div className="flex items-center justify-center gap-2 text-sm text-red-500">
                <AlertCircle className="w-4 h-4" />
                {googleAuthError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Send Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSend}
          disabled={isDisabled.send || recipientWallet.length === 0}
          size="lg"
          className="w-full max-w-md h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {isSending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              {t('universal_account.sending')}
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              {t('universal_account.send')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
