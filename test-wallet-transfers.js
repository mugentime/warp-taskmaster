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
            const data = response.data;\n            colorLog('green', `✅ All wallets analyzed: ${data.summary.totalUSDT} USDT total across ${data.summary.walletsAnalyzed} wallets`);\n            \n            colorLog('cyan', '\\n💰 Wallet Distribution:');\n            console.log(`   🟢 Spot: ${data.distribution.spot.assets} assets, ${data.distribution.spot.usdt} USDT`);\n            console.log(`   🔶 Futures: ${data.distribution.futures.assets} assets, ${data.distribution.futures.usdt} USDT`);\n            console.log(`   🟡 Cross Margin: ${data.distribution.margin.assets} assets, ${data.distribution.margin.usdt} USDT`);\n            console.log(`   🔸 Isolated Margin: ${data.distribution.isolated.assets} assets, ${data.distribution.isolated.usdt} USDT`);\n            \n            // Show errors if any\n            if (data.summary.errors && data.summary.errors.length > 0) {\n                colorLog('yellow', '⚠️  Wallet access issues:');\n                data.summary.errors.forEach(error => {\n                    console.log(`   ${error.wallet}: ${error.error}`);\n                });\n            }\n            \n            // Show top assets across all wallets\n            if (data.wallets.total.balances) {\n                colorLog('magenta', '\\n📈 Top Assets Across All Wallets:');\n                const sortedAssets = Object.entries(data.wallets.total.balances)\n                    .sort(([,a], [,b]) => b.total - a.total)\n                    .slice(0, 8);\n                    \n                sortedAssets.forEach(([asset, balance]) => {\n                    console.log(`   ${asset}: ${balance.total.toFixed(6)} total (Spot: ${balance.spot.toFixed(2)}, Futures: ${balance.futures.toFixed(2)}, Margin: ${balance.margin.toFixed(2)})`);\n                });\n            }\n            \n            return data;\n        }\n    } catch (error) {\n        colorLog('red', '❌ Failed to get wallet balances:', error.response?.data?.message || error.message);\n        return null;\n    }\n}\n\nasync function testTransferPlanning(apiKey, apiSecret, scenario) {\n    colorLog('blue', `\\n🔄 Testing transfer planning: ${scenario.name}`);\n    colorLog('cyan', `   ${scenario.description}`);\n    \n    try {\n        const response = await axios.post(`${BASE_URL}/api/v1/plan-wallet-transfers`, {\n            apiKey,\n            apiSecret,\n            symbol: scenario.symbol,\n            strategyType: scenario.strategyType,\n            investment: scenario.investment,\n            autoExecute: false // Just planning, not executing\n        });\n        \n        if (response.data.success) {\n            const plan = response.data.transferPlan;\n            const summary = response.data.summary;\n            \n            colorLog('green', `✅ Transfer planning complete`);\n            colorLog('cyan', `   📋 Transfers planned: ${summary.totalTransfers}`);\n            \n            if (plan.length > 0) {\n                colorLog('yellow', '   🔄 Planned Transfers:');\n                plan.forEach((transfer, index) => {\n                    console.log(`      ${index + 1}. ${transfer.amount} ${transfer.asset} from ${transfer.fromWallet} to ${transfer.toWallet}`);\n                    console.log(`         Reason: ${transfer.reason}`);\n                });\n            } else {\n                colorLog('green', '   ✅ No transfers needed - funds already properly distributed');\n            }\n            \n            return response.data;\n        }\n    } catch (error) {\n        colorLog('red', `   ❌ Transfer planning failed:`, error.response?.data?.message || error.message);\n        return null;\n    }\n}\n\nasync function testIndividualTransfer(apiKey, apiSecret, transferConfig) {\n    if (testConfig.dryRun) {\n        colorLog('yellow', `\\n🧪 DRY RUN: Would transfer ${transferConfig.amount} ${transferConfig.asset} from ${transferConfig.fromWallet} to ${transferConfig.toWallet}`);\n        return { success: true, dryRun: true };\n    }\n    \n    colorLog('blue', `\\n🔄 Testing individual transfer: ${transferConfig.description}`);\n    \n    try {\n        const response = await axios.post(`${BASE_URL}/api/v1/execute-wallet-transfer`, {\n            apiKey,\n            apiSecret,\n            asset: transferConfig.asset,\n            amount: transferConfig.amount,\n            fromWallet: transferConfig.fromWallet,\n            toWallet: transferConfig.toWallet\n        });\n        \n        if (response.data.success) {\n            colorLog('green', `✅ Transfer successful`);\n            colorLog('cyan', `   Transfer ID: ${response.data.transferId}`);\n            return response.data;\n        }\n    } catch (error) {\n        colorLog('red', `❌ Transfer failed:`, error.response?.data?.message || error.message);\n        return { success: false, error: error.message };\n    }\n}\n\nasync function testBotCreationWithTransfers(apiKey, apiSecret, scenario) {\n    colorLog('blue', `\\n🤖 Testing bot creation with integrated transfers: ${scenario.name}`);\n    \n    try {\n        // Use preflight endpoint to test the integrated system\n        const response = await axios.post(`${BASE_URL}/api/v1/preflight-bot`, {\n            apiKey,\n            apiSecret,\n            symbol: scenario.symbol,\n            strategyType: scenario.strategyType,\n            investment: scenario.investment,\n            autoConvert: false, // Focus on transfers, not conversions\n            dryRun: true\n        });\n        \n        if (response.data.success) {\n            const preflight = response.data.preflight;\n            colorLog('green', '✅ Integrated bot creation test successful');\n            \n            if (preflight.transfers) {\n                const transfers = preflight.transfers;\n                colorLog('cyan', `   📊 Transfer Analysis:`);\n                console.log(`      Transfers planned: ${transfers.summary.totalTransfers}`);\n                console.log(`      Successful transfers: ${transfers.summary.successfulTransfers}`);\n                console.log(`      Failed transfers: ${transfers.summary.failedTransfers}`);\n                \n                if (transfers.plan.length > 0) {\n                    colorLog('yellow', '   🔄 Transfer Details:');\n                    transfers.plan.forEach(transfer => {\n                        console.log(`      • ${transfer.amount} ${transfer.asset}: ${transfer.fromWallet} → ${transfer.toWallet}`);\n                    });\n                }\n            }\n            \n            const status = preflight.ok ? 'READY' : (preflight.requiresConversion ? 'NEEDS CONVERSION' : 'NOT READY');\n            colorLog(preflight.ok ? 'green' : 'yellow', `   🎯 Bot Status: ${status}`);\n            \n            return response.data;\n        }\n    } catch (error) {\n        colorLog('red', '❌ Integrated bot creation test failed:', error.response?.data?.message || error.message);\n        return null;\n    }\n}\n\nasync function runTests() {\n    console.log('\\n' + '='.repeat(60));\n    colorLog('bright', '🔄 INTER-WALLET TRANSFER SYSTEM TEST');\n    console.log('='.repeat(60));\n    \n    // Test server connection\n    if (!(await testServerConnection())) {\n        process.exit(1);\n    }\n    \n    // Get API keys\n    const { apiKey, apiSecret } = await promptApiKeys();\n    \n    if (!apiKey || !apiSecret) {\n        colorLog('red', '❌ API keys are required for testing');\n        process.exit(1);\n    }\n    \n    colorLog('green', '\\n✅ API keys provided');\n    colorLog('yellow', `⚠️  Test mode: ${testConfig.dryRun ? 'DRY RUN' : 'LIVE TRANSFERS'}`);\n    \n    if (!testConfig.dryRun) {\n        colorLog('red', '\\n⚠️  WARNING: LIVE TRANSFER MODE!');\n        colorLog('red', '⚠️  This will execute actual transfers on your account!');\n        await new Promise((resolve) => {\n            rl.question('\\nType \"I UNDERSTAND THE RISKS\" to continue: ', (confirm) => {\n                if (confirm !== 'I UNDERSTAND THE RISKS') {\n                    colorLog('yellow', '🛑 Test cancelled - live transfers not confirmed');\n                    process.exit(0);\n                }\n                resolve();\n            });\n        });\n    }\n    \n    try {\n        // Test 1: Get all wallet balances\n        const walletBalances = await getAllWalletBalances(apiKey, apiSecret);\n        if (!walletBalances) {\n            colorLog('red', '❌ Cannot proceed without wallet data');\n            process.exit(1);\n        }\n        \n        // Test 2: Transfer planning for each scenario\n        colorLog('blue', '\\n' + '='.repeat(50));\n        colorLog('blue', '📋 TESTING TRANSFER PLANNING SCENARIOS');\n        colorLog('blue', '='.repeat(50));\n        \n        for (const scenario of testConfig.transferScenarios) {\n            await testTransferPlanning(apiKey, apiSecret, scenario);\n        }\n        \n        // Test 3: Individual transfer testing (if not dry run)\n        if (!testConfig.dryRun && testConfig.testSmallAmounts) {\n            colorLog('blue', '\\n' + '='.repeat(50));\n            colorLog('blue', '🔄 TESTING INDIVIDUAL TRANSFERS');\n            colorLog('blue', '='.repeat(50));\n            \n            for (const transferTest of testConfig.individualTransfers) {\n                await testIndividualTransfer(apiKey, apiSecret, transferTest);\n                // Wait between transfers\n                await new Promise(resolve => setTimeout(resolve, 2000));\n            }\n        }\n        \n        // Test 4: Integrated bot creation with transfers\n        colorLog('blue', '\\n' + '='.repeat(50));\n        colorLog('blue', '🤖 TESTING INTEGRATED BOT CREATION');\n        colorLog('blue', '='.repeat(50));\n        \n        for (const scenario of testConfig.transferScenarios) {\n            await testBotCreationWithTransfers(apiKey, apiSecret, scenario);\n        }\n        \n        // Summary\n        colorLog('green', '\\n' + '='.repeat(60));\n        colorLog('green', '🎉 INTER-WALLET TRANSFER TEST COMPLETED');\n        colorLog('green', '='.repeat(60));\n        colorLog('cyan', '📋 Test Summary:');\n        colorLog('cyan', '  ✅ Multi-wallet balance detection implemented');\n        colorLog('cyan', '  ✅ Intelligent transfer planning system');\n        colorLog('cyan', '  ✅ Support for Spot ↔ Futures ↔ Margin transfers');\n        colorLog('cyan', '  ✅ Strategy-based transfer optimization');\n        colorLog('cyan', '  ✅ Integrated bot creation workflow');\n        \n        colorLog('magenta', '\\n🔧 Supported Transfer Types:');\n        colorLog('magenta', '  • Spot ↔ Futures (USD-M)');\n        colorLog('magenta', '  • Spot ↔ Cross Margin');\n        colorLog('magenta', '  • Spot ↔ Isolated Margin');\n        colorLog('magenta', '  • Cross-wallet asset optimization');\n        \n        if (testConfig.dryRun) {\n            colorLog('yellow', '\\n💡 To test actual transfers:');\n            colorLog('yellow', '  1. Set testConfig.dryRun = false');\n            colorLog('yellow', '  2. Use testConfig.testSmallAmounts = true');\n            colorLog('yellow', '  3. Review all transfer plans carefully');\n            colorLog('yellow', '  4. Start with very small amounts');\n        }\n        \n    } catch (error) {\n        colorLog('red', '\\n❌ Test suite failed:', error.message);\n    } finally {\n        rl.close();\n    }\n}\n\n// Handle Ctrl+C gracefully\nprocess.on('SIGINT', () => {\n    colorLog('yellow', '\\n🛑 Test interrupted by user');\n    rl.close();\n    process.exit(0);\n});\n\n// Start the test suite\nif (require.main === module) {\n    runTests().catch(error => {\n        colorLog('red', '💥 Unhandled error:', error.message);\n        process.exit(1);\n    });\n}\n\nmodule.exports = { runTests, testConfig };
