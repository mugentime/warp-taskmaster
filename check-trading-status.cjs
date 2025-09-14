require('dotenv').config();
const Binance = require('binance-api-node').default;

const client = Binance({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    testnet: false,
    getTime: () => Date.now() - 2000
});

async function checkStatus() {
    try {
        console.log('🔍 CHECKING CURRENT POSITIONS AND ACCOUNT STATUS...');
        
        // Check futures positions
        const futuresPositions = await client.futuresPositionRisk();
        const activePositions = futuresPositions.filter(pos => parseFloat(pos.positionAmt) !== 0);
        
        console.log(`\n📊 ACTIVE FUTURES POSITIONS: ${activePositions.length}`);
        activePositions.forEach(pos => {
            console.log(`   ${pos.symbol}: ${pos.positionAmt} (PnL: $${parseFloat(pos.unRealizedProfit).toFixed(2)})`);
        });
        
        // Check futures account
        const futuresAccount = await client.futuresAccountInfo();
        const usdtBalance = futuresAccount.assets.find(a => a.asset === 'USDT');
        
        console.log(`\n💰 FUTURES ACCOUNT STATUS:`);
        console.log(`   Available Balance: $${parseFloat(usdtBalance.availableBalance).toFixed(2)}`);
        console.log(`   Wallet Balance: $${parseFloat(usdtBalance.walletBalance).toFixed(2)}`);
        console.log(`   Cross Margin: ${futuresAccount.canTrade ? 'ENABLED' : 'DISABLED'}`);
        
        // Check spot balances for recently purchased assets
        const spotAccount = await client.accountInfo();
        const relevantSpotAssets = spotAccount.balances.filter(b => {
            const total = parseFloat(b.free) + parseFloat(b.locked);
            return total > 0 && ['BIO', 'MAV', 'BB', 'SKL', 'PROVE', 'NMR', 'USDT'].includes(b.asset);
        });
        
        console.log(`\n🪙 RELEVANT SPOT HOLDINGS:`);
        relevantSpotAssets.forEach(balance => {
            const total = parseFloat(balance.free) + parseFloat(balance.locked);
            console.log(`   ${balance.asset}: ${total.toFixed(2)}`);
        });
        
        // Check API permissions
        console.log(`\n🔐 API PERMISSIONS CHECK:`);
        console.log(`   Spot Trading: ${spotAccount.canTrade ? 'ENABLED' : 'DISABLED'}`);
        console.log(`   Futures Trading: ${futuresAccount.canTrade ? 'ENABLED' : 'DISABLED'}`);
        console.log(`   Can Deposit: ${futuresAccount.canDeposit ? 'YES' : 'NO'}`);
        console.log(`   Can Withdraw: ${futuresAccount.canWithdraw ? 'YES' : 'NO'}`);
        
        // Test getting exchange info for one of the failing symbols
        console.log(`\n🧪 TESTING FUTURES EXCHANGE INFO...`);
        try {
            const futuresExchangeInfo = await client.futuresExchangeInfo();
            const bioSymbol = futuresExchangeInfo.symbols.find(s => s.symbol === 'BIOUSDT');
            
            if (bioSymbol) {
                console.log(`   BIOUSDT Status: ${bioSymbol.status}`);
                console.log(`   Trading Enabled: ${bioSymbol.status === 'TRADING' ? 'YES' : 'NO'}`);
                
                const lotSizeFilter = bioSymbol.filters.find(f => f.filterType === 'LOT_SIZE');
                if (lotSizeFilter) {
                    console.log(`   Min Quantity: ${lotSizeFilter.minQty}`);
                    console.log(`   Step Size: ${lotSizeFilter.stepSize}`);
                }
                
                const minNotionalFilter = bioSymbol.filters.find(f => f.filterType === 'MIN_NOTIONAL');
                if (minNotionalFilter) {
                    console.log(`   Min Notional: $${minNotionalFilter.notional}`);
                }
            } else {
                console.log(`   ❌ BIOUSDT not found in futures exchange info`);
            }
        } catch (testError) {
            console.log(`   ❌ Exchange info error: ${testError.message}`);
        }
        
        // Calculate if we have proper delta-neutral positions
        console.log(`\n⚖️ DELTA-NEUTRAL STATUS CHECK:`);
        
        const spotTotalValue = relevantSpotAssets.reduce((sum, balance) => {
            if (balance.asset === 'USDT') return sum;
            return sum + (parseFloat(balance.free) + parseFloat(balance.locked));
        }, 0);
        
        console.log(`   Spot Assets (non-USDT): ${spotTotalValue > 0 ? 'YES' : 'NO'}`);
        console.log(`   Futures Hedges: ${activePositions.length > 0 ? 'YES' : 'NO'}`);
        
        if (spotTotalValue > 0 && activePositions.length === 0) {
            console.log(`   ⚠️ WARNING: You have UNHEDGED spot positions!`);
            console.log(`   ❌ Status: NOT DELTA-NEUTRAL (HIGH RISK)`);
        } else if (spotTotalValue > 0 && activePositions.length > 0) {
            console.log(`   ✅ Status: DELTA-NEUTRAL STRUCTURE DETECTED`);
        } else {
            console.log(`   ℹ️ Status: NO POSITIONS TO HEDGE`);
        }
        
    } catch (error) {
        console.error('❌ Error checking status:', error.message);
        console.error('Full error:', error);
    }
}

checkStatus();
