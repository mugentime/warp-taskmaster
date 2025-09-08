import React, { useState, useEffect } from 'react';
import Card from './Card';

interface SimpleBotCreatorProps {
    apiKey: string;
    apiSecret: string;
    isConnected: boolean;
    onCreateBot: (config: BotConfig) => Promise<void>;
}

interface BotConfig {
    id: string;
    name: string;
    symbol: string;
    strategyType: 'Long Perp' | 'Short Perp';
    investment: number;
    leverage: number;
    autoManaged: boolean;
    autoConvert: boolean;
    dryRun: boolean;
}

interface PreflightResult {
    ok: boolean;
    requiresConversion: boolean;
    plan: any[];
    message: string;
}

const POPULAR_SYMBOLS = [
    'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT',
    'BNBUSDT', 'SOLUSDT', 'MATICUSDT', 'AVAXUSDT', 'ATOMUSDT'
];

const SimpleBotCreator: React.FC<SimpleBotCreatorProps> = ({
    apiKey,
    apiSecret,
    isConnected,
    onCreateBot
}) => {
    const [config, setConfig] = useState<BotConfig>({
        id: `bot-${Date.now()}`,
        name: 'Smart Trading Bot',
        symbol: 'BTCUSDT',
        strategyType: 'Long Perp',
        investment: 10,
        leverage: 3,
        autoManaged: true,
        autoConvert: true,
        dryRun: true
    });

    const [isCreating, setIsCreating] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [preflight, setPreflight] = useState<PreflightResult | null>(null);
    const [isRunningPreflight, setIsRunningPreflight] = useState(false);
    const [currentFundingRate, setCurrentFundingRate] = useState<number | null>(null);
    const [suggestedStrategy, setSuggestedStrategy] = useState<'Long Perp' | 'Short Perp' | null>(null);

    // Auto-generate bot name based on symbol and strategy
    useEffect(() => {
        const baseName = config.symbol.replace('USDT', '');
        const strategy = config.strategyType === 'Long Perp' ? 'Long' : 'Short';
        setConfig(prev => ({
            ...prev,
            name: `${baseName} ${strategy} Bot`,
            id: `${baseName.toLowerCase()}-${strategy.toLowerCase()}-${Date.now()}`
        }));
    }, [config.symbol, config.strategyType]);

    // Fetch current funding rate for strategy suggestion
    const fetchFundingRate = async (symbol: string) => {
        try {
            const response = await fetch(`http://localhost:3001/api/v1/funding-rates/${symbol}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                const fundingRate = data.data.fundingRate;
                setCurrentFundingRate(fundingRate);
                const optimal = fundingRate < 0 ? 'Short Perp' : 'Long Perp';
                setSuggestedStrategy(optimal);
                
                console.log(`📊 ${symbol} Funding Rate: ${(fundingRate * 100).toFixed(4)}% → Suggested: ${optimal}`);
            }
        } catch (error) {
            console.error('Failed to fetch funding rate:', error);
            setCurrentFundingRate(null);
            setSuggestedStrategy(null);
        }
    };

    // Fetch funding rate when symbol changes
    useEffect(() => {
        if (config.symbol && config.symbol.endsWith('USDT')) {
            fetchFundingRate(config.symbol);
        }
    }, [config.symbol]);

    const runPreflight = async () => {
        if (!isConnected || !config.symbol || !config.investment) return;

        setIsRunningPreflight(true);
        setError(null);
        
        try {
            const response = await fetch('http://localhost:3001/api/v1/preflight-bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey,
                    apiSecret,
                    symbol: config.symbol,
                    strategyType: config.strategyType,
                    investment: config.investment,
                    autoConvert: config.autoConvert,
                    dryRun: true
                })
            });

            const data = await response.json();
            
            if (data.success) {
                setPreflight(data.preflight);
            } else {
                setError(data.message || 'Preflight check failed');
            }
        } catch (err: any) {
            setError('Failed to run preflight check: ' + err.message);
        } finally {
            setIsRunningPreflight(false);
        }
    };

    // Run preflight automatically when key parameters change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isConnected && config.symbol && config.investment > 0) {
                runPreflight();
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [config.symbol, config.investment, config.strategyType, isConnected]);

    const handleCreateBot = async () => {
        if (!isConnected) {
            setError('Please connect your API keys first');
            return;
        }

        if (!preflight?.ok && !config.dryRun) {
            setError('Preflight check must pass before creating a live bot');
            return;
        }

        setIsCreating(true);
        setError(null);
        setResult(null);

        try {
            await onCreateBot({
                ...config,
                id: `${config.symbol.toLowerCase()}-${config.strategyType.replace(' ', '-').toLowerCase()}-${Date.now()}`
            });

            setResult({ 
                success: true, 
                message: `${config.name} ${config.dryRun ? '(dry run)' : ''} created successfully!`,
                details: `Strategy: ${config.strategyType} on ${config.symbol} with ${config.leverage}x leverage`
            });
        } catch (err: any) {
            setError(err.message || 'Failed to create bot');
            setResult(null);
        } finally {
            setIsCreating(false);
        }
    };

    const getPreflightStatusColor = () => {
        if (!preflight) return 'bg-gray-500';
        if (preflight.ok) return 'bg-green-500';
        if (preflight.requiresConversion) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getPreflightStatusText = () => {
        if (isRunningPreflight) return 'Checking...';
        if (!preflight) return 'Not checked';
        if (preflight.ok) return 'Ready';
        if (preflight.requiresConversion) return 'Needs conversion';
        return 'Not ready';
    };

    return (
        <Card title="🚀 Quick Trading Bot Creator">
            <div className="space-y-6" data-testid="simple-bot-creator">
                
                {/* Quick Setup Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Trading Pair
                        </label>
                        <select
                            value={config.symbol}
                            onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="symbol-select"
                        >
                            {POPULAR_SYMBOLS.map(symbol => (
                                <option key={symbol} value={symbol}>
                                    {symbol.replace('USDT', '/USDT')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Strategy Type
                            {suggestedStrategy && suggestedStrategy !== config.strategyType && (
                                <button
                                    onClick={() => setConfig({ ...config, strategyType: suggestedStrategy })}
                                    className="ml-2 text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded"
                                >
                                    Use Suggested: {suggestedStrategy}
                                </button>
                            )}
                        </label>
                        <select
                            value={config.strategyType}
                            onChange={(e) => setConfig({ ...config, strategyType: e.target.value as 'Long Perp' | 'Short Perp' })}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                suggestedStrategy && suggestedStrategy !== config.strategyType 
                                    ? 'border-yellow-500' 
                                    : 'border-gray-600'
                            }`}
                            data-testid="strategy-select"
                        >
                            <option value="Long Perp">Long Perp (Positive Funding Rates)</option>
                            <option value="Short Perp">Short Perp (Negative Funding Rates)</option>
                        </select>
                        {currentFundingRate !== null && (
                            <div className="mt-1 text-xs text-gray-400">
                                Current {config.symbol} funding: 
                                <span className={currentFundingRate < 0 ? 'text-red-400' : 'text-green-400'}>
                                    {(currentFundingRate * 100).toFixed(4)}% every 8h
                                </span>
                                {suggestedStrategy && (
                                    <span className="ml-2">→ Optimal: {suggestedStrategy}</span>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Investment (USDT)
                        </label>
                        <input
                            type="number"
                            step="1"
                            min="1"
                            value={config.investment}
                            onChange={(e) => setConfig({ ...config, investment: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="investment-input"
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
                            data-testid="leverage-select"
                        >
                            <option value={1}>1x (Safe)</option>
                            <option value={2}>2x (Low Risk)</option>
                            <option value={3}>3x (Moderate)</option>
                            <option value={5}>5x (High Risk)</option>
                            <option value={10}>10x (Very High Risk)</option>
                        </select>
                    </div>
                </div>

                {/* Strategy Explanation */}
                <div className={`border rounded px-4 py-3 ${
                    config.strategyType === 'Long Perp' 
                        ? 'bg-green-900/30 border-green-700 text-green-200'
                        : 'bg-red-900/30 border-red-700 text-red-200'
                }`}>
                    <h4 className="font-semibold mb-2">
                        📈 {config.strategyType} Strategy on {config.symbol}:
                    </h4>
                    <ul className="text-sm space-y-1">
                        {config.strategyType === 'Long Perp' ? (
                            <>
                                <li>• <strong>Best for:</strong> Positive funding rates (shorts pay longs)</li>
                                <li>• <strong>Strategy:</strong> Sell spot {config.symbol.replace('USDT', '')}, Buy futures with {config.leverage}x leverage</li>
                                <li>• <strong>Profit:</strong> Collect funding payments every 8 hours</li>
                                <li>• <strong>Risk:</strong> Price divergence between spot and futures</li>
                            </>
                        ) : (
                            <>
                                <li>• <strong>Best for:</strong> Negative funding rates (longs pay shorts)</li>
                                <li>• <strong>Strategy:</strong> Buy spot {config.symbol.replace('USDT', '')}, Sell futures with {config.leverage}x leverage</li>
                                <li>• <strong>Profit:</strong> Collect funding payments every 8 hours</li>
                                <li>• <strong>Risk:</strong> Price divergence between spot and futures</li>
                            </>
                        )}
                        <li>• <strong>Investment:</strong> {config.investment} USDT total exposure</li>
                    </ul>
                </div>

                {/* Preflight Status */}
                {isConnected && (
                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                        <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${getPreflightStatusColor()}`}></div>
                            <span className="text-sm">
                                <strong>Status:</strong> {getPreflightStatusText()}
                            </span>
                        </div>
                        {preflight?.requiresConversion && (
                            <span className="text-xs text-yellow-400">
                                {preflight.plan.length} conversions needed
                            </span>
                        )}
                    </div>
                )}

                {/* Settings */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-6">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.autoConvert}
                                onChange={(e) => setConfig({ ...config, autoConvert: e.target.checked })}
                                className="mr-2"
                                data-testid="auto-convert-checkbox"
                            />
                            <span className="text-gray-300">Auto Convert Assets</span>
                        </label>

                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.dryRun}
                                onChange={(e) => setConfig({ ...config, dryRun: e.target.checked })}
                                className="mr-2"
                                data-testid="dry-run-checkbox"
                            />
                            <span className="text-gray-300">
                                {config.dryRun ? 'Test Mode (Safe)' : 'Live Trading (Real Money!)'}
                            </span>
                        </label>
                    </div>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 border border-red-700 rounded px-3 py-2" data-testid="error-message">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {result && result.success && (
                    <div className="flex items-center space-x-2 text-green-400 bg-green-900/20 border border-green-700 rounded px-3 py-2" data-testid="success-message">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div>
                            <div className="text-sm font-medium">{result.message}</div>
                            {result.details && <div className="text-xs text-gray-400">{result.details}</div>}
                        </div>
                    </div>
                )}

                {/* Create Bot Button */}
                <button
                    onClick={handleCreateBot}
                    disabled={isCreating || !isConnected || (!config.dryRun && !preflight?.ok)}
                    className={`w-full py-3 px-4 rounded font-medium transition-colors ${
                        isCreating || !isConnected || (!config.dryRun && !preflight?.ok)
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : config.dryRun
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                    data-testid="create-bot-button"
                >
                    {isCreating ? (
                        <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating Bot...
                        </span>
                    ) : (
                        `${config.dryRun ? '🧪 Test Bot' : '🚀 Create Live Bot'} - ${config.name}`
                    )}
                </button>

                {/* Warning for live trading */}
                {!config.dryRun && (
                    <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded text-sm">
                        <strong>⚠️ Warning:</strong> Live trading mode is enabled. This bot will use real money. 
                        Make sure you understand the risks and have tested with dry run first.
                    </div>
                )}
            </div>
        </Card>
    );
};

export default SimpleBotCreator;
