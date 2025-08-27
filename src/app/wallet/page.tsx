"use client"
import { TelegramWalletService } from "@/services/api";
import { getInforWallet, getListBuyToken, getMyWallets, getPrivate } from "@/services/api/TelegramWalletService";
import { formatNumberWithSuffix3, maskNickname, truncateString } from "@/utils/format";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, Badge, Copy, Edit, Eye, EyeOff, KeyIcon, PlusIcon, Check, Loader2, ChevronDown } from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { WalletTable } from "@/app/components/wallet/WalletTable";
import { useAuth } from "@/hooks/useAuth";
import { langConfig } from "@/lang";
import { useLang } from '@/lang';
import { useRouter } from "next/navigation";
import bs58 from 'bs58';
import ModalSignin from "../components/ModalSignin";
import { toast } from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { getMasters } from "@/services/api/MasterTradingService";

interface Token {
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

interface PrivateKeys {
    sol_private_key: string;
    eth_private_key: string;
    bnb_private_key: string;
}

interface TokenListResponse {
    status: number;
    message: string;
    data: {
        wallet_address: string;
        tokens: Token[];
    };
}

interface WalletInfoResponse {
    role: string;
    solana_address: string;
    wallet_country: string;
    wallet_id: number;
    wallet_name: string;
    wallet_nick_name: string;
}

interface MasterTrader {
    id: number;
    solana_address: string;
    nickname: string;
    type: string | null;
    country: string;
    code_ref: string;
    connect_status: string | null;
}

const wrapGradientStyle = "bg-gradient-to-t from-theme-purple-100 to-theme-gradient-linear-end p-[1.2px] relative xl:w-full w-[95%] rounded-xl"

// Add responsive styles
const containerStyles = "lg:container-glow w-full px-4 sm:px-[40px] flex flex-col gap-4 sm:gap-6 lg:gap-12 pt-4 sm:pt-[30px] relative mx-auto z-10 pb-6 lg:pb-0"
const walletGridStyles = "grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6 w-full "
const walletCardStyles = "px-4 sm:px-6 py-3 border border-solid border-theme-secondary-500 justify-evenly rounded-xl flex flex-col lg:gap-1 gap-2 items-center sm:gap-4 min-w-0 dark:bg-gradient-overlay bg-white z-10"
const walletTitleStyles = "text-Colors-Neutral-100 text-sm sm:text-base font-semibold uppercase leading-tight"
const walletAddressStyles = "text-Colors-Neutral-200 text-xs sm:text-sm font-normal leading-tight truncate"
const sectionTitleStyles = "text-Colors-Neutral-100 text-base sm:text-lg font-bold leading-relaxed"
const tableContainerStyles = "overflow-x-auto -mx-4 sm:mx-0"
const tableStyles = "w-full"
const tableHeaderStyles = "px-2 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-neutral-800 dark:text-gray-300 sticky top-0 bg-white dark:bg-gray-900 z-10"
const tableCellStyles = "px-2 py-2 sm:py-2 text-xs text-neutral-900 dark:text-gray-300"
const tableBodyContainerStyles = "max-h-[567px] overflow-y-auto"

// Add new styles for mobile assets
const assetCardStyles = "dark:bg-theme-black-200/50 bg-white rounded-xl p-4 border border-solid border-y-[#15DFFD] border-x-[#720881]"
const assetHeaderStyles = "flex items-start gap-2 mb-3"
const assetTokenStyles = "flex items-center gap-2 flex-1 min-w-0"
const assetValueStyles = "text-right"
const assetLabelStyles = "text-xs dark:text-gray-400 text-black mb-1"
const assetAmountStyles = "text-sm sm:text-base font-medium dark:text-theme-neutral-100 text-black"
const assetPriceStyles = "text-xs sm:text-sm dark:text-theme-primary-300 text-black"

// Custom debounce hook
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
}

// Add these new styles near the top with other style constants
const modalContainerStyles = "fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 sm:p-0"
const modalContentStyles = "p-[1px] rounded-xl bg-gradient-to-t from-theme-purple-100 to-theme-gradient-linear-end w-full max-w-[400px] lg:max-w-max sm:w-auto"
const modalInnerStyles = "p-4 xl:p-6 bg-white dark:bg-theme-black-200 rounded-xl shadow-[0px_0px_4px_0px_rgba(232,232,232,0.50)] outline outline-1 outline-offset-[-1px] outline-indigo-500 backdrop-blur-[5px]"
const modalTitleStyles = "text-base xl:text-[18px] font-semibold text-indigo-500 backdrop-blur-sm boxShadow linear-200-bg leading-relaxed text-fill-transparent bg-clip-text"
const modalInputStyles = "w-full px-3 pb-1.5 h-9 pt-1 bg-white dark:bg-theme-black-200 rounded-xl text-sm sm:text-base placeholder:text-xs dark:text-theme-neutral-100 focus:outline-none focus:border-purple-500"
const modalButtonStyles = "w-full sm:w-auto h-[30px] px-4 py-1.5 bg-gradient-to-l from-blue-950 to-purple-600 rounded-[30px] outline outline-1 outline-offset-[-1px] outline-indigo-500 backdrop-blur-sm flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
const modalCancelButtonStyles = "w-full sm:w-auto h-[30px] px-4 py-1 rounded-[30px] outline outline-1 outline-offset-[-1px] outline-indigo-500 backdrop-blur-sm flex justify-center items-center gap-3"
const modalButtonTextStyles = "text-xs sm:text-sm font-medium leading-none dark:text-white"
const modalLabelStyles = "text-xs sm:text-sm font-normal leading-tight text-black dark:text-theme-neutral-100 mb-1"
const modalErrorStyles = "text-[10px] sm:text-xs text-red-500 mt-1"
const modalHelperTextStyles = "text-[8px] sm:text-[10px] font-normal leading-3 text-yellow-500 mt-1"

// Add skeleton components
const WalletCardSkeleton = () => (
    <div className={walletCardStyles}>
        <div className="inline-flex justify-start items-center gap-2 w-full">
            <div className="w-6 h-6 sm:w-8 sm:h-8 relative overflow-hidden flex-shrink-0">
                <div className="w-full h-full bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
            </div>
            <div className="justify-start truncate">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20 mb-1" />
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16" />
            </div>
        </div>
        <div className="flex flex-col justify-start items-center gap-2 w-full">
            <div className="w-full h-8 sm:h-10 pl-3 sm:pl-4 pr-4 sm:pr-6 relative rounded-xl outline outline-1 outline-offset-[-1px] outline-purple-300 flex justify-between items-center">
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-24" />
                <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                </div>
            </div>
        </div>
    </div>
);

const UniversalAccountSkeleton = () => (
    <div className={`${walletCardStyles} dark:bg-gradient-purple-transparent border-theme-primary-300 bg-white z-10`}>
        <div className="inline-flex justify-start items-center gap-2.5 w-full">
            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-32" />
            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
        </div>
        <div className="flex justify-between lg:justify-start lg:items-end gap-4 w-full">
            <div className="flex flex-col justify-start items-start gap-3 min-w-0">
                <div className="w-full flex flex-col justify-center items-start gap-1.5">
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20" />
                    <div className="inline-flex justify-start items-center gap-1.5 flex-wrap">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16" />
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12" />
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-8" />
                    </div>
                </div>
            </div>
            <div className="flex justify-end flex-1 items-center gap-3 w-full sm:w-auto">
                <div className="flex flex-col justify-start items-center gap-1">
                    <div className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12" />
                </div>
                <div className="flex flex-col justify-start items-center gap-1">
                    <div className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-10" />
                </div>
            </div>
        </div>
    </div>
);

const AssetsTableSkeleton = () => (
    <div className="hidden sm:block overflow-hidden rounded-xl border-1 z-10 border-solid border-y-[#15DFFD] border-x-[#720881]">
        <div className={tableContainerStyles}>
            <table className={tableStyles}>
                <thead className="dark:bg-gray-900">
                    <tr>
                        <th className={tableHeaderStyles}>Token ▼</th>
                        <th className={tableHeaderStyles}>Balance</th>
                        <th className={tableHeaderStyles}>Price</th>
                        <th className={tableHeaderStyles}>Value</th>
                        <th className={tableHeaderStyles}>Address</th>
                    </tr>
                </thead>
                <tbody>
                    {Array(5).fill(0).map((_, index) => (
                        <tr key={index} className="border-t border-gray-700">
                            <td className={tableCellStyles}>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
                                    <div>
                                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20 mb-1" />
                                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12" />
                                    </div>
                                </div>
                            </td>
                            <td className={tableCellStyles}>
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16" />
                            </td>
                            <td className={tableCellStyles}>
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20" />
                            </td>
                            <td className={tableCellStyles}>
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16" />
                            </td>
                            <td className={tableCellStyles}>
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-24" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const AssetsMobileSkeleton = () => (
    <div className="sm:hidden space-y-3">
        {Array(3).fill(0).map((_, index) => (
            <div key={index} className={assetCardStyles}>
                <div className={`w-fit ${assetHeaderStyles} flex-col`}>
                    <div className={assetTokenStyles}>
                        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
                        <div className="min-w-0 flex gap-2">
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20" />
                            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-24 flex-1" />
                        <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                    </div>
                </div>
                <div className="flex justify-between gap-3 mt-1 lg:mt-3 lg:pt-3 pt-1 border-t border-gray-700">
                    <div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12 mb-1" />
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16" />
                    </div>
                    <div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-10 mb-1" />
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-14" />
                    </div>
                    <div className={assetValueStyles}>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-10 mb-1" />
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// Add custom select component
const CustomSelect = ({ value, onChange, options, placeholder, t, className }: {
    value: string;
    onChange: (value: string) => void;
    options: { id: number; name: string; code: string; translationKey: string; flag: string }[];
    placeholder?: string;
    t: (key: string) => string;
    className?: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const selectedOption = options.find(option => option.code === value);

    return (
        <div ref={selectRef} className="relative">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 h-9 bg-white dark:bg-theme-black-200 border-none rounded-xl text-black dark:text-theme-neutral-100 focus:outline-none focus:border-purple-500 cursor-pointer flex items-center justify-between transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${isOpen ? 'ring-2 ring-purple-500 ring-opacity-50 shadow-lg' : ''
                    } ${className}
                    }`}
            >
                <div className="flex items-center gap-2">
                    {selectedOption && (
                        <img
                            src={selectedOption.flag}
                            alt={t(selectedOption.translationKey)}
                            className="w-4 h-3 rounded object-cover"
                        />
                    )}
                    <span className={selectedOption ? 'text-black dark:text-theme-neutral-100 text-xs' : 'text-gray-500 dark:text-gray-400 text-xs'}>
                        {selectedOption ? t(selectedOption.translationKey) : placeholder}
                    </span>
                </div>
                <ChevronDown
                    className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-theme-black-200 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-auto backdrop-blur-sm">
                    {options.map((option, index) => (
                        <div
                            key={option.id}
                            onClick={() => {
                                onChange(option.code);
                                setIsOpen(false);
                            }}
                            className={`px-3 py-2.5 cursor-pointer transition-all duration-150 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2 ${value === option.code
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
                                : 'text-black dark:text-theme-neutral-100'
                                } ${index === 0 ? 'rounded-t-xl' : ''
                                } ${index === options.length - 1 ? 'rounded-b-xl' : ''
                                }`}
                        >
                            <img
                                src={option.flag}
                                alt={t(option.translationKey)}
                                className="w-4 h-3 rounded object-cover"
                            />
                            <span>{t(option.translationKey)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function WalletPage() {
    const { t } = useLang();

    const [showPrivateKeys, setShowPrivateKeys] = useState(false);
    const [showAddWallet, setShowAddWallet] = useState(false);
    const [showAddWallets, setShowAddWallets] = useState(false);
    const [showImportWallets, setShowImportWallets] = useState(false);
    const [showImportWallet, setShowImportWallet] = useState(false);
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");
    const [walletName, setWalletName] = useState("");
    const [quantityWallet, setQuantityWallet] = useState<number | null>(null);
    const [walletNickname, setWalletNickname] = useState("");
    const [selectedNetwork, setSelectedNetwork] = useState("EN");
    const [selectedMasterTrader, setSelectedMasterTrader] = useState<string>("");
    const router = useRouter();
    const [privateKey, setPrivateKey] = useState("");
    const [privateKeyArray, setPrivateKeyArray] = useState<string[]>([]);
    const [privateKeyDefault, setPrivateKeyDefault] = useState<PrivateKeys>({
        sol_private_key: "",
        eth_private_key: "",
        bnb_private_key: ""
    });
    console.log("privateKeyArray", privateKeyArray)

    const [isLoading, setIsLoading] = useState(false);
    const [wallets, setWallets] = useState<any[]>([]);
    const [showPassword, setShowPassword] = useState({
        sol: false,
        eth: false,
        bnb: false
    });
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [inputPassword, setInputPassword] = useState("");
    const [inputPasswordError, setInputPasswordError] = useState("");
    const [showInputPassword, setShowInputPassword] = useState(false);
    const [copyStates, setCopyStates] = useState<{ [key: string]: boolean }>({});
    const [isLoadingWalletInfo, setIsLoadingWalletInfo] = useState(false);
    const [privateKeyError, setPrivateKeyError] = useState("");
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showVerifyCode, setShowVerifyCode] = useState(false);
    const [email, setEmail] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [emailError, setEmailError] = useState("");
    const [codeError, setCodeError] = useState("");
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [isVerifyingCode, setIsVerifyingCode] = useState(false);

    const privateKeysRef = useRef<HTMLDivElement>(null);
    const addWalletRef = useRef<HTMLDivElement>(null);
    const importWalletRef = useRef<HTMLDivElement>(null);
    const { isAuthenticated } = useAuth();
    const [showModalResult, setShowModalResult] = useState(false);
    const [resultInfo, setResultInfo] = useState<{ created_count: number; failed_count: number; message?: string } | null>(null);
    const [privateKeys, setPrivateKeys] = useState<PrivateKeys>({
        sol_private_key: "",
        eth_private_key: "",
        bnb_private_key: ""
    });

    const fetchWalletInfo = useCallback(async (key: string) => {
        try {
            setIsLoadingWalletInfo(true);
            setPrivateKeyError("");
            const decodedKey = bs58.decode(key);
            if (decodedKey.length === 64) {
                const walletInfo = await TelegramWalletService.getWalletInfoByPrivateKey(key);
                if (walletInfo) {
                    setWalletName(walletInfo.wallet_name || '');
                    setWalletNickname(walletInfo.wallet_nick_name || '');
                    setSelectedNetwork(walletInfo.wallet_country || 'EN');
                }
            } else {
                setPrivateKeyError(t("wallet.invalidPrivateKeyLength"));
            }
        } catch (error) {
            console.log('Invalid private key format');
            setPrivateKeyError(t("wallet.invalidPrivateKeyFormat"));
        } finally {
            setIsLoadingWalletInfo(false);
        }
    }, [t]);

    // Validate private key array
    const validatePrivateKeyArray = useCallback((keys: string[]) => {
        if (keys.length === 0) {
            setPrivateKeyError(t("wallet.privateKeyRequired"));
            return false;
        }

        for (let i = 0; i < keys.length; i++) {
            try {
                const decodedKey = bs58.decode(keys[i]);
                if (decodedKey.length !== 64) {
                    setPrivateKeyError(t("wallet.invalidPrivateKeyLength"));
                    return false;
                }
            } catch (error) {
                setPrivateKeyError(t("wallet.invalidPrivateKeyFormat"));
                return false;
            }
        }

        setPrivateKeyError("");
        return true;
    }, [t]);

    const debouncedFetchWalletInfo = useDebounce(fetchWalletInfo, 500);

    useEffect(() => {
        fetchWallets();
    }, []);

    const { data: myWallets = [], refetch: refetchInforWallets, isLoading: isLoadingMyWallets } = useQuery({
        queryKey: ["my-wallets"],
        queryFn: getMyWallets,
        enabled: isAuthenticated,
    });

    const { data: tokenList = { tokens: [] }, refetch: refetchTokenList, isLoading: isLoadingTokenList } = useQuery({
        queryKey: ["token-buy-list"],
        queryFn: getListBuyToken,
        enabled: isAuthenticated,
    });

    const { data: masterTraders = [], refetch: refetchMasterTraders, isLoading: isLoadingMasters } = useQuery<MasterTrader[]>({
        queryKey: ["master-trading/masters"],
        queryFn: getMasters,
    });
    // Filter tokens with price >= 0.000001
    const filteredTokens = React.useMemo(() => {
        if (!tokenList || !tokenList.tokens || !Array.isArray(tokenList.tokens)) {
            return [];
        }
        return tokenList.tokens.filter((token: Token) => token && typeof token.token_balance_usd === 'number');
    }, [tokenList]);

    const { data: walletInfor = null, refetch, isLoading: isLoadingWalletInfor } = useQuery({
        queryKey: ["wallet-infor"],
        queryFn: getInforWallet,
    });
    const { data: listWallets = [], error, isLoading: isLoadingListWallets } = useQuery({
        queryKey: ['my-wallets'],
        queryFn: getMyWallets,
    });
    const fetchWallets = useCallback(async () => {
        try {
            const walletList = await TelegramWalletService.getMyWallets();
            setWallets(walletList);
        } catch (error) {
            console.error("Error fetching wallets:", error);
            toast.error(t('wallet.failedToFetchWallets'));
        }
    }, [t]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showPrivateKeys && privateKeysRef.current && !privateKeysRef.current.contains(event.target as Node)) {
                handleClosePrivateKeys();
            }
            if (showAddWallet && addWalletRef.current && !addWalletRef.current.contains(event.target as Node)) {
                handleCloseAddWallet();
            }
            if (showImportWallet && importWalletRef.current && !importWalletRef.current.contains(event.target as Node)) {
                handleCloseImportWallet();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPrivateKeys, showAddWallet, showImportWallet]);

    useEffect(() => {
        if (privateKeys) {
            setPrivateKeyDefault({
                sol_private_key: privateKeys.sol_private_key || "",
                eth_private_key: privateKeys.eth_private_key || "",
                bnb_private_key: privateKeys.bnb_private_key || ""
            });
        }
    }, [privateKeys]);

    const handleGetPrivateKeys = () => {
        setShowPasswordInput(true);
    };

    const handleClosePrivateKeys = () => {
        setShowPrivateKeys(false);
    };

    const handleCloseAddWallet = () => {
        setShowAddWallet(false);
        setWalletName("");
        setWalletNickname("");
        setSelectedMasterTrader("");
        setQuantityWallet(null);
    };

    const handleCloseAddWallets = () => {
        setShowAddWallets(false);
        setWalletName("");
        setWalletNickname("");
        setSelectedMasterTrader("");
        setQuantityWallet(null);
    };


    const handleCloseImportWallet = () => {
        setShowImportWallet(false);
        setWalletName("");
        setWalletNickname("");
        setPrivateKey("");
        setPrivateKeyError("");
    };
    const handleCloseImportWallets = () => {
        setShowImportWallets(false);
        setWalletName("");
        setWalletNickname("");
        setPrivateKey("");
        setSelectedNetwork("EN");
        setPrivateKeyArray([]);
        setPrivateKeyError("");
    };

    const handleCloseCreatePassword = () => {
        setShowCreatePassword(false);
        setNewPassword("");
        setConfirmPassword("");
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setPasswordError("");
        setConfirmPasswordError("");
    };

    const validatePassword = (password: string) => {
        if (password.length < 8) {
            return t("wallet.passwordMustBeAtLeast8CharactersLong");
        }
        return "";
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewPassword(value);
        const error = validatePassword(value);
        setPasswordError(error);

        // Clear confirm password error if passwords match
        if (value === confirmPassword) {
            setConfirmPasswordError("");
        } else if (confirmPassword) {
            setConfirmPasswordError(t("wallet.passwordsDoNotMatch"));
        }
    };

    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setConfirmPassword(value);
        if (value !== newPassword) {
            setConfirmPasswordError(t("wallet.passwordsDoNotMatch"));
        } else {
            setConfirmPasswordError("");
        }
    };

    const handleCreatePassword = async () => {
        // Validate both passwords
        const passwordValidationError = validatePassword(newPassword);
        if (passwordValidationError) {
            console.log("Password validation failed");
            setPasswordError(t("wallet.passwordValidationError"));
            return;
        }

        if (newPassword !== confirmPassword) {
            setConfirmPasswordError(t("wallet.passwordsDoNotMatch"));
            return;
        }
        console.log("Creating password with:", newPassword);

        try {
            setIsLoading(true);
            // TODO: Call API to set password
            await TelegramWalletService.setPassword(newPassword);
            const res = await TelegramWalletService.getPrivate();
            setPrivateKeys(res);
            toast.success(t('wallet.passwordCreatedSuccessfully'));

            handleCloseCreatePassword();
            setShowPrivateKeys(true);
        } catch (error) {
            console.error("Error in handleCreatePassword:", error);
            toast.error(t('wallet.failedToCreatePassword'));
        } finally {
            setIsLoading(false);
        }
    };

    const executeAddWallet = async () => {
        try {
            setIsLoading(true);
            const walletData = {
                name: walletName,
                nick_name: walletNickname,
                country: selectedNetwork,
                quantity: quantityWallet ?? 1,
                master: selectedMasterTrader ?? null,
                type: "other",
            };

            const response = await TelegramWalletService.addWallet(walletData);
            console.log("response", response);
            // Reset form and close modal
            setWalletName("");
            setWalletNickname("");
            setSelectedNetwork("EN");
            setSelectedMasterTrader("");
            setQuantityWallet(null);
            refetchInforWallets();

            if (response?.created_count) {
                setResultInfo({
                    created_count: Number(response?.created_count ?? 0),
                    failed_count: Number(response?.failed_count ?? 0),
                    message: response?.message,
                });
                setShowModalResult(true)
                setShowAddWallets(false);
            } else {
                toast.success(t('wallet.walletAddedSuccess'));
                setShowAddWallet(false);
            }
            // Show result modal based on API response

            // Refresh wallet list
            await fetchWallets();
        } catch (error: any) {
            console.error("Error adding wallet:", error);
            // Show error message from API if available
            if (error?.response?.data?.message.includes("Nickname is required for new wallet")) {
                toast.error(t('wallet.walletNicknameRequired'));
            }
            if (error?.response?.data?.message.includes("Nickname must be at least 3 characters long")) {
                toast.error(t('wallet.walletNicknameMustBeAtLeast3CharactersLong'));
            }
            if (error?.response?.data?.message.includes("Wallet name already exists for this user")) {
                toast.error(t('wallet.walletNameAlreadyExists'));
            }
            if (error?.response?.data?.message.includes("Private key is required for import")) {
                toast.error(t('wallet.privateKeyRequired'));
            }
            if (error?.response?.data?.message.includes("Invalid Solana private key")) {
                toast.error(t('wallet.invalidPrivateKey'));
            }
            if (error?.response?.data?.message.includes("Nickname is required for new imported wallet")) {
                toast.error(t('wallet.walletNicknameRequired'));
            }
            if (error?.response?.data?.message.includes("Invalid wallet type")) {
                toast.error(t('wallet.invalidWalletType'));
            }
            if (error?.response?.data?.message.includes("This wallet is already linked to your account")) {
                toast.error(t('wallet.walletAlreadyExists'));
            }
            if (error?.response?.data?.message.includes("User not found")) {
                toast.error(t('wallet.userNotFound'));
            }
            if (error?.response?.data?.message.includes("Wallet nickname already exists")) {
                toast.error(t('wallet.walletNicknameDuplicate'));
            }
            if (error?.response?.data?.message.includes("Failed to create wallet after")) {
                toast.error(t('wallet.failedToCreateWallet'));
            }
            if (error?.response?.data?.message.includes("Error creating wallet")) {
                toast.error(t('wallet.failedToCreateWallet'));
            }
            if (error?.response?.data?.message.includes("Error adding wallet")) {
                toast.error(t('wallet.failedToAddWallet'));
            }
            if (error?.response?.data?.message.includes("Failed to create or get wallet_auth record")) {
                toast.error(t('wallet.failedToCreateOrGetWalletAuthRecord'));
            }
            if (error?.response?.data?.message.includes("Wallet nickname is required for new wallet")) {
                toast.error(t('wallet.walletNicknameRequired'));
            }
            await fetchWallets();
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportWallet = async () => {
        try {
            setIsLoading(true);
            const walletData = {
                name: walletName,
                nick_name: walletNickname,
                country: selectedNetwork,
                private_key: privateKey,
                type: "import",
            };

            const response = await TelegramWalletService.addWallet(walletData);

            // Reset form and close modal
            setWalletName("");
            setWalletNickname("");
            setSelectedNetwork("EN");
            setShowImportWallet(false);

            // Show result modal based on API response
            toast.success(t('wallet.walletAddedSuccess'));

            // Refresh wallet list
            await fetchWallets();
        } catch (error: any) {
            // Log error but continue with other keys
            console.error(`Failed to import wallet with key: ${privateKey}`, error);

            // Show specific error messages
            if (error?.response?.data?.message.includes("Nickname is required for new wallet")) {
                toast.error(t('wallet.walletNicknameRequired'));
            } else if (error?.response?.data?.message.includes("Nickname must be at least 3 characters long")) {
                toast.error(t('wallet.walletNicknameMustBeAtLeast3CharactersLong'));
            } else if (error?.response?.data?.message.includes("Wallet name already exists for this user")) {
                toast.error(t('wallet.walletNameAlreadyExists'));
            } else if (error?.response?.data?.message.includes("Private key is required for import")) {
                toast.error(t('wallet.privateKeyRequired'));
            } else if (error?.response?.data?.message.includes("Invalid Solana private key")) {
                toast.error(t('wallet.invalidPrivateKey'));
            } else if (error?.response?.data?.message.includes("Nickname is required for new imported wallet")) {
                toast.error(t('wallet.walletNicknameRequired'));
            } else if (error?.response?.data?.message.includes("Invalid wallet type")) {
                toast.error(t('wallet.invalidWalletType'));
            } else if (error?.response?.data?.message.includes("This wallet is already linked to your account")) {
                toast.error(t('wallet.walletAlreadyExists'));
            } else if (error?.response?.data?.message.includes("User not found")) {
                toast.error(t('wallet.userNotFound'));
            } else if (error?.response?.data?.message.includes("Wallet nickname already exists")) {
                toast.error(t('wallet.walletNicknameDuplicate'));
            } else if (error?.response?.data?.message.includes("Failed to create wallet after")) {
                toast.error(t('wallet.failedToCreateWallet'));
            } else if (error?.response?.data?.message.includes("Error creating wallet")) {
                toast.error(t('wallet.failedToCreateWallet'));
            } else if (error?.response?.data?.message.includes("Error adding wallet")) {
                toast.error(t('wallet.failedToAddWallet'));
            } else if (error?.response?.data?.message.includes("Failed to create or get wallet_auth record")) {
                toast.error(t('wallet.failedToCreateOrGetWalletAuthRecord'));
            } else if (error?.response?.data?.message.includes("Wallet nickname is required for new wallet")) {
                toast.error(t('wallet.walletNicknameRequired'));
            }
        } finally {
            setIsLoading(false);
        }
    };
    console.log("privateKeyArray", privateKeyArray.length)

    const executeImportWallets = async () => {
        try {
            setIsLoading(true);
            // Process each private key
            try {
                const walletData = {
                    name: walletName,
                    nick_name: walletNickname,
                    country: selectedNetwork,
                    private_key: privateKeyArray,
                    quantity: privateKeyArray.length,
                    type: "import",
                };

                const res = await TelegramWalletService.addWallet(walletData);
                if (res.created_count) {
                    setResultInfo({
                        created_count: Number(res?.created_count ?? 0),
                        failed_count: Number(res?.failed_count ?? 0),
                        message: res?.message,
                    });
                    setShowModalResult(true);
                }

            } catch (error: any) {
                console.error(`Failed to import wallet with key: ${privateKey}`, error);
            }

            // Reset form and close modal
            setWalletName("");
            setWalletNickname("");
            setSelectedNetwork("EN");
            setPrivateKeyArray([]);
            setPrivateKeyError("");
            setShowImportWallets(false);

            // Refresh wallet list
            await fetchWallets();
        } catch (error: any) {
            if (error?.response?.data?.message.includes("Nickname is required for new wallet")) {
                toast.error(t('wallet.walletNicknameRequired'));
            }
            if (error?.response?.data?.message.includes("Nickname must be at least 3 characters long")) {
                toast.error(t('wallet.walletNicknameMustBeAtLeast3CharactersLong'));
            }
            if (error?.response?.data?.message.includes("Wallet name already exists for this user")) {
                toast.error(t('wallet.walletNameAlreadyExists'));
            }
            if (error?.response?.data?.message.includes("Private key is required for import")) {
                toast.error(t('wallet.privateKeyRequired'));
            }
            if (error?.response?.data?.message.includes("Invalid Solana private key")) {
                toast.error(t('wallet.invalidPrivateKey'));
            }
            if (error?.response?.data?.message.includes("Nickname is required for new imported wallet")) {
                toast.error(t('wallet.walletNicknameRequired'));
            }
            if (error?.response?.data?.message.includes("Invalid wallet type")) {
                toast.error(t('wallet.invalidWalletType'));
            }
            if (error?.response?.data?.message.includes("This wallet is already linked to your account")) {
                toast.error(t('wallet.walletAlreadyExists'));
            }
            if (error?.response?.data?.message.includes("User not found")) {
                toast.error(t('wallet.userNotFound'));
            }
            if (error?.response?.data?.message.includes("Wallet nickname already exists")) {
                toast.error(t('wallet.walletNicknameDuplicate'));
            }
            if (error?.response?.data?.message.includes("Failed to create wallet after")) {
                toast.error(t('wallet.failedToCreateWallet'));
            }
            if (error?.response?.data?.message.includes("Error creating wallet")) {
                toast.error(t('wallet.failedToCreateWallet'));
            }
            if (error?.response?.data?.message.includes("Error adding wallet")) {
                toast.error(t('wallet.failedToAddWallet'));
            }
            if (error?.response?.data?.message.includes("Failed to create or get wallet_auth record")) {
                toast.error(t('wallet.failedToCreateOrGetWalletAuthRecord'));
            }
            if (error?.response?.data?.message.includes("Wallet nickname is required for new wallet")) {
                toast.error(t('wallet.walletNicknameRequired'));
            }
        } finally {
            setIsLoading(false);
        }
    }

    const handleCopyAddress = (address: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // Prevent spam clicking - if already copying this address, ignore
        if (copyStates[address]) {
            return;
        }

        // Set copying state immediately to prevent spam
        setCopyStates(prev => ({ ...prev, [address]: true }));

        // Copy to clipboard
        toast.success(t('connectMasterModal.copyAddress.copied'));

        // Reset copy state after 2 seconds
        setTimeout(() => {
            setCopyStates(prev => ({ ...prev, [address]: false }));
        }, 2000);
    };

    const handleClosePasswordInput = () => {
        setShowPasswordInput(false);
        setInputPassword("");
        setInputPasswordError("");
        setShowInputPassword(false);
    };

    const handleSubmitPassword = async () => {
        try {
            setIsLoading(true);
            const res = await TelegramWalletService.getPrivate();
            setPrivateKeys(res);
            setPrivateKeyDefault({
                sol_private_key: res.sol_private_key || "",
                eth_private_key: res.eth_private_key || "",
                bnb_private_key: res.bnb_private_key || ""
            });
            handleClosePasswordInput();
            setShowPrivateKeys(true);
            toast.success(t('wallet.privateKeysRetrieved'));
        } catch (error) {
            console.error("Error getting private keys:", error);
            setInputPasswordError(t("wallet.invalidPassword"));
        } finally {
            setIsLoading(false);
        }
    };
    const { data: privateKeyPublics } = useQuery({
        queryKey: ['privateKeyPublics'],
        queryFn: () => TelegramWalletService.getPrivate()
    })
    console.log("privateKeyPublics", privateKeyPublics)

    const handleForgotPassword = async () => {
        // Close other modals
        setShowPasswordInput(false);
        setShowCreatePassword(false);
        setShowPrivateKeys(false);
        setShowAddWallet(false);
        setShowImportWallet(false);

        // Show verification code modal
        setShowForgotPassword(true);
        handleSendVerificationCode();
    };

    const handleSendVerificationCode = async () => {
        try {
            const res = await TelegramWalletService.sendVerificationCode()
            console.log(res)
            toast.success(t('wallet.verificationCodeSent'));
        } catch (error) {
            console.error("Error verifying code:", error);
            setCodeError(t("wallet.invalidCode"));
        } finally {
            setIsVerifyingCode(false);
        }
    };

    const handleCloseForgotPassword = () => {
        setShowForgotPassword(false);
        setEmail("");
        setEmailError("");
    };

    const handleCloseVerifyCode = () => {
        setShowVerifyCode(false);
        setVerificationCode("");
        setCodeError("");
    };

    const handleChangePassword = async () => {
        try {
            setIsLoading(true);
            const res = await TelegramWalletService.changePassword(verificationCode.toUpperCase(), newPassword);
            if (res.status === 400) {
                toast.error(t('wallet.expiredCode'));
            }
            // Close modal and reset states
            setShowForgotPassword(false);
            setVerificationCode("");
            setNewPassword("");
            setConfirmPassword("");
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setPasswordError("");
            setConfirmPasswordError("");
            setCodeError("");

            // Show success message
            toast.success(t('wallet.passwordChangedSuccessfully'));
        } catch (error) {
            console.error("Error changing password:", error);
            setCodeError(t("wallet.invalidCode"));
        } finally {
            setIsLoading(false);
        }
    }

    const handleResendCode = async () => {
        try {
            setIsSendingCode(true);
            const res = await TelegramWalletService.sendVerificationCode();
            toast.success(t('wallet.codeResentSuccessfully'));
        } catch (error) {
            console.error("Error resending code:", error);
            toast.error(t('wallet.failedToResendCode'));
        } finally {
            setIsSendingCode(false);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-4 sm:gap-12">
                <div className={containerStyles}>
                    {/* Wallet Cards Section */}
                    <div className="flex flex-col gap-5">
                        <div className={walletGridStyles}>
                            {isLoadingWalletInfor || isLoadingListWallets ? (
                                <>
                                    <WalletCardSkeleton />
                                    <WalletCardSkeleton />
                                    <WalletCardSkeleton />
                                    <UniversalAccountSkeleton />
                                </>
                            ) : (
                                <>
                                    <div className={walletCardStyles}>
                                        <div className="inline-flex justify-start items-center gap-2 w-full ">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 relative overflow-hidden flex-shrink-0">
                                                <img src="/solana.png" alt="Solana" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="justify-start truncate">
                                                <span className={walletTitleStyles}>{t('wallet.solana')}</span>
                                                <span className={walletTitleStyles}> {t('wallet.wallet')}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-start items-center gap-2 w-full">
                                            <div className="w-full h-8 lg:h-[36px] pl-3 sm:pl-4 pr-4 sm:pr-6 relative rounded-xl outline outline-1 outline-offset-[-1px] outline-purple-300 flex justify-between items-center">
                                                <div className={walletAddressStyles}>
                                                    {truncateString(walletInfor?.solana_address, 12)}
                                                </div>
                                                <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0">
                                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-Colors-Neutral-100" />
                                                </div>
                                                <button
                                                    onClick={(e) => handleCopyAddress(walletInfor?.solana_address || '', e)}
                                                    className="text-gray-400 hover:text-gray-200 transition-colors"
                                                >
                                                    {copyStates[walletInfor?.solana_address || ''] ? (
                                                        <Check className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>

                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between gap-2 w-full col-span-2">
                                        {walletInfor && <div className="flex justify-center items-center mx-auto mt-1">
                                            <button
                                                onClick={() => setShowPrivateKeys(true)}
                                                className="lg:max-w-auto group relative bg-gradient-to-t from-theme-primary-500 to-theme-secondary-400 py-1.5 md:py-2 px-3 md:px-4 lg:px-5 rounded-full text-[11px] md:text-xs transition-all duration-500 hover:from-theme-blue-100 hover:to-theme-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 w-auto flex items-center justify-center gap-1"
                                            >
                                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 relative overflow-hidden">
                                                    <KeyIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-theme-neutral-100" />
                                                </div>
                                                <div className="text-xs sm:text-sm font-medium leading-tight text-theme-neutral-100">
                                                    {t('wallet.getPrivateKey')}
                                                </div>
                                            </button>
                                        </div>}
                                        <div className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto justify-start items-center gap-3 sm:gap-6 z-10 ">
                                            <button
                                                onClick={() => setShowAddWallets(true)}
                                                className="lg:max-w-auto group relative bg-gradient-to-t from-[#377bf8] to-theme-secondary-400 py-1.5 px-3 md:pl-3 pr-4 rounded-full text-[10px] md:text-xs transition-all duration-500 hover:from-theme-blue-100 hover:to-theme-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 w-full md:w-auto flex items-center justify-center gap-1"
                                            >
                                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 relative overflow-hidden text-theme-neutral-100">
                                                    <PlusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                </div>
                                                <div className="text-xs sm:text-sm font-medium leading-tight text-theme-neutral-100">
                                                    {t('wallet.addWallets')}
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setShowImportWallets(true)}
                                                className="lg:max-w-auto group relative bg-transparent border py-1.5 px-4 md:pl-3 pr-4 rounded-full text-[10px] md:text-xs transition-all duration-500 hover:from-theme-blue-100 hover:bg-gradient-to-t hover:border-transparent hover:to-theme-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 w-full md:w-auto flex items-center justify-center gap-1 lg:bg-white dark:lg:bg-transparent  lg:border-transparent dark:lg:border-theme-neutral-100"
                                            >
                                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 relative overflow-hidden text-theme-neutral-100">
                                                    <ArrowDownToLine className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                </div>
                                                <div className="text-xs sm:text-sm font-medium leading-tight text-theme-neutral-100">
                                                    {t('wallet.importWallets')}
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setShowAddWallet(true)}
                                                className="lg:max-w-auto  group relative bg-gradient-to-t from-theme-primary-500 to-theme-secondary-400 py-1.5 px-3 md:pl-3 pr-4 rounded-full text-[10px] md:text-xs transition-all duration-500 hover:from-theme-blue-100 hover:to-theme-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 w-full md:w-auto flex items-center justify-center gap-1"
                                            >
                                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 relative overflow-hidden text-theme-neutral-100">
                                                    <PlusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                </div>
                                                <div className="text-xs sm:text-sm font-medium leading-tight text-theme-neutral-100">
                                                    {t('wallet.addWallet')}
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setShowImportWallet(true)}
                                                className="lg:max-w-auto group relative bg-transparent border py-1.5  px-3 md:pl-3 pr-4 rounded-full text-[10px] md:text-xs transition-all duration-500 hover:from-theme-blue-100 hover:bg-gradient-to-t hover:border-transparent hover:to-theme-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 w-full md:w-auto flex items-center justify-center gap-1 lg:bg-white dark:lg:bg-transparent  lg:border-transparent dark:lg:border-theme-neutral-100"
                                            >
                                                <ArrowDownToLine className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                <div className="text-xs sm:text-sm font-medium leading-tight text-indigo-500 dark:text-white">
                                                    {t('wallet.importWallet')}
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                    <div className={`${walletCardStyles} dark:bg-gradient-purple-transparent border-theme-primary-300 bg-white z-10`}>
                                        <div className="inline-flex justify-start items-center gap-2.5 w-full">
                                            <img src="/ethereum.png" alt="Ethereum" className="w-5 h-5 object-cover" />
                                            <div className="justify-start text-Colors-Neutral-100 text-base font-semibold uppercase leading-normal truncate">
                                                {t('wallet.universalAccount')}
                                            </div>
                                            <img src="/ethereum.png" alt="Ethereum" className="w-5 h-5 object-cover" />
                                        </div>
                                        <div className="flex justify-between lg:justify-start lg:items-end gap-4 w-full">
                                            <div className="flex flex-col justify-start items-start gap-3 min-w-0">
                                                <div className="w-full flex flex-col justify-center items-start">
                                                    <div className="text-right justify-start text-Colors-Neutral-100 text-xl font-bold leading-9 truncate">
                                                        {walletInfor?.solana_balance} SOL
                                                    </div>
                                                    <div className="inline-flex justify-start items-center gap-1.5 flex-wrap">
                                                        <div className="text-right justify-start text-theme-primary-300 text-[16px] font-medium leading-relaxed">
                                                            ${formatNumberWithSuffix3(walletInfor?.solana_balance_usd)}
                                                        </div>
                                                        <div className="text-right justify-start text-theme-primary-300 text-[16px] font-medium leading-relaxed">
                                                            (0.00%)
                                                        </div>
                                                        <div className="text-right justify-start text-Colors-Neutral-100 text-[16px] font-medium leading-relaxed">
                                                            24H
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end flex-1 items-center gap-3 w-full sm:w-auto">
                                                <div className="flex flex-col justify-start items-center gap-1">


                                                    <button onClick={() => router.replace('/universal-account?type=deposit')} className="flex flex-col justify-start items-center gap-0.5 md:gap-1">
                                                        <div className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 gradient-overlay border border-neutral-200 rounded-full flex justify-center items-center group  transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95">
                                                            <ArrowDownToLine className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4" />
                                                        </div>
                                                        <div className="text-center text-Colors-Neutral-100 text-[9px] md:text-[10px] font-semibold">
                                                            {t('wallet.receive')}
                                                        </div>
                                                    </button>

                                                </div>
                                                <div className="flex flex-col justify-start items-center gap-1">
                                                    <button onClick={() => router.replace('/universal-account?type=withdraw')} className="flex flex-col justify-start items-center gap-0.5 md:gap-1">
                                                        <div className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 gradient-overlay border border-neutral-200 rounded-full flex justify-center items-center transition-all hover:scale-105">
                                                            <ArrowUpFromLine className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4" />
                                                        </div>
                                                        <div className="text-center text-Colors-Neutral-100 text-[9px] md:text-[10px] font-semibold">
                                                            {t('wallet.send')}
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>


                    <div className="flex xl:flex-row flex-col gap-5">
                        <div className="w-full flex flex-1 flex-col">
                            {/* Wallet Management Section */}
                            <div className="self-stretch flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 w-full z-10">
                                <div className="flex justify-center items-center gap-2 sm:gap-2.5 w-full">
                                    <img src="/ethereum.png" alt="Ethereum" className="w-3 h-3 sm:w-4 sm:h-4 object-cover" />
                                    <div className={sectionTitleStyles}>{t('wallet.solanaWallet')}</div>
                                    <img src="/ethereum.png" alt="Ethereum" className="w-3 h-3 sm:w-4 sm:h-4 object-cover" />
                                </div>
                            </div>

                            {/* Wallet Table */}
                            <div className="">
                                {isLoadingMyWallets ? (
                                    <div className="overflow-hidden rounded-xl border-1 z-10 border-solid border-y-[#15DFFD] border-x-[#720881] mt-[50px]">
                                        <div className={tableContainerStyles}>
                                            <table className={tableStyles}>
                                                <thead className="dark:bg-gray-900">
                                                    <tr>
                                                        <th className={tableHeaderStyles}>{t('wallet.walletName')}</th>
                                                        <th className={tableHeaderStyles}>{t('wallet.nickname')}</th>
                                                        <th className={tableHeaderStyles}>{t('wallet.network')}</th>
                                                        <th className={tableHeaderStyles}>{t('wallet.address')}</th>
                                                        <th className={tableHeaderStyles}>{t('wallet.actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Array(3).fill(0).map((_, index) => (
                                                        <tr key={index} className="border-t border-gray-700">
                                                            <td className={tableCellStyles}>
                                                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-24" />
                                                            </td>
                                                            <td className={tableCellStyles}>
                                                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20" />
                                                            </td>
                                                            <td className={tableCellStyles}>
                                                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16" />
                                                            </td>
                                                            <td className={tableCellStyles}>
                                                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-32" />
                                                            </td>
                                                            <td className={tableCellStyles}>
                                                                <div className="flex gap-2">
                                                                    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16" />
                                                                    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16" />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <WalletTable
                                        wallets={myWallets}
                                        onCopyAddress={handleCopyAddress}
                                        onUpdateWallet={refetchInforWallets}
                                        refetchWallets={refetchInforWallets}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="w-full flex flex-col xl:gap-4 gap-2 md:max-w-[37%]">
                            {/* Assets Section */}
                            <div className="flex justify-center items-center gap-2 sm:gap-2.5 mb-8">
                                <img src="/ethereum.png" alt="Ethereum" className="w-3 h-3 sm:w-4 sm:h-4 object-cover" />
                                <div className={sectionTitleStyles}>{t('wallet.assets')}</div>
                                <img src="/ethereum.png" alt="Ethereum" className="w-3 h-3 sm:w-4 sm:h-4 object-cover" />
                            </div>

                            {/* Assets Display - Table for desktop, Cards for mobile */}
                            <div className="">
                                {isLoadingTokenList ? (
                                    <>
                                        <AssetsTableSkeleton />
                                        <AssetsMobileSkeleton />
                                    </>
                                ) : (
                                    <>
                                        {/* Desktop Table View */}
                                        <div className="hidden sm:block overflow-hidden rounded-xl border-1 z-10 border-solid border-y-[#15DFFD] border-x-[#720881]">
                                            {!filteredTokens || filteredTokens.length === 0 ? (
                                                <div className="flex justify-center items-center py-8 text-neutral-600 dark:text-gray-400">
                                                    {t('wallet.noTokens')}
                                                </div>
                                            ) : (
                                                <div className={tableContainerStyles}>
                                                    <div className="relative">
                                                        <table className={tableStyles}>
                                                            <thead className="dark:bg-gray-900">
                                                                <tr>
                                                                    <th className={`${tableHeaderStyles} w-[7%]`}>{t('wallet.token')} ▼</th>
                                                                    <th className={`${tableHeaderStyles} w-[5%]`}>{t('wallet.balance')}</th>
                                                                    <th className={`${tableHeaderStyles} w-[3%]`}>{t('wallet.price')}</th>
                                                                    <th className={`${tableHeaderStyles} w-[3%]`}>{t('wallet.value')}</th>
                                                                </tr>
                                                            </thead>
                                                        </table>
                                                        <div className={tableBodyContainerStyles}>
                                                            <table className={tableStyles}>
                                                                <tbody>
                                                                    {filteredTokens.map((token: Token, index: number) => (
                                                                        <tr key={index} className="border-t border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => router.push(`/trading?address=${token.token_address}`)}>
                                                                            <td className={tableCellStyles}>
                                                                                <div className="flex items-center gap-2">
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
                                                                            <td className={tableCellStyles}>
                                                                                {token.token_balance.toFixed(6)}
                                                                            </td>
                                                                            <td className={tableCellStyles}>
                                                                                ${token.token_price_usd.toFixed(4)}
                                                                            </td>
                                                                            <td className={tableCellStyles}>
                                                                                ${token.token_balance_usd.toFixed(4)}
                                                                            </td>

                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Mobile Card View */}
                                        <div className="sm:hidden space-y-3">
                                            {!filteredTokens || filteredTokens.length === 0 ? (
                                                <div className="flex justify-center items-center py-6 text-neutral-600 dark:text-gray-400 bg-gray-800/60 rounded-xl">
                                                    {t('wallet.noTokens')}
                                                </div>
                                            ) : (
                                                filteredTokens.map((token: Token, index: number) => (
                                                    <div key={index} className={assetCardStyles}>
                                                        {/* Token Info Header */}
                                                        <div className={`w-fit ${assetHeaderStyles} flex-col `}>
                                                            <div className={assetTokenStyles}>
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
                                                            {/* Token Address */}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs dark:text-neutral-200 text-black truncate flex-1">
                                                                    {truncateString(token.token_address, 12)}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => handleCopyAddress(token.token_address, e)}
                                                                    className="text-gray-400 hover:text-gray-200 p-1 transition-colors"
                                                                >
                                                                    {copyStates[token.token_address] ? (
                                                                        <Check className="w-4 h-4 text-green-500" />
                                                                    ) : (
                                                                        <Copy className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Token Details */}
                                                        <div className="flex justify-between gap-3 mt-1 lg:mt-3 lg:pt-3 pt-1 border-t border-gray-700">
                                                            <div>
                                                                <div className={assetLabelStyles}>{t('wallet.balance')}</div>
                                                                <div className={assetAmountStyles}>{token.token_balance.toFixed(token.token_decimals)}</div>
                                                            </div>
                                                            <div>
                                                                <div className={assetLabelStyles}>{t('wallet.price')}</div>
                                                                <div className={assetPriceStyles}>${token.token_price_usd.toFixed(6)}</div>
                                                            </div>
                                                            <div className={assetValueStyles}>
                                                                <div className={assetLabelStyles}>{t('wallet.value')}</div>
                                                                <div className={assetAmountStyles}>${token.token_balance_usd.toFixed(2)}</div>
                                                            </div>
                                                        </div>

                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Move modals outside the main container */}
            {showAddWallet && (
                <div className="fixed inset-0 bg-theme-black-1/3 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="p-[1px] rounded-xl bg-gradient-to-t from-theme-purple-100 to-theme-gradient-linear-end w-full max-w-[400px]">
                        <div ref={addWalletRef} className="bg-white dark:bg-theme-black-200 border border-theme-gradient-linear-start p-4 sm:p-6 rounded-xl">
                            <h2 className="text-lg sm:text-xl font-semibold text-indigo-500 backdrop-blur-sm boxShadow linear-200-bg mb-4 text-fill-transparent bg-clip-text">{t('wallet.addNewWallet')}</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-200 text-black mb-1">{t('wallet.walletName')} <span className="text-red-500">*</span></label>
                                    <div className={wrapGradientStyle}>
                                        <input
                                            type="text"
                                            value={walletName}
                                            onChange={(e) => setWalletName(e.target.value)}
                                            className="w-full px-3 pb-1.5 h-9 pt-1 dark:bg-theme-black-200 placeholder:text-xs rounded-xl text-black dark:text-theme-neutral-100 focus:outline-none focus:border-purple-500"
                                            placeholder={t('wallet.enterWalletName')}
                                        />
                                    </div>

                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-200 text-black mb-1">{t('wallet.nickname')} <span className="text-red-500">*</span></label>
                                    <div className={wrapGradientStyle}>
                                        <input
                                            type="text"
                                            value={walletNickname}
                                            onChange={(e) => setWalletNickname(e.target.value)}
                                            className="w-full px-3 pb-1.5 h-9 pt-1 bg-white dark:bg-theme-black-200 placeholder:text-xs rounded-xl text-black dark:text-theme-neutral-100 focus:outline-none focus:border-purple-500"
                                            placeholder={t('wallet.enterNickname')}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-200 text-black mb-1">{t('wallet.country')} <span className="text-red-500">*</span></label>
                                    <div className={wrapGradientStyle}>
                                        <CustomSelect
                                            value={selectedNetwork}
                                            onChange={(value) => setSelectedNetwork(value)}
                                            options={langConfig.listLangs}
                                            placeholder={t('wallet.country')}
                                            t={t}
                                        />
                                    </div>
                                </div>

                                <div className="text-[10px] italic text-gray-900 dark:text-yellow-500 leading-5">
                                    {t('wallet.walletNameNote')}
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={handleCloseAddWallet}
                                        className="px-4 py-1.5 text-xs 2xl:text-sm font-medium dark:text-gray-200 text-black hover:text-neutral-100"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        onClick={executeAddWallet}
                                        disabled={isLoading || !walletName || !walletNickname}
                                        className="px-4 py-1.5 text-xs 2xl:text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-neutral-100 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? t('wallet.adding') : t('wallet.addWallet')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showAddWallets && (
                <div className="fixed inset-0 bg-theme-black-1/3 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="p-[1px] rounded-xl bg-gradient-to-t from-theme-purple-100 to-theme-gradient-linear-end w-full max-w-[440px]">
                        <div ref={addWalletRef} className="bg-white dark:bg-theme-black-200 border border-theme-gradient-linear-start p-4 sm:p-6 rounded-xl">
                            <h2 className="text-lg sm:text-xl font-semibold text-indigo-500 backdrop-blur-sm boxShadow linear-200-bg mb-4 text-fill-transparent bg-clip-text">{t('wallet.addWallets')}</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-200 text-black mb-1">{t('wallet.quantityWallet')} <span className="text-red-500">*</span></label>
                                    <div className={wrapGradientStyle}>
                                        <input
                                            type="number"
                                            value={quantityWallet || ""}
                                            onChange={(e) => setQuantityWallet(Number(e.target.value))}
                                            className="w-full px-3 pb-1.5 h-9 pt-1 dark:bg-theme-black-200 placeholder:text-xs rounded-xl text-black dark:text-theme-neutral-100 focus:outline-none focus:border-purple-500"
                                            placeholder={t('wallet.enterQuantityWallet')}
                                        />
                                    </div>

                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-200 text-black mb-1">{t('wallet.walletPerixName')} <span className="text-red-500">*</span></label>
                                    <div className={wrapGradientStyle}>
                                        <input
                                            type="text"
                                            value={walletName}
                                            onChange={(e) => setWalletName(e.target.value)}
                                            className="w-full px-3 pb-1.5 h-9 pt-1 dark:bg-theme-black-200 placeholder:text-xs rounded-xl text-black dark:text-theme-neutral-100 focus:outline-none focus:border-purple-500"
                                            placeholder={t('wallet.enterWalletName')}
                                        />
                                    </div>
                                    <span className="text-[10px] text-yellow-500 italic">
                                        {t('wallet.walletPerixNameNote')}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-200 text-black mb-1">{t('wallet.nickname')} <span className="text-red-500">*</span></label>
                                    <div className={wrapGradientStyle}>
                                        <input
                                            type="text"
                                            value={walletNickname}
                                            onChange={(e) => setWalletNickname(e.target.value)}
                                            className="w-full px-3 pb-1.5 h-9 pt-1 bg-white dark:bg-theme-black-200 placeholder:text-xs rounded-xl text-black dark:text-theme-neutral-100 focus:outline-none focus:border-purple-500"
                                            placeholder={t('wallet.enterNickname')}
                                        />
                                    </div>
                                </div>
                                {/* Network Selection */}
                                <div className="flex flex-col gap-1">
                                    <div className={modalLabelStyles}>{t('wallet.country')} <span className="text-red-500">*</span></div>
                                    <div className={wrapGradientStyle}>
                                        <CustomSelect
                                            value={selectedNetwork}
                                            onChange={(value) => setSelectedNetwork(value)}
                                            options={langConfig.listLangs}
                                            placeholder={t('wallet.country')}
                                            t={t}
                                            className="h-9"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-200 text-black mb-1">{t('wallet.connectMaster')}</label>
                                    <div className={wrapGradientStyle}>
                                        <Select
                                            value={selectedMasterTrader}
                                            onValueChange={(value) => {
                                                setSelectedMasterTrader(value);
                                            }}
                                        >
                                            <SelectTrigger className="border-none w-full px-3 pb-1.5 pt-1 dark:bg-theme-black-200 bg-white placeholder:!text-xs rounded-xl text-black dark:text-theme-neutral-100 focus:outline-none focus:border-purple-500 [&>span]:text-xs dark:[&>span]:text-gray-400 h-9">
                                                <SelectValue placeholder={t('wallet.connectMaster')} className="text-yellow-500" />
                                            </SelectTrigger>
                                            <SelectContent
                                                className="bg-white dark:bg-theme-black-200 border border-gray-200 dark:border-gray-700 shadow-lg"
                                                style={{ zIndex: 9999 }}
                                            >
                                                {masterTraders && masterTraders.length > 0 ? (
                                                    masterTraders.map((trader: MasterTrader) => (
                                                        <SelectItem className="flex h-10" key={trader.id} value={trader.solana_address}>
                                                            {maskNickname(trader.nickname)} - <span className="text-xs text-yellow-500 italic">{truncateString(trader.solana_address, 10)}</span>
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="no-traders" disabled>
                                                        {isLoadingMasters ? 'Loading...' : 'No master traders available'}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="text-[10px] italic text-gray-900 dark:text-yellow-500 leading-5">
                                    {t('wallet.walletNameNote')}
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={handleCloseAddWallets}
                                        className="px-4 py-1.5 text-xs 2xl:text-sm font-medium dark:text-gray-200 text-black hover:text-neutral-100"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        onClick={executeAddWallet}
                                        disabled={isLoading || !walletName || !walletNickname}
                                        className="px-4 py-1.5 text-xs 2xl:text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-neutral-100 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? t('wallet.adding') : t('wallet.addWallet')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showImportWallets && (
                <div className={`${modalContainerStyles} bg-theme-black-1/3 backdrop-blur-sm`}>
                    <div className={modalContentStyles}>
                        <div ref={importWalletRef} className={modalInnerStyles}>
                            <div className="xl:w-[40vw] flex flex-col gap-4 sm:gap-6">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div className={modalTitleStyles}>{t('wallet.importWallets')}</div>
                                    </div>

                                    {/* Private Key */}
                                    <div className="flex flex-col">
                                        <div className={modalLabelStyles}>{t('wallet.solanaPrivateKey')} <span className="text-red-500">*</span></div>
                                        <div>
                                            <div className="relative w-full">
                                                <textarea
                                                    value={privateKeyArray.join('\n')}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        // Parse private keys from textarea - split by newlines and dots, filter out empty strings
                                                        const keys = value
                                                            .split(/[\n.]+/)
                                                            .map(key => key.trim())
                                                            .filter(key => key.length > 0);
                                                        setPrivateKeyArray(keys);
                                                        // Validate the keys
                                                        validatePrivateKeyArray(keys);
                                                    }}
                                                    onPaste={(e) => {
                                                        e.preventDefault();
                                                        const pastedText = e.clipboardData.getData('text');
                                                        // Split pasted text by common separators and add newlines
                                                        const keys = pastedText
                                                            .split(/[\s,;.]+/)
                                                            .map(key => key.trim())
                                                            .filter(key => key.length > 0);

                                                        if (keys.length > 1) {
                                                            // If multiple keys are pasted, add them with newlines
                                                            const currentKeys = [...privateKeyArray];
                                                            const newKeys = [...currentKeys, ...keys];
                                                            setPrivateKeyArray(newKeys);
                                                            validatePrivateKeyArray(newKeys);
                                                        } else {
                                                            // If single key, just add it normally
                                                            const currentKeys = [...privateKeyArray];
                                                            if (pastedText.trim()) {
                                                                currentKeys.push(pastedText.trim());
                                                                setPrivateKeyArray(currentKeys);
                                                                validatePrivateKeyArray(currentKeys);
                                                            }
                                                        }
                                                    }}
                                                    placeholder={t('wallet.enterSolanaPrivateKey')}
                                                    className={`${modalInputStyles} !pt-2 border-l-[#03bdff] border-r-[#555aff] !text-xs border-b-[#03bdff] border-t-[#555aff] border-2 rounded-md ${privateKeyError ? 'border-red-500' : ''}`}
                                                    rows={5}
                                                />
                                            </div>
                                        </div>
                                        <div className={`${modalHelperTextStyles} italic mb-1`}>
                                            {t('wallet.privateKeyFormatHint')}
                                        </div>
                                        {/* Wallet Name */}
                                        <div className="flex flex-col gap-1">
                                            <div className={modalLabelStyles}>{t('wallet.walletPerixName')} <span className="text-red-500">*</span></div>
                                            <div className={wrapGradientStyle}>
                                                <input
                                                    type="text"
                                                    value={walletName}
                                                    onChange={(e) => setWalletName(e.target.value)}
                                                    placeholder={t('wallet.enterWalletName')}
                                                    className={modalInputStyles}
                                                />
                                            </div>
                                        </div>
                                        <div className={`${modalHelperTextStyles} italic`}>
                                            {t('wallet.privateKeySecurity')}
                                        </div>
                                    </div>

                                    {/* Wallet Nickname */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.walletNickname')} <span className="text-red-500">*</span></div>
                                        <div className={wrapGradientStyle}>
                                            <input
                                                type="text"
                                                value={walletNickname}
                                                onChange={(e) => setWalletNickname(e.target.value)}
                                                placeholder={t('wallet.enterWalletNickname')}
                                                className={modalInputStyles}
                                            />
                                        </div>
                                    </div>

                                    {/* Network Selection */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.country')} <span className="text-red-500">*</span></div>
                                        <div className={wrapGradientStyle}>
                                            <CustomSelect
                                                value={selectedNetwork}
                                                onChange={(value) => setSelectedNetwork(value)}
                                                options={langConfig.listLangs}
                                                placeholder={t('wallet.country')}
                                                className="h-9"
                                                t={t}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium dark:text-gray-200 text-black mb-1">{t('wallet.connectMaster')} <span className="text-red-500">*</span></label>
                                        <div className={wrapGradientStyle}>
                                            <Select
                                                value={selectedMasterTrader}
                                                onValueChange={(value) => {
                                                    setSelectedMasterTrader(value);
                                                }}
                                            >
                                                <SelectTrigger className="border-none w-full px-3 py-1.5 dark:bg-theme-black-200 bg-white placeholder:!text-xs rounded-xl text-black dark:text-theme-neutral-100 focus:outline-none focus:border-purple-500 [&>span]:text-xs dark:[&>span]:text-gray-400 h-9">
                                                    <SelectValue placeholder={t('wallet.connectMaster')} className="text-yellow-500" />
                                                </SelectTrigger>
                                                <SelectContent
                                                    className="bg-white dark:bg-theme-black-200 border border-gray-200 dark:border-gray-700 shadow-lg"
                                                    style={{ zIndex: 9999 }}
                                                >
                                                    {masterTraders && masterTraders.length > 0 ? (
                                                        masterTraders.map((trader: MasterTrader) => (
                                                            <SelectItem className="flex h-10" key={trader.id} value={trader.solana_address}>
                                                                {maskNickname(trader.nickname)} - <span className="text-xs text-yellow-500 italic">{truncateString(trader.solana_address, 10)}</span>
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem value="no-traders-import" disabled>
                                                            {isLoadingMasters ? 'Loading...' : 'No master traders available'}
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-5">
                                    <button onClick={handleCloseImportWallets} className={modalCancelButtonStyles}>
                                        <div className={modalButtonTextStyles}>{t('common.cancel')}</div>
                                    </button>
                                    <button
                                        onClick={executeImportWallets}
                                        disabled={isLoading || !walletName || !walletNickname || !selectedNetwork || privateKeyArray?.length === 0}
                                        className={modalButtonStyles}
                                    >
                                        <div className={modalButtonTextStyles}>{t('wallet.importWallet')}</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPrivateKeys && (
                <div className={modalContainerStyles}>
                    <div className={modalContentStyles}>
                        <div ref={privateKeysRef} className={modalInnerStyles}>
                            <div className=" 2xl:w-96 w-[40vw] flex flex-col gap-4 sm:gap-6">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div className={modalTitleStyles}>{t('wallet.privateKeys')}</div>
                                        <button onClick={handleClosePrivateKeys} className="w-5 h-5 relative overflow-hidden">
                                            <div className="w-3 h-3 left-[4.17px] top-[4.16px] absolute bg-Colors-Neutral-200" />
                                        </button>
                                    </div>

                                    {/* Solana Private Key */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.solanaPrivateKey')}</div>
                                        <div className={wrapGradientStyle}>
                                            <div className="relative w-full">
                                                <input
                                                    type={showPassword.sol ? "text" : "password"}
                                                    value={privateKeyPublics.sol_private_key}
                                                    readOnly
                                                    placeholder={t('wallet.enterSolanaPrivateKey')}
                                                    className={`${modalInputStyles} pr-16 cursor-default`}
                                                />
                                                <div className="absolute right-3 top-1/3 flex items-center gap-2">
                                                    <Copy
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(privateKeyPublics.sol_private_key);
                                                            toast.success(t('connectMasterModal.copyAddress.copied'));
                                                        }}
                                                        className="w-4 h-4 cursor-pointer text-gray-400 hover:text-gray-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(prev => ({ ...prev, sol: !prev.sol }))}
                                                        className=" text-gray-400 cursor-pointer hover:text-gray-200"
                                                    >
                                                        {showPassword.sol ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={modalHelperTextStyles}>
                                            {t('wallet.privateKeySecurity')}
                                        </div>
                                    </div>

                                    {/* Ethereum Private Key */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.ethereumPrivateKey')}</div>
                                        <div className={wrapGradientStyle}>
                                            <div className="relative w-full">
                                                <input
                                                    type={showPassword.eth ? "text" : "password"}
                                                    value={privateKeyPublics.eth_private_key}
                                                    readOnly
                                                    placeholder="Enter Ethereum private key"
                                                    className={`${modalInputStyles} pr-16 cursor-default`}
                                                />
                                                <div className="absolute right-3 top-1/3 flex items-center gap-2">
                                                    <Copy
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(privateKeyPublics.eth_private_key);
                                                            toast.success(t('connectMasterModal.copyAddress.copied'));
                                                        }}
                                                        className="w-4 h-4 cursor-pointer text-gray-400 hover:text-gray-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(prev => ({ ...prev, eth: !prev.eth }))}
                                                        className=" text-gray-400 hover:text-gray-200"
                                                    >
                                                        {showPassword.eth ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>

                                            </div>
                                        </div>
                                    </div>

                                    {/* BNB Private Key */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.bnbPrivateKey')}</div>
                                        <div className={wrapGradientStyle}>
                                            <div className="relative w-full">
                                                <input
                                                    type={showPassword.bnb ? "text" : "password"}
                                                    value={privateKeyPublics.bnb_private_key}
                                                    readOnly
                                                    placeholder="Enter BNB private key"
                                                    className={`${modalInputStyles} pr-16 cursor-default`}
                                                />
                                                <div className="absolute right-3 top-1/3 flex items-center gap-2">
                                                    <Copy
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(privateKeyPublics.bnb_private_key);
                                                            toast.success(t('connectMasterModal.copyAddress.copied'));
                                                        }}
                                                        className="w-4 h-4 cursor-pointer text-gray-400 hover:text-gray-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(prev => ({ ...prev, bnb: !prev.bnb }))}
                                                        className=" text-gray-400 cursor-pointer hover:text-gray-200"
                                                    >
                                                        {showPassword.bnb ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-5">
                                    <button onClick={handleClosePrivateKeys} className={modalCancelButtonStyles}>
                                        <div className={modalButtonTextStyles}>{t('common.close')}</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showImportWallet && (
                <div className={modalContainerStyles}>
                    <div className={modalContentStyles}>
                        <div ref={importWalletRef} className={modalInnerStyles}>
                            <div className=" 2xl:w-96 w-[40vw] flex flex-col gap-4 sm:gap-6">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div className={modalTitleStyles}>{t('wallet.importWallet')}</div>
                                        <button onClick={handleCloseImportWallet} className="w-5 h-5 relative overflow-hidden">
                                            <div className="w-3 h-3 left-[4.17px] top-[4.16px] absolute bg-Colors-Neutral-200" />
                                        </button>
                                    </div>

                                    {/* Wallet Name */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.walletName')} <span className="text-red-500">*</span></div>
                                        <div className={wrapGradientStyle}>
                                            <input
                                                type="text"
                                                value={walletName}
                                                onChange={(e) => setWalletName(e.target.value)}
                                                placeholder={t('wallet.enterWalletName')}
                                                className={modalInputStyles}
                                            />
                                        </div>
                                    </div>

                                    {/* Private Key */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.solanaPrivateKey')} <span className="text-red-500">*</span></div>
                                        <div className={wrapGradientStyle}>
                                            <div className="relative w-full">
                                                <input
                                                    type={showPassword.sol ? "text" : "password"}
                                                    value={privateKey}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setPrivateKeyError("");
                                                        setPrivateKey(value);
                                                        if (value) {
                                                            debouncedFetchWalletInfo(value);
                                                        } else {
                                                            setPrivateKeyError("");
                                                        }
                                                    }}
                                                    placeholder={t('wallet.enterSolanaPrivateKey')}
                                                    className={`${modalInputStyles} pr-20 ${privateKeyError ? 'border-red-500' : ''}`}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    {isLoadingWalletInfo && (
                                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(prev => ({ ...prev, sol: !prev.sol }))}
                                                        className="text-gray-400 hover:text-gray-200"
                                                    >
                                                        {showPassword.sol ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        {privateKeyError && (
                                            <div className={modalErrorStyles}>{privateKeyError}</div>
                                        )}
                                        <div className={modalHelperTextStyles}>
                                            {t('wallet.privateKeySecurity')}
                                        </div>
                                    </div>

                                    {/* Wallet Nickname */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.walletNickname')} <span className="text-red-500">*</span></div>
                                        <div className={wrapGradientStyle}>
                                            <input
                                                type="text"
                                                value={walletNickname}
                                                onChange={(e) => setWalletNickname(e.target.value)}
                                                placeholder={t('wallet.enterWalletNickname')}
                                                className={modalInputStyles}
                                            />
                                        </div>
                                    </div>

                                    {/* Network Selection */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.country')} <span className="text-red-500">*</span></div>
                                        <div className={wrapGradientStyle}>
                                            <CustomSelect
                                                value={selectedNetwork}
                                                onChange={(value) => setSelectedNetwork(value)}
                                                options={langConfig.listLangs}
                                                placeholder={t('wallet.country')}
                                                t={t}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-5">
                                    <button onClick={handleCloseImportWallet} className={modalCancelButtonStyles}>
                                        <div className={modalButtonTextStyles}>{t('common.cancel')}</div>
                                    </button>
                                    <button
                                        onClick={handleImportWallet}
                                        disabled={isLoading || !walletName || !walletNickname}
                                        className={modalButtonStyles}
                                    >
                                        <div className={modalButtonTextStyles}>{t('wallet.importWallet')}</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCreatePassword && (
                <div className={modalContainerStyles}>
                    <div className={modalContentStyles}>
                        <div className={modalInnerStyles}>
                            <div className=" 2xl:w-96 w-[40vw] flex flex-col gap-4 sm:gap-6">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div className={modalTitleStyles}>{t('wallet.createPassword')}</div>
                                        <button onClick={handleCloseCreatePassword} className="w-5 h-5 relative overflow-hidden">
                                            <div className="w-3 h-3 left-[4.17px] top-[4.16px] absolute bg-Colors-Neutral-200" />
                                        </button>
                                    </div>

                                    {/* New Password */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.newPassword')} <span className="text-red-500">*</span></div>
                                        <div className={wrapGradientStyle}>
                                            <div className="relative w-full">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={handlePasswordChange}
                                                    placeholder={t('wallet.enterNewPassword')}
                                                    className={`${modalInputStyles} pr-10 ${passwordError ? 'border-red-500' : ''}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                                                >
                                                    {showNewPassword ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        {passwordError && (
                                            <div className={modalErrorStyles}>{passwordError}</div>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.confirmPassword')} <span className="text-red-500">*</span></div>
                                        <div className={wrapGradientStyle}>
                                            <div className="relative w-full">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={handleConfirmPasswordChange}
                                                    placeholder={t('wallet.enterConfirmPassword')}
                                                    className={`${modalInputStyles} pr-10 ${confirmPasswordError ? 'border-red-500' : ''}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        {confirmPasswordError && (
                                            <div className={modalErrorStyles}>{confirmPasswordError}</div>
                                        )}
                                    </div>

                                    <div className={modalHelperTextStyles}>
                                        {t('wallet.passwordRequirements')}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-5">
                                    <button onClick={handleCloseCreatePassword} className={modalCancelButtonStyles}>
                                        <div className={modalButtonTextStyles}>{t('common.cancel')}</div>
                                    </button>
                                    <button
                                        onClick={handleCreatePassword}
                                        disabled={isLoading || !newPassword || !confirmPassword}
                                        className={modalButtonStyles}
                                    >
                                        <div className={modalButtonTextStyles}>
                                            {isLoading ? t('wallet.creating') : t('wallet.createPassword')}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPasswordInput && (
                <div className={modalContainerStyles}>
                    <div className={modalContentStyles}>
                        <div className={modalInnerStyles}>
                            <div className=" 2xl:w-96 w-[40vw] flex flex-col gap-4 sm:gap-6">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div className={modalTitleStyles}>{t('wallet.enterPassword')}</div>
                                        <button onClick={handleClosePasswordInput} className="w-5 h-5 relative overflow-hidden">
                                            <div className="w-3 h-3 left-[4.17px] top-[4.16px] absolute bg-Colors-Neutral-200" />
                                        </button>
                                    </div>

                                    {/* Password Input */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.password')} <span className="text-red-500">*</span></div>
                                        <div className={wrapGradientStyle}>
                                            <div className="relative w-full">
                                                <input
                                                    type={showInputPassword ? "text" : "password"}
                                                    value={inputPassword}
                                                    onChange={(e) => {
                                                        setInputPassword(e.target.value);
                                                        setInputPasswordError("");
                                                    }}
                                                    placeholder={t("wallet.passwordRequired")}
                                                    className={`${modalInputStyles} pr-10 ${inputPasswordError ? 'border-red-500' : ''}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowInputPassword(!showInputPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                                                >
                                                    {showInputPassword ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        {inputPasswordError && (
                                            <div className={modalErrorStyles}>{inputPasswordError}</div>
                                        )}
                                    </div>

                                    <div>
                                        <div className={modalHelperTextStyles}>
                                            {t('wallet.enterPasswordToView')}
                                        </div>
                                        <button
                                            onClick={handleForgotPassword}
                                            className="text-xs text-theme-primary-400 w-fit hover:underline text-left mt-1"
                                        >
                                            {t('wallet.forgotPassword')}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-5">
                                    <button onClick={handleClosePasswordInput} className={modalCancelButtonStyles}>
                                        <div className={modalButtonTextStyles}>{t('common.cancel')}</div>
                                    </button>
                                    <button
                                        onClick={handleSubmitPassword}
                                        disabled={isLoading || !inputPassword}
                                        className={modalButtonStyles}
                                    >
                                        <div className={modalButtonTextStyles}>
                                            {isLoading ? t('wallet.verifying') : t('wallet.submit')}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Forgot Password Modal */}
            {showForgotPassword && (
                <div className={modalContainerStyles}>
                    <div className={modalContentStyles}>
                        <div className={modalInnerStyles}>
                            <div className=" 2xl:w-96 w-[40vw] flex flex-col gap-4 sm:gap-6">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div className={modalTitleStyles}>{t('wallet.forgotPassword')}</div>
                                        <button onClick={handleCloseForgotPassword} className="w-5 h-5 relative overflow-hidden">
                                            <div className="w-3 h-3 left-[4.17px] top-[4.16px] absolute bg-Colors-Neutral-200" />
                                        </button>
                                    </div>

                                    {/* Verification Code Inputs */}
                                    <div>
                                        <div className="flex flex-col gap-1">
                                            <div className={modalLabelStyles}>{t('wallet.verificationCode')} <span className="text-red-500">*</span></div>
                                            <div className="flex justify-between gap-2">
                                                {[0, 1, 2, 3].map((index) => (
                                                    <div key={index} className={wrapGradientStyle}>
                                                        <input
                                                            type="text"
                                                            maxLength={1}
                                                            value={verificationCode[index] || ''}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                setCodeError("");
                                                                // Allow both letters and numbers
                                                                if (/^[a-zA-Z0-9]*$/.test(value)) {
                                                                    const newCode = verificationCode.split('');
                                                                    newCode[index] = value;
                                                                    setVerificationCode(newCode.join(''));

                                                                    // Auto focus next input
                                                                    if (value && index < 3) {
                                                                        const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                                                                        if (nextInput) nextInput.focus();
                                                                    }
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
                                                                    const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
                                                                    if (prevInput) prevInput.focus();
                                                                }
                                                            }}
                                                            onPaste={(e) => {
                                                                e.preventDefault();
                                                                const pastedData = e.clipboardData.getData('text');
                                                                // Remove any non-alphanumeric characters and take first 4 characters
                                                                const cleanData = pastedData.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();

                                                                if (cleanData.length > 0) {
                                                                    // Fill the verification code with pasted data
                                                                    const newCode = cleanData.padEnd(4, '').split('');
                                                                    setVerificationCode(newCode.join(''));

                                                                    // Focus on the next empty input or the last input
                                                                    const nextEmptyIndex = Math.min(cleanData.length, 3);
                                                                    const nextInput = document.querySelector(`input[data-index="${nextEmptyIndex}"]`) as HTMLInputElement;
                                                                    if (nextInput) nextInput.focus();
                                                                }
                                                            }}
                                                            data-index={index}
                                                            className={`${modalInputStyles} text-center text-lg font-semibold uppercase`}
                                                            placeholder="-"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            {codeError && (
                                                <div className={modalErrorStyles}>{codeError}</div>
                                            )}
                                        </div>
                                        <div className="flex justify-end items-center mt-1">
                                            <button
                                                onClick={handleResendCode}
                                                disabled={isSendingCode}
                                                className="text-xs text-theme-primary-400 hover:text-theme-primary-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSendingCode ? t('wallet.sending') : t('wallet.resendCode')}
                                            </button>
                                        </div>
                                    </div>
                                    {/* New Password */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.newPassword')} <span className="text-red-500">*</span></div>
                                        <div className={wrapGradientStyle}>
                                            <div className="relative w-full">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={handlePasswordChange}
                                                    placeholder={t('wallet.enterNewPassword')}
                                                    className={`${modalInputStyles} pr-10 ${passwordError ? 'border-red-500' : ''}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                                                >
                                                    {showNewPassword ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        {passwordError && (
                                            <div className={modalErrorStyles}>{passwordError}</div>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.confirmPassword')} <span className="text-red-500">*</span></div>
                                        <div className={wrapGradientStyle}>
                                            <div className="relative w-full">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={handleConfirmPasswordChange}
                                                    placeholder={t('wallet.enterConfirmPassword')}
                                                    className={`${modalInputStyles} pr-10 ${confirmPasswordError ? 'border-red-500' : ''}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        {confirmPasswordError && (
                                            <div className={modalErrorStyles}>{confirmPasswordError}</div>
                                        )}
                                    </div>

                                    <div className={modalHelperTextStyles}>
                                        {t('wallet.passwordRequirements')}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-5">
                                    <button onClick={handleCloseForgotPassword} className={modalCancelButtonStyles}>
                                        <div className={modalButtonTextStyles}>{t('common.cancel')}</div>
                                    </button>
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={isVerifyingCode ||
                                            verificationCode.length !== 4 ||
                                            !newPassword ||
                                            !confirmPassword ||
                                            !!passwordError ||
                                            !!confirmPasswordError}
                                        className={modalButtonStyles}
                                    >
                                        <div className={modalButtonTextStyles}>
                                            {isVerifyingCode ? t('wallet.verifying') : t('wallet.verify')}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Verify Code Modal */}
            {showVerifyCode && (
                <div className={modalContainerStyles}>
                    <div className={modalContentStyles}>
                        <div className={modalInnerStyles}>
                            <div className=" 2xl:w-96 w-[40vw] flex flex-col gap-4 sm:gap-6">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div className={modalTitleStyles}>{t('wallet.verifyCode')}</div>
                                        <button onClick={handleCloseVerifyCode} className="w-5 h-5 relative overflow-hidden">
                                            <div className="w-3 h-3 left-[4.17px] top-[4.16px] absolute bg-Colors-Neutral-200" />
                                        </button>
                                    </div>

                                    {/* Verification Code Input */}
                                    <div className="flex flex-col gap-1">
                                        <div className={modalLabelStyles}>{t('wallet.verificationCode')}</div>
                                        <div className={wrapGradientStyle}>
                                            <input
                                                type="text"
                                                value={verificationCode}
                                                onChange={(e) => {
                                                    setVerificationCode(e.target.value);
                                                    setCodeError("");
                                                }}
                                                placeholder={t("wallet.enterVerificationCode")}
                                                className={`${modalInputStyles} ${codeError ? 'border-red-500' : ''}`}
                                            />
                                        </div>
                                        {codeError && (
                                            <div className={modalErrorStyles}>{codeError}</div>
                                        )}
                                    </div>

                                    <div className={modalHelperTextStyles}>
                                        {t('wallet.enterVerificationCodeSent')}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-5">
                                    <button onClick={handleCloseVerifyCode} className={modalCancelButtonStyles}>
                                        <div className={modalButtonTextStyles}>{t('common.cancel')}</div>
                                    </button>
                                    <button
                                        // onClick={handleVerifyCode}
                                        disabled={isVerifyingCode || !verificationCode}
                                        className={modalButtonStyles}
                                    >
                                        <div className={modalButtonTextStyles}>
                                            {isVerifyingCode ? t('wallet.verifying') : t('wallet.verify')}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ModalSignin isOpen={!isAuthenticated} onClose={() => { }} />
            {showModalResult && (
                <div className="fixed inset-0 bg-theme-black-1/3 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="p-[1px] rounded-xl bg-gradient-to-t from-theme-purple-100 to-theme-gradient-linear-end w-full max-w-[440px]">
                        <div className="bg-white dark:bg-theme-black-200 border border-theme-gradient-linear-start p-5 rounded-xl">
                            <h2 className="text-lg sm:text-xl font-semibold text-indigo-500 backdrop-blur-sm boxShadow linear-200-bg mb-4 text-fill-transparent bg-clip-text">
                                {t('wallet.resultTitleImport')}
                            </h2>
                            <div className="space-y-3 text-sm dark:text-gray-200 text-black">

                                <div className="flex items-center justify-between">
                                    <span>{t('wallet.importedSuccessfully')}</span>
                                    <span className="font-semibold text-green-500">{resultInfo?.created_count ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>{t('wallet.failedCount')}</span>
                                    <span className="font-semibold text-red-500">{resultInfo?.failed_count ?? 0}</span>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setShowModalResult(false)}
                                    className="px-4 py-1.5 text-xs 2xl:text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-neutral-100 rounded-lg font-medium"
                                >
                                    {t('common.close')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
