require('dotenv').config();
const Binance = require('binance-api-node').default;

const client = Binance({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    testnet: false,
    getTime: () => Date.now() - 2000
});

async function closeImbalancedPositions() {
    try {
        console.log('🔍 CHECKING FOR IMBALANCED POSITIONS...');
        
        // Get all positions
        const spotAccount = await client.accountInfo();
        const futuresPositions = await client.futuresPositionRisk();
        const prices = await client.prices();
        
        const activePositions = futuresPositions.filter(p => parseFloat(p.positionAmt) !== 0);
        
        console.log(`\n📊 Found ${activePositions.length} active futures positions`);
        
        // Check each position
        for (const position of activePositions) {
            const symbol = position.symbol;
            const baseAsset = symbol.replace('USDT', '');
            const spotBalance = spotAccount.balances.find(b => b.asset === baseAsset);
            
            const spotSize = spotBalance ? parseFloat(spotBalance.free) + parseFloat(spotBalance.locked) : 0;
            const futuresSize = Math.abs(parseFloat(position.positionAmt));
            const ratio = futuresSize / spotSize;
            
            console.log(`\n🔍 Checking ${symbol}:`);
            console.log(`   • Spot: ${spotSize}`);
            console.log(`   • Futures: ${futuresSize}`);
            console.log(`   • Ratio: ${(ratio * 100).toFixed(1)}%`);
            
            if (ratio > 1.1 || ratio < 0.9) {
                console.log(`❌ IMBALANCED POSITION DETECTED: ${symbol}`);
                console.log(`   Closing futures position...`);
                
                try {
                    // Close futures position
                    const closeOrder = await client.futuresOrder({
                        symbol: symbol,
                        side: position.positionAmt < 0 ? 'BUY' : 'SELL',
                        type: 'MARKET',
                        quantity: Math.abs(parseFloat(position.positionAmt)).toString()
                    });
                    
                    console.log(`✅ Closed futures position: ${symbol}`);
                    console.log(`   Order ID: ${closeOrder.orderId}`);
                    
                    // Small delay between operations
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`❌ Error closing ${symbol}:`, error.message);
                }
            } else {
                console.log(`✅ Position is balanced`);
            }
        }
        
        console.log('\n✅ POSITION CHECK COMPLETE');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

closeImbalancedPositions();