
import React from 'react';
import type { PnLSummaryData } from '../types';

interface PnLSummaryProps {
    data: PnLSummaryData;
}

const PnlCard: React.FC<{ title: string; value: string; isPositive?: boolean; change?: string; icon: React.ReactNode }> = ({ title, value, isPositive, change, icon }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg flex-1 min-w-[150px]">
        <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-400">{title}</p>
            {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {change && (
            <p className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {change}
            </p>
        )}
    </div>
);

const PnLSummary: React.FC<PnLSummaryProps> = ({ data }) => {
    const is24hPnlPositive = data.pnl24h >= 0;

    const DollarSignIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 10v-1m0-6h.01M6 12H5m14 0h-1m-1-5l.707-.707M6.293 6.293L7 7m10 10l.707.707M7 17l-.707.707" />
        </svg>
    );

    const ChartBarIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    );
    
    const CheckCircleIcon = () => (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    return (
        <div className="flex flex-wrap gap-4">
            <PnlCard
                title="Total P&L"
                value={`$${data.totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={<DollarSignIcon />}
            />
            <PnlCard
                title="24h P&L"
                value={`${is24hPnlPositive ? '+' : ''}$${data.pnl24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                isPositive={is24hPnlPositive}
                change={`${is24hPnlPositive ? '▲' : '▼'} ${(Math.abs(data.pnl24h) / (data.totalPnl - data.pnl24h) * 100).toFixed(2)}%`}
                icon={<ChartBarIcon />}
            />
            <PnlCard
                title="Win Rate"
                value={`${data.winRate}%`}
                icon={<CheckCircleIcon />}
            />
        </div>
    );
};

export default PnLSummary;