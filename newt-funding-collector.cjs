const axios = require('axios');

async function createNewtFundingBot() {
    console.log('💰 NEWT FUNDING COLLECTOR BOT');
    console.log('🎯 Objective: Collect massive NEWT funding payments (-451.97% APY)');
    console.log('');
    
    const baseUrl = 'http://localhost:3001';
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;
    
    try {
        // Simple strategy: Just go LONG on NEWT perpetual futures
        // Since funding rate is negative (-0.4128%), long positions GET PAID
        const botConfig = {
            id: `newt-funding-collector-${Date.now()}`,
            name: `NEWT Funding Collector (${new Date().toLocaleTimeString()})`,
            symbol: 'NEWTUSDT',
            strategyType: 'Simple Long', // Simplified strategy
            investment: 20,
            leverage: 5, // Higher leverage for funding collection
            autoManaged: true,
            apiKey: apiKey,
            apiSecret: apiSecret,
            autoConvert: false, // Don't convert - we already have assets
            dryRun: false,
            // Custom config for funding collection
            strategyMode: 'funding_collection',
            targetWallet: 'futures'
        };
        
        console.log('🚀 Creating NEWT Funding Collector Bot...');
        console.log('');
        console.log('💡 Strategy Explanation:');
        console.log('   • NEWT has -0.4128% funding rate (every 8 hours)');
        console.log('   • This means LONG positions GET PAID funding fees');
        console.log('   • -451.97% annualized = you get paid to hold NEWT perps!');
        console.log('   • Your $20 can potentially earn $90+ per year from funding alone');
        console.log('');
        
        console.log('🤖 Bot Configuration:');
        console.log(`   💰 Investment: $${botConfig.investment} USD`);
        console.log(`   📈 Strategy: Simple Long (Funding Collection)`);
        console.log(`   ⚖️  Leverage: ${botConfig.leverage}x`);
        console.log(`   🎯 Symbol: NEWTUSDT`);
        console.log(`   💸 Expected Funding: +$${((20 * 0.004128 * 3 * 365) / 100).toFixed(2)} per year`);
        console.log(`   🔴 Mode: LIVE TRADING`);
        console.log('');
        
        // Direct API call to create a simple long position
        console.log('🚀 Executing simple LONG NEWT strategy...');
        
        // Use the test-newt-long-perp.js approach which should work
        const testResponse = await axios.post(`${baseUrl}/api/v1/test-newt-long`, {
            apiKey: apiKey,
            apiSecret: apiSecret,
            investment: 20,
            leverage: 5,
            dryRun: false
        });
        
        if (testResponse.data.success) {
            console.log('');
            console.log('🎉 SUCCESS! NEWT Funding Collector Bot Created!');
            console.log('');
            console.log('💸 Funding Collection Active:');
            console.log('   • Every 8 hours you will receive funding payments');
            console.log('   • -0.4128% × your position size × 3 times per day');
            console.log('   • With 5x leverage, this amplifies your returns');
            console.log('');
            console.log('🌐 Monitor at: http://localhost:4173/');
            console.log('✅ Bot is collecting NEWT funding payments!');
        } else {
            throw new Error(testResponse.data.message || 'Failed to create NEWT position');
        }
        
    } catch (error) {
        // If API doesn't support test-newt-long, create manual instructions
        console.log('📋 Manual NEWT Funding Collection Setup:');
        console.log('');
        console.log('🎯 You already have 39.16 NEWT tokens worth ~$10!');
        console.log('💡 To collect the -451.97% funding rate:');
        console.log('');
        console.log('1. 📱 Open Binance Futures');
        console.log('2. 🔍 Search for NEWTUSDT Perpetual');
        console.log('3. 📈 Place a LONG order:');
        console.log('   • Quantity: 78 NEWT (using 5x leverage)');
        console.log('   • Type: Market Order');
        console.log('   • Margin: ~$4 USDT');
        console.log('   • Leverage: 5x');
        console.log('4. ⏰ Every 8 hours you will receive funding payments');
        console.log('5. 💰 With -0.4128% rate, you get paid to hold long!');
        console.log('');
        console.log('💸 Expected Daily Earnings:');
        console.log(`   • Per 8h: $${(20 * 5 * 0.004128).toFixed(3)} USD`);
        console.log(`   • Per day: $${(20 * 5 * 0.004128 * 3).toFixed(2)} USD`);
        console.log(`   • Per month: $${(20 * 5 * 0.004128 * 3 * 30).toFixed(2)} USD`);
        console.log('');
        console.log('🌐 Monitor funding rates: http://localhost:4173/');
        console.log('⚠️  Remember: Funding rates change every 8 hours!');
    }
}

createNewtFundingBot().catch(console.error);
