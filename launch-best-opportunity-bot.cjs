require('dotenv').config();
const axios = require('axios');

async function launchBestOpportunityBot(targetSymbol, investmentAmount) {
    console.log('🎯 Starting BEST OPPORTUNITY Bot Launcher...');
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
        
        // Fetch current arbitrage opportunities
        console.log('📊 Analyzing current arbitrage opportunities...');
        const opportunitiesResponse = await axios.get(`${baseUrl}/api/v1/arbitrage-opportunities`);
        
        if (!opportunitiesResponse.data.opportunities || opportunitiesResponse.data.opportunities.length === 0) {
            console.log('❌ No arbitrage opportunities found at the moment');
            console.log('   Try again in a few minutes when funding rates update');
            process.exit(1);
        }
        
        // Sort opportunities by profit potential and select the best one
        const opportunities = opportunitiesResponse.data.opportunities;
        const sortedOpportunities = opportunities
            .filter(op => op.liquidity >= 100000) // Minimum $100k liquidity
            .sort((a, b) => {
                // Primary sort: Annualized rate (profit potential)
                const aRate = Math.abs(parseFloat(a.annualizedRate || 0));
                const bRate = Math.abs(parseFloat(b.annualizedRate || 0));
                if (Math.abs(bRate - aRate) > 5) return bRate - aRate; // If >5% difference
                
                // Secondary sort: Liquidity (safety)
                return b.liquidity - a.liquidity;
            });
        
        if (sortedOpportunities.length === 0) {
            console.log('❌ No high-quality opportunities found (need >$100k liquidity)');
            process.exit(1);
        }
        
        const bestOpportunity = sortedOpportunities[0];
        
        console.log('🏆 BEST OPPORTUNITY SELECTED:');
        console.log('');
        console.log(`   Symbol: ${bestOpportunity.symbol}`);
        console.log(`   Strategy: ${parseFloat(bestOpportunity.fundingRate) > 0 ? 'Short Perp + Buy Spot' : 'Long Perp + Short Spot'}`);
        console.log(`   Funding Rate: ${bestOpportunity.fundingRatePercent}% per 8h`);
        console.log(`   Annualized Rate: ${bestOpportunity.annualizedRate}%`);
        console.log(`   Liquidity: $${(bestOpportunity.liquidity / 1000000).toFixed(1)}M`);
        console.log(`   Risk Score: ${bestOpportunity.riskScore?.toFixed(1) || 'N/A'}`);
        console.log('');
        
        // Show top 5 opportunities for context
        console.log('📈 Top 5 Opportunities Available:');
        sortedOpportunities.slice(0, 5).forEach((op, i) => {
            console.log(`   ${i + 1}. ${op.symbol}: ${op.annualizedRate}% annual (${op.fundingRatePercent}% per 8h)`);
        });
        console.log('');
        
        // Determine strategy based on funding rate direction
        const fundingRate = parseFloat(bestOpportunity.fundingRate);
        const strategy = fundingRate > 0 ? 'Arbitrage' : 'Long Perp';
        const isShort = fundingRate > 0;
        
        // Create bot configuration for the best opportunity
        const botConfig = {
            id: `best-opportunity-${bestOpportunity.symbol.toLowerCase()}-${Date.now()}`,
            name: `BEST: ${bestOpportunity.symbol} ${strategy} (${bestOpportunity.annualizedRate}% APY)`,
            symbol: bestOpportunity.symbol,
            strategyType: strategy,
            investment: 20, // $20 USD investment
            leverage: 3, // Conservative 3x leverage
            autoManaged: true,
            apiKey: apiKey,
            apiSecret: apiSecret,
            autoConvert: true,
            dryRun: false, // LIVE TRADING
            // Opportunity-specific data
            expectedAnnualReturn: parseFloat(bestOpportunity.annualizedRate),
            fundingRate: bestOpportunity.fundingRate,
            liquidity: bestOpportunity.liquidity,
            riskScore: bestOpportunity.riskScore || 0
        };
        
        console.log('🤖 LIVE Bot Configuration:');
        console.log(`   💰 Investment: $${botConfig.investment} USD`);
        console.log(`   📈 Strategy: ${botConfig.strategyType}`);
        console.log(`   ⚖️  Leverage: ${botConfig.leverage}x`);
        console.log(`   🎯 Symbol: ${botConfig.symbol}`);
        console.log(`   📊 Expected Return: ${botConfig.expectedAnnualReturn}% annually`);
        console.log(`   💎 Liquidity: $${(botConfig.liquidity / 1000000).toFixed(1)}M`);
        console.log(`   🛡️  Risk Score: ${botConfig.riskScore.toFixed(1)}`);
        console.log(`   🔴 Mode: LIVE TRADING`);
        console.log('');
        
        // Launch the bot
        console.log('🚀 Launching BEST OPPORTUNITY bot...');
        const launchResponse = await axios.post(`${baseUrl}/api/v1/launch-bot`, botConfig);
        
        if (launchResponse.data.success) {
            console.log('');
            console.log('🎉 SUCCESS! Your BEST OPPORTUNITY bot is now active!');
            console.log('');
            console.log('🤖 Live Bot Details:');
            console.log(`   Bot ID: ${launchResponse.data.bot.id}`);
            console.log(`   Name: ${launchResponse.data.bot.name}`);
            console.log(`   Status: ${launchResponse.data.bot.status}`);
            console.log(`   Investment: $${launchResponse.data.bot.investment} USD`);
            console.log(`   Expected APY: ${botConfig.expectedAnnualReturn}%`);
            
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
            console.log('🔴 LIVE TRADING ACTIVE!');
            console.log('');
            console.log('💡 What Your Bot is Doing:');
            if (isShort) {
                console.log('   • Short perpetual futures (betting price goes down)');
                console.log('   • Buy spot assets (hedging the short)');
                console.log('   • Collect positive funding payments every 8 hours');
            } else {
                console.log('   • Long perpetual futures (betting price goes up)'); 
                console.log('   • Receive negative funding (getting paid to hold long)');
                console.log('   • Profit from funding rate arbitrage');
            }
            
            console.log('');
            console.log('🌐 Monitor your bot:');
            console.log('   Web UI: http://localhost:4173/');
            console.log('   Backend API: http://localhost:3001/');
            console.log('');
            console.log('⚠️  Trading Notes:');
            console.log('   • Funding payments occur every 8 hours (00:00, 08:00, 16:00 UTC)');
            console.log('   • Bot will automatically rebalance positions');
            console.log('   • Monitor market conditions and funding rate changes');
            console.log('   • Stop bot anytime via web interface if conditions change');
            console.log('');
            console.log(`✅ Your ${bestOpportunity.symbol} arbitrage bot is operational!`);
            
        } else {
            console.error('❌ Bot creation failed:', launchResponse.data.message);
            if (launchResponse.data.error) {
                console.error('   Error details:', launchResponse.data.error);
            }
            
            // Suggest alternatives
            if (sortedOpportunities.length > 1) {
                console.log('');
                console.log('💡 Alternative opportunities to try:');
                sortedOpportunities.slice(1, 4).forEach((op, i) => {
                    console.log(`   ${i + 2}. ${op.symbol}: ${op.annualizedRate}% APY`);
                });
            }
            
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Error launching best opportunity bot:', error.response?.data?.message || error.message);
        if (error.response?.data?.error) {
            console.error('   Details:', error.response.data.error);
        }
        
        console.log('');
        console.log('🛠️  Troubleshooting:');
        console.log('   1. Ensure backend and frontend are running');
        console.log('   2. Check your Binance API permissions');
        console.log('   3. Verify sufficient balance in your account');
        console.log('   4. Try again - funding rates update every few minutes');
        
        process.exit(1);
    }
}

// Run the best opportunity bot launcher
launchBestOpportunityBot().catch(console.error);
