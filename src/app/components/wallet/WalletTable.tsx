"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/ui/table";
import { Button } from "@/ui/button";
import { Copy, Edit, Check, X, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { truncateString } from "@/utils/format";
import { Wallet } from "../list-wallet";
import { Input } from "@/ui/input";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { TelegramWalletService } from '@/services/api';
import notify from "../notify";
import { getInforWallet, useWallet, deleteMultipleWallets } from "@/services/api/TelegramWalletService";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/ui/dialog";
import { useLang } from "@/lang";
import { WalletLanguageSelect } from "./WalletLanguageSelect";
import { Checkbox } from "@/ui/checkbox";

interface WalletData extends Wallet {
    wallet_nick_name: string;
    wallet_country: string;
    eth_address: string;
    solana_balance: number;
    solana_balance_usd: number;
}

interface WalletTableProps {
    wallets: WalletData[];
    onCopyAddress?: (address: string, e: React.MouseEvent) => void;
    onUpdateWallet?: () => void;
    refetchWallets?: () => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoadingMore?: boolean;
}

const textTitle = 'text-neutral-800 dark:text-neutral-200 font-normal text-xs py-2'
const textContent = 'text-neutral-900 dark:text-neutral-100 text-xs font-normal py-2 px-2'

// Add new styles for mobile wallet cards only
const mobileStyles = {
    card: "sm:hidden dark:bg-theme-black-200/50 bg-white rounded-xl p-3 border border-solid border-y-theme-primary-100 border-x-theme-purple-200",
    header: "flex items-start justify-between gap-2 mb-2",
    nameContainer: "flex lg:flex-col gap-1 min-w-0",
    label: "text-xs dark:text-white text-black",
    value: "text-xs font-medium dark:text-neutral-100 text-black",
    badge: "text-[10px] px-1.5 py-0.5 rounded-full",
    actionBar: "flex items-center gap-2 mt-2 pt-2 border-t border-gray-700",
    addressContainer: "space-y-2 mt-2",
    editButton: "h-5 w-5 p-0 hover:bg-neutral-700/50",
    copyButton: "h-6 w-6 p-0 hover:bg-neutral-700/50 flex-shrink-0",
    icon: "h-3 w-3"
}

export function WalletTable({ wallets, onCopyAddress, onUpdateWallet, refetchWallets, onLoadMore, hasMore = false, isLoadingMore = false }: WalletTableProps) {
    const { toast } = useToast();
    const { t } = useLang();
    const { isAuthenticated, logout, updateToken } = useAuth();
    const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<'name' | 'nickname' | 'country' | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [walletToDelete, setWalletToDelete] = useState<WalletData | null>(null);
    const [loadingWalletId, setLoadingWalletId] = useState<string | null>(null);
    const [loadingField, setLoadingField] = useState<'name' | 'nickname' | 'country' | null>(null);
    const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
    const [isBulkDelete, setIsBulkDelete] = useState(false);
    const [walletBalances, setWalletBalances] = useState<Record<string, { sol_balance: number; sol_balance_usd: number }>>({});
    const [loadingBalances, setLoadingBalances] = useState<Record<string, boolean>>({});

    // Infinite scroll ref
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadingRef = useRef<HTMLTableRowElement>(null);
    const onLoadMoreRef = useRef(onLoadMore);

    // Update the ref when onLoadMore changes
    useEffect(() => {
        onLoadMoreRef.current = onLoadMore;
    }, [onLoadMore]);

    // Setup intersection observer for infinite scroll
    useEffect(() => {
        // Clean up previous observer
        if (observerRef.current) {
            observerRef.current.disconnect();
        }
        
        if (loadingRef.current && onLoadMore && hasMore && !isLoadingMore) {
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        onLoadMoreRef.current?.();
                    }
                },
                { 
                    threshold: 0.1,
                    rootMargin: '100px' // Start loading when element is 100px away from viewport
                }
            );
            observerRef.current.observe(loadingRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasMore, isLoadingMore]); // Removed onLoadMore from dependencies to prevent unnecessary re-creation

    // Load balances for all wallets when wallets change
    useEffect(() => {
        if (wallets && wallets.length > 0) {
            wallets.forEach(wallet => {
                if (!walletBalances[wallet.wallet_id] && !loadingBalances[wallet.wallet_id]) {
                    getBalanceWallet(wallet);
                }
            });
        }
    }, [wallets]);

    const handleSelectWallet = (walletId: string, checked: boolean) => {
        if (checked) {
            setSelectedWallets(prev => [...prev, walletId]);
        } else {
            setSelectedWallets(prev => prev.filter(id => id !== walletId));
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const deletableWallets = wallets.filter(wallet => wallet.wallet_type !== 'main');
            setSelectedWallets(deletableWallets.map(wallet => wallet.wallet_id));
        } else {
            setSelectedWallets([]);
        }
    };

    const isAllSelected = () => {
        const deletableWallets = wallets.filter(wallet => wallet.wallet_type !== 'main');
        return deletableWallets.length > 0 && selectedWallets.length === deletableWallets.length;
    };

    const isIndeterminate = () => {
        const deletableWallets = wallets.filter(wallet => wallet.wallet_type !== 'main');
        return selectedWallets.length > 0 && selectedWallets.length < deletableWallets.length;
    };

    const { data: walletInfor, refetch } = useQuery({
        queryKey: ["wallet-infor"],
        queryFn: getInforWallet,
    });
    const handleCopyAddress = (address: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        toast({
            title: t("wallet.copySuccess"),
            description: truncateString(address, 14),
        });
        onCopyAddress?.(address, e);

        // Reset copied state after 2 seconds
        setTimeout(() => {
            setCopiedAddress(null);
        }, 2000);
    };

    const handleStartEdit = (walletId: string, field: 'name' | 'nickname' | 'country', currentValue: string) => {
        setEditingWalletId(walletId);
        setEditingField(field);
        setEditingValue(currentValue);
    };

    const handleCancelEdit = () => {
        setEditingWalletId(null);
        setEditingField(null);
        setEditingValue('');
    };

    const handleChangeWallet = async (wallet: WalletData) => {
        try {
            const res = await useWallet({ wallet_id: wallet.wallet_id });
            updateToken(res.token);
            notify({
                message: t("wallet.switchSuccess"),
                type: 'success'
            });
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Error changing wallet:', error);
            notify({
                message: t("wallet.switchFailed"),
                type: 'error'
            });
        }
    };

    const handleDeleteClick = (wallet: WalletData, e: React.MouseEvent) => {
        e.stopPropagation();
        setWalletToDelete(wallet);
        setDeleteModalOpen(true);
    };

    const handleDeleteWallet = async (id: string) => {
        try {
            const walletData = { wallet_id: id };
            const res = await TelegramWalletService.deleteWallet(walletData);

            if (res) {
                notify({
                    message: t("wallet.deleteSuccess"),
                    type: 'success'
                });
                onUpdateWallet?.();
                setDeleteModalOpen(false);
                setWalletToDelete(null);
                refetchWallets?.();
            }
        } catch (error) {
            console.error('Error deleting wallet:', error);
            notify({
                message: t("wallet.deleteFailed"),
                type: 'error'
            });
        }
    };

    const handleUpdateWallet = async () => {
        if (!editingWalletId || !editingField) return;

        setIsSubmitting(true);
        try {
            const currentWallet = wallets.find(w => w.wallet_id === editingWalletId);
            if (!currentWallet) return;

            // Check for duplicate nickname
            if (editingField === 'nickname') {
                const isDuplicate = wallets.some(
                    w => w.wallet_id !== editingWalletId && w.wallet_nick_name === editingValue
                );
                if (isDuplicate) {
                    notify({
                        message: t("wallet.nicknameDuplicate"),
                        type: 'error'
                    });
                    return;
                }
            }

            const response = await TelegramWalletService.changeName({
                wallet_id: editingWalletId,
                name: editingField === 'name' ? editingValue : currentWallet.wallet_name,
                nick_name: editingField === 'nickname' ? editingValue : currentWallet.wallet_nick_name,
                country: editingField === 'country' ? editingValue : currentWallet.wallet_country,
            });

            if (response) {
                notify({
                    message: t("wallet.updateSuccess"),
                    type: 'success'
                });
                onUpdateWallet?.();
            }
        } catch (error: any) {
            if (error?.response?.data?.message === "Invalid data or duplicate name/nickname") {
                notify({
                    message: t("wallet.nicknameDuplicate"),
                    type: 'error'
                });
            } else {
                notify({
                    message: t("wallet.updateFailed"),
                    type: 'error'
                });
            }
        } finally {
            setIsSubmitting(false);
            handleCancelEdit();
        }
    };

    const handleBulkDelete = async () => {
        if (selectedWallets.length === 0) {
            notify({
                message: t("wallet.selectWalletToDelete"),
                type: 'error'
            });
            return;
        }

        try {
            const walletIds = selectedWallets.map(id => parseInt(id));
            const res = await deleteMultipleWallets(walletIds);
            console.log(res);
            if (res) {
                notify({
                    message: t("wallet.deleteSuccess"),
                    type: 'success'
                });
                onUpdateWallet?.();
                setSelectedWallets([]);
                setIsBulkDelete(false);
                refetchWallets?.();
            }
        } catch (error) {
            console.error('Error bulk deleting wallets:', error);
            notify({
                message: t("wallet.deleteFailed"),
                type: 'error'
            });
        }
    };

    const renderMobileWalletCard = (wallet: WalletData) => (
        <div key={wallet.wallet_id} className={mobileStyles.card}>
            {/* Header with Name and Type */}
            <div className={mobileStyles.header}>
                {wallet.wallet_type !== 'main' ? (
                    <Checkbox
                        checked={selectedWallets.includes(wallet.wallet_id)}
                        onCheckedChange={(checked) => handleSelectWallet(wallet.wallet_id, checked as boolean)}
                        className="mt-0.5"
                    />
                ) : (
                    <div className="w-4 h-4" />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={mobileStyles.nameContainer}>
                            <div className="flex items-center gap-2">
                                <span className={mobileStyles.value}>{wallet.wallet_name}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={mobileStyles.editButton}
                                    onClick={() => handleStartEdit(wallet.wallet_id, 'name', wallet.wallet_name)}
                                >
                                    <Edit className={mobileStyles.icon} />
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={mobileStyles.value}>{wallet.wallet_nick_name}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={mobileStyles.editButton}
                                    onClick={() => handleStartEdit(wallet.wallet_id, 'nickname', wallet.wallet_nick_name)}
                                >
                                    <Edit className={mobileStyles.icon} />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            className={`${wallet.wallet_type === "main"
                                ? "dark:bg-green-900 bg-green-50 border-green-600 text-green-300"
                                : wallet.wallet_type === "import"
                                    ? "dark:bg-blue-900 bg-blue-50 border-blue-600 text-blue-300"
                                    : "dark:bg-gray-700 bg-gray-50 border-gray-600 dark:text-gray-300 text-neutral-900"
                                } ${mobileStyles.badge}`}
                        >
                            {t(`listWalletss.walletType.${wallet.wallet_type}`)}
                        </Badge>
                        <Badge
                            className={`${wallet.wallet_auth === "master"
                                ? "dark:bg-purple-900 bg-purple-50 border-purple-600 text-purple-300"
                                : "dark:bg-gray-700 bg-gray-50 border-[#15DFFD] text-[#15DFFD]"
                                } ${mobileStyles.badge}`}
                        >
                            {t(`listWalletss.walletType.${wallet.wallet_auth}`)}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Addresses */}
            <div className={mobileStyles.addressContainer}>
                <div className="flex items-center justify-between">
                    <div className={mobileStyles.label}>{t('wallet.solanaAddress')} :</div>
                    <div className="flex items-center gap-1">
                        <span className={`${mobileStyles.value} truncate flex-1 !text-yellow-500 italic`}>
                            {truncateString(wallet.solana_address, 12)}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={mobileStyles.copyButton}
                            onClick={(e) => handleCopyAddress(wallet.solana_address, e)}
                        >
                            {copiedAddress === wallet.solana_address ? (
                                <Check className={`${mobileStyles.icon} text-green-500`} />
                            ) : (
                                <Copy className={mobileStyles.icon} />
                            )}
                        </Button>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className={mobileStyles.label}>{t('wallet.balance')} :</div>
                    <div className="flex items-center gap-2">
                        {loadingBalances[wallet.wallet_id] ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="text-xs">Loading...</span>
                            </div>
                        ) : (
                            <span className={`${mobileStyles.value} truncate flex-1`}>
                                SOL: <span className="text-purple-600">
                                    {walletBalances[wallet.wallet_id]?.sol_balance?.toFixed(4) || '0.0000'}
                                </span> ≈ <span className="text-theme-primary-400">
                                    ${walletBalances[wallet.wallet_id]?.sol_balance_usd?.toFixed(2) || '0.00'}
                                </span>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className={mobileStyles.actionBar}>
                <div className="flex items-center gap-2">
                    <div
                        className={`w-2 h-2 rounded-full ${walletInfor?.solana_address === wallet.solana_address
                            ? 'bg-theme-green-200 cursor-default'
                            : 'bg-neutral-200 hover:bg-theme-green-200 cursor-pointer'
                            }`}
                        onClick={() => walletInfor?.solana_address !== wallet.solana_address && handleChangeWallet(wallet)}
                    />
                    <span className={mobileStyles.value}>
                        {walletInfor?.solana_address === wallet.solana_address ? t('wallet.active') : t('wallet.switch')}
                    </span>
                </div>
                {wallet.wallet_type !== 'main' && walletInfor?.solana_address !== wallet.solana_address && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`${mobileStyles.copyButton} hover:bg-red-700/50 ml-auto`}
                        onClick={(e) => handleDeleteClick(wallet, e)}
                    >
                        <Trash2 className={`${mobileStyles.icon} text-red-500`} />
                    </Button>
                )}
            </div>
        </div>
    );

    const renderEditableCell = (wallet: WalletData, field: 'name' | 'nickname' | 'country') => {
        const isEditing = editingWalletId === wallet.wallet_id && editingField === field;
        const isLoading = loadingWalletId === wallet.wallet_id && loadingField === field;
        const value = field === 'name' ? wallet.wallet_name :
            field === 'nickname' ? wallet.wallet_nick_name :
                wallet.wallet_country?.toLowerCase();

        if (isEditing) {
            if (field === 'country') {
                return (
                    <div className="flex items-center gap-2">
                        <WalletLanguageSelect
                            value={editingValue?.toLowerCase()}
                            onChange={async (newValue) => {
                                const lowerNewValue = newValue?.toLowerCase();
                                setEditingValue(lowerNewValue);
                                setEditingWalletId(wallet.wallet_id);
                                setEditingField('country');
                                setLoadingWalletId(wallet.wallet_id);
                                setLoadingField('country');
                                try {
                                    const response = await TelegramWalletService.changeName({
                                        wallet_id: wallet.wallet_id,
                                        name: wallet.wallet_name,
                                        nick_name: wallet.wallet_nick_name,
                                        country: lowerNewValue,
                                    });

                                    if (response) {
                                        notify({
                                            message: t("wallet.updateSuccess"),
                                            type: 'success'
                                        });
                                        onUpdateWallet?.();
                                    }
                                } catch (error) {
                                    console.error('Error updating country:', error);
                                    notify({
                                        message: t("wallet.updateFailed"),
                                        type: 'error'
                                    });
                                } finally {
                                    setLoadingWalletId(null);
                                    setLoadingField(null);
                                    handleCancelEdit();
                                }
                            }}
                            className="h-7 w-[113px]"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-red-700/50"
                            onClick={handleCancelEdit}
                            disabled={isLoading}
                        >
                            <X className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                );
            }

            return (
                <div className="flex items-center gap-2">
                    <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="h-7 w-[140px] text-xs"
                        autoFocus
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hover:bg-green-700/50"
                        onClick={handleUpdateWallet}
                        disabled={isSubmitting}
                    >
                        <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hover:bg-red-700/50"
                        onClick={handleCancelEdit}
                        disabled={isSubmitting}
                    >
                        <X className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            );
        }

        if (field === 'country') {
            return (
                <div className="flex items-center gap-3">
                    <WalletLanguageSelect
                        value={value}
                        onChange={async (newValue) => {
                            const lowerNewValue = newValue.toLowerCase();
                            setEditingWalletId(wallet.wallet_id);
                            setEditingField('country');
                            setEditingValue(lowerNewValue);
                            setLoadingWalletId(wallet.wallet_id);
                            setLoadingField('country');
                            try {
                                const response = await TelegramWalletService.changeName({
                                    wallet_id: wallet.wallet_id,
                                    name: wallet.wallet_name,
                                    nick_name: wallet.wallet_nick_name,
                                    country: lowerNewValue,
                                });

                                if (response) {
                                    notify({
                                        message: t("wallet.updateSuccess"),
                                        type: 'success'
                                    });
                                    onUpdateWallet?.();
                                }
                            } catch (error) {
                                console.error('Error updating country:', error);
                                notify({
                                    message: t("wallet.updateFailed"),
                                    type: 'error'
                                });
                            } finally {
                                setLoadingWalletId(null);
                                setLoadingField(null);
                                handleCancelEdit();
                            }
                        }}
                        className="h-7 w-[113px]"
                    />
                </div>
            );
        }

        return (
            <div className="flex items-center gap-3">
                <span>{value}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 hover:bg-neutral-700/50"
                    onClick={() => handleStartEdit(wallet.wallet_id, field, value)}
                    disabled={isLoading}
                >
                    <Edit className="h-4 w-4 dark:text-theme-neutral-100" />
                </Button>
            </div>
        );
    };
    const getBalanceWallet = async (wallet: WalletData) => {
        try {
            setLoadingBalances(prev => ({ ...prev, [wallet.wallet_id]: true }));
            const response = await TelegramWalletService.getWalletBalanceByAddress(wallet.solana_address);
            if (response && response.sol_balance !== undefined) {
                setWalletBalances(prev => ({
                    ...prev,
                    [wallet.wallet_id]: {
                        sol_balance: response.sol_balance || 0,
                        sol_balance_usd: response.sol_balance_usd || 0
                    }
                }));
            }
            return response;
        } catch (error) {
            console.error('Error getting balance wallet:', error);
            // Set default values on error
            setWalletBalances(prev => ({
                ...prev,
                [wallet.wallet_id]: {
                    sol_balance: 0,
                    sol_balance_usd: 0
                }
            }));
        } finally {
            setLoadingBalances(prev => ({ ...prev, [wallet.wallet_id]: false }));
        }
    }

    return (
        <>
            <Card className="border-none dark:shadow-blue-900/5">
                <CardContent className="p-0 relative gap-0">
                    {selectedWallets.length > 0 ? (
                        <div className="flex mt-2 items-center justify-between md:px-4 px-2 py-1 mb-2 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl">
                            <div className="flex items-center gap-2">
                                <span className="md:text-sm text-xs font-medium text-red-700 dark:text-red-300">
                                    {t('wallet.selectedWallets', { count: selectedWallets.length })}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedWallets([])}
                                    className="md:text-xs text-[10px] h-[25.6px] rounded-full hover:bg-gray-700"
                                >
                                    {t('wallet.clearSelection')}
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setIsBulkDelete(true)}
                                    className="md:text-xs text-[10px] h-[25.6px] bg-red-500 hover:bg-red-600 rounded-full"
                                >
                                    {t('wallet.deleteSelected')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[52px]" />
                    )}
                    {/* Desktop Table View */}
                    <div className="hidden sm:block border-1 z-10 border-solid mb-8 rounded-xl overflow-hidden border-y-theme-primary-100 border-x-theme-purple-200">
                        <Table className="w-full !bg-gray-700">
                            <TableRow className="bg-muted/50 h-12">
                                <TableHead className={`${textTitle} w-[2%] px-2`}>
                                    {wallets?.length > 1 && (
                                        <Checkbox
                                            checked={isAllSelected()}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    )}
                                </TableHead>
                                <TableHead className={`${textTitle} w-[10%] px-4`}>{t('wallet.walletName')}</TableHead>
                                <TableHead className={`${textTitle} w-[10%] px-4`}>{t('wallet.nickname')}</TableHead>
                                <TableHead className={`${textTitle} w-[10%] px-4`}>{t('wallet.solanaAddress')}</TableHead>
                                <TableHead className={`${textTitle} w-[14%] px-4`}>{t('wallet.balance')}</TableHead>
                                <TableHead className={`${textTitle} w-[8%] px-4`}>{t('wallet.country')}</TableHead>
                                <TableHead className={`${textTitle} w-[8%] px-4`}>{t('wallet.type')}</TableHead>
                                <TableHead className={`${textTitle} w-[8%] px-4`}>{t('wallet.walletLevel')}</TableHead>
                                <TableHead className={`${textTitle} w-[8%] px-4`}>{t('common.actions')}</TableHead>
                            </TableRow>
                        </Table>
                        <div className="max-h-[650px] overflow-y-auto w-full">
                            <Table className="w-full">
                                <TableBody className="w-full">
                                    {wallets?.map((wallet) => (
                                        <TableRow
                                            key={wallet.wallet_id}
                                            className="dark:hover:bg-neutral-800/30 hover:bg-theme-green-300 transition-colors h-14 border-b-1 border-b-solid border-b-transparent"
                                        >
                                            <TableCell className={`px-4 ${textContent} `}>
                                                {wallet.wallet_type !== 'main' && (
                                                    <Checkbox
                                                        checked={selectedWallets.includes(wallet.wallet_id)} onClick={() => handleSelectWallet(wallet.wallet_id, !selectedWallets.includes(wallet.wallet_id))}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell className={`px-4 ${textContent}`}>
                                                {renderEditableCell(wallet, 'name')}
                                            </TableCell>
                                            <TableCell className={`px-4 ${textContent}`}>
                                                {renderEditableCell(wallet, 'nickname')}
                                            </TableCell>

                                            <TableCell className={`px-4 ${textContent}`}>
                                                <div className="flex items-center gap-1">
                                                    <span className="truncate max-w-[180px] text-yellow-500 italic">
                                                        {truncateString(wallet.solana_address, 10)}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 p-0 hover:bg-neutral-700/50 flex-shrink-0"
                                                        onClick={(e) => handleCopyAddress(wallet.solana_address, e)}
                                                    >
                                                        {copiedAddress === wallet.solana_address ? (
                                                            <Check className="h-3 w-3 text-green-500" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className={`px-4 ${textContent}`}>
                                                {loadingBalances[wallet.wallet_id] ? (
                                                    <div className="flex items-center gap-2">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        <span className="text-xs">Loading...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        SOL: <span className="text-purple-600">
                                                            {walletBalances[wallet.wallet_id]?.sol_balance?.toFixed(4) || '0.0000'}
                                                        </span> ≈ <span className="text-theme-primary-400">
                                                            ${walletBalances[wallet.wallet_id]?.sol_balance_usd?.toFixed(2) || '0.00'}
                                                        </span>
                                                    </>
                                                )}
                                            </TableCell>
                                            <TableCell className={`px-4 ${textContent}`}>
                                                {renderEditableCell(wallet, 'country')}
                                            </TableCell>
                                            <TableCell className={`px-4 ${textContent}`}>
                                                <Badge
                                                    className={`${wallet.wallet_type === "main"
                                                        ? "bg-green-50 dark:bg-green-900 border-green-600 text-green-300"
                                                        : wallet.wallet_type === "import"
                                                            ? " dark:bg-blue-900 border-blue-600 text-blue-300"
                                                            : "dark:bg-gray-700 border-gray-600 dark:text-theme-neutral-100 text-theme-neutral-900"
                                                        } px-2 py-1 whitespace-nowrap`}
                                                >
                                                    {t(`listWalletss.walletType.${wallet.wallet_type}`)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`px-4 ${textContent}`}>
                                                <Badge
                                                    className={`${wallet.wallet_auth === "master"
                                                        ? "dark:bg-yellow-800 border-yellow-600 text-yellow-300"
                                                        : "dark:bg-gray-700 border-[#15DFFD] text-[#15DFFD]"
                                                        } px-2 py-1 whitespace-nowrap`}
                                                >
                                                    {t(`listWalletss.walletType.${wallet.wallet_auth}`)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`px-4 ${textContent}`}>
                                                <div className="flex items-center gap-1 cursor-pointer p-1 rounded-md">
                                                    <div
                                                        className={`w-2.5 h-2.5 rounded-full ${walletInfor?.solana_address === wallet.solana_address
                                                            ? 'bg-theme-green-200 cursor-default'
                                                            : 'bg-neutral-200 hover:bg-theme-green-200 cursor-pointer'
                                                            }`}
                                                        onClick={() => walletInfor?.solana_address !== wallet.solana_address && handleChangeWallet(wallet)}
                                                    />
                                                    {wallet.wallet_type !== 'main' && walletInfor?.solana_address !== wallet.solana_address && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 p-0 hover:bg-red-700/50"
                                                            onClick={(e) => handleDeleteClick(wallet, e)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Loading indicator for infinite scroll */}
                                    {(isLoadingMore || hasMore) && (
                                        <TableRow ref={loadingRef} className="h-16">
                                            <TableCell colSpan={9} className="text-center py-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span className="text-sm text-gray-500">
                                                        {isLoadingMore ? t('wallet.loadingMore') : 'Scroll to load more'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    {/* Mobile Card View */}
                    <div className="sm:hidden space-y-3 p-2">
                        {/* Mobile Bulk Delete Actions */}
                        {wallets?.map((wallet) => renderMobileWalletCard(wallet))}
                    </div>

                </CardContent>
            </Card>

            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent hiddenCloseButton className="sm:max-w-[425px] p-0 border-none border-transparent">
                    <div className="bg-gradient-to-t from-theme-purple-100 to-theme-gradient-linear-end p-[1px] relative w-full rounded-xl">
                        <div className="w-full px-3 py-2 bg-theme-black-200 rounded-xl text-neutral-100">
                            <DialogHeader className="p-2">
                                <DialogTitle className="text-xl font-semibold text-indigo-500 backdrop-blur-sm boxShadow linear-200-bg mb-2 text-fill-transparent bg-clip-text">
                                    {t('wallet.confirmDeleteWallet', { nameWallet: walletToDelete?.wallet_nick_name || walletToDelete?.wallet_name })}
                                </DialogTitle>
                            </DialogHeader>
                            <DialogFooter className="flex justify-end gap-2 p-2 flex-row">
                                <div className="bg-gradient-to-t from-theme-purple-100 to-theme-gradient-linear-end p-[1px] relative rounded-full">
                                    <button
                                        className="bg-theme-black-200 h-[30px] text-neutral-100 px-5 rounded-full"
                                        onClick={() => setDeleteModalOpen(false)}
                                    >
                                        {t('wallet.cancel')}
                                    </button>
                                </div>
                                <button
                                    className="linear-gradient-light dark:linear-gradient-connect hover:border h-[32px] border px-5 border-transparent rounded-full text-sm"
                                    onClick={() => handleDeleteWallet(walletToDelete?.wallet_id || '')}
                                >
                                    {t('wallet.delete')}
                                </button>
                            </DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={isBulkDelete} onOpenChange={setIsBulkDelete}>
                <DialogContent className="sm:max-w-[425px] p-0 border-none border-transparent">
                    <div className="bg-gradient-to-t from-theme-purple-100 to-theme-gradient-linear-end p-[1px] relative w-full rounded-xl">
                        <div className="w-full px-3 py-2 bg-theme-black-200 rounded-xl text-neutral-100">
                            <DialogHeader className="p-2">
                                <DialogTitle className="text-xl font-semibold text-indigo-500 backdrop-blur-sm boxShadow linear-200-bg mb-2 text-fill-transparent bg-clip-text">
                                    {t('wallet.confirmBulkDelete')}
                                </DialogTitle>
                                <DialogDescription className="text-neutral-100 text-sm">
                                    {t('wallet.confirmBulkDeleteMessage', { count: selectedWallets.length })}
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex justify-end gap-2 p-2">
                                <div className="bg-gradient-to-t from-theme-purple-100 to-theme-gradient-linear-end p-[1px] relative rounded-full">
                                    <button
                                        className="bg-theme-black-200 h-[30px] text-neutral-100 px-5 rounded-full"
                                        onClick={() => setIsBulkDelete(false)}
                                    >
                                        {t('wallet.cancel')}
                                    </button>
                                </div>
                                <button
                                    className="linear-gradient-light dark:linear-gradient-connect hover:border h-[32px] border px-5 border-transparent rounded-full text-sm"
                                    onClick={handleBulkDelete}
                                >
                                    {t('wallet.delete')}
                                </button>
                            </DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
} 