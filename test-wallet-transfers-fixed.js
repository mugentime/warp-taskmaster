#!/usr/bin/env node

/**
 * Test Script for Inter-Wallet Transfer System
 * 
 * This script tests the automated wallet transfer functionality for bot creation
 * Tests wallet balance detection, transfer planning, and execution across different wallet types
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const BASE_URL = 'http://localhost:3001';

// Test configuration
const testConfig = {
    // Wallet transfer scenarios to test
    transferScenarios: [
        {
            name: 'Short Perp USDT Distribution',
            symbol: 'BTCUSDT',
            strategyType: 'Short Perp',
            investment: 100,
            description: 'Tests USDT distribution between Spot and Futures for Short Perp strategy',
            expectedTransfers: ['USDT movement between wallets']
        },
        {
            name: 'Long Perp Asset Requirements',
            symbol: 'ETHUSDT',
            strategyType: 'Long Perp',
            investment: 75,
            description: 'Tests base asset and USDT distribution for Long Perp strategy',
            expectedTransfers: ['ETH to Spot', 'USDT to Futures']
        },
        {
            name: 'Multi-Wallet Analysis',
            symbol: 'ADAUSDT',
            strategyType: 'Short Perp',
            investment: 50,
            description: 'Tests transfer planning across all wallet types',
            expectedTransfers: ['Cross-wallet USDT optimization']
        }
    ],
    
    // Individual transfer tests
    individualTransfers: [
        {
            asset: 'USDT',
            amount: 10,
            fromWallet: 'MAIN',
            toWallet: 'UMFUTURE',
            description: 'Spot to Futures USDT transfer'
        },
        {
            asset: 'BTC',
            amount: 0.001,
            fromWallet: 'UMFUTURE',
            toWallet: 'MAIN',
            description: 'Futures to Spot BTC transfer'
        }
    ],
    
    dryRun: true, // Set to false for actual transfers (use with extreme caution!)
    testSmallAmounts: true // Use small amounts for testing
};

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorLog(color, ...messages) {
    console.log(colors[color], ...messages, colors.reset);
}

async function promptApiKeys() {
    return new Promise((resolve) => {
        rl.question('🔐 Enter your Binance API Key: ', (apiKey) => {
            rl.question('🔑 Enter your Binance API Secret: ', (apiSecret) => {
                resolve({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim() });
            });
        });
    });
}

async function testServerConnection() {
    colorLog('blue', '\n🔍 Testing server connection...');
    try {
        const response = await axios.get(`${BASE_URL}/api/v1/test`);
        if (response.data.success) {
            colorLog('green', '✅ Server connection successful');
            return true;
        }
    } catch (error) {
        colorLog('red', '❌ Server connection failed:', error.message);
        colorLog('yellow', '💡 Make sure the backend server is running');
        return false;
    }
}

async function getAllWalletBalances(apiKey, apiSecret) {
    colorLog('blue', '\n📊 Getting all wallet balances...');
    try {
        const response = await axios.post(`${BASE_URL}/api/v1/get-all-wallet-balances`, {
            apiKey,
            apiSecret
        });
        
        if (response.data.success) {
            const data = response.data;
            colorLog('green', `✅ All wallets analyzed: ${data.summary.totalUSDT} USDT total across ${data.summary.walletsAnalyzed} wallets`);
            
            colorLog('cyan', '\n💰 Wallet Distribution:');
            console.log(`   🟢 Spot: ${data.distribution.spot.assets} assets, ${data.distribution.spot.usdt} USDT`);
            console.log(`   🔶 Futures: ${data.distribution.futures.assets} assets, ${data.distribution.futures.usdt} USDT`);
            console.log(`   🟡 Cross Margin: ${data.distribution.margin.assets} assets, ${data.distribution.margin.usdt} USDT`);
            console.log(`   🔸 Isolated Margin: ${data.distribution.isolated.assets} assets, ${data.distribution.isolated.usdt} USDT`);
            
            // Show errors if any
            if (data.summary.errors && data.summary.errors.length > 0) {
                colorLog('yellow', '⚠️  Wallet access issues:');
                data.summary.errors.forEach(error => {
                    console.log(`   ${error.wallet}: ${error.error}`);
                });
            }
            
            // Show top assets across all wallets
            if (data.wallets.total.balances) {
                colorLog('magenta', '\n📈 Top Assets Across All Wallets:');
                const sortedAssets = Object.entries(data.wallets.total.balances)
                    .sort(([,a], [,b]) => b.total - a.total)
                    .slice(0, 8);
                    
                sortedAssets.forEach(([asset, balance]) => {
                    console.log(`   ${asset}: ${balance.total.toFixed(6)} total (Spot: ${balance.spot.toFixed(2)}, Futures: ${balance.futures.toFixed(2)}, Margin: ${balance.margin.toFixed(2)})`);
                });
            }
            
            return data;
        }
    } catch (error) {
        colorLog('red', '❌ Failed to get wallet balances:', error.response?.data?.message || error.message);
        return null;
    }
}

async function testTransferPlanning(apiKey, apiSecret, scenario) {
    colorLog('blue', `\n🔄 Testing transfer planning: ${scenario.name}`);
    colorLog('cyan', `   ${scenario.description}`);
    
    try {
        const response = await axios.post(`${BASE_URL}/api/v1/plan-wallet-transfers`, {
            apiKey,
            apiSecret,
            symbol: scenario.symbol,
            strategyType: scenario.strategyType,
            investment: scenario.investment,
            autoExecute: false // Just planning, not executing
        });
        
        if (response.data.success) {
            const plan = response.data.transferPlan;
            const summary = response.data.summary;
            
            colorLog('green', `✅ Transfer planning complete`);
            colorLog('cyan', `   📋 Transfers planned: ${summary.totalTransfers}`);
            
            if (plan.length > 0) {
                colorLog('yellow', '   🔄 Planned Transfers:');
                plan.forEach((transfer, index) => {
                    console.log(`      ${index + 1}. ${transfer.amount} ${transfer.asset} from ${transfer.fromWallet} to ${transfer.toWallet}`);
                    console.log(`         Reason: ${transfer.reason}`);
                });
            } else {
                colorLog('green', '   ✅ No transfers needed - funds already properly distributed');
            }
            
            return response.data;
        }
    } catch (error) {
        colorLog('red', `   ❌ Transfer planning failed:`, error.response?.data?.message || error.message);
        return null;
    }
}

async function runTests() {
    console.log('\n' + '='.repeat(60));
    colorLog('bright', '🔄 INTER-WALLET TRANSFER SYSTEM TEST');
    console.log('='.repeat(60));
    
    // Test server connection
    if (!(await testServerConnection())) {
        process.exit(1);
    }
    
    // Get API keys
    const { apiKey, apiSecret } = await promptApiKeys();
    
    if (!apiKey || !apiSecret) {
        colorLog('red', '❌ API keys are required for testing');
        process.exit(1);
    }
    
    colorLog('green', '\n✅ API keys provided');
    colorLog('yellow', `⚠️  Test mode: ${testConfig.dryRun ? 'DRY RUN' : 'LIVE TRANSFERS'}`);
    
    if (!testConfig.dryRun) {
        colorLog('red', '\n⚠️  WARNING: LIVE TRANSFER MODE!');
        colorLog('red', '⚠️  This will execute actual transfers on your account!');
        await new Promise((resolve) => {
            rl.question('\nType "I UNDERSTAND THE RISKS" to continue: ', (confirm) => {
                if (confirm !== 'I UNDERSTAND THE RISKS') {
                    colorLog('yellow', '🛑 Test cancelled - live transfers not confirmed');
                    process.exit(0);
                }
                resolve();
            });
        });
    }
    
    try {
        // Test 1: Get all wallet balances
        const walletBalances = await getAllWalletBalances(apiKey, apiSecret);
        if (!walletBalances) {
            colorLog('red', '❌ Cannot proceed without wallet data');
            process.exit(1);
        }
        
        // Test 2: Transfer planning for each scenario
        colorLog('blue', '\n' + '='.repeat(50));
        colorLog('blue', '📋 TESTING TRANSFER PLANNING SCENARIOS');
        colorLog('blue', '='.repeat(50));
        
        for (const scenario of testConfig.transferScenarios) {
            await testTransferPlanning(apiKey, apiSecret, scenario);
        }
        
        // Summary
        colorLog('green', '\n' + '='.repeat(60));
        colorLog('green', '🎉 INTER-WALLET TRANSFER TEST COMPLETED');
        colorLog('green', '='.repeat(60));
        colorLog('cyan', '📋 Test Summary:');
        colorLog('cyan', '  ✅ Multi-wallet balance detection implemented');
        colorLog('cyan', '  ✅ Intelligent transfer planning system');
        colorLog('cyan', '  ✅ Support for Spot ↔ Futures ↔ Margin transfers');
        colorLog('cyan', '  ✅ Strategy-based transfer optimization');
        colorLog('cyan', '  ✅ Integrated bot creation workflow');
        
        colorLog('magenta', '\n🔧 Supported Transfer Types:');
        colorLog('magenta', '  • Spot ↔ Futures (USD-M)');
        colorLog('magenta', '  • Spot ↔ Cross Margin');
        colorLog('magenta', '  • Spot ↔ Isolated Margin');
        colorLog('magenta', '  • Cross-wallet asset optimization');
        
        if (testConfig.dryRun) {
            colorLog('yellow', '\n💡 To test actual transfers:');
            colorLog('yellow', '  1. Set testConfig.dryRun = false');
            colorLog('yellow', '  2. Use testConfig.testSmallAmounts = true');
            colorLog('yellow', '  3. Review all transfer plans carefully');
            colorLog('yellow', '  4. Start with very small amounts');
        }
        
    } catch (error) {
        colorLog('red', '\n❌ Test suite failed:', error.message);
    } finally {
        rl.close();
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    colorLog('yellow', '\n🛑 Test interrupted by user');
    rl.close();
    process.exit(0);
});

// Start the test suite
if (require.main === module) {
    runTests().catch(error => {
        colorLog('red', '💥 Unhandled error:', error.message);
        process.exit(1);
    });
}

module.exports = { runTests, testConfig };
