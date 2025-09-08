export interface RiskConfiguration {
    maxDailyLoss: number;           // Maximum daily loss in USDT
    maxPositionSize: number;        // Maximum position size per trade
    maxTotalExposure: number;       // Maximum total exposure across all trades
    maxConcurrentTrades: number;    // Maximum number of concurrent trades
    volatilityThreshold: number;    // Stop trading if volatility exceeds this
    liquidityThreshold: number;     // Minimum liquidity required
    maxLeverage: number;           // Maximum allowed leverage
    emergencyStopEnabled: boolean;  // Enable emergency stop functionality
}

export interface RiskMetrics {
    currentExposure: number;
    dailyPnL: number;
    openPositions: number;
    riskScore: number;            // 0-100 scale
    marketVolatility: number;
    liquidityScore: number;
    lastUpdated: number;
}

export interface RiskAlert {
    id: string;
    type: 'WARNING' | 'CRITICAL' | 'EMERGENCY';
    message: string;
    timestamp: number;
    metric: string;
    value: number;
    threshold: number;
    action: 'MONITOR' | 'REDUCE_EXPOSURE' | 'STOP_TRADING' | 'CLOSE_POSITIONS';
}

export class RiskManagementService {
    private config: RiskConfiguration;
    private metrics: RiskMetrics;
    private alerts: RiskAlert[] = [];
    private emergencyStopActive: boolean = false;
    
    constructor(config: RiskConfiguration) {
        this.config = config;
        this.metrics = {
            currentExposure: 0,
            dailyPnL: 0,
            openPositions: 0,
            riskScore: 0,
            marketVolatility: 0,
            liquidityScore: 10,
            lastUpdated: Date.now()
        };
    }

    /**
     * Evaluate if a trade should be allowed
     */
    evaluateTradeRisk(
        investment: number,
        leverage: number,
        marketVolatility: number,
        liquidityScore: number
    ): {
        approved: boolean;
        risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
        warnings: string[];
        maxAllowedInvestment: number;
    } {
        const warnings: string[] = [];
        let approved = true;
        let risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'LOW';

        // Check emergency stop
        if (this.emergencyStopActive) {
            return {
                approved: false,
                risk: 'EXTREME',
                warnings: ['Emergency stop is active - no new trades allowed'],
                maxAllowedInvestment: 0
            };
        }

        // Check daily loss limits
        if (this.metrics.dailyPnL < -this.config.maxDailyLoss) {
            warnings.push(`Daily loss limit exceeded: ${this.metrics.dailyPnL} < -${this.config.maxDailyLoss}`);
            approved = false;
            risk = 'EXTREME';
        }

        // Check position size limits
        const maxAllowedInvestment = Math.min(
            investment,
            this.config.maxPositionSize,
            this.config.maxTotalExposure - this.metrics.currentExposure
        );

        if (investment > maxAllowedInvestment) {
            warnings.push(`Position size reduced from ${investment} to ${maxAllowedInvestment}`);
            if (maxAllowedInvestment <= 0) {
                approved = false;
                risk = 'HIGH';
            }
        }

        // Check leverage limits
        if (leverage > this.config.maxLeverage) {
            warnings.push(`Leverage exceeds maximum: ${leverage}x > ${this.config.maxLeverage}x`);
            approved = false;
            risk = 'HIGH';
        }

        // Check concurrent trades
        if (this.metrics.openPositions >= this.config.maxConcurrentTrades) {
            warnings.push(`Maximum concurrent trades reached: ${this.metrics.openPositions}`);
            approved = false;
            risk = 'MEDIUM';
        }

        // Check market volatility
        if (marketVolatility > this.config.volatilityThreshold) {
            warnings.push(`Market volatility too high: ${marketVolatility}% > ${this.config.volatilityThreshold}%`);
            if (marketVolatility > this.config.volatilityThreshold * 1.5) {
                approved = false;
                risk = 'HIGH';
            } else {
                risk = 'MEDIUM';
            }
        }

        // Check liquidity
        if (liquidityScore < this.config.liquidityThreshold) {
            warnings.push(`Insufficient liquidity: ${liquidityScore} < ${this.config.liquidityThreshold}`);
            if (liquidityScore < this.config.liquidityThreshold * 0.5) {
                approved = false;
                risk = 'EXTREME';
            } else {
                risk = 'HIGH';
            }
        }

        return {
            approved,
            risk,
            warnings,
            maxAllowedInvestment
        };
    }

    /**
     * Update risk metrics
     */
    updateRiskMetrics(
        currentExposure: number,
        dailyPnL: number,
        openPositions: number,
        marketVolatility: number
    ): void {
        this.metrics = {
            currentExposure,
            dailyPnL,
            openPositions,
            marketVolatility,
            riskScore: this.calculateRiskScore(),
            liquidityScore: this.metrics.liquidityScore, // Updated separately
            lastUpdated: Date.now()
        };

        this.checkRiskAlerts();
    }

    /**
     * Calculate overall risk score (0-100)
     */
    private calculateRiskScore(): number {
        let score = 0;

        // Exposure risk (0-30 points)
        const exposureRatio = this.metrics.currentExposure / this.config.maxTotalExposure;
        score += Math.min(exposureRatio * 30, 30);

        // Loss risk (0-25 points)
        if (this.metrics.dailyPnL < 0) {
            const lossRatio = Math.abs(this.metrics.dailyPnL) / this.config.maxDailyLoss;
            score += Math.min(lossRatio * 25, 25);
        }

        // Position concentration risk (0-20 points)
        const positionRatio = this.metrics.openPositions / this.config.maxConcurrentTrades;
        score += Math.min(positionRatio * 20, 20);

        // Market volatility risk (0-25 points)
        const volatilityRatio = this.metrics.marketVolatility / this.config.volatilityThreshold;
        score += Math.min(volatilityRatio * 25, 25);

        return Math.min(score, 100);
    }

    /**
     * Check for risk alerts
     */
    private checkRiskAlerts(): void {
        const now = Date.now();

        // Daily loss alert
        if (this.metrics.dailyPnL < -this.config.maxDailyLoss * 0.8) {
            this.addAlert({
                id: `daily-loss-${now}`,
                type: this.metrics.dailyPnL < -this.config.maxDailyLoss ? 'EMERGENCY' : 'CRITICAL',
                message: `Daily loss approaching limit: ${this.metrics.dailyPnL.toFixed(2)} USDT`,
                timestamp: now,
                metric: 'dailyPnL',
                value: this.metrics.dailyPnL,
                threshold: -this.config.maxDailyLoss,
                action: this.metrics.dailyPnL < -this.config.maxDailyLoss ? 'STOP_TRADING' : 'REDUCE_EXPOSURE'
            });
        }

        // Exposure alert
        if (this.metrics.currentExposure > this.config.maxTotalExposure * 0.8) {
            this.addAlert({
                id: `exposure-${now}`,
                type: 'WARNING',
                message: `High exposure: ${this.metrics.currentExposure.toFixed(2)} USDT`,
                timestamp: now,
                metric: 'currentExposure',
                value: this.metrics.currentExposure,
                threshold: this.config.maxTotalExposure,
                action: 'MONITOR'
            });
        }

        // Volatility alert
        if (this.metrics.marketVolatility > this.config.volatilityThreshold) {
            this.addAlert({
                id: `volatility-${now}`,
                type: 'CRITICAL',
                message: `High market volatility: ${this.metrics.marketVolatility.toFixed(2)}%`,
                timestamp: now,
                metric: 'marketVolatility',
                value: this.metrics.marketVolatility,
                threshold: this.config.volatilityThreshold,
                action: 'REDUCE_EXPOSURE'
            });
        }

        // High risk score alert
        if (this.metrics.riskScore > 80) {
            this.addAlert({
                id: `risk-score-${now}`,
                type: this.metrics.riskScore > 95 ? 'EMERGENCY' : 'CRITICAL',
                message: `High risk score: ${this.metrics.riskScore.toFixed(1)}/100`,
                timestamp: now,
                metric: 'riskScore',
                value: this.metrics.riskScore,
                threshold: 80,
                action: this.metrics.riskScore > 95 ? 'CLOSE_POSITIONS' : 'REDUCE_EXPOSURE'
            });
        }
    }

    /**
     * Add risk alert
     */
    private addAlert(alert: RiskAlert): void {
        // Prevent duplicate alerts (same type and metric within 5 minutes)
        const recentAlert = this.alerts.find(a => 
            a.type === alert.type && 
            a.metric === alert.metric && 
            (alert.timestamp - a.timestamp) < 300000 // 5 minutes
        );

        if (!recentAlert) {
            this.alerts.unshift(alert);
            
            // Keep only last 50 alerts
            if (this.alerts.length > 50) {
                this.alerts = this.alerts.slice(0, 50);
            }

            // Execute automatic actions
            this.handleAutoRiskAction(alert);
        }
    }

    /**
     * Handle automatic risk actions
     */
    private handleAutoRiskAction(alert: RiskAlert): void {
        switch (alert.action) {
            case 'STOP_TRADING':
                this.emergencyStopActive = true;
                console.log(`[RISK] Emergency stop activated: ${alert.message}`);
                break;
            case 'CLOSE_POSITIONS':
                console.log(`[RISK] Position closure required: ${alert.message}`);
                // Implementation would close all positions
                break;
            case 'REDUCE_EXPOSURE':
                console.log(`[RISK] Exposure reduction recommended: ${alert.message}`);
                // Implementation would reduce position sizes
                break;
            case 'MONITOR':
                console.log(`[RISK] Monitoring alert: ${alert.message}`);
                break;
        }
    }

    /**
     * Get current risk status
     */
    getRiskStatus(): {
        metrics: RiskMetrics;
        alerts: RiskAlert[];
        emergencyStopActive: boolean;
        status: 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
    } {
        let status: 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'EMERGENCY' = 'SAFE';

        if (this.emergencyStopActive) {
            status = 'EMERGENCY';
        } else if (this.metrics.riskScore > 80) {
            status = 'CRITICAL';
        } else if (this.metrics.riskScore > 60) {
            status = 'WARNING';
        } else if (this.metrics.riskScore > 30) {
            status = 'CAUTION';
        }

        return {
            metrics: this.metrics,
            alerts: this.alerts.slice(0, 10), // Return last 10 alerts
            emergencyStopActive: this.emergencyStopActive,
            status
        };
    }

    /**
     * Reset emergency stop
     */
    resetEmergencyStop(): void {
        this.emergencyStopActive = false;
        console.log('[RISK] Emergency stop reset');
    }

    /**
     * Update risk configuration
     */
    updateConfiguration(config: Partial<RiskConfiguration>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get recommendations for position sizing
     */
    getPositionSizingRecommendation(requestedAmount: number): {
        recommendedAmount: number;
        reason: string;
        adjustment: number;
    } {
        const maxSafe = Math.min(
            this.config.maxPositionSize,
            (this.config.maxTotalExposure - this.metrics.currentExposure) * 0.8
        );

        if (requestedAmount <= maxSafe) {
            return {
                recommendedAmount: requestedAmount,
                reason: 'Amount within safe limits',
                adjustment: 0
            };
        }

        const adjustment = ((maxSafe - requestedAmount) / requestedAmount) * 100;
        
        return {
            recommendedAmount: Math.max(maxSafe, 0),
            reason: `Reduced for risk management (${adjustment.toFixed(1)}% reduction)`,
            adjustment
        };
    }
}

// Default risk configuration for conservative trading
export const DEFAULT_RISK_CONFIG: RiskConfiguration = {
    maxDailyLoss: 50,           // $50 max daily loss
    maxPositionSize: 100,       // $100 max per trade
    maxTotalExposure: 200,      // $200 total exposure
    maxConcurrentTrades: 3,     // 3 concurrent trades max
    volatilityThreshold: 5,     // 5% volatility threshold
    liquidityThreshold: 5,      // Minimum liquidity score of 5
    maxLeverage: 5,            // 5x max leverage
    emergencyStopEnabled: true
};
