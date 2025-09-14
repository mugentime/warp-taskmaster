require('dotenv').config();
const Binance = require('binance-api-node').default;

const client = Binance({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    testnet: false,
    getTime: () => Date.now() - 2000
});

async function checkPositions() {
    try {
        console.log('🔍 CHECKING POSITIONS...');
        
        // Get spot balances
        const spotAccount = await client.accountInfo();
        const futures = await client.futuresAccountInfo();
        const futuresPositions = await client.futuresPositionRisk();
        const prices = await client.prices();
        
        const spotBalances = spotAccount.balances.filter(b => {
            const total = parseFloat(b.free) + parseFloat(b.locked);
            return total > 0;
        });
        
        const activePositions = futuresPositions.filter(p => parseFloat(p.positionAmt) !== 0);
        
        console.log('\n📊 ACCOUNT STATUS:');
        const spotUsdt = spotBalances.find(b => b.asset === 'USDT');
        console.log(`• Spot USDT: $${spotUsdt ? parseFloat(spotUsdt.free).toFixed(2) : '0.00'}`);
        console.log(`• Futures USDT: $${parseFloat(futures.availableBalance).toFixed(2)}`);
        
        console.log('\n🪙 SPOT HOLDINGS:');
        for (const balance of spotBalances) {
            if (balance.asset === 'USDT') continue;
            const total = parseFloat(balance.free) + parseFloat(balance.locked);
            const price = parseFloat(prices[balance.asset + 'USDT'] || 0);
            const value = total * price;
            console.log(`• ${balance.asset}: ${total.toFixed(2)} ($${value.toFixed(2)})`);
        }
        
        console.log('\n📈 FUTURES POSITIONS:');
        for (const position of activePositions) {
            console.log(`• ${position.symbol}: ${position.positionAmt} (PnL: $${parseFloat(position.unRealizedProfit).toFixed(2)})`);
        }
        
        console.log('\n⚖️ HEDGE RATIOS:');
        const hedgedAssets = new Set([
            ...spotBalances.map(b => b.asset),
            ...activePositions.map(p => p.symbol.replace('USDT', ''))
        ]);
        
        for (const asset of hedgedAssets) {
            if (asset === 'USDT') continue;
            
            const spotBalance = spotBalances.find(b => b.asset === asset);
            const futuresPosition = activePositions.find(p => p.symbol === asset + 'USDT');
            
            const spotSize = spotBalance ? parseFloat(spotBalance.free) + parseFloat(spotBalance.locked) : 0;
            const futuresSize = futuresPosition ? Math.abs(parseFloat(futuresPosition.positionAmt)) : 0;
            
            const ratio = futuresSize > 0 ? (futuresSize / spotSize) : 0;
            const status = ratio >= 0.9 && ratio <= 1.1 ? '✅' : '❌';
            
            console.log(`${status} ${asset}: ${(ratio * 100).toFixed(1)}% hedged (${spotSize} spot vs ${futuresSize} futures)`);
        }
        
        console.log('\n📊 SUMMARY:');
        console.log(`• Total active positions: ${activePositions.length}`);
        console.log(`• Total PnL: $${activePositions.reduce((sum, pos) => sum + parseFloat(pos.unRealizedProfit), 0).toFixed(2)}`);
        const hedgedCount = Array.from(hedgedAssets).filter(asset => {
            if (asset === 'USDT') return false;
            const spotBalance = spotBalances.find(b => b.asset === asset);
            const futuresPosition = activePositions.find(p => p.symbol === asset + 'USDT');
            const spotSize = spotBalance ? parseFloat(spotBalance.free) + parseFloat(spotBalance.locked) : 0;
            const futuresSize = futuresPosition ? Math.abs(parseFloat(futuresPosition.positionAmt)) : 0;
            const ratio = futuresSize > 0 ? (futuresSize / spotSize) : 0;
            return ratio >= 0.9 && ratio <= 1.1;
        }).length;
        console.log(`• Properly hedged: ${hedgedCount}/${hedgedAssets.size - 1}`);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkPositions();