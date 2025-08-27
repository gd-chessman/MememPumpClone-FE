'use client'
import React from 'react'
import { ArrowDownLeft, ArrowDownToLine, ArrowUpFromLine, ArrowUpRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getInforWallet } from '@/services/api/TelegramWalletService'
import { formatNumberWithSuffix, formatNumberWithSuffix3 } from '@/utils/format'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lang/useLang'
import { useAuth } from '@/hooks/useAuth';
import { getTopCoins } from '@/services/api/OnChainService'

const Layout = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <div className={`bg-gradient-to-t from-theme-gradient-linear-start to-theme-gradient-linear-end dark:from-theme-blue-100/10 dark:to-theme-blue-200/10 2xl:min-w-auto 2xl:basis-1/2 relative rounded-xl transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-lg p-[1px] ${className}`}>
            <div className='w-full h-full rounded-xl bg-gradient-to-l from-[#1962b0b3]/70 to-[#117b7bb3]/70'>
                <div className='bg-theme-blue-300  dark:bg-[#00000054] 2xl:px-5 px-2 py-3 rounded-xl w-full h-full flex flex-col items-center justify-center gap-1 2xl:gap-3'>
                    {children}
                </div>
            </div>
        </div>
    )
}

const LayoutCoin = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <div className={`bg-[#33333340] shadow-lg 2xl:min-w-auto 2xl:basis-1/2 relative rounded-xl transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-lg p-[1px] ${className}`}>
            <div className='w-full h-full rounded-xl '>
                <div className='bg-theme-blue-300  dark:bg-[#00000054] rounded-xl w-full h-full flex flex-col items-center justify-center gap-1 2xl:gap-3 px-2 py-3'>
                    {children}
                </div>
            </div>
        </div>
    )
}

const Title = ({ name }: { name: string }) => {
    return (
        <div className='flex items-center gap-1 2xl:gap-2'>
            <img src={"/ethereum.png"} alt="ethereum" className='w-[14px] h-[14px] md:w-[16px] md:h-[16px]' />
            <span className='dark:dark:text-neutral-100 text-theme-black-300 text-xs 2xl:text-[16px] font-semibold capitalize'>{name}</span>
            <img src={"/ethereum.png"} alt="ethereum" className='w-[14px] h-[14px] md:w-[16px] md:h-[16px]' />
        </div>
    )
}

const OverView = () => {
    const router = useRouter()
    const { t } = useLang()
    const { isAuthenticated } = useAuth()
    const { data: walletInfor, refetch } = useQuery({
        queryKey: ["wallet-infor"],
        queryFn: getInforWallet,
    });
    const { data: topCoins, isLoading: isLoadingTopCoins } = useQuery({
        queryKey: ["topCoins"],
        queryFn: () => getTopCoins({ offset: 3, limit: 50 }), 
        refetchInterval: 30000,
    });

    // Filter top 5 coins by price change percentage (highest)
    const topPriceChangeCoins = topCoins?.slice().sort((a: any, b: any) =>
        (b.price_change_24h_percent || 0) - (a.price_change_24h_percent || 0)
    ).slice(0, 5) || [];

    // Filter top 5 coins by liquidity (highest)
    const topPumFun24h = topCoins?.filter((coin: any) => coin.program === "pumpfun-amm")
        .sort((a: any, b: any) => (b.price_change_24h_percent || 0) - (a.price_change_24h_percent || 0))
        .slice(0, 5) || [];

    console.log("topCoins", topPriceChangeCoins)
    return (
        <div className='flex flex-col gap-2'>
            <div className='flex md:flex-row flex-col gap-3 z-10'>
                <div className="flex gap-3 flex-1 xl:flex-row flex-col">
                    <Layout className='flex-1 min-w-[270px] md:max-w-[600px]'>
                        <img src="/solana-logo.png" alt="solana" className='w-[40px] h-[40px] md:w-[48px] md:h-[48px] lg:w-[56px] lg:h-[56px] rounded-full' />
                        <div className='flex gap-1 md:gap-2'>
                            <Title name={t('overview.launchToken.title')} />
                        </div>
                        <div className='flex flex-col items-center'>
                            <span className='dark:text-neutral-100 text-theme-brown-100 font-normal capitalize text-[10px] 2xl:text-xs mb-1 text-center px-1 md:px-2 lg:px-0'>{t('overview.launchToken.description2')}</span>
                            <span className='dark:text-theme-primary-100 text-theme-brown-100 font-normal capitalize text-[10px] italic mb-1 text-center px-1 md:px-2 lg:px-0'>{t('overview.launchToken.description')}</span>
                        </div>
                        <button
                            onClick={() => router.push('/create-coin/pumpfun')}
                            className='lg:max-w-auto max-w-[120px] group relative bg-gradient-to-t from-theme-primary-500 to-theme-secondary-400 py-1.5 md:py-2 px-3 md:px-4 lg:px-5 rounded-full text-[11px] md:text-xs transition-all duration-500 hover:from-theme-blue-100 hover:to-theme-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 w-full md:w-auto'
                        >
                            <span className='relative z-10 text-neutral-100'>{t('overview.launchToken.createNow')}</span>
                            <div className='absolute inset-0 rounded-full bg-gradient-to-r from-theme-primary-300 to-theme-secondary-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm'></div>
                        </button>
                    </Layout>
                    {/* <Layout className='min-w-[220px] '>
                        <div className='flex flex-col items-center justify-between h-full gap-2 md:gap-3 w-full'>
                            <div className='flex flex-col items-center gap-1 md:gap-2  h-full'>
                                <img src="/wallet-logo.png" alt="wallet-logo" className='w-[40px] md:w-[48px] lg:w-[70px] h-auto bg-transparent rounded-full my-2' />
                                <div className='flex gap-1 md:gap-2'>
                                    <Title name="Ví cá nhân" />
                                </div>
                                <div className='flex flex-col items-center gap-1 md:gap-2'>
                                    <span className='text-theme-brown-100 dark:dark:text-neutral-100 text-theme-black-300 text-[11px] 2xl:text-xs font-normal mb-1 text-center px-1 md:px-2 lg:px-0'>{t('overview.masterTrade.description')}</span>
                                </div>
                            </div>
                            <div className='absolute bottom-2 left-0 w-[48%] z-20 flex flex-col items-left px-3 gap-1'>
                                <div className="dark:text-neutral-100 text-theme-black-300 text-sm 2xl:text-base font-bold ">${walletInfor?.solana_balance?.toFixed(3) || '0.000'} SOL</div>
                                <div className="text-cyan-400 text-sm 2xl:text-base">
                                    ${formatNumberWithSuffix3(walletInfor?.solana_balance_usd?.toFixed(2) || '0.00')} USD <span className='dark:dark:text-neutral-100 text-theme-black-300'>24H</span>
                                </div>
                            </div>
                        </div>
                    </Layout> */}
                </div>
                <div className='md:basis-3/12 sm:basis-2/5 flex items-center justify-center relative z-10'>
                    <img src="/memepump-dashboard.png" alt="mmp" className='w-auto 2xl:h-[200px] h-[150px] object-cover' />
                    <svg className='absolute bottom-0 left-0 w-[48%] h-auto z-10' xmlns="http://www.w3.org/2000/svg" width="247" height="113" viewBox="0 0 247 113" fill="none">
                        <path d="M164.72 1C171.102 1 176.265 6.03471 177.559 12.2848C183.596 41.4413 206.559 64.403 235.715 70.4398C241.965 71.7338 247 76.8968 247 83.2795V101C247 107.627 241.627 113 235 113H13C6.37259 113 1 107.627 1 101V13C1 6.37258 6.37258 1 13 1H164.72Z" className="dark:fill-[url(#paint0_linear_1465_20343)] fill-[#E8F4FD]" />
                        <g filter="url(#filter0_di_1465_20343)">
                            <path d="M4.5 5.5L29.5 12.5H49.5" stroke="#211D40" stroke-width="2" />
                        </g>
                        <g filter="url(#filter1_di_1465_20343)">
                            <path d="M29.5 12.5V50L53.5 63.8564" stroke="#211D40" stroke-width="2" />
                        </g>
                        <g filter="url(#filter2_d_1465_20343)">
                            <circle cx="3" cy="3" r="3" transform="matrix(-1 0 0 1 54 10)" fill="#7400FF" />
                        </g>
                        <g filter="url(#filter3_d_1465_20343)">
                            <circle cx="3" cy="3" r="3" transform="matrix(-1 0 0 1 56 61)" fill="#7400FF" />
                        </g>
                        <g filter="url(#filter4_d_1465_20343)">
                            <path d="M29.7656 23.9966V40.0035" stroke="#8833EE" stroke-width="2" />
                        </g>
                        <defs>
                            <filter id="filter0_di_1465_20343" x="0.230469" y="0.537109" width="53.2695" height="16.9629" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.14 0" />
                                <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="effect1_dropShadow_1465_20343" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1465_20343" result="shape" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset dy="4" />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0.213141 0 0 0 0 0.213141 0 0 0 0 0.213141 0 0 0 0.25 0" />
                                <feBlend mode="normal" in2="shape" result="effect2_innerShadow_1465_20343" />
                            </filter>
                            <filter id="filter1_di_1465_20343" x="24.5" y="8.5" width="33.5" height="60.2224" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.14 0" />
                                <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="effect1_dropShadow_1465_20343" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1465_20343" result="shape" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset dy="4" />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0.213141 0 0 0 0 0.213141 0 0 0 0 0.213141 0 0 0 0.25 0" />
                                <feBlend mode="normal" in2="shape" result="effect2_innerShadow_1465_20343" />
                            </filter>
                            <filter id="filter2_d_1465_20343" x="44" y="6" width="14" height="14" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0.503606 0 0 0 0 0.149038 0 0 0 0 1 0 0 0 1 0" />
                                <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="effect1_dropShadow_1465_20343" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1465_20343" result="shape" />
                            </filter>
                            <filter id="filter3_d_1465_20343" x="46" y="57" width="14" height="14" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0.503606 0 0 0 0 0.149038 0 0 0 0 1 0 0 0 1 0" />
                                <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="effect1_dropShadow_1465_20343" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1465_20343" result="shape" />
                            </filter>
                            <filter id="filter4_d_1465_20343" x="24.7656" y="19.9966" width="10" height="24.0068" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0.55235 0 0 0 0 0.328525 0 0 0 0 1 0 0 0 0.4 0" />
                                <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="effect1_dropShadow_1465_20343" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1465_20343" result="shape" />
                            </filter>
                            <linearGradient id="paint0_linear_1465_20343" x1="124" y1="1" x2="124" y2="113" gradientUnits="userSpaceOnUse">
                                <stop stop-color="#292C4F" />
                                <stop offset="1" stop-color="#1A1C35" />
                            </linearGradient>
                        </defs>
                    </svg>
                    {isAuthenticated &&
                        <div className='absolute bottom-2 left-0 w-[48%] z-20 flex flex-col items-left px-3 gap-1'>
                            <div className="dark:text-neutral-100 text-theme-black-300 text-sm 2xl:text-base font-bold ">${walletInfor?.solana_balance?.toFixed(3) || '0.000'} SOL</div>
                            <div className="text-cyan-400 text-sm 2xl:text-base">
                                ${formatNumberWithSuffix3(walletInfor?.solana_balance_usd?.toFixed(2) || '0.00')} USD <span className='dark:dark:text-neutral-100 text-theme-black-300'>24H</span>
                            </div>
                        </div>}
                    {isAuthenticated && <div className="absolute 2xl:bottom-2 bottom-1 right-0 w-[36%] z-20 flex justify-around px-3 gap-4">
                        <button onClick={() => router.replace('/universal-account?type=deposit')} className="flex flex-col justify-start items-center gap-0.5 md:gap-1">
                            <div className="w-6 h-6 md:w-7 md:h-7 2xl:w-8 2xl:h-8 bg-gradient-to-t from-theme-primary-500 to-theme-secondary-400 border border-neutral-200 rounded-full flex justify-center items-center group  transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 bg-theme-blue-100">
                                <ArrowDownToLine className="w-2.5 h-2.5 md:w-3 md:h-3 2xl:w-4 2xl:h-4 text-neutral-100 z-10" />
                                <div className='absolute inset-0 rounded-full w-[30px] h-[30px] bg-gradient-to-r from-theme-primary-300 to-theme-secondary-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm'></div>
                            </div>
                            <div className="text-center text-theme-brown-100 dark:text-theme-neutral-100 text-[9px] 2xl:text-[10px] font-semibold">
                                {t('overview.universalAccount.receive')}
                            </div>
                        </button>
                        <button onClick={() => router.replace('/universal-account?type=withdraw')} className="flex flex-col justify-start items-center gap-0.5 md:gap-1">
                            <div className="w-6 h-6 md:w-7 md:h-7 2xl:w-8 2xl:h-8 bg-gradient-to-t from-theme-primary-500 to-theme-secondary-400 border border-neutral-200 rounded-full flex justify-center items-center group  transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 bg-theme-blue-100">
                                <ArrowUpFromLine className="w-2.5 h-2.5 md:w-3 md:h-3 2xl:w-4 2xl:h-4 text-neutral-100 z-10" />
                                <div className='absolute inset-0 rounded-full w-[30px] h-[30px] bg-gradient-to-r from-theme-primary-300 to-theme-secondary-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm'></div>
                            </div>
                            <div className="text-center text-theme-brown-100 dark:text-theme-neutral-100 text-[9px] 2xl:text-[10px] font-semibold">
                                {t('overview.universalAccount.send')}
                            </div>
                        </button>
                    </div>}
                    <svg className='absolute bottom-0 right-0 w-[48%] h-auto' xmlns="http://www.w3.org/2000/svg" width="247" height="113" viewBox="0 0 247 113" fill="none">
                        <path d="M82.2805 1C75.8978 1 70.7348 6.03471 69.4407 12.2848C63.4038 41.4413 40.4414 64.403 11.2849 70.4398C5.03471 71.7338 0 76.8968 0 83.2795V101C0 107.627 5.37259 113 12 113H234C240.627 113 246 107.627 246 101V13C246 6.37258 240.627 1 234 1H82.2805Z" className="dark:fill-[url(#paint0_linear_1465_20342)] fill-[#F0F8FF]" />
                        <g filter="url(#filter0_di_1465_20342)">
                            <path d="M242.5 5.5L217.5 12.5H197.5" stroke="#211D40" stroke-width="2" />
                        </g>
                        <g filter="url(#filter1_di_1465_20342)">
                            <path d="M217.5 12.5V50L193.5 63.8564" stroke="#211D40" stroke-width="2" />
                        </g>
                        <g filter="url(#filter2_d_1465_20342)">
                            <circle cx="196" cy="13" r="3" fill="#7400FF" />
                        </g>
                        <g filter="url(#filter3_d_1465_20342)">
                            <circle cx="194" cy="64" r="3" fill="#7400FF" />
                        </g>
                        <g filter="url(#filter4_d_1465_20342)">
                            <path d="M217.234 23.9966V40.0035" stroke="#8833EE" stroke-width="2" />
                        </g>
                        <defs>
                            <filter id="filter0_di_1465_20342" x="193.5" y="0.537109" width="53.2695" height="16.9629" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.14 0" />
                                <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="effect1_dropShadow_1465_20342" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1465_20342" result="shape" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset dy="4" />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0.213141 0 0 0 0 0.213141 0 0 0 0 0.213141 0 0 0 0.25 0" />
                                <feBlend mode="normal" in2="shape" result="effect2_innerShadow_1465_20342" />
                            </filter>
                            <filter id="filter1_di_1465_20342" x="189" y="8.5" width="33.5" height="60.2224" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.14 0" />
                                <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="effect1_dropShadow_1465_20342" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1465_20342" result="shape" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset dy="4" />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0.213141 0 0 0 0 0.213141 0 0 0 0 0.213141 0 0 0 0.25 0" />
                                <feBlend mode="normal" in2="shape" result="effect2_innerShadow_1465_20342" />
                            </filter>
                            <filter id="filter2_d_1465_20342" x="189" y="6" width="14" height="14" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0.503606 0 0 0 0 0.149038 0 0 0 0 1 0 0 0 1 0" />
                                <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="effect1_dropShadow_1465_20342" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1465_20342" result="shape" />
                            </filter>
                            <filter id="filter3_d_1465_20342" x="187" y="57" width="14" height="14" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0.503606 0 0 0 0 0.149038 0 0 0 0 1 0 0 0 1 0" />
                                <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="effect1_dropShadow_1465_20342" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1465_20342" result="shape" />
                            </filter>
                            <filter id="filter4_d_1465_20342" x="212.234" y="19.9966" width="10" height="24.0068" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0.55235 0 0 0 0 0.328525 0 0 0 0 1 0 0 0 0.4 0" />
                                <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="effect1_dropShadow_1465_20342" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1465_20342" result="shape" />
                            </filter>
                            <linearGradient id="paint0_linear_1465_20342" x1="123" y1="1" x2="123" y2="113" gradientUnits="userSpaceOnUse">
                                <stop stop-color="#292C4F" />
                                <stop offset="1" stop-color="#1A1C35" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <div className="flex gap-3 flex-1 xl:flex-row flex-col justify-end">
                    {/* <LayoutCoin className='min-w-[220px] '>
                        <div className='flex flex-col gap-2 h-full justify-around w-full'>
                            <Title name={t('overview.topPumfun')} />
                            {topPumFun24h.map((coin: any) => (
                                <div onClick={() => router.push(`/trading?address=${coin.address}`)} key={coin.id} className='flex items-center justify-between gap-1 w-full h-[30px] cursor-pointer hover:bg-slate-800 px-2 rounded-xl'>
                                    <div className='flex items-center gap-1'>
                                        <img
                                            src={coin.logo_uri}
                                            alt={coin.symbol}
                                            className='2xl:w-[20px] 2xl:h-[20px] w-[16px] h-[16px] bg-transparent rounded-full'
                                            onError={(e) => {
                                                e.currentTarget.src = '/logo3.png';
                                            }}
                                        />
                                        <span className='2xl:text-xs text-[10px] font-semibold'>{coin.symbol}</span>
                                        <div className='2xl:text-xs text-[10px] text-[#53e2ef] font-semibold'>${formatNumberWithSuffix(coin.market_cap || 0)}</div>
                                    </div>
                                    <div className={`font-semibold 2xl:text-sm text-xs ${(coin.volume_24h_change_percent ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {(coin.volume_24h_change_percent ?? 0) >= 0 ? '+' : ''}{formatNumberWithSuffix(coin.volume_24h_change_percent ?? 0)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </LayoutCoin> */}
                    <Layout className='flex-1 md:max-w-[600px]'>
                        <div className='flex flex-col items-center justify-between h-full gap-2 md:gap-3 w-full'>
                            <div className='flex flex-col items-center gap-1 md:gap-2 justify-center h-full'>
                                <img src="/earth-logo.png" alt="earth-logo" className='w-[40px] md:w-[48px] lg:w-[56px] h-auto bg-transparent rounded-full' />
                                <div className='flex gap-1 md:gap-2'>
                                    <Title name={t('overview.masterTrade.title')} />
                                </div>
                                <div className='flex flex-col items-center gap-1 md:gap-2'>
                                    <span className='text-theme-brown-100 dark:dark:text-neutral-100 text-theme-black-300 text-[11px] 2xl:text-xs font-normal mb-1 text-center px-1 md:px-2 lg:px-0'>{t('overview.masterTrade.description')}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push('/master-trade')}
                                className='lg:max-w-auto max-w-[120px] group relative bg-gradient-to-t from-theme-primary-500 to-theme-secondary-400 py-1.5 md:py-2 px-3 md:px-4 lg:px-5 rounded-full text-[11px] md:text-xs transition-all duration-500 hover:from-theme-blue-100 hover:to-theme-blue-200 hover:scale-105 hover:shadow-lg hover:shadow-theme-primary-500/30 active:scale-95 w-full md:w-auto'
                            >
                                <span className='relative z-10 text-neutral-100'>{t('overview.masterTrade.explore')}</span>
                                <div className='absolute inset-0 rounded-full bg-gradient-to-r from-theme-primary-300 to-theme-secondary-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm'></div>
                            </button>
                        </div>
                    </Layout>
                </div>
            </div>
        </div>
    )
}

export default OverView;
