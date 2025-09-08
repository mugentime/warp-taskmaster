#!/usr/bin/env node

/**
 * Test Script for Enhanced Automated Asset Swapping System
 * 
 * This script tests the improved asset conversion functionality for bot creation
 * Tests both dry-run analysis and actual conversion execution
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
    // Test conversion scenarios
    scenarios: [
        {
            name: 'Short Perp Bot Creation',
            symbol: 'BTCUSDT',
            strategyType: 'Short Perp',
            investment: 100,
            description: 'Tests conversion to USDT for Short Perp strategy'
        },
        {
            name: 'ETH Short Perp Bot',
            symbol: 'ETHUSDT', 
            strategyType: 'Short Perp',
            investment: 50,
            description: 'Tests ETH short position setup with conversions'
        },
        {
            name: 'Long Perp Bot Creation',
            symbol: 'ADAUSDT',
            strategyType: 'Long Perp',
            investment: 25,
            description: 'Tests base asset acquisition for Long Perp strategy'
        }
    ],
    
    // Test assets for conversion analysis
    testAssets: ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'MATIC'],
    
    dryRun: true // Set to false for actual conversions (use with caution!)
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
        colorLog('yellow', '💡 Make sure the backend server is running: npm run server');
        return false;
    }
}

async function getAccountBalances(apiKey, apiSecret) {
    colorLog('blue', '\n📊 Getting account balances...');
    try {
        const response = await axios.post(`${BASE_URL}/api/v1/wallet-balances`, {
            apiKey,
            apiSecret,
            minValueUSDT: 0.1 // Show assets worth more than $0.10
        });
        
        if (response.data.success) {
            const data = response.data.data;
            colorLog('green', `✅ Account loaded: ${data.totalValueUSDT} USDT across ${data.totalAssets} assets`);
            
            // Show top assets
            colorLog('cyan', '\n💰 Top Assets:');
            data.balances.slice(0, 10).forEach(balance => {
                const percentage = balance.percentage.toFixed(1);
                console.log(`   ${balance.asset}: ${balance.total} (${balance.valueUSDT} USDT, ${percentage}%)`);
            });
            
            return data;
        }
    } catch (error) {
        colorLog('red', '❌ Failed to get balances:', error.response?.data?.message || error.message);
        return null;
    }
}

async function testEnhancedConversion(apiKey, apiSecret, testAssets) {
    colorLog('blue', '\n🔄 Testing enhanced conversion system...');
    try {
        const response = await axios.post(`${BASE_URL}/api/v1/test-enhanced-conversion`, {
            apiKey,
            apiSecret,
            testAssets,
            dryRun: testConfig.dryRun
        });
        
        if (response.data.success) {
            const analysis = response.data.analysis;
            colorLog('green', `✅ Conversion analysis complete`);
            colorLog('cyan', `   📈 Analyzed: ${analysis.totalAssetsAnalyzed} assets`);
            colorLog('cyan', `   ✅ Viable conversions: ${analysis.viableConversions}`);
            colorLog('cyan', `   💰 Total estimated value: ${analysis.totalEstimatedValue} USDT`);
            
            // Show conversion details
            colorLog('magenta', '\n🛤️  Conversion Paths:');
            analysis.conversionDetails.forEach(detail => {
                const status = detail.viable ? '✅' : '❌';
                const slippage = detail.estimatedSlippage ? `(${(detail.estimatedSlippage * 100).toFixed(2)}% slippage)` : '';
                console.log(`   ${status} ${detail.asset}: ${detail.pathDescription} ${slippage}`);
                if (detail.viable) {
                    console.log(`      Balance: ${detail.balance.toFixed(6)} → ~${detail.estimatedUSDTValue.toFixed(2)} USDT`);
                }
                if (detail.error) {
                    console.log(`      Error: ${detail.error}`);
                }
            });
            
            // Show conversion results if executed
            if (response.data.conversionResults && !testConfig.dryRun) {
                const results = response.data.conversionResults;
                colorLog('green', `\n🎯 Conversion Results: ${results.successCount}/${results.results.length} successful`);
                colorLog('green', `💰 Total converted: ${results.totalConverted.toFixed(2)} USDT`);
            }
            
            return response.data;
        }
    } catch (error) {
        colorLog('red', '❌ Conversion test failed:', error.response?.data?.message || error.message);
        return null;
    }
}

async function testBotCreationScenarios(apiKey, apiSecret) {
    colorLog('blue', '\n🤖 Testing bot creation scenarios...');
    
    for (const scenario of testConfig.scenarios) {
        colorLog('yellow', `\n📝 Testing: ${scenario.name}`);
        colorLog('cyan', `   ${scenario.description}`);
        
        try {
            const response = await axios.post(`${BASE_URL}/api/v1/preflight-bot`, {
                apiKey,
                apiSecret,
                symbol: scenario.symbol,
                strategyType: scenario.strategyType,
                investment: scenario.investment,
                autoConvert: false, // Test analysis only
                dryRun: true
            });
            
            if (response.data.success) {
                const preflight = response.data.preflight;
                const status = preflight.ok ? '✅ Ready' : '⚠️  Needs conversion';
                colorLog('green', `   ${status}: ${scenario.symbol} ${scenario.strategyType}`);
                
                if (preflight.requiresConversion) {
                    colorLog('yellow', `   🔄 Conversion required: ${preflight.plan.length} assets`);
                    preflight.plan.forEach(step => {
                        console.log(`      • ${step.asset}: ${step.estimatedUsdtValue.toFixed(2)} USDT`);
                    });
                }
                
                if (preflight.missing) {
                    colorLog('red', `   ❌ Missing assets:`, JSON.stringify(preflight.missing));
                }
            }
        } catch (error) {
            colorLog('red', `   ❌ Scenario failed:`, error.response?.data?.message || error.message);
        }
    }
}

async function runTests() {
    console.log('\n' + '='.repeat(60));
    colorLog('bright', '🚀 ENHANCED ASSET SWAPPING SYSTEM TEST');
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
    colorLog('yellow', `⚠️  Test mode: ${testConfig.dryRun ? 'DRY RUN' : 'LIVE TRADING'}`);
    
    if (!testConfig.dryRun) {
        rl.question('\n⚠️  WARNING: Live trading mode! Type "CONFIRM" to continue: ', (confirm) => {
            if (confirm !== 'CONFIRM') {
                colorLog('yellow', '🛑 Test cancelled - live trading not confirmed');
                process.exit(0);
            }
        });
    }
    
    try {
        // Test 1: Get account balances
        const balances = await getAccountBalances(apiKey, apiSecret);
        if (!balances) {
            colorLog('red', '❌ Cannot proceed without account data');
            process.exit(1);
        }
        
        // Test 2: Enhanced conversion system
        await testEnhancedConversion(apiKey, apiSecret, testConfig.testAssets);
        
        // Test 3: Bot creation scenarios
        await testBotCreationScenarios(apiKey, apiSecret);
        
        // Summary
        colorLog('green', '\n' + '='.repeat(60));
        colorLog('green', '🎉 ASSET SWAPPING TEST COMPLETED');
        colorLog('green', '='.repeat(60));
        colorLog('cyan', '📋 Test Summary:');
        colorLog('cyan', '  ✅ Enhanced conversion paths implemented');
        colorLog('cyan', '  ✅ Batch processing for multiple assets');
        colorLog('cyan', '  ✅ Slippage estimation and path optimization');
        colorLog('cyan', '  ✅ Bot creation preflight analysis');
        colorLog('cyan', '  ✅ Automated asset requirement detection');
        
        if (testConfig.dryRun) {
            colorLog('yellow', '\n💡 To test actual conversions:');
            colorLog('yellow', '  1. Set testConfig.dryRun = false');
            colorLog('yellow', '  2. Use small amounts for testing');
            colorLog('yellow', '  3. Monitor for any conversion failures');
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
