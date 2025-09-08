
import React from 'react';
import type { AccountBalance } from '../types';
import Card from './Card';

interface AccountStatusProps {
    balance: AccountBalance | null;
    loading: boolean;
    error: string | null;
    onCheckBalance: () => void;
}

const AccountStatus: React.FC<AccountStatusProps> = ({ balance, loading, error, onCheckBalance }) => {
    
    const StatusIcon: React.FC<{ status: 'connected' | 'error' | 'idle' }> = ({ status }) => {
        const color = {
            connected: 'bg-green-500',
            error: 'bg-red-500',
            idle: 'bg-gray-500',
        }[status];
        const title = {
            connected: 'Successfully connected to Binance',
            error: 'Connection failed',
            idle: 'Idle',
        }[status];
        return <div className={`w-3 h-3 rounded-full ${color}`} title={title}></div>;
    };
    
    return (
        <Card title="Account Status">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                    {loading && (
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-yellow-400"></div>
                            <span className="text-gray-400">Verifying connection...</span>
                        </div>
                    )}
                    
                    {error && (
                         <div className="flex items-center space-x-2">
                            <StatusIcon status="error" />
                            <div>
                                <p className="text-red-400 font-semibold">Connection Failed: <span className="font-normal">{error}</span></p>
                                {error.includes('backend server') && (
                                    <p className="text-gray-400 text-xs mt-1">Please ensure the backend server from the `backend` directory is running and try again.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {balance && !loading && !error && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <StatusIcon status="connected" />
                                <div className="flex flex-wrap gap-x-6 gap-y-1">
                                    <div>
                                        <span className="text-sm text-gray-400">Total Portfolio Value: </span>
                                        <span className="font-bold text-lg text-white">{balance.totalValueUSDT || balance.totalWalletBalance} USDT</span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-400">Available USDT: </span>
                                        <span className="font-bold text-lg text-white">{balance.usdtAvailableBalance} USDT</span>
                                    </div>
                                    {balance.totalAssets && (
                                        <div>
                                            <span className="text-sm text-gray-400">Assets: </span>
                                            <span className="font-bold text-lg text-white">{balance.totalAssets}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Detailed Balances Table */}
                            {balance.detailedBalances && balance.detailedBalances.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Asset Breakdown:</h4>
                                    <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                                        <div className="max-h-48 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-700/50 sticky top-0">
                                                    <tr>
                                                        <th className="text-left p-2 text-gray-300 font-medium">Asset</th>
                                                        <th className="text-right p-2 text-gray-300 font-medium">Balance</th>
                                                        <th className="text-right p-2 text-gray-300 font-medium">Value (USDT)</th>
                                                        <th className="text-right p-2 text-gray-300 font-medium">Price</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {balance.detailedBalances
                                                        .filter(asset => parseFloat(asset.total) > 0)
                                                        .map((asset, index) => (
                                                        <tr key={asset.asset} className={`${index % 2 === 0 ? 'bg-gray-800/30' : 'bg-transparent'} hover:bg-gray-700/30`}>
                                                            <td className="p-2">
                                                                <span className="font-medium text-white">{asset.asset}</span>
                                                                {parseFloat(asset.locked) > 0 && (
                                                                    <span className="ml-1 text-xs text-yellow-400" title="Some balance is locked">🔒</span>
                                                                )}
                                                            </td>
                                                            <td className="p-2 text-right text-gray-300">
                                                                {parseFloat(asset.total).toFixed(6)}
                                                            </td>
                                                            <td className="p-2 text-right font-medium text-white">
                                                                ${parseFloat(asset.valueUSDT).toFixed(2)}
                                                            </td>
                                                            <td className="p-2 text-right text-gray-400 text-xs">
                                                                {asset.asset === 'USDT' ? '1.0000' : parseFloat(asset.priceUSDT).toFixed(4)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    
                                    {/* Summary */}
                                    {balance.summary && (
                                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-400">
                                            <div>Stablecoins: ${balance.summary.stablecoins}</div>
                                            <div>Crypto: ${balance.summary.crypto}</div>
                                            {balance.summary.unconvertible > 0 && (
                                                <div>Unconvertible: {balance.summary.unconvertible} assets</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {!loading && !error && !balance && (
                        <div className="flex items-center space-x-2">
                            <StatusIcon status="idle" />
                            <p className="text-gray-400">Click "Verify Connection" to connect to your backend and check balance.</p>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={onCheckBalance}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors w-full sm:w-auto disabled:bg-blue-800/50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Verifying...' : 'Verify Connection'}
                </button>
            </div>
        </Card>
    );
};

export default AccountStatus;