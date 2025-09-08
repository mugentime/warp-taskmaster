
import React from 'react';
import type { FundingData } from '../types';

interface FundingOpportunitiesProps {
    positiveRates: FundingData[];
    negativeRates: FundingData[];
    onImplement: (opportunity: FundingData, isShort: boolean) => void;
}

const getBaseAsset = (symbol: string) => {
    // A simple utility to extract the base asset from a symbol like BTCUSDT -> BTC
    const quoteAssets = ['USDT', 'BUSD', 'USDC', 'FDUSD', 'TUSD'];
    for (const quote of quoteAssets) {
        if (symbol.endsWith(quote)) {
            return symbol.replace(quote, '');
        }
    }
    return symbol;
}

const StrategyTable: React.FC<{ title: string; data: FundingData[], isShort: boolean, onImplement: (opportunity: FundingData, isShort: boolean) => void; }> = ({ title, data, isShort, onImplement }) => {
    const calculateAPR = (rate: number) => {
        // Funding is typically every 8 hours, so 3 times a day.
        return (rate * 3 * 365 * 100).toFixed(2);
    };

    return (
        <div>
            <h3 className="text-md font-semibold text-gray-300 mb-2">{title}</h3>
            <p className="text-xs text-gray-500 italic mb-3">
                APR is an estimate based on the current live rate and is subject to change.
            </p>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-4 py-2">Strategy</th>
                            <th scope="col" className="px-4 py-2 text-right">Current Rate</th>
                            <th scope="col" className="px-4 py-2 text-right">Est. APR</th>
                            <th scope="col" className="px-4 py-2 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => {
                            const apr = calculateAPR(item.fundingRate);
                            const baseAsset = getBaseAsset(item.symbol);
                            const rateColor = 'text-green-400'; // Both tables show earning opportunities

                            return (
                                <tr key={item.symbol} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <th scope="row" className="px-4 py-2 font-medium text-white whitespace-nowrap">
                                        {isShort ? (
                                            <div>
                                                <span className="font-bold text-red-400">SHORT</span> {item.symbol} Perp
                                            </div>
                                        ) : (
                                            <div>
                                                <span className="font-bold text-green-400">LONG</span> {item.symbol} Perp
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500">
                                            {isShort ? `Buy ${baseAsset} Spot` : `Sell ${baseAsset} Spot`}
                                        </div>
                                    </th>
                                    <td className={`px-4 py-2 text-right font-mono ${rateColor}`}>
                                        {`${(item.fundingRate * 100).toFixed(4)}%`}
                                    </td>
                                    <td className={`px-4 py-2 text-right font-mono ${rateColor}`}>
                                        {apr}%
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button 
                                            onClick={() => onImplement(item, isShort)}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-1 px-3 rounded text-xs transition-colors"
                                        >
                                            Create Bot
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const FundingOpportunities: React.FC<FundingOpportunitiesProps> = ({ positiveRates, negativeRates, onImplement }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <StrategyTable title="High Positive Rates (Short Perp to Earn)" data={positiveRates} isShort={true} onImplement={onImplement} />
            <StrategyTable title="High Negative Rates (Long Perp to Earn)" data={negativeRates.map(d => ({...d, fundingRate: -d.fundingRate}))} isShort={false} onImplement={onImplement} />
        </div>
    );
};

export default FundingOpportunities;