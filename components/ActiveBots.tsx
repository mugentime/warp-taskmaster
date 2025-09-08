import React from 'react';
import type { ActiveBot } from '../types';
import Card from './Card';

interface ActiveBotsProps {
    bots: ActiveBot[];
    onStopBot: (botId: string) => void;
    loading: boolean;
    error: string | null;
    isBackendConnected: boolean;
}

const ActiveBots: React.FC<ActiveBotsProps> = ({ bots, onStopBot, loading, error, isBackendConnected }) => {

    const formatCurrency = (value: number) => {
        return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    };

    const formatDuration = (ms: number): string => {
        if (ms < 0) ms = 0;
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            return `${days}d ${hours}h`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-24">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
                </div>
            );
        }

        if (!isBackendConnected) {
             return (
                <div className="text-center text-gray-500 py-4">
                    <p className="font-semibold">Could not connect to the backend server.</p>
                    <p className="text-sm">Please ensure the server from the `backend` directory is running and refresh.</p>
                </div>
            );
        }

        if (bots.length === 0) {
            return <p className="text-center text-gray-500 py-4">{error ? 'Could not load bots.' : 'No active bots found.'}</p>;
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-4 py-3">Strategy</th>
                            <th scope="col" className="px-4 py-3 text-right">Investment</th>
                            <th scope="col" className="px-4 py-3 text-right">Uptime</th>
                            <th scope="col" className="px-4 py-3 text-right">Funding Revenue</th>
                            <th scope="col" className="px-4 py-3 text-right">ROI</th>
                            <th scope="col" className="px-4 py-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bots.map((bot) => {
                            const isRevenuePositive = bot.fundingRevenue >= 0;
                            const roi = (bot.fundingRevenue / bot.investment) * 100;
                            return (
                                <tr key={bot.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <th scope="row" className="px-4 py-3 font-medium text-white whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-base">{bot.name}</span>
                                            {bot.autoManaged && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full" title="Managed by Rebalancing Engine">🤖 Auto</span>}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            <span className={`font-semibold ${bot.strategyType === 'Short Perp' ? 'text-red-400' : 'text-green-400'}`}>
                                                {bot.strategyType.toUpperCase()}
                                            </span>
                                            <span className="ml-2">{bot.symbol}</span>
                                            <span className="ml-2">({bot.leverage}x)</span>
                                        </div>
                                    </th>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {formatCurrency(bot.investment)}
                                    </td>
                                     <td className="px-4 py-3 text-right font-mono">
                                        {formatDuration(Date.now() - bot.startTime)}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono ${isRevenuePositive ? 'text-green-400' : 'text-red-400'}`}>
                                        {isRevenuePositive ? '+' : ''}{formatCurrency(bot.fundingRevenue)}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {roi.toFixed(2)}%
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            onClick={() => onStopBot(bot.id)}
                                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs transition-colors"
                                        >
                                            Stop Bot
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <Card title="Active Arbitrage Bots">
            {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-4" role="alert">
                    <p><strong className="font-bold">Backend Error: </strong> {error}</p>
                </div>
            )}
            {renderContent()}
        </Card>
    );
};

export default ActiveBots;