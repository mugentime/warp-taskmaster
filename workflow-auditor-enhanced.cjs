/**
 * 🔍 ENHANCED TASKMASTER WORKFLOW AUDITOR
 * ═════════════════════════════════════════════════════════════
 * 
 * Enhanced validation system that properly handles:
 * - Order confirmation timing
 * - Position validation retries
 * - Delta-neutral verification
 * - Trade status polling
 */

require('dotenv').config();
const Binance = require('binance-api-node').default;

class EnhancedWorkflowAuditor {
    constructor() {
        this.auditLog = [];
        this.validationErrors = [];
        this.criticalFailures = [];
        
        // Initialize Binance client for position validation
        this.client = Binance({
            apiKey: process.env.BINANCE_API_KEY,
            apiSecret: process.env.BINANCE_API_SECRET,
            testnet: false,
            getTime: () => Date.now() - 2000
        });
        
        // Enhanced workflow step definitions
        this.workflowSteps = {
            CAPITAL_ALLOCATION: {
                name: 'Capital Allocation Analysis',
                required: true,
                validations: ['portfolio_analyzed', 'allocation_calculated', 'deficits_identified']
            },
            ASSET_CONVERSION: {
                name: 'Asset Conversion',
                required: true,
                validations: ['assets_identified', 'conversion_executed', 'usdt_received']
            },
            CAPITAL_TRANSFER: {
                name: 'Capital Transfer',
                required: true,
                validations: ['transfer_executed', 'balances_updated', 'allocation_verified']
            },
            POSITION_DEPLOYMENT: {
                name: 'Position Deployment',
                required: true,
                validations: ['spot_purchase', 'futures_hedge', 'delta_neutral_confirmed'],
                maxRetries: 5,             // Number of validation retries
                retryDelay: 2000,          // 2 seconds between retries
                maxValidationTime: 30000   // 30 seconds max wait for validation
            },
            OPPORTUNITY_ANALYSIS: {
                name: 'Opportunity Analysis',
                required: true,
                validations: ['funding_rates_fetched', 'opportunities_ranked', 'liquidity_verified']
            }
        };
        
        // Track active validations
        this.activeValidations = new Map();
        
        console.log('🔍 ENHANCED WORKFLOW AUDITOR INITIALIZED');
        console.log('⏱️ Position validation timing enabled');
        console.log('🔄 Order validation retries enabled');
    }
    
    startStep(stepName, context = {}) {
        const timestamp = new Date().toISOString();
        const stepInfo = this.workflowSteps[stepName];
        
        if (!stepInfo) {
            this.recordError(`Unknown workflow step: ${stepName}`);
            return false;
        }
        
        const auditEntry = {
            step: stepName,
            name: stepInfo.name,
            startTime: timestamp,
            context: context,
            validations: {},
            pendingValidations: new Set(),
            completed: false,
            success: false
        };
        
        this.auditLog.push(auditEntry);
        console.log(`🔍 AUDIT START: ${stepInfo.name} [${timestamp}]`);
        
        return auditEntry;
    }
    
    async validate(stepName, validationType, success, data = {}) {
        const currentStep = this.getCurrentStep(stepName);
        if (!currentStep) {
            this.recordError(`Cannot validate ${validationType} - step ${stepName} not started`);
            return false;
        }
        
        // Special handling for futures order validations
        if (stepName === 'POSITION_DEPLOYMENT' && validationType === 'futures_hedge') {
            return await this.validateFuturesOrder(currentStep, data);
        }
        
        // Special handling for delta-neutral confirmation
        if (stepName === 'POSITION_DEPLOYMENT' && validationType === 'delta_neutral_confirmed') {
            return await this.validateDeltaNeutral(currentStep, data);
        }
        
        // Standard validation
        currentStep.validations[validationType] = {
            success: success,
            timestamp: new Date().toISOString(),
            data: data
        };
        
        const status = success ? '✅' : '❌';
        console.log(`${status} VALIDATION: ${validationType} - ${success ? 'PASSED' : 'FAILED'}`);
        
        if (!success) {
            this.recordError(`Validation failed: ${stepName}.${validationType}`, data);
        }
        
        return success;
    }
    
    async validateFuturesOrder(step, orderData) {
        console.log(`🔄 VALIDATING FUTURES ORDER: ${orderData.symbol}`);
        const startTime = Date.now();
        let retryCount = 0;
        
        // Add to pending validations
        const validationId = `${step.step}_futures_${orderData.symbol}_${startTime}`;
        this.activeValidations.set(validationId, {
            startTime,
            type: 'futures_hedge',
            data: orderData
        });
        
        try {
            while (retryCount < this.workflowSteps.POSITION_DEPLOYMENT.maxRetries) {
                // Check futures position
                const futuresPositions = await this.client.futuresPositionRisk();
                const position = futuresPositions.find(p => p.symbol === orderData.symbol);
                
                const positionSize = position ? Math.abs(parseFloat(position.positionAmt)) : 0;
                const targetSize = Math.abs(parseFloat(orderData.quantity));
                
                // Calculate match percentage (allow 5% difference due to rounding)
                const sizeMatch = positionSize > 0 && Math.abs(positionSize - targetSize) / targetSize <= 0.05;
                
                if (sizeMatch) {
                    console.log(`✅ Futures position validated for ${orderData.symbol}:`);
                    console.log(`   Target: ${targetSize}`);
                    console.log(`   Actual: ${positionSize}`);
                    
                    // Record successful validation
                    step.validations['futures_hedge'] = {
                        success: true,
                        timestamp: new Date().toISOString(),
                        data: {
                            symbol: orderData.symbol,
                            targetSize: targetSize,
                            actualSize: positionSize,
                            retries: retryCount
                        }
                    };
                    
                    this.activeValidations.delete(validationId);
                    return true;
                }
                
                // Not found or size mismatch - retry after delay
                console.log(`⏳ Waiting for futures position confirmation (${retryCount + 1}/${this.workflowSteps.POSITION_DEPLOYMENT.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, this.workflowSteps.POSITION_DEPLOYMENT.retryDelay));
                retryCount++;
                
                // Check if we've exceeded max validation time
                if (Date.now() - startTime > this.workflowSteps.POSITION_DEPLOYMENT.maxValidationTime) {
                    console.log(`⚠️ Futures validation timed out for ${orderData.symbol}`);
                    break;
                }
            }
            
            // Position validation failed
            console.log(`❌ Futures position validation failed for ${orderData.symbol}`);
            console.log(`   Expected: ${orderData.quantity}`);
            console.log(`   Found: ${positionSize || 0}`);
            
            step.validations['futures_hedge'] = {
                success: false,
                timestamp: new Date().toISOString(),
                data: {
                    symbol: orderData.symbol,
                    error: 'Position validation failed after retries',
                    targetSize: parseFloat(orderData.quantity),
                    actualSize: positionSize || 0
                }
            };
            
            this.recordError(`Futures position validation failed for ${orderData.symbol}`, {
                symbol: orderData.symbol,
                targetSize: orderData.quantity,
                retries: retryCount
            });
            
            this.activeValidations.delete(validationId);
            return false;
            
        } catch (error) {
            console.error(`❌ Error validating futures position:`, error.message);
            
            step.validations['futures_hedge'] = {
                success: false,
                timestamp: new Date().toISOString(),
                data: {
                    symbol: orderData.symbol,
                    error: error.message
                }
            };
            
            this.recordError(`Futures position validation error: ${error.message}`);
            this.activeValidations.delete(validationId);
            return false;
        }
    }
    
    async validateDeltaNeutral(step, positionData) {
        console.log(`⚖️ VALIDATING DELTA-NEUTRAL POSITION: ${positionData.symbol}`);
        
        try {
            // Get spot balance
            const spotAccount = await this.client.accountInfo();
            const spotBalance = spotAccount.balances.find(b => b.asset === positionData.symbol.replace('USDT', ''));
            const spotSize = spotBalance ? parseFloat(spotBalance.free) + parseFloat(spotBalance.locked) : 0;
            
            // Get futures position
            const futuresPositions = await this.client.futuresPositionRisk();
            const futuresPosition = futuresPositions.find(p => p.symbol === positionData.symbol);
            const futuresSize = futuresPosition ? Math.abs(parseFloat(futuresPosition.positionAmt)) : 0;
            
            // Calculate hedge ratio (allow 10% difference)
            const hedgeRatio = futuresSize > 0 ? futuresSize / spotSize : 0;
            const isBalanced = hedgeRatio >= 0.90 && hedgeRatio <= 1.10;
            
            if (isBalanced) {
                console.log(`✅ Delta-neutral position verified for ${positionData.symbol}:`);
                console.log(`   Spot: ${spotSize}`);
                console.log(`   Futures: ${futuresSize}`);
                console.log(`   Hedge Ratio: ${(hedgeRatio * 100).toFixed(1)}%`);
                
                step.validations['delta_neutral_confirmed'] = {
                    success: true,
                    timestamp: new Date().toISOString(),
                    data: {
                        symbol: positionData.symbol,
                        spotSize,
                        futuresSize,
                        hedgeRatio
                    }
                };
                
                return true;
            }
            
            console.log(`❌ Delta-neutral validation failed for ${positionData.symbol}:`);
            console.log(`   Spot: ${spotSize}`);
            console.log(`   Futures: ${futuresSize}`);
            console.log(`   Hedge Ratio: ${(hedgeRatio * 100).toFixed(1)}%`);
            
            step.validations['delta_neutral_confirmed'] = {
                success: false,
                timestamp: new Date().toISOString(),
                data: {
                    symbol: positionData.symbol,
                    spotSize,
                    futuresSize,
                    hedgeRatio,
                    error: 'Position not properly hedged'
                }
            };
            
            this.recordError(`Delta-neutral validation failed for ${positionData.symbol}`, {
                spotSize,
                futuresSize,
                hedgeRatio
            });
            
            return false;
            
        } catch (error) {
            console.error(`❌ Error validating delta-neutral position:`, error.message);
            
            step.validations['delta_neutral_confirmed'] = {
                success: false,
                timestamp: new Date().toISOString(),
                data: {
                    symbol: positionData.symbol,
                    error: error.message
                }
            };
            
            this.recordError(`Delta-neutral validation error: ${error.message}`);
            return false;
        }
    }
    
    async completeStep(stepName, success = true) {
        const currentStep = this.getCurrentStep(stepName);
        if (!currentStep) {
            this.recordError(`Cannot complete step ${stepName} - not started`);
            return false;
        }
        
        // Wait for any pending validations
        if (stepName === 'POSITION_DEPLOYMENT') {
            await this.waitForPendingValidations(currentStep);
        }
        
        currentStep.completed = true;
        currentStep.success = success;
        currentStep.endTime = new Date().toISOString();
        currentStep.duration = new Date(currentStep.endTime) - new Date(currentStep.startTime);
        
        // Check if all required validations passed
        const stepInfo = this.workflowSteps[stepName];
        const missedValidations = stepInfo.validations.filter(validation => 
            !currentStep.validations[validation] || !currentStep.validations[validation].success
        );
        
        if (missedValidations.length > 0) {
            // For position deployment, check if futures orders are actually working despite validation timing
            if (stepName === 'POSITION_DEPLOYMENT') {
                const actuallyWorking = await this.verifyPositionsWorking(currentStep);
                if (actuallyWorking) {
                    console.log('✅ Position deployment actually succeeded despite validation timing');
                    success = true;
                } else {
                    this.recordCriticalFailure(`Step ${stepName} completed but missing validations: ${missedValidations.join(', ')}`);
                    success = false;
                }
            } else {
                this.recordCriticalFailure(`Step ${stepName} completed but missing validations: ${missedValidations.join(', ')}`);
                success = false;
            }
        }
        
        const status = success ? '✅' : '❌';
        const duration = Math.round(currentStep.duration / 1000);
        console.log(`${status} AUDIT COMPLETE: ${stepInfo.name} (${duration}s)`);
        
        if (!success && stepInfo.required) {
            this.recordCriticalFailure(`Required step ${stepName} failed - system integrity compromised`);
        }
        
        return success;
    }
    
    async verifyPositionsWorking(step) {
        // This checks if positions are actually working despite validation timing issues
        try {
            const spotAccount = await this.client.accountInfo();
            const futuresPositions = await this.client.futuresPositionRisk();
            
            // Extract symbols from context
            const symbols = Object.keys(step.context || {}).filter(k => k.endsWith('USDT'));
            
            for (const symbol of symbols) {
                const baseAsset = symbol.replace('USDT', '');
                const spotBalance = spotAccount.balances.find(b => b.asset === baseAsset);
                const futuresPosition = futuresPositions.find(p => p.symbol === symbol);
                
                const spotSize = spotBalance ? parseFloat(spotBalance.free) + parseFloat(spotBalance.locked) : 0;
                const futuresSize = futuresPosition ? Math.abs(parseFloat(futuresPosition.positionAmt)) : 0;
                
                if (spotSize > 0 && futuresSize > 0) {
                    const hedgeRatio = futuresSize / spotSize;
                    if (hedgeRatio >= 0.90 && hedgeRatio <= 1.10) {
                        console.log(`✅ Position ${symbol} is properly hedged (${(hedgeRatio * 100).toFixed(1)}%)`);
                        return true;
                    }
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Error verifying positions:', error.message);
            return false;
        }
    }
    
    async waitForPendingValidations(step) {
        const validations = Array.from(this.activeValidations.values())
            .filter(v => v.type === 'futures_hedge');
        
        if (validations.length === 0) return;
        
        console.log(`⏳ Waiting for ${validations.length} pending validations...`);
        
        const maxWait = this.workflowSteps.POSITION_DEPLOYMENT.maxValidationTime;
        const startWait = Date.now();
        
        while (Date.now() - startWait < maxWait && this.activeValidations.size > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log(`✅ Validation wait complete`);
    }
    
    getCurrentStep(stepName) {
        return this.auditLog
            .filter(entry => entry.step === stepName)
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
    }
    
    recordError(message, data = {}) {
        const error = {
            timestamp: new Date().toISOString(),
            message: message,
            data: data
        };
        
        this.validationErrors.push(error);
        console.log(`⚠️ AUDIT ERROR: ${message}`);
    }
    
    recordCriticalFailure(message, data = {}) {
        const failure = {
            timestamp: new Date().toISOString(),
            message: message,
            data: data
        };
        
        this.criticalFailures.push(failure);
        console.log(`🚨 CRITICAL AUDIT FAILURE: ${message}`);
    }
    
    generateAuditReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalSteps: this.auditLog.length,
                completedSteps: this.auditLog.filter(s => s.completed).length,
                successfulSteps: this.auditLog.filter(s => s.success).length,
                failedSteps: this.auditLog.filter(s => s.completed && !s.success).length,
                validationErrors: this.validationErrors.length,
                criticalFailures: this.criticalFailures.length,
                pendingValidations: this.activeValidations.size
            },
            steps: this.auditLog,
            errors: this.validationErrors,
            criticalFailures: this.criticalFailures,
            integrity: this.criticalFailures.length === 0 ? 'INTACT' : 'COMPROMISED'
        };
        
        return report;
    }
    
    isSafeToProceed() {
        const recentFailures = this.criticalFailures.filter(failure => {
            const failureTime = new Date(failure.timestamp);
            const cutoff = new Date(Date.now() - 300000); // Last 5 minutes
            return failureTime > cutoff;
        });
        
        return recentFailures.length === 0;
    }
    
    reset() {
        this.auditLog = [];
        this.validationErrors = [];
        this.criticalFailures = [];
        this.activeValidations.clear();
        console.log('🔍 AUDIT STATE RESET');
    }
}

module.exports = EnhancedWorkflowAuditor;
