#!/usr/bin/env node
/**
 * UNIFIED BALANCE CALCULATOR - FIXED VERSION
 * Provides consistent balance calculations to avoid discrepancies between different scripts
 */

require('dotenv').config();
const Binance = require('binance-api-node').default;

const client = Binance({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    testnet: false,
    getTime: () => Date.now() + (parseInt(process.env.TIMESTAMP_OFFSET) || 0)
});

async function getUnifiedBalance() {
    try {
        console.log('💰 UNIFIED BALANCE CALCULATION\n');
        
        // Get current prices for all symbols
        const prices = await client.prices();
        
        // Get Spot Account
        console.log('🏦 SPOT WALLET ANALYSIS:');
        console.log('═══════════════════════════');
        const spotAccount = await client.accountInfo();
        
        let spotBreakdown = [];
        let totalSpotValue = 0;
        let liquidUSDT = 0;
        
        spotAccount.balances.forEach(balance => {
            const free = parseFloat(balance.free);
            const locked = parseFloat(balance.locked);
            const total = free + locked;
            
            if (total > 0.001) { // Only include meaningful balances
                let usdValue = 0;
                
                if (balance.asset === 'USDT') {
                    usdValue = total;
                    liquidUSDT += total;
                } else {
                    const symbol = balance.asset + 'USDT';
                    const price = prices[symbol];
                    if (price) {
                        usdValue = total * parseFloat(price);
                    }
                }
                
                if (usdValue > 0.01) {
                    spotBreakdown.push({
                        asset: balance.asset,
                        amount: total,
                        free,
                        locked,
                        usdValue,
                        isLiquid: balance.asset === 'USDT'
                    });
                    totalSpotValue += usdValue;
                    console.log(`   ${balance.asset}: ${total.toFixed(4)} tokens = $${usdValue.toFixed(2)} ${balance.asset === 'USDT' ? '(LIQUID)' : ''}`);
                }
            }
        });
        
        console.log(`\n💵 Total SPOT Value: $${totalSpotValue.toFixed(2)}`);
        console.log(`💧 Liquid USDT in Spot: $${liquidUSDT.toFixed(2)}\n`);
        
        // Get Futures Account
        console.log('🚀 FUTURES WALLET ANALYSIS:');
        console.log('═══════════════════════════════');
        const futuresAccount = await client.futuresAccountInfo();
        
        let futuresUSDT = 0;
        let futuresAvailable = 0;
        let unrealizedPnL = 0;
        let positionsValue = 0;
        
        futuresAccount.assets.forEach(asset => {
            const balance = parseFloat(asset.walletBalance);
            if (balance > 0) {
                console.log(`   ${asset.asset}: ${balance.toFixed(4)}`);
                if (asset.asset === 'USDT') {
                    futuresUSDT = balance;
                }
            }
        });
        
        futuresAvailable = parseFloat(futuresAccount.availableBalance);
        unrealizedPnL = parseFloat(futuresAccount.totalUnrealizedProfit);
        
        // Get positions for deployed capital calculation
        const positions = futuresAccount.positions.filter(pos => parseFloat(pos.positionAmt) !== 0);
        positions.forEach(pos => {
            const notional = Math.abs(parseFloat(pos.positionAmt) * parseFloat(pos.markPrice));
            positionsValue += notional;
            console.log(`   Position ${pos.symbol}: $${notional.toFixed(2)} (${parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT'})`);
        });
        
        console.log(`\n💵 Futures Wallet Balance: $${futuresUSDT.toFixed(2)}`);
        console.log(`💧 Available for Trading: $${futuresAvailable.toFixed(2)}`);
        console.log(`📊 Unrealized PnL: ${unrealizedPnL >= 0 ? '+' : ''}$${unrealizedPnL.toFixed(2)}`);
        console.log(`📍 Total Positions Value: $${positionsValue.toFixed(2)}\n`);
        
        // Calculate totals
        const totalPortfolioValue = totalSpotValue + futuresUSDT;
        const totalLiquidCapital = liquidUSDT + futuresAvailable;
        const totalDeployedCapital = (totalSpotValue - liquidUSDT) + (futuresUSDT - futuresAvailable);
        const availableCapital = totalPortfolioValue - totalDeployedCapital;
        
        console.log('📊 UNIFIED BALANCE SUMMARY:');
        console.log('════════════════════════════');
        console.log(`🏆 TOTAL PORTFOLIO VALUE: $${totalPortfolioValue.toFixed(2)}`);
        console.log(`🏦 SPOT ASSETS: $${totalSpotValue.toFixed(2)}`);
        console.log(`🚀 FUTURES WALLET: $${futuresUSDT.toFixed(2)}`);
        console.log(`💧 TOTAL LIQUID CAPITAL: $${totalLiquidCapital.toFixed(2)}`);
        console.log(`📈 TOTAL DEPLOYED CAPITAL: $${totalDeployedCapital.toFixed(2)}`);
        console.log(`💰 AVAILABLE FOR NEW POSITIONS: $${availableCapital.toFixed(2)}`);
        console.log(`📊 CAPITAL UTILIZATION: ${((totalDeployedCapital / totalPortfolioValue) * 100).toFixed(1)}%`);
        
        console.log('\n💎 ASSET ALLOCATION:');
        console.log('═════════════════════');
        spotBreakdown.forEach(asset => {
            const percentage = (asset.usdValue / totalPortfolioValue) * 100;
            console.log(`   ${asset.asset}: $${asset.usdValue.toFixed(2)} (${percentage.toFixed(1)}%)`);
        });
        if (futuresUSDT > 0) {
            const percentage = (futuresUSDT / totalPortfolioValue) * 100;
            console.log(`   FUTURES USDT: $${futuresUSDT.toFixed(2)} (${percentage.toFixed(1)}%)`);
        }
        
        return {
            totalPortfolioValue,
            spotValue: totalSpotValue,
            futuresValue: futuresUSDT,
            liquidCapital: totalLiquidCapital,
            deployedCapital: totalDeployedCapital,
            availableCapital,
            utilizationPercent: (totalDeployedCapital / totalPortfolioValue) * 100,
            spotBreakdown,
            futuresUSDT,
            futuresAvailable,
            unrealizedPnL,
            positionsValue,
            liquidUSDT
        };
        
    } catch (error) {
        console.error('❌ Error in unified balance calculation:', error.message);
        return null;
    }
}

if (require.main === module) {
    getUnifiedBalance().then(result => {
        if (result) {
            console.log('\n✅ Unified balance calculation completed');
        }
    });
}

module.exports = { getUnifiedBalance };
