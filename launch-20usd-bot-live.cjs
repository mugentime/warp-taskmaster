const axios = require('axios');

async function launch20USDBot() {
    console.log('🚀 Starting $20 USD LIVE Trading Bot...');
    console.log('');
    console.log('⚠️  WARNING: This will create a LIVE bot with REAL money!');
    console.log('💰 Investment: $20 USD');
    console.log('📈 Strategy: Long Perp BTCUSDT');
    console.log('⚖️  Leverage: 3x (Conservative)');
    console.log('');
    
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
        
        // Create bot configuration for LIVE trading
        const botConfig = {
            id: `live-bot-20usd-${Date.now()}`,
            name: `LIVE $20 USD Bot - ${new Date().toLocaleTimeString()}`,
            symbol: 'BTCUSDT',
            strategyType: 'Long Perp',
            investment: 20,
            leverage: 3,
            autoManaged: true,
            apiKey: apiKey,
            apiSecret: apiSecret,
            autoConvert: true,
            dryRun: false, // LIVE TRADING ENABLED
            timestampOffset: -2000
        };
        
        console.log('🤖 LIVE Bot Configuration:');
        console.log(`   💰 Investment: $${botConfig.investment} USD`);
        console.log(`   📈 Strategy: ${botConfig.strategyType}`);
        console.log(`   ⚖️  Leverage: ${botConfig.leverage}x`);
        console.log(`   🎯 Symbol: ${botConfig.symbol}`);
        console.log(`   🔄 Auto-Managed: ${botConfig.autoManaged ? 'Yes' : 'No'}`);
        console.log(`   ⚠️  Mode: ${botConfig.dryRun ? 'DRY RUN' : '🔴 LIVE TRADING'}`);
        console.log('');
        
        // Launch the LIVE bot
        console.log('🚀 Launching LIVE trading bot...');
        const launchResponse = await axios.post(`${baseUrl}/api/v1/launch-bot`, botConfig);
        
        if (launchResponse.data.success) {
            console.log('');
            console.log('🎉 SUCCESS! Your LIVE $20 USD trading bot is now active!');
            console.log('');
            console.log('🤖 Live Bot Details:');
            console.log(`   Bot ID: ${launchResponse.data.bot.id}`);
            console.log(`   Name: ${launchResponse.data.bot.name}`);
            console.log(`   Status: ${launchResponse.data.bot.status}`);
            console.log(`   Investment: $${launchResponse.data.bot.investment} USD`);
            console.log(`   Leverage: ${launchResponse.data.bot.leverage}x`);
            console.log(`   Symbol: ${launchResponse.data.bot.symbol}`);
            
            if (launchResponse.data.preflight) {
                console.log('');
                console.log('🔄 Automated Setup Completed:');
                if (launchResponse.data.preflight.transfers) {
                    console.log(`   Wallet transfers: ${launchResponse.data.preflight.transfers.summary?.totalTransfers || 0}`);
                }
                if (launchResponse.data.preflight.executed) {
                    console.log(`   Asset conversions: ${launchResponse.data.preflight.executed.length || 0}`);
                }
            }
            
            console.log('');
            console.log('🔴 LIVE TRADING ACTIVE - Your bot is now trading with real money!');
            console.log('');
            console.log('🌐 Monitor your bot:');
            console.log('   Web UI: http://localhost:4173/');
            console.log('   Backend API: http://localhost:3001/');
            console.log('');
            console.log('⚠️  Important Notes:');
            console.log('   • Bot will execute real trades with your $20 budget');
            console.log('   • Monitor performance regularly');
            console.log('   • Uses 3x leverage (conservative for futures)');
            console.log('   • Stop the bot anytime via the web interface');
            console.log('');
            console.log('✅ Your $20 USD trading bot is operational!');
            
        } else {
            console.error('❌ Live bot creation failed:', launchResponse.data.message);
            if (launchResponse.data.error) {
                console.error('   Error details:', launchResponse.data.error);
            }
            
            // Common error handling
            if (launchResponse.data.message?.includes('Timestamp')) {
                console.log('');
                console.log('🕐 Timestamp sync issue - Backend should have been fixed');
            }
            if (launchResponse.data.message?.includes('insufficient')) {
                console.log('');
                console.log('💰 Insufficient balance - ensure you have at least $20 USDT in futures wallet');
            }
            
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Error launching live bot:', error.response?.data?.message || error.message);
        if (error.response?.data?.error) {
            console.error('   Details:', error.response.data.error);
        }
        
        console.log('');
        console.log('🛠️  Troubleshooting:');
        console.log('   1. Ensure backend is running (should be started automatically)');
        console.log('   2. Check your Binance API permissions (futures trading enabled)');
        console.log('   3. Verify you have at least $20 USDT in your futures wallet');
        console.log('   4. Check internet connection to Binance');
        
        process.exit(1);
    }
}

// Run the live bot launcher
launch20USDBot().catch(console.error);
