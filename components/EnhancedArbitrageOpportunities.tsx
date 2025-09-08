import React, { useState, useEffect } from 'react';
import type { ArbitrageOpportunity, ArbitrageOpportunitiesResponse } from '../types';

interface EnhancedArbitrageOpportunitiesProps {
    onImplement?: (opportunity: ArbitrageOpportunity, isShort: boolean) => void;
}

const RatingBadge: React.FC<{ rating: string }> = ({ rating }) => {
    const colors = {
        'EXTREME': 'bg-red-600 text-white',
        'HIGH': 'bg-orange-500 text-white', 
        'MEDIUM': 'bg-yellow-500 text-black',
        'LOW': 'bg-green-500 text-white'
    };
    
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[rating as keyof typeof colors]}`}>
            {rating}
        </span>
    );
};

const StrategyBadge: React.FC<{ strategy: string }> = ({ strategy }) => {
    const isShort = strategy.includes('Short');
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            isShort ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
            {strategy}
        </span>
    );
};

const EnhancedArbitrageOpportunities: React.FC<EnhancedArbitrageOpportunitiesProps> = ({ onImplement }) => {
    const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number>(0);
    const [summary, setSummary] = useState<any>(null);
    const [selectedRating, setSelectedRating] = useState<string>('MEDIUM');

    const fetchOpportunities = async () => {
        try {
            setError(null);
            const response = await fetch(`/api/v1/arbitrage-opportunities?minRating=${selectedRating}&limit=50`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Expected JSON, received: ${contentType}. Content: ${text.substring(0, 100)}...`);
            }
            
            const data: ArbitrageOpportunitiesResponse = await response.json();
            
            if (data.success) {
                setOpportunities(data.opportunities);
                setSummary(data.summary);
                setLastUpdated(data.lastUpdated);
            } else {
                throw new Error(data.message || 'Failed to fetch opportunities');
            }
        } catch (err) {
            console.error('Error fetching arbitrage opportunities:', err);
            if (err instanceof Error) {
                if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                    setError('Cannot connect to backend server. Please check if the server is running on http://localhost:3001');
                } else {
                    setError(err.message);
                }
            } else {
                setError('Unknown error occurred');
            }
            setOpportunities([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOpportunities();
        const interval = setInterval(fetchOpportunities, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, [selectedRating]);

    const handleImplement = (opportunity: ArbitrageOpportunity) => {
        const isShort = opportunity.strategy.includes('Short');
        onImplement?.(opportunity, isShort);
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    const getCacheAge = () => {
        if (!lastUpdated) return 'Unknown';
        const ageMs = Date.now() - lastUpdated;
        const ageSeconds = Math.floor(ageMs / 1000);
        if (ageSeconds < 60) return `${ageSeconds}s ago`;
        const ageMinutes = Math.floor(ageSeconds / 60);
        return `${ageMinutes}m ago`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
                <strong className="font-bold">Error: </strong>
                <span>{error}</span>
                <button 
                    onClick={fetchOpportunities}
                    className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Live Arbitrage Opportunities</h3>
                    {summary && (
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                            <span>Total: {summary.totalOpportunities}</span>
                            <span className="text-red-400">Extreme: {summary.ratings.extreme}</span>
                            <span className="text-orange-400">High: {summary.ratings.high}</span>
                            <span className="text-yellow-400">Medium: {summary.ratings.medium}</span>
                            <span>Updated: {getCacheAge()}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-400">Min Rating:</label>
                    <select 
                        value={selectedRating}
                        onChange={(e) => setSelectedRating(e.target.value)}
                        className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 text-sm"
                    >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="EXTREME">EXTREME</option>
                    </select>
                    <button 
                        onClick={fetchOpportunities}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Opportunities Table */}
            {opportunities.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    No opportunities found for the selected rating level.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-200 uppercase bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3">Rating</th>
                                <th className="px-4 py-3">Strategy</th>
                                <th className="px-4 py-3 text-right">Funding Rate</th>
                                <th className="px-4 py-3 text-right">Annualized</th>
                                <th className="px-4 py-3 text-right">8h Return</th>
                                <th className="px-4 py-3 text-right">Score</th>
                                <th className="px-4 py-3 text-right">Liquidity</th>
                                <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {opportunities.map((opportunity, index) => (
                                <tr key={`${opportunity.symbol}-${index}`} className="border-b border-gray-700 hover:bg-gray-700/30">
                                    <td className="px-4 py-3 font-semibold text-white">
                                        {opportunity.symbol}
                                    </td>
                                    <td className="px-4 py-3">
                                        <RatingBadge rating={opportunity.rating} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <StrategyBadge strategy={opportunity.strategy} />
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono ${
                                        opportunity.fundingRate >= 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                        {opportunity.fundingRatePercent}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-yellow-400">
                                        {opportunity.annualizedRate}%
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-blue-400">
                                        {opportunity.estimatedReturn8h}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {opportunity.score.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-400">
                                        ${(opportunity.liquidity / 1000000).toFixed(1)}M
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleImplement(opportunity)}
                                            className={`px-3 py-1 rounded text-xs font-semibold ${
                                                opportunity.rating === 'EXTREME' 
                                                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                                                    : opportunity.rating === 'HIGH'
                                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                            }`}
                                        >
                                            {opportunity.rating === 'EXTREME' ? '🔥 TRADE' : 'Trade'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Summary Stats */}
            {summary && opportunities.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{summary.ratings.extreme}</div>
                        <div className="text-xs text-gray-400">EXTREME</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-400">{summary.ratings.high}</div>
                        <div className="text-xs text-gray-400">HIGH</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{summary.ratings.medium}</div>
                        <div className="text-xs text-gray-400">MEDIUM</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{summary.ratings.low}</div>
                        <div className="text-xs text-gray-400">LOW</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedArbitrageOpportunities;
