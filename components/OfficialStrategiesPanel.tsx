
import React from 'react';
import type { OfficialBotStrategy } from '../types';
import Card from './Card';

interface OfficialStrategiesPanelProps {
    strategies: OfficialBotStrategy[];
}

const StrategyTypeBadge: React.FC<{ type: string }> = ({ type }) => {
    const colors = {
        'Funding Rate': 'bg-blue-900 text-blue-300',
        'Spot-Futures Spread': 'bg-purple-900 text-purple-300',
        'Triangular': 'bg-green-900 text-green-300',
    };
    const colorClass = colors[type as keyof typeof colors] || 'bg-gray-700 text-gray-300';
    return <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>{type}</span>;
}

const OfficialStrategiesPanel: React.FC<OfficialStrategiesPanelProps> = ({ strategies }) => {
    return (
        <Card title="Official Binance Arbitrage Bot Strategies (Reference)">
            <div className="space-y-4">
                <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg" role="alert">
                    <p><strong className="font-bold">For Reference Only: </strong> This is a representative list of strategies available in Binance's automated bot product. This list is static as Binance does not provide a live API for it.</p>
                </div>
                {strategies.map(strategy => (
                    <div key={strategy.name} className="bg-gray-700/50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-md font-bold text-white">{strategy.name}</h3>
                            <StrategyTypeBadge type={strategy.type} />
                        </div>
                        <p className="text-sm text-gray-400">{strategy.description}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default OfficialStrategiesPanel;