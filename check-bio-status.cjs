require('dotenv').config();
const client = require('binance-api-node').default({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    testnet: false,
    getTime: () => Date.now() - 2000
});

async function checkBIOStatus() {
    try {
        const account = await client.accountInfo();
        console.log('🔍 CURRENT BIO BALANCE CHECK:');
        
        const bio = account.balances.find(b => b.asset === 'BIO');
        if (bio) {
            console.log(`   BIO Free: ${bio.free}`);
            console.log(`   BIO Locked: ${bio.locked}`);
            const total = parseFloat(bio.free) + parseFloat(bio.locked);
            console.log(`   BIO Total: ${total}`);
            
            if (total > 0) {
                console.log('❌ BIO still exists - conversion incomplete');
                
                // Get price to show value
                const prices = await client.prices();
                const bioPrice = parseFloat(prices.BIOUSDT || 0);
                const value = total * bioPrice;
                console.log(`   BIO Price: $${bioPrice.toFixed(6)}`);
                console.log(`   BIO Value: $${value.toFixed(2)}`);
                
                if (value > 5) {
                    console.log('💡 Significant BIO value - should be converted for better liquidity');
                } else {
                    console.log('ℹ️  Small BIO value - dust amount');
                }
            } else {
                console.log('✅ BIO fully converted');
            }
        } else {
            console.log('✅ No BIO balance found');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkBIOStatus();
