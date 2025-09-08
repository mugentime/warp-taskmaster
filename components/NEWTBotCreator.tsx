import React, { useState, useEffect } from 'react';
import Card from './Card';

interface NEWTBotCreatorProps {
    apiKey: string;
    apiSecret: string;
    isConnected: boolean;
    onCreateBot: (config: NEWTBotConfig) => Promise<void>;
}

interface NEWTBotConfig {
    id: string;
    name: string;
    symbol: string;
    strategyType: string;
    investment: number;
    leverage: number;
    autoManaged: boolean;
    autoConvert: boolean;
    dryRun: boolean;
    expectedAnnualReturn?: number;
    fundingRate?: number;
}

interface BestOpportunity {
    symbol: string;
    strategy: string;
    fundingRate: number;
    fundingRatePercent: string;
    annualizedRate: string;
    liquidity: number;
    rating: string;
    nextFunding: string;
}

const NEWTBotCreator: React.FC<NEWTBotCreatorProps> = ({ 
    apiKey, 
    apiSecret, 
    isConnected, 
    onCreateBot 
}) => {
    const [bestOpportunity, setBestOpportunity] = useState<BestOpportunity | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [config, setConfig] = useState<NEWTBotConfig>({
        id: `best-opportunity-${Date.now()}`,
        name: 'Loading Best Opportunity...',
        symbol: 'LOADING',
        strategyType: 'Loading...',
        investment: 20,
        leverage: 3,
        autoManaged: true,
        autoConvert: true,
        dryRun: false
    });

    const [isCreating, setIsCreating] = useState(false);
    const [result, setResult] = useState<any>(null);
    
    // Fetch best opportunity
    const fetchBestOpportunity = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch('/api/v1/arbitrage-opportunities?limit=1');
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText}. ${text.substring(0, 100)}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Expected JSON, got ${contentType}`);
            }
            
            const data = await response.json();
            if (data.success && data.opportunities?.length > 0) {
                const best = data.opportunities[0];
                setBestOpportunity(best);
                
                // Update config with best opportunity
                const strategyType = best.strategy.includes('Short') ? 'Arbitrage' : 'Long Perp';
                setConfig(prev => ({
                    ...prev,
                    id: `best-${best.symbol.toLowerCase()}-${Date.now()}`,
                    name: `BEST: ${best.symbol} ${strategyType} (${best.annualizedRate}% APY)`,
                    symbol: best.symbol,
                    strategyType: strategyType,
                    expectedAnnualReturn: parseFloat(best.annualizedRate),
                    fundingRate: best.fundingRate
                }));
            } else {
                throw new Error('No opportunities available');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch best opportunity');
            console.error('Error fetching best opportunity:', err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchBestOpportunity();
        const interval = setInterval(fetchBestOpportunity, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const handleCreateBot = async () => {
        if (!isConnected) {
            setError('Please connect your API keys first');
            return;
        }

        setIsCreating(true);
        setError(null);
        setResult(null);

        try {
            await onCreateBot({
                ...config,
                id: `best-${config.symbol.toLowerCase()}-${Date.now()}` // Generate new ID for each attempt
            });
            setResult({ success: true, message: `${config.symbol} bot created successfully!` });
        } catch (err: any) {
            setError(err.message || 'Failed to create bot');
            setResult(null);
        } finally {
            setIsCreating(false);
        }
    };

    const StatusIcon: React.FC<{ status: 'success' | 'error' | 'warning' }> = ({ status }) => {
        const color = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
        }[status];
        return <div className={`w-3 h-3 rounded-full ${color}`}></div>;
    };

    const getTitle = () => {
        if (loading) return "🔄 Finding Best Opportunity...";
        if (error) return "❌ Error Loading Opportunity";
        if (bestOpportunity) {
            return `🏆 BEST: ${bestOpportunity.symbol} (${bestOpportunity.rating})`;
        }
        return "🤖 Best Opportunity Bot Creator";
    };

    const getRatingColor = (rating: string) => {
        const colors = {
            'EXTREME': 'border-red-500 bg-red-900/20 text-red-200',
            'HIGH': 'border-orange-500 bg-orange-900/20 text-orange-200',
            'MEDIUM': 'border-yellow-500 bg-yellow-900/20 text-yellow-200',
            'LOW': 'border-green-500 bg-green-900/20 text-green-200'
        };
        return colors[rating as keyof typeof colors] || 'border-blue-500 bg-blue-900/20 text-blue-200';
    };

    if (loading) {
        return (
            <Card title={getTitle()}>
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
                    <span className="ml-3 text-gray-400">Analyzing 127 opportunities...</span>
                </div>
            </Card>
        );
    }

    return (
        <Card title={getTitle()}>
            <div className="space-y-6" data-testid="best-opportunity-bot-creator">
                {/* Dynamic Opportunity Display */}
                {bestOpportunity && (
                    <div className={`border px-4 py-3 rounded ${getRatingColor(bestOpportunity.rating)}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">🎯 Current Best Opportunity:</h4>
                            <button 
                                onClick={fetchBestOpportunity}
                                className="text-xs bg-black/20 hover:bg-black/30 px-2 py-1 rounded"
                            >
                                🔄 Refresh
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                                <span className="text-gray-400">Symbol:</span>
                                <div className="font-mono font-bold">{bestOpportunity.symbol}</div>
                            </div>
                            <div>
                                <span className="text-gray-400">Annual Return:</span>
                                <div className="font-mono font-bold">{bestOpportunity.annualizedRate}%</div>
                            </div>
                            <div>
                                <span className="text-gray-400">Funding Rate:</span>
                                <div className="font-mono">{bestOpportunity.fundingRatePercent}</div>
                            </div>
                            <div>
                                <span className="text-gray-400">Liquidity:</span>
                                <div className="font-mono">${(bestOpportunity.liquidity/1000000).toFixed(1)}M</div>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">
                            Strategy: {bestOpportunity.strategy} | Next funding: {new Date(bestOpportunity.nextFunding).toLocaleTimeString()}
                        </div>
                    </div>
                )}

                {/* Bot Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Bot Name
                        </label>
                        <input
                            type="text"
                            value={config.name}
                            onChange={(e) => setConfig({ ...config, name: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="bot-name-input"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Symbol
                        </label>
                        <input
                            type="text"
                            value={config.symbol}
                            onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="bot-symbol-input"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Investment (USDT)
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            value={config.investment}
                            onChange={(e) => setConfig({ ...config, investment: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="bot-investment-input"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Leverage
                        </label>
                        <select
                            value={config.leverage}
                            onChange={(e) => setConfig({ ...config, leverage: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="bot-leverage-select"
                        >
                            <option value={1}>1x (Conservative)</option>
                            <option value={3}>3x (Recommended)</option>
                            <option value={5}>5x (Moderate)</option>
                            <option value={10}>10x (Aggressive)</option>
                        </select>
                    </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-300">Advanced Options:</h4>
                    
                    <div className="flex items-center space-x-6">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.autoManaged}
                                onChange={(e) => setConfig({ ...config, autoManaged: e.target.checked })}
                                className="mr-2"
                                data-testid="auto-managed-checkbox"
                            />
                            <span className="text-sm text-gray-300">Auto Management</span>
                        </label>

                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.autoConvert}
                                onChange={(e) => setConfig({ ...config, autoConvert: e.target.checked })}
                                className="mr-2"
                                data-testid="auto-convert-checkbox"
                            />
                            <span className="text-sm text-gray-300">Auto Convert Assets</span>
                        </label>

                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.dryRun}
                                onChange={(e) => setConfig({ ...config, dryRun: e.target.checked })}
                                className="mr-2"
                                data-testid="dry-run-checkbox"
                            />
                            <span className="text-sm text-gray-300">Dry Run (Test Mode)</span>
                        </label>
                    </div>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 border border-red-700 rounded px-3 py-2" data-testid="opportunity-error-message">
                            <StatusIcon status="error" />
                            <span className="text-sm">Opportunity Error: {error}</span>
                            <button 
                                onClick={fetchBestOpportunity}
                                className="ml-auto text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {result && result.success && (
                    <div className="flex items-center space-x-2 text-green-400 bg-green-900/20 border border-green-700 rounded px-3 py-2" data-testid="bot-success-message">
                        <StatusIcon status="success" />
                        <span className="text-sm">{result.message}</span>
                    </div>
                )}

                {!isConnected && (
                    <div className="flex items-center space-x-2 text-yellow-400 bg-yellow-900/20 border border-yellow-700 rounded px-3 py-2">
                        <StatusIcon status="warning" />
                        <span className="text-sm">Please connect your Binance API keys first</span>
                    </div>
                )}

                {/* Create Bot Button */}
                <div className="flex space-x-3">
                    <button
                        onClick={handleCreateBot}
                        disabled={!isConnected || isCreating}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                        data-testid="create-bot-button"
                    >
                        {isCreating ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                <span>Creating {config.symbol} Bot...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center space-x-2">
                                <span>🏆</span>
                                <span>Create BEST Opportunity Bot ({config.symbol})</span>
                            </div>
                        )}
                    </button>

                    {config.dryRun && (
                        <div className="flex-shrink-0 bg-yellow-600 text-white px-3 py-3 rounded text-sm font-medium">
                            🧪 TEST MODE
                        </div>
                    )}
                </div>

                {/* Dynamic Automation Preview */}
                <div className="bg-gray-800/50 rounded p-4 text-sm">
                    <h4 className="font-semibold text-gray-300 mb-2">🔄 Automated Process Preview:</h4>
                    {bestOpportunity ? (
                        <div className="space-y-1 text-gray-400">
                            <div>1. 📁 Analyze all wallet balances (Spot, Futures, Margin, Isolated)</div>
                            <div>2. 🔍 Locate {bestOpportunity.symbol.replace('USDT', '')} assets across all wallets</div>
                            <div>3. 🔄 Transfer assets to optimal wallets (if needed)</div>
                            <div>4. 💰 Ensure USDT in Futures wallet (if needed)</div>
                            <div>5. 💱 Convert other assets to required currencies (if needed)</div>
                            <div>6. 📈 Execute {bestOpportunity.strategy} on {bestOpportunity.symbol}</div>
                            <div>7. 🎯 Collect {bestOpportunity.fundingRatePercent} funding rate every 8h</div>
                            <div>8. ✅ Activate automated management & monitoring</div>
                        </div>
                    ) : (
                        <div className="text-gray-500 text-center py-4">
                            No opportunity loaded
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default NEWTBotCreator;
