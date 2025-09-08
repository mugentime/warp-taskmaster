
import React, { useState, useEffect } from 'react';
import type { FundingData } from '../types';

interface ImplementBotModalProps {
    isOpen: boolean;
    onClose: () => void;
    opportunity: FundingData | null;
    isShort: boolean;
    onLaunchBot: (config: { investment: number, leverage: number, name: string, autoManaged: boolean }) => void;
}

const ImplementBotModal: React.FC<ImplementBotModalProps> = ({ isOpen, onClose, opportunity, isShort, onLaunchBot }) => {
    const [investment, setInvestment] = useState('');
    const [leverage, setLeverage] = useState(10);
    const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);
    const [botName, setBotName] = useState('');
    const [autoManaged, setAutoManaged] = useState(false);

    useEffect(() => {
        if (opportunity) {
            // Auto-determine strategy based on funding rate
            const fundingRate = opportunity.fundingRate || 0;
            const optimalStrategy = fundingRate < 0 ? 'Short' : 'Long';
            setBotName(`${opportunity.symbol} ${optimalStrategy} Bot`);
        }
    }, [opportunity, isShort]);
    
    useEffect(() => {
        // Reset state on close
        if (!isOpen) {
            setInvestment('');
            setLeverage(10);
            setAcknowledgeRisk(false);
            setBotName('');
            setAutoManaged(false);
        }
    }, [isOpen]);

    if (!isOpen || !opportunity) return null;

    const handleLaunch = () => {
        const investmentAmount = parseFloat(investment);
        if (investmentAmount > 0 && acknowledgeRisk && botName.trim() !== '') {
            onLaunchBot({ investment: investmentAmount, leverage, name: botName, autoManaged });
        }
    };

    const isLaunchDisabled = !botName.trim() || !investment || parseFloat(investment) <= 0 || !acknowledgeRisk;
    
    // Auto-determine optimal strategy based on funding rate
    const fundingRate = opportunity?.fundingRate || 0;
    const isOptimalShort = fundingRate < 0;
    const strategyType = isOptimalShort ? "Short Perp / Buy Spot" : "Long Perp / Sell Spot";
    const strategyExplanation = isOptimalShort 
        ? "Negative funding rate: Earn payments from long positions" 
        : "Positive funding rate: Earn payments from short positions";
    const futuresOrderSize = (parseFloat(investment) / 2 * leverage).toFixed(2);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 transition-opacity" onClick={onClose} data-testid="implement-bot-modal">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 transform transition-all" onClick={e => e.stopPropagation()} data-testid="implement-bot-form">
                <h2 className="text-xl font-bold text-yellow-400 mb-2">Create Arbitrage Bot</h2>
                <p className="text-gray-400 mb-4">Configure and launch a new bot for <span className="font-bold text-white">{opportunity.symbol}</span>.</p>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="botName" className="block text-sm font-medium text-gray-300">Bot Name</label>
                        <input
                            type="text"
                            id="botName"
                            value={botName}
                            onChange={(e) => setBotName(e.target.value)}
                            className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                            placeholder="e.g., My ETH Short Bot"
                            data-testid="modal-bot-name-input"
                        />
                    </div>

                    <div>
                        <span className="text-sm font-semibold text-gray-300">Auto-Selected Strategy:</span>
                        <p className={`font-bold ${isOptimalShort ? 'text-red-400' : 'text-green-400'}`}>{strategyType}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            🧐 {strategyExplanation}
                        </p>
                        {opportunity && (
                            <p className="text-xs text-gray-500 mt-1">
                                Funding: {(fundingRate * 100).toFixed(4)}% every 8h
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="investment" className="block text-sm font-medium text-gray-300">Investment Amount (USDT)</label>
                        <input
                            type="number"
                            id="investment"
                            value={investment}
                            onChange={(e) => setInvestment(e.target.value)}
                            className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                            placeholder="e.g., 1000"
                            data-testid="modal-investment-input"
                        />
                    </div>

                    <div>
                        <label htmlFor="leverage" className="block text-sm font-medium text-gray-300">Leverage ({leverage}x)</label>
                        <input
                            type="range"
                            id="leverage"
                            min="1"
                            max="20"
                            value={leverage}
                            onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg accent-yellow-500"
                            data-testid="modal-leverage-slider"
                        />
                    </div>
                    
                    <div className="bg-gray-900/50 p-3 rounded-lg text-sm space-y-2">
                        <p className="font-semibold text-gray-300">Order Summary (Approximate):</p>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Spot Order (50%):</span>
                            <span className="font-mono text-white">{(parseFloat(investment) / 2 || 0).toFixed(2)} USDT</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Futures Order (50%):</span>
                            <span className="font-mono text-white">{(parseFloat(investment) / 2 || 0).toFixed(2)} USDT</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Futures Position Size:</span>
                            <span className="font-mono text-white">{isNaN(parseFloat(futuresOrderSize)) ? '0.00' : futuresOrderSize} USDT</span>
                        </div>
                    </div>

                    <div className="flex items-start">
                        <input
                            id="auto-managed"
                            type="checkbox"
                            checked={autoManaged}
                            onChange={(e) => setAutoManaged(e.target.checked)}
                            className="h-4 w-4 text-yellow-500 bg-gray-700 border-gray-600 rounded focus:ring-yellow-600 accent-yellow-500"
                            data-testid="modal-auto-managed-checkbox"
                        />
                        <label htmlFor="auto-managed" className="ml-2 text-sm text-gray-400">
                           Automatically move this investment to better opportunities (Auto-Rebalance).
                        </label>
                    </div>

                    <div className="flex items-start">
                        <input
                            id="risk-ack"
                            type="checkbox"
                            checked={acknowledgeRisk}
                            onChange={(e) => setAcknowledgeRisk(e.target.checked)}
                            className="h-4 w-4 text-yellow-500 bg-gray-700 border-gray-600 rounded focus:ring-yellow-600 accent-yellow-500"
                            data-testid="modal-risk-acknowledgment-checkbox"
                        />
                        <label htmlFor="risk-ack" className="ml-2 text-sm text-gray-400">
                            I understand the risks, including potential losses from price divergence and liquidation.
                        </label>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
                        data-testid="modal-cancel-button"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleLaunch}
                        disabled={isLaunchDisabled}
                        className="px-4 py-2 text-sm font-medium text-gray-900 bg-yellow-500 rounded-md hover:bg-yellow-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-500 disabled:bg-yellow-800/50 disabled:cursor-not-allowed"
                        data-testid="modal-launch-button"
                    >
                        Launch Bot
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImplementBotModal;