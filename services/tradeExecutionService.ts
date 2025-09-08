import type { ArbitrageOpportunity } from '../types';

export interface TradeExecutionConfig {
    symbol: string;
    strategy: 'Short Perp + Long Spot' | 'Long Perp + Short Spot';
    investment: number; // USDT amount
    leverage: number;
    maxSlippage: number; // Percentage
    dryRun?: boolean;
}

export interface TradeExecutionResult {
    success: boolean;
    tradeId: string;
    spotOrder?: {
        orderId: string;
        symbol: string;
        side: 'BUY' | 'SELL';
        quantity: number;
        price: number;
        status: string;
    };
    futuresOrder?: {
        orderId: string;
        symbol: string;
        side: 'BUY' | 'SELL';
        quantity: number;
        price: number;
        status: string;
    };
    totalCost: number;
    estimatedProfit8h: number;
    message: string;
    error?: string;
}

export interface PositionSizingResult {
    spotQuantity: number;
    futuresQuantity: number;
    spotValue: number;
    futuresValue: number;
    totalInvestment: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class TradeExecutionService {
    private apiKey: string;
    private apiSecret: string;
    private baseUrl: string = '/api/v1';

    constructor(apiKey: string, apiSecret: string) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }

    /**
     * Calculate optimal position sizes for arbitrage trade
     */
    calculatePositionSizing(
        opportunity: ArbitrageOpportunity, 
        config: TradeExecutionConfig,
        accountBalance: number
    ): PositionSizingResult {
        const { investment, leverage } = config;
        const { markPrice, liquidityScore, riskScore } = opportunity;

        // Ensure investment doesn't exceed 50% of account balance for safety
        const maxInvestment = Math.min(investment, accountBalance * 0.5);
        
        // Calculate quantities
        const spotValue = maxInvestment / 2; // 50% for spot
        const futuresValue = maxInvestment / 2; // 50% for futures
        
        const spotQuantity = spotValue / markPrice;
        const futuresQuantity = (futuresValue * leverage) / markPrice;

        // Risk assessment
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (riskScore > 5 || liquidityScore < 3) riskLevel = 'HIGH';
        else if (riskScore > 2 || liquidityScore < 5) riskLevel = 'MEDIUM';

        return {
            spotQuantity,
            futuresQuantity,
            spotValue,
            futuresValue,
            totalInvestment: maxInvestment,
            riskLevel
        };
    }

    /**
     * Execute arbitrage trade (spot + futures)
     */
    async executeArbitrageTrade(
        opportunity: ArbitrageOpportunity,
        config: TradeExecutionConfig,
        accountBalance: number
    ): Promise<TradeExecutionResult> {
        const tradeId = `ARB_${opportunity.symbol}_${Date.now()}`;
        
        try {
            // Calculate position sizing
            const sizing = this.calculatePositionSizing(opportunity, config, accountBalance);
            
            if (sizing.riskLevel === 'HIGH' && !config.dryRun) {
                return {
                    success: false,
                    tradeId,
                    totalCost: 0,
                    estimatedProfit8h: 0,
                    message: 'Trade rejected due to high risk level',
                    error: 'High risk: Low liquidity or high volatility detected'
                };
            }

            // Dry run mode
            if (config.dryRun) {
                return this.simulateTrade(opportunity, config, sizing, tradeId);
            }

            // Execute real trades
            return await this.executeRealTrade(opportunity, config, sizing, tradeId);

        } catch (error) {
            return {
                success: false,
                tradeId,
                totalCost: 0,
                estimatedProfit8h: 0,
                message: 'Trade execution failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Simulate trade execution (dry run)
     */
    private simulateTrade(
        opportunity: ArbitrageOpportunity,
        config: TradeExecutionConfig,
        sizing: PositionSizingResult,
        tradeId: string
    ): TradeExecutionResult {
        const isShortPerp = config.strategy === 'Short Perp + Long Spot';
        
        // Calculate estimated fees
        const spotFee = sizing.spotValue * 0.001; // 0.1% maker fee
        const futuresFee = sizing.futuresValue * 0.0004; // 0.04% maker fee
        const totalFees = spotFee + futuresFee;

        // Calculate estimated profit
        const fundingProfit = Math.abs(opportunity.fundingRate) * sizing.futuresValue;
        const estimatedProfit8h = fundingProfit - totalFees;

        return {
            success: true,
            tradeId,
            spotOrder: {
                orderId: `SPOT_${tradeId}`,
                symbol: opportunity.symbol.replace('USDT', ''),
                side: isShortPerp ? 'BUY' : 'SELL',
                quantity: sizing.spotQuantity,
                price: opportunity.markPrice,
                status: 'SIMULATED'
            },
            futuresOrder: {
                orderId: `FUTURES_${tradeId}`,
                symbol: opportunity.symbol,
                side: isShortPerp ? 'SELL' : 'BUY',
                quantity: sizing.futuresQuantity,
                price: opportunity.markPrice,
                status: 'SIMULATED'
            },
            totalCost: sizing.totalInvestment + totalFees,
            estimatedProfit8h,
            message: `Simulated ${config.strategy} trade for ${opportunity.symbol} - Est. 8h profit: $${estimatedProfit8h.toFixed(2)}`
        };
    }

    /**
     * Execute real trade (to be implemented with actual API calls)
     */
    private async executeRealTrade(
        opportunity: ArbitrageOpportunity,
        config: TradeExecutionConfig,
        sizing: PositionSizingResult,
        tradeId: string
    ): Promise<TradeExecutionResult> {
        // This would implement actual Binance API calls
        // For now, return simulation with warning
        const simulation = this.simulateTrade(opportunity, config, sizing, tradeId);
        
        return {
            ...simulation,
            message: 'REAL TRADING NOT YET IMPLEMENTED - This was simulated for safety',
            error: 'Real trading requires additional safety checks and API integration'
        };
    }

    /**
     * Get current trading fees for symbol
     */
    async getTradingFees(symbol: string) {
        // Default Binance fees - could be enhanced with API call
        return {
            spotMakerFee: 0.001,   // 0.1%
            spotTakerFee: 0.001,   // 0.1%
            futuresMakerFee: 0.0002, // 0.02%
            futuresTakerFee: 0.0004  // 0.04%
        };
    }

    /**
     * Validate trade before execution
     */
    validateTrade(
        opportunity: ArbitrageOpportunity,
        config: TradeExecutionConfig,
        accountBalance: number
    ): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check account balance
        if (config.investment > accountBalance) {
            errors.push(`Insufficient balance: ${config.investment} > ${accountBalance}`);
        }

        // Check minimum investment
        if (config.investment < 10) {
            errors.push('Minimum investment is $10 USDT');
        }

        // Check maximum investment (safety)
        if (config.investment > accountBalance * 0.5) {
            errors.push('Maximum investment is 50% of account balance for safety');
        }

        // Check leverage limits
        if (config.leverage < 1 || config.leverage > 10) {
            errors.push('Leverage must be between 1x and 10x for safety');
        }

        // Check opportunity is still valid
        if (Math.abs(opportunity.fundingRate) < 0.0001) {
            errors.push('Funding rate too low for profitable arbitrage');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Helper function to create trade execution service
export const createTradeExecutionService = (apiKey: string, apiSecret: string) => {
    return new TradeExecutionService(apiKey, apiSecret);
};
