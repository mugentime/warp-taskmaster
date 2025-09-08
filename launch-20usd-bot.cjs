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
        const opportunitiesResponse = await axios.get(`${baseUrl}/api/v1/arbitrage-opportunities`);
        
        if (!opportunitiesResponse.data.opportunities || opportunitiesResponse.data.opportunities.length === 0) {
            console.log('⚠️  No arbitrage opportunities found, creating a basic BTCUSDT bot...');
        }
        
        // Create bot configuration
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
            dryRun: false
        };
        
        console.log('🤖 Bot Configuration:');
        console.log(`   💰 Investment: $${botConfig.investment} USD`);
        console.log(`   📈 Strategy: ${botConfig.strategyType}`);
        console.log(`   ⚖️  Leverage: ${botConfig.leverage}x`);
        console.log(`   🎯 Symbol: ${botConfig.symbol}`);
        console.log(`   🔄 Auto-Managed: ${botConfig.autoManaged ? 'Yes' : 'No'}`);
        console.log(`   ⚠️  Live Trading: ${!botConfig.dryRun ? 'ENABLED' : 'Disabled'}`);
        console.log('');
        
        // Launch the bot
        console.log('🚀 Launching bot...');
        const launchResponse = await axios.post(`${baseUrl}/api/v1/launch-bot`, botConfig);
        
        if (launchResponse.data.success) {
            console.log('');
            console.log('🎉 SUCCESS! Your $20 USD bot has been created and launched!');
            console.log('');
            console.log('🤖 Bot Details:');
            console.log(`   Bot ID: ${launchResponse.data.bot.id}`);
            console.log(`   Name: ${launchResponse.data.bot.name}`);
            console.log(`   Status: ${launchResponse.data.bot.status}`);
            console.log(`   Investment: $${launchResponse.data.bot.investment} USD`);
            console.log(`   Leverage: ${launchResponse.data.bot.leverage}x`);
            
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
            console.log('🌐 Monitor your bot:');
            console.log('   Web UI: http://localhost:4173/');
            console.log('   Backend API: http://localhost:3001/');
            console.log('');
            console.log('✅ Bot is now active and trading with your $20 USD budget!');
            
        } else {
            console.error('❌ Bot creation failed:', launchResponse.data.message);
            if (launchResponse.data.error) {
                console.error('   Error details:', launchResponse.data.error);
            }
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Error launching bot:', error.response?.data?.message || error.message);
        if (error.response?.data?.error) {
            console.error('   Details:', error.response.data.error);
        }
        process.exit(1);
    }
}

// Run the bot launcher
launch20USDBot().catch(console.error);
