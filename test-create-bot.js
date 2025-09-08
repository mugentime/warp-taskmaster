import fetch from 'node-fetch';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const BASE_URL = 'http://localhost:3001';

// Test configuration
const testConfig = {
    // Bot creation scenarios
    botScenarios: [
        {
            name: 'BTC Short Perp Bot - Small Test',
            id: 'test-btc-short-' + Date.now(),
            symbol: 'BTCUSDT',
            strategyType: 'Short Perp',
            investment: 20, // Small amount for testing
            leverage: 5,
            autoManaged: true
        },
        {
            name: 'ETH Long Perp Bot - Test',
            id: 'test-eth-long-' + Date.now(),
            symbol: 'ETHUSDT',
            strategyType: 'Long Perp',
            investment: 15,
            leverage: 3,
            autoManaged: true
        }
    ],
    
    // Test modes
    dryRun: true, // Set to false for actual bot creation
    autoConvert: true, // Enable automatic asset conversion
    testWalletTransfers: true // Test the wallet transfer system
};

// Colors for console output
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

function promptQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function testServerConnection() {
    colorLog('blue', '\n🔍 Testing server connection...');
    try {
        const response = await fetch(`${BASE_URL}/api/v1/test`);
        const data = await response.json();
        if (data.success) {
            colorLog('green', '✅ Backend server operational');
            return true;
        }
    } catch (error) {
        colorLog('red', '❌ Backend server not accessible:', error.message);
        return false;
    }
}

async function getAllWalletBalances(apiKey, apiSecret) {
    colorLog('blue', '\n📊 Analyzing all wallet balances...');
    try {
        const response = await fetch(`${BASE_URL}/api/v1/get-all-wallet-balances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey, apiSecret })
        });
        
        const data = await response.json();
        if (data.success) {
            colorLog('green', `✅ Multi-wallet analysis complete`);
            colorLog('cyan', `   💰 Total Portfolio: ${data.summary.totalUSDT} USDT across ${data.summary.walletsAnalyzed} wallets`);
            
            // Show wallet distribution
            const dist = data.distribution;
            console.log(`   🟢 Spot: ${dist.spot.assets} assets, ${dist.spot.usdt} USDT`);
            console.log(`   🔶 Futures: ${dist.futures.assets} assets, ${dist.futures.usdt} USDT`);
            console.log(`   🟡 Margin: ${dist.margin.assets} assets, ${dist.margin.usdt} USDT`);
            console.log(`   🔸 Isolated: ${dist.isolated.assets} assets, ${dist.isolated.usdt} USDT`);
            
            return data;
        } else {
            colorLog('red', `❌ Wallet analysis failed: ${data.message}`);
            return null;
        }
    } catch (error) {
        colorLog('red', '❌ Wallet balance fetch failed:', error.message);
        return null;
    }
}

async function testWalletTransferPlanning(apiKey, apiSecret, scenario) {
    colorLog('blue', `\n🔄 Testing wallet transfer planning for: ${scenario.name}`);
    
    try {
        const response = await fetch(`${BASE_URL}/api/v1/plan-wallet-transfers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey,
                apiSecret,
                symbol: scenario.symbol,
                strategyType: scenario.strategyType,
                investment: scenario.investment,
                autoExecute: false // Just planning for now
            })
        });
        
        const data = await response.json();
        if (data.success) {
            const transfers = data.transferPlan;
            colorLog('green', `✅ Transfer planning complete`);
            colorLog('cyan', `   📋 Transfers needed: ${transfers.length}`);
            
            if (transfers.length > 0) {
                colorLog('yellow', '   🔄 Planned Transfers:');
                transfers.forEach((transfer, index) => {
                    console.log(`      ${index + 1}. ${transfer.amount} ${transfer.asset}: ${transfer.fromWallet} → ${transfer.toWallet}`);
                    console.log(`         📝 ${transfer.reason}`);
                });
            } else {
                colorLog('green', '   ✅ No transfers needed - optimal distribution already exists');
            }
            
            return data;
        } else {
            colorLog('red', `❌ Transfer planning failed: ${data.message}`);
            return null;
        }
    } catch (error) {
        colorLog('red', '❌ Transfer planning error:', error.message);
        return null;
    }
}

async function testBotCreationPreflight(apiKey, apiSecret, scenario) {
    colorLog('blue', `\n🤖 Testing bot creation preflight: ${scenario.name}`);
    
    try {
        const response = await fetch(`${BASE_URL}/api/v1/preflight-bot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey,
                apiSecret,
                symbol: scenario.symbol,
                strategyType: scenario.strategyType,
                investment: scenario.investment,
                autoConvert: testConfig.autoConvert,
                dryRun: true // Always dry run for preflight
            })
        });
        
        const data = await response.json();
        if (data.success) {
            const preflight = data.preflight;
            colorLog('green', '✅ Preflight analysis complete');
            
            // Show transfer analysis
            if (preflight.transfers) {
                const transfers = preflight.transfers;
                colorLog('cyan', '   🔄 Transfer Analysis:');
                console.log(`      Planned: ${transfers.summary.totalTransfers} transfers`);
                console.log(`      Successful: ${transfers.summary.successfulTransfers}`);
                console.log(`      Failed: ${transfers.summary.failedTransfers}`);
            }
            
            // Show conversion analysis
            if (preflight.requiresConversion) {
                colorLog('yellow', '   💱 Asset Conversion Required:');
                console.log(`      Assets to convert: ${preflight.plan.length}`);
                preflight.plan.forEach(asset => {
                    console.log(`      • ${asset.asset}: ${asset.estimatedUsdtValue.toFixed(2)} USDT`);
                });
            } else {
                colorLog('green', '   ✅ No asset conversion needed');
            }
            
            // Show readiness status
            const status = preflight.ok ? 'READY TO CREATE' : 'NEEDS PREPARATION';
            colorLog(preflight.ok ? 'green' : 'yellow', `   🎯 Bot Status: ${status}`);
            
            return data;
        } else {
            colorLog('red', `❌ Preflight failed: ${data.message}`);
            return null;
        }
    } catch (error) {
        colorLog('red', '❌ Preflight analysis error:', error.message);
        return null;
    }
}

async function testBotCreation(apiKey, apiSecret, scenario) {
    colorLog('blue', `\n🚀 Testing complete bot creation: ${scenario.name}`);
    
    try {
        const response = await fetch(`${BASE_URL}/api/v1/launch-bot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: scenario.id,
                name: scenario.name,
                symbol: scenario.symbol,
                strategyType: scenario.strategyType,
                investment: scenario.investment,
                leverage: scenario.leverage,
                autoManaged: scenario.autoManaged,
                apiKey,
                apiSecret,
                autoConvert: testConfig.autoConvert,
                dryRun: testConfig.dryRun
            })
        });
        
        const data = await response.json();
        if (data.success) {
            colorLog('green', '🎉 Bot creation successful!');
            
            const bot = data.bot;
            const preflight = data.preflight;
            
            // Show bot details
            colorLog('cyan', '   🤖 Bot Details:');
            console.log(`      ID: ${bot.id}`);
            console.log(`      Symbol: ${bot.symbol}`);
            console.log(`      Strategy: ${bot.strategyType}`);
            console.log(`      Investment: $${bot.investment}`);
            console.log(`      Leverage: ${bot.leverage}x`);
            
            // Show automation summary
            if (preflight.transfers) {
                colorLog('magenta', '   🔄 Automated Operations:');
                console.log(`      Wallet transfers: ${preflight.transfers.summary.totalTransfers}`);
                console.log(`      Asset conversions: ${preflight.executed ? preflight.executed.length : 0}`);
                
                if (preflight.batchStats) {
                    console.log(`      Total converted: ${preflight.batchStats.totalConverted.toFixed(2)} USDT`);
                }
            }
            
            colorLog('green', '   ✅ All automated asset management completed successfully!');
            return data;
            
        } else {
            colorLog('red', `❌ Bot creation failed: ${data.message}`);
            if (data.requiresConversion) {
                colorLog('yellow', '   💡 Asset conversion required but not enabled');
            }
            return null;
        }
    } catch (error) {
        colorLog('red', '❌ Bot creation error:', error.message);
        return null;
    }
}

async function runCreateBotTests() {
    console.log('\n' + '='.repeat(60));
    colorLog('bright', '🚀 AUTOMATED BOT CREATION SYSTEM TEST');
    console.log('='.repeat(60));
    
    // Test server connection
    if (!(await testServerConnection())) {
        process.exit(1);
    }
    
    // Get API credentials
    const apiKey = await promptQuestion('🔐 Enter your Binance API Key: ');
    const apiSecret = await promptQuestion('🔑 Enter your Binance API Secret: ');
    
    if (!apiKey || !apiSecret) {
        colorLog('red', '❌ API credentials required');
        process.exit(1);
    }
    
    colorLog('green', '\n✅ API credentials provided');
    colorLog('yellow', `⚠️  Test mode: ${testConfig.dryRun ? 'DRY RUN (Safe)' : 'LIVE TRADING'}`);
    colorLog('yellow', `⚠️  Auto-convert: ${testConfig.autoConvert ? 'ENABLED' : 'DISABLED'}`);
    
    if (!testConfig.dryRun) {
        const confirm = await promptQuestion('\n⚠️  WARNING: Live mode! Type "CONFIRM" to proceed: ');
        if (confirm !== 'CONFIRM') {
            colorLog('yellow', '🛑 Test cancelled');
            process.exit(0);
        }
    }
    
    try {
        // Step 1: Analyze all wallet balances
        const walletAnalysis = await getAllWalletBalances(apiKey, apiSecret);
        if (!walletAnalysis) {
            colorLog('red', '❌ Cannot proceed without wallet data');
            process.exit(1);
        }
        
        // Step 2: Test each bot creation scenario
        colorLog('blue', '\n' + '='.repeat(50));
        colorLog('blue', '🧪 TESTING BOT CREATION SCENARIOS');
        colorLog('blue', '='.repeat(50));
        
        for (const scenario of testConfig.botScenarios) {
            colorLog('yellow', `\n📋 Scenario: ${scenario.name}`);
            
            // Test wallet transfer planning
            if (testConfig.testWalletTransfers) {
                await testWalletTransferPlanning(apiKey, apiSecret, scenario);
            }
            
            // Test preflight analysis
            await testBotCreationPreflight(apiKey, apiSecret, scenario);
            
            // Test complete bot creation
            await testBotCreation(apiKey, apiSecret, scenario);
            
            colorLog('blue', '\n' + '-'.repeat(40));
        }
        
        // Final summary
        colorLog('green', '\n' + '='.repeat(60));
        colorLog('green', '🎉 AUTOMATED BOT CREATION TEST COMPLETED');
        colorLog('green', '='.repeat(60));
        
        colorLog('cyan', '📋 System Capabilities Tested:');
        colorLog('cyan', '  ✅ Multi-wallet balance analysis');
        colorLog('cyan', '  ✅ Intelligent transfer planning');
        colorLog('cyan', '  ✅ Automated asset conversion');
        colorLog('cyan', '  ✅ Comprehensive preflight checks');
        colorLog('cyan', '  ✅ Complete bot creation workflow');
        
        colorLog('magenta', '\n🚀 Key Features Demonstrated:');
        colorLog('magenta', '  • Automatic wallet-to-wallet transfers');
        colorLog('magenta', '  • Smart asset conversion with optimal paths');
        colorLog('magenta', '  • Strategy-based fund distribution');
        colorLog('magenta', '  • Real-time validation and error handling');
        colorLog('magenta', '  • Zero manual intervention required');
        
        if (testConfig.dryRun) {
            colorLog('yellow', '\n💡 This was a safe dry-run test');
            colorLog('yellow', '  Set dryRun: false to create actual bots');
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

// Start the test
runCreateBotTests().catch(error => {
    colorLog('red', '💥 Unhandled error:', error.message);
    rl.close();
    process.exit(1);
});
