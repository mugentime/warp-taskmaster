/**
 * 🛡️ ENHANCED TRADE VALIDATOR
 * ═══════════════════════════════════════════════════════════
 * 
 * Ensures proper position sizing and delta-neutral validation
 * with retry logic and comprehensive safety checks.
 */

require('dotenv').config();
const Binance = require('binance-api-node').default;

class TradeValidator {
    constructor() {
        this.client = Binance({
            apiKey: process.env.BINANCE_API_KEY,
            apiSecret: process.env.BINANCE_API_SECRET,
            testnet: false,
            getTime: () => Date.now() - 2000
        });
        
        // Constants for validation
        this.MIN_HEDGE_RATIO = 0.90;  // 90% minimum hedge
        this.MAX_HEDGE_RATIO = 1.10;  // 110% maximum hedge
        this.MAX_RETRIES = 5;         // Max retries for validation
        this.RETRY_DELAY = 2000;      // 2 seconds between retries
        this.MAX_WAIT_TIME = 30000;   // 30 seconds max wait for validation
        
        console.log('🛡️ ENHANCED TRADE VALIDATOR INITIALIZED');
        console.log(`⚖️  Target hedge ratio: 95%`);
        console.log(`🔍 Validation range: ${this.MIN_HEDGE_RATIO * 100}% - ${this.MAX_HEDGE_RATIO * 100}%`);
    }
    
    /**
     * Validates that a position is properly hedged with futures
     */
    async validatePosition(symbol, context = {}) {
        console.log(`\n🔍 VALIDATING POSITION: ${symbol}`);
        
        try {
            // Get position data
            const spotAccount = await this.client.accountInfo();
            const futuresPositions = await this.client.futuresPositionRisk();
            
            // Get asset balances
            const baseAsset = symbol.replace('USDT', '');
            const spotBalance = spotAccount.balances.find(b => b.asset === baseAsset);
            const futuresPosition = futuresPositions.find(p => p.symbol === symbol);
            
            // Calculate sizes
            const spotSize = spotBalance ? parseFloat(spotBalance.free) + parseFloat(spotBalance.locked) : 0;
            const futuresSize = futuresPosition ? Math.abs(parseFloat(futuresPosition.positionAmt)) : 0;
            
            console.log(`📊 Current Position:`);
            console.log(`   • Spot: ${spotSize.toFixed(8)} ${baseAsset}`);
            console.log(`   • Futures: ${futuresSize.toFixed(8)} ${baseAsset}`);
            
            // Calculate hedge ratio
            const ratio = futuresSize / spotSize;
            console.log(`⚖️  Hedge Ratio: ${(ratio * 100).toFixed(1)}%`);
            
            // Check if position is balanced
            const isBalanced = ratio >= this.MIN_HEDGE_RATIO && ratio <= this.MAX_HEDGE_RATIO;
            
            if (isBalanced) {
                console.log(`✅ Position is properly hedged`);
                return {
                    success: true,
                    ratio,
                    spotSize,
                    futuresSize,
                    needsRebalancing: false
                };
            }
            
            // Position needs rebalancing
            console.log(`❌ Position is NOT properly hedged`);
            return {
                success: false,
                ratio,
                spotSize,
                futuresSize,
                needsRebalancing: true,
                targetFuturesSize: spotSize * 0.95 // Target 95% hedge
            };
            
        } catch (error) {
            console.error(`❌ Validation error:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Calculates proper futures quantity based on spot size
     */
    async calculateFuturesQuantity(symbol, spotQuantity) {
        console.log(`\n🧮 CALCULATING FUTURES QUANTITY:`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Spot Quantity: ${spotQuantity}`);
        
        try {
            // Get exchange info for LOT_SIZE filter
            const futuresExchangeInfo = await this.client.futuresExchangeInfo();
            const symbolInfo = futuresExchangeInfo.symbols.find(s => s.symbol === symbol);
            
            if (!symbolInfo) {
                throw new Error(`Symbol ${symbol} not found in futures exchange info`);
            }
            
            // Get LOT_SIZE filter
            const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
            if (!lotSizeFilter) {
                throw new Error(`LOT_SIZE filter not found for ${symbol}`);
            }
            
            // Calculate proper quantity
            const targetQuantity = spotQuantity * 0.95; // 95% hedge ratio
            const stepSize = parseFloat(lotSizeFilter.stepSize);
            const minQty = parseFloat(lotSizeFilter.minQty);
            
            // Round to proper step size
            let futuresQuantity = Math.floor(targetQuantity / stepSize) * stepSize;
            
            // Ensure minimum quantity
            futuresQuantity = Math.max(futuresQuantity, minQty);
            
            // Format to proper precision
            const precision = stepSize.toString().split('.')[1]?.length || 0;
            futuresQuantity = parseFloat(futuresQuantity.toFixed(precision));
            
            console.log(`✅ FUTURES QUANTITY CALCULATED:`);
            console.log(`   • Target: ${targetQuantity}`);
            console.log(`   • Formatted: ${futuresQuantity}`);
            console.log(`   • Step Size: ${stepSize}`);
            console.log(`   • Min Quantity: ${minQty}`);
            console.log(`   • Precision: ${precision} decimals`);
            
            return {
                success: true,
                quantity: futuresQuantity,
                hedgeRatio: futuresQuantity / spotQuantity
            };
            
        } catch (error) {
            console.error(`❌ Quantity calculation error:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Validates a futures order with retries
     */
    async validateFuturesOrder(symbol, orderData, context = {}) {
        console.log(`\n🔍 VALIDATING FUTURES ORDER: ${symbol}`);
        console.log(`   Target Quantity: ${orderData.quantity}`);
        
        const startTime = Date.now();
        let retryCount = 0;
        
        while (retryCount < this.MAX_RETRIES) {
            try {
                const validation = await this.validatePosition(symbol);
                
                if (validation.success) {
                    return validation;
                }
                
                // Check if we've exceeded max wait time
                if (Date.now() - startTime > this.MAX_WAIT_TIME) {
                    console.log(`⚠️  Validation timed out after ${this.MAX_WAIT_TIME / 1000}s`);
                    break;
                }
                
                // Retry after delay
                console.log(`⏳ Waiting for order confirmation (${retryCount + 1}/${this.MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                retryCount++;
                
            } catch (error) {
                console.error(`❌ Validation attempt ${retryCount + 1} failed:`, error.message);
                retryCount++;
            }
        }
        
        return {
            success: false,
            error: `Validation failed after ${retryCount} retries`
        };
    }
    
    /**
     * Checks if position needs rebalancing
     */
    async checkRebalancing(symbol) {
        console.log(`\n🔍 CHECKING IF REBALANCING NEEDED: ${symbol}`);
        
        const validation = await this.validatePosition(symbol);
        
        if (!validation.success) {
            return {
                needsRebalancing: true,
                error: validation.error
            };
        }
        
        const ratio = validation.ratio;
        
        if (ratio < this.MIN_HEDGE_RATIO) {
            console.log(`⚠️  Position under-hedged (${(ratio * 100).toFixed(1)}%)`);
            return {
                needsRebalancing: true,
                type: 'increase_hedge',
                currentRatio: ratio,
                targetQuantity: validation.spotSize * 0.95
            };
        }
        
        if (ratio > this.MAX_HEDGE_RATIO) {
            console.log(`⚠️  Position over-hedged (${(ratio * 100).toFixed(1)}%)`);
            return {
                needsRebalancing: true,
                type: 'decrease_hedge',
                currentRatio: ratio,
                targetQuantity: validation.spotSize * 0.95
            };
        }
        
        console.log(`✅ Position properly balanced (${(ratio * 100).toFixed(1)}%)`);
        return {
            needsRebalancing: false,
            currentRatio: ratio
        };
    }
}

module.exports = TradeValidator;