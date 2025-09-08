import React, { useState, useEffect } from 'react';
import type { ArbitrageOpportunity } from '../types';
import { TradeExecutionService, TradeExecutionConfig, TradeExecutionResult } from '../services/tradeExecutionService';

interface TradeConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    opportunity: ArbitrageOpportunity | null;
    accountBalance: number;
    onTradeExecuted: (result: TradeExecutionResult) => void;
}

const TradeConfirmationModal: React.FC<TradeConfirmationModalProps> = ({
    isOpen,
    onClose,
    opportunity,
    accountBalance,
    onTradeExecuted
}) => {
    const [investment, setInvestment] = useState<number>(50);
    const [leverage, setLeverage] = useState<number>(3);
    const [dryRun, setDryRun] = useState<boolean>(true);
    const [isExecuting, setIsExecuting] = useState<boolean>(false);
    const [validation, setValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] });

    useEffect(() => {
        if (opportunity && isOpen) {
            // Reset form when modal opens
            const maxInvestment = Math.min(100, accountBalance * 0.3); // Max 30% of balance or $100
            setInvestment(Math.max(20, maxInvestment));
            setLeverage(3);
            setDryRun(true);
        }
    }, [opportunity, isOpen, accountBalance]);

    useEffect(() => {
        if (opportunity) {
            validateTrade();
        }
    }, [investment, leverage, opportunity]);

    const validateTrade = () => {
        if (!opportunity) return;

        const config: TradeExecutionConfig = {
            symbol: opportunity.symbol,
            strategy: opportunity.strategy as any,
            investment,
            leverage,
            maxSlippage: 0.5,
            dryRun
        };

        // Create dummy service for validation
        const service = new TradeExecutionService('', '');
        const result = service.validateTrade(opportunity, config, accountBalance);
        setValidation(result);
    };

    const calculateEstimates = () => {
        if (!opportunity) return null;

        const maxInvestment = Math.min(investment, accountBalance * 0.5);
        const spotValue = maxInvestment / 2;
        const futuresValue = maxInvestment / 2;
        
        // Fees
        const spotFee = spotValue * 0.001;
        const futuresFee = futuresValue * 0.0004;
        const totalFees = spotFee + futuresFee;

        // Profit estimation
        const fundingProfit = Math.abs(opportunity.fundingRate) * futuresValue;
        const estimatedProfit8h = fundingProfit - totalFees;
        const roi8h = (estimatedProfit8h / maxInvestment) * 100;

        return {
            spotValue,
            futuresValue,
            totalFees,
            estimatedProfit8h,
            roi8h,
            maxInvestment
        };
    };

    const handleExecuteTrade = async () => {
        if (!opportunity || !validation.valid) return;

        setIsExecuting(true);
        try {
            const config: TradeExecutionConfig = {
                symbol: opportunity.symbol,
                strategy: opportunity.strategy as any,
                investment,
                leverage,
                maxSlippage: 0.5,
                dryRun
            };

            // Create service with dummy credentials for simulation
            const service = new TradeExecutionService('dummy', 'dummy');
            const result = await service.executeArbitrageTrade(opportunity, config, accountBalance);
            
            onTradeExecuted(result);
            onClose();
        } catch (error) {
            console.error('Trade execution failed:', error);
        } finally {
            setIsExecuting(false);
        }
    };

    if (!isOpen || !opportunity) return null;

    const estimates = calculateEstimates();
    const isShortPerp = opportunity.strategy.includes('Short');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Confirm Arbitrage Trade</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Opportunity Details */}
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">{opportunity.symbol}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Strategy:</span>
                            <div className={`font-semibold ${isShortPerp ? 'text-red-400' : 'text-green-400'}`}>
                                {opportunity.strategy}
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-400">Funding Rate:</span>
                            <div className={`font-mono font-semibold ${opportunity.fundingRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {opportunity.fundingRatePercent}
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-400">Annualized:</span>
                            <div className="font-mono text-yellow-400">{opportunity.annualizedRate}%</div>
                        </div>
                        <div>
                            <span className="text-gray-400">Rating:</span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                opportunity.rating === 'EXTREME' ? 'bg-red-600' :
                                opportunity.rating === 'HIGH' ? 'bg-orange-500' :
                                'bg-yellow-500 text-black'
                            }`}>
                                {opportunity.rating}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Trade Configuration */}
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Investment Amount (USDT)
                        </label>
                        <input
                            type="number"
                            value={investment}
                            onChange={(e) => setInvestment(Number(e.target.value))}
                            min="10"
                            max={accountBalance * 0.5}
                            step="5"
                            className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="text-xs text-gray-400 mt-1">
                            Available: ${accountBalance.toFixed(2)} (Max 50%: ${(accountBalance * 0.5).toFixed(2)})
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Futures Leverage
                        </label>
                        <select
                            value={leverage}
                            onChange={(e) => setLeverage(Number(e.target.value))}
                            className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={1}>1x (Conservative)</option>
                            <option value={2}>2x</option>
                            <option value={3}>3x (Recommended)</option>
                            <option value={5}>5x</option>
                            <option value={10}>10x (Risky)</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="dryRun"
                            checked={dryRun}
                            onChange={(e) => setDryRun(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="dryRun" className="text-sm text-gray-300">
                            Dry Run (Simulation Only) - RECOMMENDED for first trades
                        </label>
                    </div>
                </div>

                {/* Trade Estimates */}
                {estimates && (
                    <div className="bg-gray-700 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-white mb-3">Trade Estimates</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-400">Spot Value:</span>
                                <div className="font-mono text-blue-400">${estimates.spotValue.toFixed(2)}</div>
                            </div>
                            <div>
                                <span className="text-gray-400">Futures Value:</span>
                                <div className="font-mono text-purple-400">${estimates.futuresValue.toFixed(2)}</div>
                            </div>
                            <div>
                                <span className="text-gray-400">Total Fees:</span>
                                <div className="font-mono text-red-400">${estimates.totalFees.toFixed(2)}</div>
                            </div>
                            <div>
                                <span className="text-gray-400">Est. 8h Profit:</span>
                                <div className={`font-mono font-semibold ${estimates.estimatedProfit8h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${estimates.estimatedProfit8h.toFixed(2)} ({estimates.roi8h.toFixed(2)}%)
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Validation Errors */}
                {!validation.valid && (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4">
                        <h4 className="text-red-400 font-semibold mb-2">Trade Validation Errors:</h4>
                        <ul className="text-red-300 text-sm space-y-1">
                            {validation.errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExecuteTrade}
                        disabled={!validation.valid || isExecuting}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium ${
                            validation.valid && !isExecuting
                                ? dryRun 
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        }`}
                    >
                        {isExecuting 
                            ? 'Executing...' 
                            : dryRun 
                                ? '🧪 Simulate Trade' 
                                : '⚡ Execute Real Trade'
                        }
                    </button>
                </div>

                <div className="mt-4 text-xs text-gray-400 text-center">
                    {dryRun ? 
                        'Dry run mode: No real trades will be executed' :
                        '⚠️ REAL TRADING MODE: This will execute actual trades with your funds'
                    }
                </div>
            </div>
        </div>
    );
};

export default TradeConfirmationModal;
