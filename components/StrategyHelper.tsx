import React, { useState } from 'react';

const StrategyHelper: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="text-2xl">🎯</div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Smart Strategy Selection</h3>
                        <p className="text-sm text-gray-300">
                            The system now auto-selects the optimal strategy based on funding rates
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-blue-300 hover:text-blue-200 text-sm underline"
                >
                    {isExpanded ? 'Hide Details' : 'Learn How'}
                </button>
            </div>

            {isExpanded && (
                <div className="mt-4 space-y-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-red-900/30 border border-red-700 rounded p-3">
                            <h4 className="font-semibold text-red-300 flex items-center mb-2">
                                📉 Negative Funding Rate → Short Perp Strategy
                            </h4>
                            <ul className="text-red-200 space-y-1 text-xs">
                                <li>• When funding rate is <strong>negative</strong> (like RED: -0.3148%)</li>
                                <li>• Long positions pay short positions every 8 hours</li>
                                <li>• <strong>Strategy:</strong> Buy spot asset + Sell futures</li>
                                <li>• <strong>Profit:</strong> Collect funding payments from longs</li>
                                <li>• <strong>Requirements:</strong> USDT only (no base asset needed)</li>
                            </ul>
                        </div>

                        <div className="bg-green-900/30 border border-green-700 rounded p-3">
                            <h4 className="font-semibold text-green-300 flex items-center mb-2">
                                📈 Positive Funding Rate → Long Perp Strategy
                            </h4>
                            <ul className="text-green-200 space-y-1 text-xs">
                                <li>• When funding rate is <strong>positive</strong></li>
                                <li>• Short positions pay long positions every 8 hours</li>
                                <li>• <strong>Strategy:</strong> Sell spot asset + Buy futures</li>
                                <li>• <strong>Profit:</strong> Collect funding payments from shorts</li>
                                <li>• <strong>Requirements:</strong> Own the base asset to sell</li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3">
                        <h4 className="font-semibold text-yellow-300 mb-2">
                            ⚡ What's New:
                        </h4>
                        <ul className="text-yellow-200 space-y-1 text-xs">
                            <li>✅ <strong>Auto-Strategy Selection:</strong> System picks optimal strategy based on current funding rate</li>
                            <li>✅ <strong>Enhanced Error Prevention:</strong> Margin preflight validation prevents insufficient balance errors</li>
                            <li>✅ <strong>Smart Asset Management:</strong> Auto-converts assets when needed</li>
                            <li>✅ <strong>Real-time Funding Data:</strong> Live funding rates from Binance API</li>
                        </ul>
                    </div>

                    <div className="text-center">
                        <div className="text-xs text-gray-400">
                            💡 <strong>Pro Tip:</strong> For RED with -0.3148% funding rate, use Short Perp to earn ~0.31% every 8 hours (~35% annually)
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategyHelper;
