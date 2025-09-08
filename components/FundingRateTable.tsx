
import React, { useState, useEffect } from 'react';
import type { FundingData } from '../types';

interface FundingRateTableProps {
    data: FundingData[];
}

const Countdown: React.FC<{ nextFundingTime: number }> = ({ nextFundingTime }) => {
    // FIX: The calculateTimeLeft function is updated to always return an object
    // with h, m, and s properties to prevent type errors. When the countdown
    // is finished, it now returns '00' for each unit.
    const calculateTimeLeft = () => {
        const difference = nextFundingTime - +new Date();

        if (difference > 0) {
            return {
                h: Math.floor((difference / (1000 * 60 * 60)) % 24).toString().padStart(2, '0'),
                m: Math.floor((difference / 1000 / 60) % 60).toString().padStart(2, '0'),
                s: Math.floor((difference / 1000) % 60).toString().padStart(2, '0'),
            };
        }
        return { h: '00', m: '00', s: '00' };
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearTimeout(timer);
    });

    return (
        <span>{timeLeft.h}:{timeLeft.m}:{timeLeft.s}</span>
    );
}


const FundingRateTable: React.FC<FundingRateTableProps> = ({ data }) => {
    return (
        <div className="overflow-x-auto h-full">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                    <tr>
                        <th scope="col" className="px-4 py-2">Symbol</th>
                        <th scope="col" className="px-4 py-2 text-right">Funding Rate</th>
                        <th scope="col" className="px-4 py-2 text-right">Mark Price</th>
                        <th scope="col" className="px-4 py-2 text-right">Next Funding</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => {
                        const isPositive = item.fundingRate >= 0;
                        return (
                            <tr key={item.symbol} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <th scope="row" className="px-4 py-2 font-medium text-white whitespace-nowrap">
                                    {item.symbol}
                                </th>
                                <td className={`px-4 py-2 text-right font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                    {`${(item.fundingRate * 100).toFixed(4)}%`}
                                </td>
                                <td className="px-4 py-2 text-right font-mono">
                                    {item.markPrice.toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-right font-mono">
                                    <Countdown nextFundingTime={item.nextFundingTime} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default FundingRateTable;