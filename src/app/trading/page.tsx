"use client"
import Interface from './inter-face/page'
import TokenInfo from './token-info'
import ListToken from './list-token/page'
import TransactionHistory from './transaction-history/page'
import Control from './control/page'
import Slider from './slider/page'
import { useState, useEffect, Suspense } from 'react'
import TradingViewChart from '@/app/components/tradingview-chart/TradingViewChart'
import ChartMobile from '@/app/components/tradingview-chart/ChartMobile'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

const TradingPage = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(800);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const checkScreenSize = () => {
    // Check if screen width is less than 768px (typical mobile breakpoint)
    return window.innerWidth < 768;
  };
  
  const isSmallScreen = windowWidth < 997;
  
  console.log("windowWidth", windowWidth);

  useEffect(() => {
    setIsMounted(true);
    setWindowWidth(window.innerWidth);
    setIsMobile(checkScreenSize());
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setIsMobile(checkScreenSize());
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Use default height during SSR
  const height = isMounted ? windowWidth : 800;
  let withDesktop = 'w-1/6';
  if(windowWidth < 1464) withDesktop = 'w-1/5';
  if(windowWidth < 1201) withDesktop = 'w-[23%]';
  if(windowWidth < 905) withDesktop = 'w-[35%]';
  
  return (
    <div className={`h-[92.5vh] flex flex-col gap-2 container-trading relative z-40  ${
      isMobile ? 'px-2' : 'px-2'
    }`}>
      {/* {!isMobile && <Interface />} */}
      
      {/* Sidebar Toggle Button for Small Screens */}
      {isSmallScreen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-16 left-0 bg-theme-neutral-800 hover:bg-theme-neutral-700 text-white p-2 rounded-lg shadow-lg transition-all duration-200 z-50"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isSidebarOpen ? (
              <ArrowLeft size={22} />
            ) : (
              <ArrowRight size={22} />
            )}
          </svg>
        </button>
      )}
      
      <div className={`flex-1 flex ${
        isMobile ? 'flex-col' : 'flex-row'
      } 2xl:gap-4 xl:gap-2 gap-1 w-full relative z-10 overflow-hidden`}>
        
        {/* Left Column - Sidebar for Small Screens */}
        {isSmallScreen ? (
          <>
            {/* Sidebar Overlay */}
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            
            {/* Sidebar */}
            <div className={`fixed left-0 top-12 md:h-full h-[calc(100vh-115px)] w-[360px] bg-white dark:bg-theme-neutral-1000 shadow-xl z-50 transform transition-transform duration-300 ease-in-out rounded-r-xl ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
              <div className="flex flex-col h-full p-2 gap-4 overflow-y-auto">
                <TokenInfo />
                <ListToken />
              </div>
            </div>
          </>
        ) : (
          /* Original Left Column for Larger Screens */
            <></>
        )}

        {/* Center and Right Columns with Resizable Panels */}
        {!isMobile ? (
          <PanelGroup direction="horizontal" className="flex-1">
            <Panel defaultSize={20} minSize={12} maxSize={25} className="h-full overflow-hidden">
            <div className={`flex ${
              isMobile ? 'flex-row w-full lg:h-[200px]' : 'flex-col '} xl:gap- gap-1 lg:overflow-hidden`}>
              <TokenInfo />
              {!isMobile && <ListToken />}
            </div>
            </Panel>
             <PanelResizeHandle className="w-[2px] m-1 bg-theme-neutral-800 hover:bg-neutral-600 transition-colors relative z-400" />
            {/* Center Column */}
            <Panel defaultSize={65} minSize={50} maxSize={85} className="lg:overflow-hidden relative">
              <PanelGroup direction="vertical" className="h-full">
                {/* Chart Panel */}
                <Panel defaultSize={55} minSize={30} maxSize={80} className="lg:overflow-hidden relative">
                  <div className='dark:bg-[#0e0e0e] shadow-inset bg-white rounded-xl p-2 overflow-auto transition-all duration-100 relative h-full'>
                    <TradingViewChart className='h-full rounded-xl overflow-hidden' />
                  </div>
                </Panel>
                
                {/* Height Resize Handle */}
                <PanelResizeHandle className="h-[2px] m-1 bg-theme-neutral-800 hover:bg-neutral-600 transition-colors relative z-400" />
                
                {/* Transaction History Panel */}
                <Panel  minSize={20} maxSize={60} className="lg:overflow-hidden relative">
                  <div className='transition-all duration-100 overflow-hidden rounded-xl flex h-full'>
                    <div className='flex flex-1 w-full'>
                      <TransactionHistory />
                    </div>
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>
            
            {/* Width Resize Handle */}
            <PanelResizeHandle className="w-[2px] m-1 bg-theme-neutral-800 hover:bg-neutral-600 transition-colors relative z-400" />
            
            {/* Right Column */}
            <Panel defaultSize={24} minSize={15} maxSize={30} className="h-full overflow-hidden">
              <div className='h-full overflow-auto'>
                <Control/>
              </div>
            </Panel>
          </PanelGroup>
        ) : (
          /* Mobile layout - no resizable panels */
          <>
            {/* Center Column for Mobile */}
            <div className="table sm:flex flex-col w-full h-full lg:overflow-hidden relative">
              <div 
                style={{ height: '300px' }} 
                className='dark:bg-theme-neutral-1000 shadow-inset bg-white rounded-xl p-2 md:p-4 overflow-auto transition-all duration-100 relative'
              >
                <ChartMobile className='h-full'/>
              </div>
              
              <div className='h-1 m-1 md:m-2 bg-theme-neutral-800 cursor-row-resize hover:bg-neutral-600 transition-colors relative z-400' />
              
              <div className='transition-all duration-100 overflow-hidden rounded-xl flex'>
                <div className='flex flex-1 w-full md:h-full h-[50vh] overflow-scroll'>
                  <TransactionHistory />
                </div>
              </div>
            </div>
            
            {/* Right Column for Mobile */}
            <div className="w-full h-[70px]">
              <div className='h-full overflow-auto'>
                <Control/>
              </div>
            </div>
          </>
        )}
      </div>
      {/* <Slider /> */}
    </div>
  )
}

export default function TradingPageWrapper() {
  return (
    <Suspense fallback={<div></div>}>
      <TradingPage />
    </Suspense>
  )
}
