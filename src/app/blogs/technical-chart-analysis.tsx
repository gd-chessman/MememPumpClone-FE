import React from 'react';
import { Metadata } from 'next';
import { useLang } from '@/lang/useLang';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_APP_NAME} | Technical Chart Analysis & Trends 2025`,
  description: 'Explore MEMEPUMP potential through advanced technical charts on TradingView. Make investment decisions based on trends, indicators, and market sentiment.',
};

export default function BlogMemePump() {
  const { t } = useLang();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 text-gray-800 dark:text-gray-200">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        {t('blog.technicalChartAnalysis.title')}
      </h1>

      <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
        {t('blog.technicalChartAnalysis.intro')}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">
        {t('blog.technicalChartAnalysis.whyTradingView.title')}
      </h2>

      <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
        {t('blog.technicalChartAnalysis.whyTradingView.content1')}
      </p>

      <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
        {t('blog.technicalChartAnalysis.whyTradingView.content2')}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">
        {t('blog.technicalChartAnalysis.differences.title')}
      </h2>

      <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
        {t('blog.technicalChartAnalysis.differences.content1')}
      </p>

      <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
        {t('blog.technicalChartAnalysis.differences.content2')}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">
        {t('blog.technicalChartAnalysis.marketPsychology.title')}
      </h2>

      <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
        {t('blog.technicalChartAnalysis.marketPsychology.content1')}
      </p>

      <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
        {t('blog.technicalChartAnalysis.marketPsychology.content2')}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">
        {t('blog.technicalChartAnalysis.bitcoinComparison.title')}
      </h2>

      <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
        {t('blog.technicalChartAnalysis.bitcoinComparison.content').split('Bitcoin chart').map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index === 0 && (
              <a
                href="https://vn.tradingview.com/symbols/BTCUSD/"
                target="_blank"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Bitcoin chart
              </a>
            )}
          </React.Fragment>
        ))}
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">
        {t('blog.technicalChartAnalysis.conclusion.title')}
      </h2>

      <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
        {t('blog.technicalChartAnalysis.conclusion.content1')}
      </p>

      <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
        {t('blog.technicalChartAnalysis.conclusion.content2')}
      </p>
    </div>
  );
}