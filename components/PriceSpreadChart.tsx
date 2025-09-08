
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SpreadHistoryPoint } from '../types';

interface PriceSpreadChartProps {
    data: SpreadHistoryPoint[];
}

const PriceSpreadChart: React.FC<PriceSpreadChartProps> = ({ data }) => {
    return (
        <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
                <LineChart
                    data={data}
                    margin={{
                        top: 5, right: 20, left: -10, bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                    <XAxis dataKey="time" stroke="#a0aec0" fontSize={12} />
                    <YAxis stroke="#a0aec0" fontSize={12} domain={['dataMin - 0.2', 'dataMax + 0.2']} />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#1a202c', 
                            borderColor: '#2d3748',
                            borderRadius: '0.5rem'
                        }}
                        labelStyle={{ color: '#cbd5e0' }}
                    />
                    <Legend wrapperStyle={{fontSize: "14px"}}/>
                    <Line type="monotone" dataKey="spread" stroke="#F0B90B" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Spread ($)" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PriceSpreadChart;