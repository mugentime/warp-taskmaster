
import React from 'react';
import type { PositionData } from '../types';

interface OpenPositionsProps {
    data: PositionData[];
}

const OpenPositions: React.FC<OpenPositionsProps> = ({ data }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                    <tr>
                        <th scope="col" className="px-4 py-3">Symbol</th>
                        <th scope="col" className="px-4 py-3">Side</th>
                        <th scope="col" className="px-4 py-3 text-right">Quantity</th>
                        <th scope="col" className="px-4 py-3 text-right">Entry Price</th>
                        <th scope="col" className="px-4 py-3 text-right">Mark Price</th>
                        <th scope="col" className="px-4 py-3 text-right">Unrealized PNL</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((pos) => {
                        const isPnlPositive = pos.pnl >= 0;
                        const isLong = pos.side === 'LONG';
                        return (
                            <tr key={pos.symbol} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <th scope="row" className="px-4 py-3 font-medium text-white whitespace-nowrap">
                                    {pos.symbol}
                                </th>
                                <td className={`px-4 py-3 font-semibold ${isLong ? 'text-green-500' : 'text-red-500'}`}>
                                    {pos.side}
                                </td>
                                <td className="px-4 py-3 text-right font-mono">
                                    {pos.quantity}
                                </td>
                                <td className="px-4 py-3 text-right font-mono">
                                    ${pos.entryPrice.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-mono">
                                    ${pos.markPrice.toLocaleString()}
                                </td>
                                <td className={`px-4 py-3 text-right font-mono ${isPnlPositive ? 'text-green-400' : 'text-red-400'}`}>
                                    {isPnlPositive ? '+' : ''}${pos.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default OpenPositions;