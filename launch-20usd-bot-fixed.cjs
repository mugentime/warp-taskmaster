const axios = require('axios');

async function launch20USDBot() {
    console.log('🚀 Starting $20 USD Bot Creation via API...');
    
    const baseUrl = 'http://localhost:3001';
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;
    
    if (!apiKey || !apiSecret) {
        console.error('❌ Missing Binance API credentials');
        process.exit(1);
    }
    
    try {
        // Test server connectivity
        console.log('🔍 Testing backend connection...');
        const testResponse = await axios.get(`${baseUrl}/api/v1/test`);
        console.log('✅ Backend server is running');
        
        // Get arbitrage opportunities
        console.log('📊 Fetching arbitrage opportunities...');
        try {
            const opportunitiesResponse = await axios.get(`${baseUrl}/api/v1/arbitrage-opportunities`);
            console.log(`📈 Found ${opportunitiesResponse.data.opportunities?.length || 0} opportunities`);
        } catch (err) {
            console.log('⚠️  Could not fetch opportunities, proceeding with manual configuration...');
        }
        
        // Create bot configuration with timestamp offset to fix Binance sync issue
        const botConfig = {
            id: `bot-20usd-${Date.now()}`,
            name: `$20 USD Trading Bot - ${new Date().toLocaleTimeString()}`,
            symbol: 'BTCUSDT',
            strategyType: 'Long Perp',  
            investment: 20,
            leverage: 3,
            autoManaged: true,
            apiKey: apiKey,
            apiSecret: apiSecret,
            autoConvert: true,
            dryRun: true, // Start with dry run first to test
            timestampOffset: -2000 // Subtract 2 seconds to fix timestamp sync issue
        };
        
        console.log('🤖 Bot Configuration:');
        console.log(`   💰 Investment: $${botConfig.investment} USD`);
        console.log(`   📈 Strategy: ${botConfig.strategyType}`);
        console.log(`   ⚖️  Leverage: ${botConfig.leverage}x`);
        console.log(`   🎯 Symbol: ${botConfig.symbol}`);
        console.log(`   🔄 Auto-Managed: ${botConfig.autoManaged ? 'Yes' : 'No'}`);
        console.log(`   ⚠️  Mode: ${botConfig.dryRun ? 'DRY RUN (Safe Testing)' : 'LIVE TRADING'}`);
        console.log('');
        
        // First try with dry run to test connectivity
        console.log('🧪 Testing with dry run first...');
        const launchResponse = await axios.post(`${baseUrl}/api/v1/launch-bot`, botConfig);
        
        if (launchResponse.data.success) {
            console.log('');
            console.log('🎉 SUCCESS! Dry run test completed successfully!');
            console.log('');
            console.log('🤖 Bot Test Results:');
            console.log(`   Bot ID: ${launchResponse.data.bot.id}`);
            console.log(`   Name: ${launchResponse.data.bot.name}`);
            console.log(`   Status: ${launchResponse.data.bot.status}`);
            console.log(`   Investment: $${launchResponse.data.bot.investment} USD`);
            console.log(`   Leverage: ${launchResponse.data.bot.leverage}x`);
            
            if (launchResponse.data.preflight) {
                console.log('');
                console.log('🔄 Automated Setup Test:');
                if (launchResponse.data.preflight.transfers) {
                    console.log(`   Wallet transfers: ${launchResponse.data.preflight.transfers.summary?.totalTransfers || 0}`);
                }
                if (launchResponse.data.preflight.executed) {
                    console.log(`   Asset conversions: ${launchResponse.data.preflight.executed.length || 0}`);
                }
            }
            
            console.log('');
            console.log('✅ Dry run successful! Now you can:');
            console.log('   1. Change dryRun to false in the script to enable live trading');
            console.log('   2. Monitor at http://localhost:4173/');
            console.log('   3. API status at http://localhost:3001/');
            console.log('');
            console.log('🛡️  Current mode: SAFE DRY RUN - No real trades executed');
            
            // Ask if user wants to proceed with live trading
            console.log('');
            console.log('⚠️  To enable LIVE TRADING with real money:');
            console.log('   Run this script again with dryRun: false in the config');
            console.log('   Make sure you have at least $20 USDT in your futures wallet');
            
        } else {
            console.error('❌ Bot creation failed:', launchResponse.data.message);
            if (launchResponse.data.error) {
                console.error('   Error details:', launchResponse.data.error);
            }
            
            // If timestamp error, suggest clock sync
            if (launchResponse.data.message?.includes('Timestamp')) {
                console.log('');
                console.log('🕐 TIMESTAMP FIX SUGGESTIONS:');
                console.log('   1. Sync your system clock: w32tm /resync');
                console.log('   2. Or use NTP time sync');
                console.log('   3. Check timezone settings');
            }
            
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Error launching bot:', error.response?.data?.message || error.message);
        if (error.response?.data?.error) {
            console.error('   Details:', error.response.data.error);
        }
        
        // Timestamp error handling
        if (error.message?.includes('Timestamp') || error.response?.data?.message?.includes('Timestamp')) {
            console.log('');
            console.log('🕐 TIMESTAMP SYNC ISSUE DETECTED');
            console.log('   Your system time is ahead of Binance servers');
            console.log('   Run: w32tm /resync  (as administrator)');
            console.log('   Or wait a few minutes for automatic sync');
        }
        
        process.exit(1);
    }
}

// Run the bot launcher
launch20USDBot().catch(console.error);
