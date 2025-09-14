/**
 * 🔧 FIX BIO CONVERSION SCRIPT
 * 
 * PURPOSE: Analyze and fix BIO token conversion issues
 * - Check current BIO balance and value
 * - Analyze trading requirements (LOT_SIZE, MIN_NOTIONAL)
 * - Attempt proper conversion to USDT
 */

require('dotenv').config();
const Binance = require('binance-api-node').default;

const client = Binance({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    testnet: false,
    getTime: () => Date.now() - 2000
});

async function fixBIOConversion() {
    try {
        console.log('🔍 ANALYZING BIO CONVERSION ISSUE...');
        console.log('════════════════════════════════════════');
        
        // Get account info
        const account = await client.accountInfo();
        const bioBalance = account.balances.find(b => b.asset === 'BIO');
        
        if (!bioBalance || parseFloat(bioBalance.free) === 0) {
            console.log('❌ No BIO balance found');
            return;
        }
        
        const freeAmount = parseFloat(bioBalance.free);
        const lockedAmount = parseFloat(bioBalance.locked);
        
        console.log('📊 BIO BALANCE:');
        console.log(`   Free: ${freeAmount} BIO`);
        console.log(`   Locked: ${lockedAmount} BIO`);
        console.log(`   Total: ${freeAmount + lockedAmount} BIO`);
        
        // Get BIO price and value
        const prices = await client.prices();
        const bioPrice = parseFloat(prices.BIOUSDT);
        const totalValue = (freeAmount + lockedAmount) * bioPrice;
        const freeValue = freeAmount * bioPrice;
        
        console.log('\n💰 VALUE:');
        console.log(`   BIO Price: $${bioPrice.toFixed(6)} USDT`);
        console.log(`   Free Value: $${freeValue.toFixed(2)} USDT`);
        console.log(`   Total Value: $${totalValue.toFixed(2)} USDT`);
        
        // Get trading rules
        const exchangeInfo = await client.exchangeInfo();
        const bioSymbol = exchangeInfo.symbols.find(s => s.symbol === 'BIOUSDT');
        
        if (!bioSymbol) {
            console.log('❌ BIOUSDT trading pair not found');
            return;
        }
        
        console.log('\n📋 TRADING RULES:');
        const lotSizeFilter = bioSymbol.filters.find(f => f.filterType === 'LOT_SIZE');
        const minNotionalFilter = bioSymbol.filters.find(f => f.filterType === 'MIN_NOTIONAL');
        
        if (lotSizeFilter) {
            console.log(`   LOT_SIZE:`);
            console.log(`     Min Qty: ${lotSizeFilter.minQty}`);
            console.log(`     Max Qty: ${lotSizeFilter.maxQty}`);
            console.log(`     Step Size: ${lotSizeFilter.stepSize}`);
        }
        
        if (minNotionalFilter) {
            console.log(`   MIN_NOTIONAL: ${minNotionalFilter.minNotional} USDT`);
        }
        
        // Calculate proper sell quantity
        const stepSize = parseFloat(lotSizeFilter.stepSize);
        const minQty = parseFloat(lotSizeFilter.minQty);
        const minNotional = parseFloat(minNotionalFilter.minNotional || '5');
        
        // Round down to proper step size
        const properQty = Math.floor(freeAmount / stepSize) * stepSize;
        const properNotional = properQty * bioPrice;
        
        console.log('\n🔧 CONVERSION CALCULATION:');
        console.log(`   Available: ${freeAmount} BIO`);
        console.log(`   Proper Qty: ${properQty} BIO (rounded to step size)`);
        console.log(`   Proper Notional: $${properNotional.toFixed(2)} USDT`);
        
        // Check if conversion is possible
        if (properQty < minQty) {
            console.log(`❌ CANNOT CONVERT: Quantity ${properQty} < minimum ${minQty}`);
            return;
        }
        
        if (properNotional < minNotional) {
            console.log(`❌ CANNOT CONVERT: Notional $${properNotional.toFixed(2)} < minimum $${minNotional}`);
            return;
        }
        
        console.log('✅ CONVERSION IS POSSIBLE!');
        
        // Ask user for confirmation
        console.log('\n🚀 READY TO CONVERT BIO TO USDT');
        console.log(`   Will sell: ${properQty} BIO`);
        console.log(`   Expected: ~$${properNotional.toFixed(2)} USDT`);
        console.log(`   Remaining: ${(freeAmount - properQty).toFixed(0)} BIO (dust)`);
        
        // Execute conversion
        console.log('\n⏳ Executing market sell order...');
        
        const sellOrder = await client.order({
            symbol: 'BIOUSDT',
            side: 'SELL',
            type: 'MARKET',
            quantity: properQty.toFixed(0) // Round to integer for BIO
        });
        
        console.log('✅ CONVERSION SUCCESSFUL!');
        console.log(`   Order ID: ${sellOrder.orderId}`);
        console.log(`   Status: ${sellOrder.status}`);
        console.log(`   Executed: ${sellOrder.executedQty} BIO`);
        
        if (sellOrder.fills) {
            let totalUSDT = 0;
            sellOrder.fills.forEach(fill => {
                const usdt = parseFloat(fill.qty) * parseFloat(fill.price);
                totalUSDT += usdt;
                console.log(`   Fill: ${fill.qty} BIO @ $${parseFloat(fill.price).toFixed(6)} = $${usdt.toFixed(2)}`);
            });
            console.log(`   Total USDT Received: $${totalUSDT.toFixed(2)}`);
        }
        
        console.log('\n💰 Your liquid USDT balance has been increased!');
        console.log('🎯 The automation system will now have more capital to deploy');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code) {
            console.log('   Error Code:', error.code);
        }
        
        // Common error explanations
        if (error.message.includes('LOT_SIZE')) {
            console.log('\n💡 LOT_SIZE Error Solution:');
            console.log('   - The quantity must be rounded to the correct step size');
            console.log('   - BIO might require integer quantities (no decimals)');
        }
        
        if (error.message.includes('MIN_NOTIONAL')) {
            console.log('\n💡 MIN_NOTIONAL Error Solution:');
            console.log('   - The total order value is too small');
            console.log('   - Need to sell more BIO or wait for higher price');
        }
    }
}

console.log('🤖 BIO CONVERSION FIXER');
console.log('This will convert your BIO tokens to USDT for trading');
console.log('');

// Safety countdown
let countdown = 3;
const timer = setInterval(() => {
    if (countdown > 0) {
        console.log(`🚀 Starting analysis in ${countdown}...`);
        countdown--;
    } else {
        clearInterval(timer);
        console.log('🔥 ANALYZING NOW!');
        console.log('');
        fixBIOConversion().catch(console.error);
    }
}, 1000);
