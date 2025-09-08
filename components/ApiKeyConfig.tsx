import React, { useState, useEffect } from 'react';
import Card from './Card';

interface ApiKeyConfigProps {
    onApiKeysSet: (apiKey: string, apiSecret: string) => void;
    onTestConnection: (apiKey: string, apiSecret: string) => Promise<boolean>;
}

const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({ onApiKeysSet, onTestConnection }) => {
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSecrets, setShowSecrets] = useState(false);

    // Load saved API keys on component mount
    useEffect(() => {
        const savedApiKey = localStorage.getItem('temp-api-key');
        const savedApiSecret = localStorage.getItem('temp-api-secret');
        if (savedApiKey && savedApiSecret) {
            setApiKey(savedApiKey);
            setApiSecret(savedApiSecret);
        }
    }, []);

    const handleConnect = async () => {
        if (!apiKey.trim() || !apiSecret.trim()) {
            setError('Please enter both API Key and API Secret');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const success = await onTestConnection(apiKey.trim(), apiSecret.trim());
            if (success) {
                setIsConnected(true);
                // Save to localStorage for session
                localStorage.setItem('temp-api-key', apiKey.trim());
                localStorage.setItem('temp-api-secret', apiSecret.trim());
                onApiKeysSet(apiKey.trim(), apiSecret.trim());
            } else {
                setError('Connection failed. Please check your API keys and permissions.');
                setIsConnected(false);
            }
        } catch (err) {
            setError('Connection error. Please try again.');
            setIsConnected(false);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setApiKey('');
        setApiSecret('');
        setError(null);
        localStorage.removeItem('temp-api-key');
        localStorage.removeItem('temp-api-secret');
    };

    const StatusIcon: React.FC<{ status: 'connected' | 'error' | 'idle' }> = ({ status }) => {
        const color = {
            connected: 'bg-green-500',
            error: 'bg-red-500',
            idle: 'bg-gray-500',
        }[status];
        return <div className={`w-3 h-3 rounded-full ${color}`}></div>;
    };

    return (
        <Card title="🔐 Binance API Configuration">
            <div className="space-y-4">
                {!isConnected ? (
                    <>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Binance API Key
                                </label>
                                <input
                                    type={showSecrets ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter your Binance API Key"
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Binance API Secret
                                </label>
                                <input
                                    type={showSecrets ? 'text' : 'password'}
                                    value={apiSecret}
                                    onChange={(e) => setApiSecret(e.target.value)}
                                    placeholder="Enter your Binance API Secret"
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="showSecrets"
                                    checked={showSecrets}
                                    onChange={(e) => setShowSecrets(e.target.checked)}
                                    className="mr-2"
                                />
                                <label htmlFor="showSecrets" className="text-sm text-gray-400">
                                    Show API keys
                                </label>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center space-x-2 text-red-400">
                                <StatusIcon status="error" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <div className="bg-blue-900/30 border border-blue-700 text-blue-200 px-3 py-2 rounded text-sm">
                            <strong>Required Permissions:</strong> Spot Trading, Futures Trading, Margin Trading
                        </div>

                        <button
                            onClick={handleConnect}
                            disabled={isConnecting || !apiKey.trim() || !apiSecret.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {isConnecting ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                    <span>Connecting...</span>
                                </div>
                            ) : (
                                'Connect to Binance'
                            )}
                        </button>
                    </>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                            <StatusIcon status="connected" />
                            <span className="text-green-400 font-semibold">Connected to Binance API</span>
                        </div>
                        
                        <div className="bg-green-900/30 border border-green-700 text-green-200 px-3 py-2 rounded text-sm">
                            ✅ API connection successful. You can now create bots with automated asset management.
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={handleConnect}
                                disabled={isConnecting}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
                            >
                                Test Again
                            </button>
                            <button
                                onClick={handleDisconnect}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default ApiKeyConfig;
