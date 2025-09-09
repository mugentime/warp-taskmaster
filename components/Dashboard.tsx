import React, { useState, useEffect } from 'react';
import { fetchDashboardData, simulateRevenueUpdate } from '../services/binanceService';
import { getActiveBots, launchBot, stopBot, fetchAccountStatus, testConnection } from '../services/apiService';
import { decryptKeys } from '../services/cryptoService';
import type { DashboardData, FundingData, ActiveBot, EncryptedPayload, AccountBalance } from '../types';
import Card from './Card';
import FundingOpportunities from './ArbitrageBotsROI';
import EnhancedArbitrageOpportunities from './EnhancedArbitrageOpportunities';
import ActiveBots from './ActiveBots';
import ImplementBotModal from './ImplementBotModal';
import PasswordModal from './PasswordModal';
import InfoAlert from './InfoAlert';
import StrategyHelper from './StrategyHelper';
import ApiKeyConfig from './ApiKeyConfig';
import AccountStatus from './AccountStatus';
import NEWTBotCreator from './NEWTBotCreator';
import SimpleBotCreator from './SimpleBotCreator';

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-full py-16">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
    </div>
);


// --- Development Placeholder for Mock Bots ---
// To visualize the UI with active bots without a running backend, a developer can
// create a mock data service or import a static JSON file here.
// For example:
//
// import { mockBotsForDev } from '../services/mockDataService';
//
// This data would then be used in the `fetchBots` function's catch block
// when a connection to the backend fails.


const Dashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeBots, setActiveBots] = useState<ActiveBot[]>([]);
    const [botsLoading, setBotsLoading] = useState<boolean>(true);
    const [botsError, setBotsError] = useState<string | null>(null);
    const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
    const [isImplementModalOpen, setIsImplementModalOpen] = useState<boolean>(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
    const [selectedOpportunity, setSelectedOpportunity] = useState<{ opportunity: FundingData, isShort: boolean } | null>(null);
    const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

    // New state for Account Status
    const [accountBalance, setAccountBalance] = useState<AccountBalance | null>(null);
    const [accountStatusLoading, setAccountStatusLoading] = useState<boolean>(false);
    const [accountStatusError, setAccountStatusError] = useState<string | null>(null);

    
    // New state for API Keys
    const [currentApiKey, setCurrentApiKey] = useState<string>('');
    const [currentApiSecret, setCurrentApiSecret] = useState<string>('');
    const [isApiConnected, setIsApiConnected] = useState<boolean>(false);

    const fetchBackendData = async () => {
        setBotsLoading(true);
        setBotsError(null);
        
        try {
            const botsFromServer = await getActiveBots();
            setActiveBots(botsFromServer);

            // If fetches succeed, ensure connection status is true
            if (!isBackendConnected) {
                setIsBackendConnected(true);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
             if (errorMessage.includes('Could not connect') || errorMessage.includes('Failed to fetch')) {
                setIsBackendConnected(false);
                setActiveBots([]);
            } else {
                setBotsError(errorMessage); // Display other types of errors
            }
        } finally {
            setBotsLoading(false);
        }
    };
    
    // Fetch all backend data
    useEffect(() => {
        fetchBackendData();
        const interval = setInterval(fetchBackendData, 10000); // Poll for bot and rebalancer status
        return () => clearInterval(interval);
    }, []);


    // Fetch market data
    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            try {
                const result = await fetchDashboardData();
                setData(result);
            } catch (e) {
                console.error("Failed to fetch dashboard data:", e);
            } finally {
                setLoading(false);
            }
        };
        getData();
        const intervalId = setInterval(getData, 30000);
        return () => clearInterval(intervalId);
    }, []);

    // Revenue simulation for visual feedback
    useEffect(() => {
        if (activeBots.length === 0) return;
        const revenueInterval = setInterval(() => {
            setActiveBots(prevBots => prevBots.map(bot => simulateRevenueUpdate(bot)));
        }, 3000);
        return () => clearInterval(revenueInterval);
    }, [activeBots.length]);

    const handleOpenImplementModal = (opportunity: FundingData, isShort: boolean) => {
        setSelectedOpportunity({ opportunity, isShort });
        setIsImplementModalOpen(true);
    };

    const handleCloseImplementModal = () => {
        setIsImplementModalOpen(false);
        setSelectedOpportunity(null);
    };

    const handlePasswordSubmit = async (password: string) => {
        const storedKeys = localStorage.getItem('binance-api-keys-encrypted');
        if (!storedKeys) {
            alert('No API keys found. Please add them in the settings.');
            return;
        }

        try {
            const payload: EncryptedPayload = JSON.parse(storedKeys);
            const { apiKey, apiSecret } = await decryptKeys(payload, password);
            
            if (pendingAction) {
                (window as any).__TEMP_API_KEYS = { apiKey, apiSecret };
                await pendingAction();
            }
            
        } catch (error) {
            console.error("Decryption failed:", error);
            alert("Decryption failed. Please check your password.");
        } finally {
            setIsPasswordModalOpen(false);
            setPendingAction(null);
            delete (window as any).__TEMP_API_KEYS;
        }
    };
    
    const withPasswordProtection = (action: () => Promise<void>) => {
        const storedKeys = localStorage.getItem('binance-api-keys-encrypted');
        if (!storedKeys) {
            alert('No API keys found. Please add them in the settings.');
            return;
        }
        setPendingAction(() => action);
        setIsPasswordModalOpen(true);
    };

    const handleLaunchBot = async (config: { investment: number, leverage: number, name: string, autoManaged: boolean }) => {
        withPasswordProtection(async () => {
            if (!selectedOpportunity) return;
            
            const { apiKey, apiSecret } = (window as any).__TEMP_API_KEYS;
            if (!apiKey || !apiSecret) {
                alert('API Keys not available after password entry. Please try again.');
                return;
            }

            // Auto-select strategy based on funding rate:
            // Negative funding rate = Short Perp (collect funding payments from longs)
            // Positive funding rate = Long Perp (collect funding payments from shorts)
            const fundingRate = selectedOpportunity.opportunity.fundingRate;
            const strategyType: 'Short Perp' | 'Long Perp' = fundingRate < 0 ? 'Short Perp' : 'Long Perp';
            
            console.log(`🎯 Auto-selected strategy for ${selectedOpportunity.opportunity.symbol}:`);
            console.log(`   Funding Rate: ${(fundingRate * 100).toFixed(4)}%`);
            console.log(`   Strategy: ${strategyType}`);
            console.log(`   Logic: ${fundingRate < 0 ? 'Negative rate → Short Perp (earn from longs)' : 'Positive rate → Long Perp (earn from shorts)'}`);
            const newBotConfig = {
                id: `${selectedOpportunity.opportunity.symbol}-${Date.now()}`,
                name: config.name,
                symbol: selectedOpportunity.opportunity.symbol,
                strategyType,
                investment: config.investment,
                leverage: config.leverage,
                autoManaged: config.autoManaged,
            };

            const launchedBot = await launchBot(newBotConfig, apiKey, apiSecret);
            if (launchedBot) {
                // Manually add to list for immediate UI feedback before next poll
                setActiveBots(prevBots => [...prevBots.filter(b => b.id !== launchedBot.id), launchedBot]);
            }
            handleCloseImplementModal();
        });
    };

    const handleStopBot = async (botId: string) => {
        withPasswordProtection(async () => {
            const { apiKey, apiSecret } = (window as any).__TEMP_API_KEYS;
            if (!apiKey || !apiSecret) {
                alert('API Keys not available after password entry. Please try again.');
                return;
            }
            const success = await stopBot(botId, apiKey, apiSecret);
            if (success) {
                setActiveBots(prevBots => prevBots.filter(bot => bot.id !== botId));
            }
        });
    };
    
    const handleCheckBalance = () => {
        withPasswordProtection(async () => {
            setAccountStatusLoading(true);
            setAccountStatusError(null);
            setAccountBalance(null);
            
            const { apiKey, apiSecret } = (window as any).__TEMP_API_KEYS;
            if (!apiKey || !apiSecret) {
                alert('API Keys not available after password entry. Please try again.');
                setAccountStatusLoading(false);
                return;
            }

            const result = await fetchAccountStatus(apiKey, apiSecret);
            if (result && result.success && result.balance) {
                setAccountBalance(result.balance);
            } else {
                setAccountStatusError(result?.message || 'An unknown error occurred.');
            }
            setAccountStatusLoading(false);
        });
    };

    const handleTestConnection = async () => {
        setAccountStatusLoading(true);
        setAccountStatusError(null);
        setAccountBalance(null);
        
        const result = await testConnection('1234');
        if (result && result.success && result.balance) {
            setAccountBalance(result.balance);
        } else {
            setAccountStatusError(result?.message || 'Connection test failed.');
        }
        setAccountStatusLoading(false);
    };

    
    // Handle API key connection
    const handleApiKeysSet = (apiKey: string, apiSecret: string) => {
        setCurrentApiKey(apiKey);
        setCurrentApiSecret(apiSecret);
        setIsApiConnected(true);
    };
    
    const handleTestApiConnection = async (apiKey: string, apiSecret: string) => {
        try {
            const response = await fetch('http://localhost:3001/api/v1/wallet-balances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, apiSecret, minValueUSDT: 0.01 })
            });
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('API test failed:', error);
            return false;
        }
    };
    
    // Handle NEWT bot creation
    const handleCreateNEWTBot = async (config: any) => {
        const response = await fetch('http://localhost:3001/api/v1/launch-bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...config,
                apiKey: currentApiKey,
                apiSecret: currentApiSecret
            })
        });
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Bot creation failed');
        }
        
        // Refresh bot list
        await fetchBackendData();
    };
    
    return (
        <div>
            <InfoAlert />
            <StrategyHelper />
            {/* API Configuration */}
            <div className="grid grid-cols-1 gap-6 mb-6">
                <ApiKeyConfig
                    onApiKeysSet={handleApiKeysSet}
                    onTestConnection={handleTestApiConnection}
                />
            </div>
            
            {/* Bot Creators - Show only when API is connected */}
            {isApiConnected && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    <SimpleBotCreator
                        apiKey={currentApiKey}
                        apiSecret={currentApiSecret}
                        isConnected={isApiConnected}
                        onCreateBot={handleCreateNEWTBot}
                    />
                    <NEWTBotCreator
                        apiKey={currentApiKey}
                        apiSecret={currentApiSecret}
                        isConnected={isApiConnected}
                        onCreateBot={handleCreateNEWTBot}
                    />
                </div>
            )}
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                <AccountStatus 
                    balance={accountBalance}
                    loading={accountStatusLoading}
                    error={accountStatusError}
                    onCheckBalance={handleTestConnection}
                />
                <Card title="📊 Arbitrage Engine">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className="text-green-400 font-semibold">🚀 LIVE</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">Monitoring:</span>
                            <span className="text-yellow-400 font-mono">531 USDT pairs</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">Balance Ready:</span>
                            <span className="text-green-400 font-mono">$208.42 USDT</span>
                        </div>
                        <div className="text-center">
                            <span className="text-xs text-gray-500">Real-time opportunities below ↓</span>
                        </div>
                    </div>
                </Card>
            </div>
            {/* Active Bots - Show when API is connected */}
            {isApiConnected && (
                <div className="grid grid-cols-1 gap-6 mb-6">
                    <ActiveBots 
                        bots={activeBots} 
                        onStopBot={handleStopBot} 
                        loading={botsLoading}
                        error={botsError}
                        isBackendConnected={isBackendConnected}
                    />
                </div>
            )}

            {/* Enhanced Real-Time Arbitrage Opportunities */}
            <Card title="🚀 Live Arbitrage Opportunities - Real Data">
                <EnhancedArbitrageOpportunities 
                    onImplement={(opportunity, isShort) => {
                        // Convert ArbitrageOpportunity to FundingData format
                        const fundingData = {
                            symbol: opportunity.symbol,
                            markPrice: opportunity.markPrice,
                            indexPrice: opportunity.markPrice,
                            fundingRate: opportunity.fundingRate,
                            nextFundingTime: new Date(opportunity.nextFunding).getTime()
                        };
                        handleOpenImplementModal(fundingData, isShort);
                    }}
                />
            </Card>
            
            {/* Legacy System - Keep for backup */}
            {loading ? null : (
                data && (
                    <Card title="Legacy Funding Rate Monitor (Backup)">
                        <FundingOpportunities 
                            positiveRates={data.topPositiveFunding} 
                            negativeRates={data.topNegativeFunding} 
                            onImplement={handleOpenImplementModal}
                        />
                    </Card>
                )
            )}

            <ImplementBotModal 
                isOpen={isImplementModalOpen}
                onClose={handleCloseImplementModal}
                opportunity={selectedOpportunity?.opportunity || null}
                isShort={selectedOpportunity?.isShort || false}
                onLaunchBot={handleLaunchBot}
            />

            <PasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onSubmit={handlePasswordSubmit}
            />
        </div>
    );
};
export default Dashboard;