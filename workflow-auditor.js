/**
 * 🔍 TASKMASTER WORKFLOW AUDITOR
 * ═════════════════════════════════════════════════════════════
 * 
 * Comprehensive validation system to ensure NO shortcuts are taken
 * in the autonomous trading workflow. Every step must be verified.
 */

class WorkflowAuditor {
    constructor() {
        this.auditLog = [];
        this.validationErrors = [];
        this.criticalFailures = [];
        
        // Workflow step definitions with required validations
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
                validations: ['spot_purchase', 'futures_hedge', 'delta_neutral_confirmed']
            },
            OPPORTUNITY_ANALYSIS: {
                name: 'Opportunity Analysis',
                required: true,
                validations: ['funding_rates_fetched', 'opportunities_ranked', 'liquidity_verified']
            }
        };
    }

    // Start auditing a workflow step
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
            completed: false,
            success: false
        };

        this.auditLog.push(auditEntry);
        console.log(`🔍 AUDIT START: ${stepInfo.name} [${timestamp}]`);
        
        return auditEntry;
    }

    // Validate a specific aspect of a workflow step
    validate(stepName, validationType, success, data = {}) {
        const currentStep = this.getCurrentStep(stepName);
        if (!currentStep) {
            this.recordError(`Cannot validate ${validationType} - step ${stepName} not started`);
            return false;
        }

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

    // Complete a workflow step
    completeStep(stepName, success = true) {
        const currentStep = this.getCurrentStep(stepName);
        if (!currentStep) {
            this.recordError(`Cannot complete step ${stepName} - not started`);
            return false;
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
            this.recordCriticalFailure(`Step ${stepName} completed but missing validations: ${missedValidations.join(', ')}`);
            success = false;
        }

        const status = success ? '✅' : '❌';
        const duration = Math.round(currentStep.duration / 1000);
        console.log(`${status} AUDIT COMPLETE: ${stepInfo.name} (${duration}s)`);

        if (!success && stepInfo.required) {
            this.recordCriticalFailure(`Required step ${stepName} failed - system integrity compromised`);
        }

        return success;
    }

    // Get current step being audited
    getCurrentStep(stepName) {
        return this.auditLog
            .filter(entry => entry.step === stepName)
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
    }

    // Record validation error
    recordError(message, data = {}) {
        const error = {
            timestamp: new Date().toISOString(),
            message: message,
            data: data
        };
        
        this.validationErrors.push(error);
        console.log(`⚠️ AUDIT ERROR: ${message}`);
    }

    // Record critical failure
    recordCriticalFailure(message, data = {}) {
        const failure = {
            timestamp: new Date().toISOString(),
            message: message,
            data: data
        };
        
        this.criticalFailures.push(failure);
        console.log(`🚨 CRITICAL AUDIT FAILURE: ${message}`);
    }

    // Generate comprehensive audit report
    generateAuditReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalSteps: this.auditLog.length,
                completedSteps: this.auditLog.filter(s => s.completed).length,
                successfulSteps: this.auditLog.filter(s => s.success).length,
                failedSteps: this.auditLog.filter(s => s.completed && !s.success).length,
                validationErrors: this.validationErrors.length,
                criticalFailures: this.criticalFailures.length
            },
            steps: this.auditLog,
            errors: this.validationErrors,
            criticalFailures: this.criticalFailures,
            integrity: this.criticalFailures.length === 0 ? 'INTACT' : 'COMPROMISED'
        };

        return report;
    }

    // Check if workflow is safe to proceed
    isSafeToProceed() {
        const recentFailures = this.criticalFailures.filter(failure => {
            const failureTime = new Date(failure.timestamp);
            const cutoff = new Date(Date.now() - 300000); // Last 5 minutes
            return failureTime > cutoff;
        });

        return recentFailures.length === 0;
    }

    // Reset audit state
    reset() {
        this.auditLog = [];
        this.validationErrors = [];
        this.criticalFailures = [];
        console.log('🔍 AUDIT STATE RESET');
    }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkflowAuditor;
} else {
    globalThis.WorkflowAuditor = WorkflowAuditor;
}
