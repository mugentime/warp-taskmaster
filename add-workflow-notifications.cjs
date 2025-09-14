/**
 * 🔔 ADD WORKFLOW COMPLETION NOTIFICATIONS TO TASKMASTER
 * ══════════════════════════════════════════════════════
 * 
 * This script patches your existing TaskMaster to send Telegram notifications
 * every time a complete workflow cycle is finished for the next hour.
 * 
 * Usage:
 * node add-workflow-notifications.cjs
 * 
 * This will:
 * 1. Hook into your running TaskMaster process
 * 2. Monitor workflow completions 
 * 3. Send Telegram notifications for each completed cycle
 * 4. Run for 1 hour then stop
 */

require('dotenv').config();
const fs = require('fs');
const WorkflowCompletionNotifier = require('./workflow-completion-notifier.cjs');

class TaskMasterNotificationPatch {
    constructor() {
        this.notifier = new WorkflowCompletionNotifier(1); // 1 hour duration
        this.logFile = 'taskmaster-precision-fixed.log'; // Your current log file
        this.lastLogPosition = 0;
        this.workflowPattern = /WORKFLOW CYCLE.*COMPLETED|✅.*COMPLETE|DEPLOYMENT COMPLETE|Rebalancing complete/i;
        this.portfolioPattern = /Portfolio.*\$([0-9.,]+)|Utilization.*([0-9.]+)%|P&L.*\$([0-9.-]+)/i;
        
        this.cycleCount = 0;
        this.isMonitoring = false;
        
        console.log('🔔 WORKFLOW NOTIFICATION PATCH INITIALIZED');
        console.log(`📄 Monitoring log file: ${this.logFile}`);
    }
    
    async startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ Already monitoring');
            return;
        }
        
        this.isMonitoring = true;
        console.log('🚀 STARTING WORKFLOW COMPLETION MONITORING...');
        
        // Check if log file exists
        if (!fs.existsSync(this.logFile)) {
            console.error(`❌ Log file ${this.logFile} not found. Make sure TaskMaster is running.`);
            process.exit(1);
        }
        
        // Get initial file size
        const stats = fs.statSync(this.logFile);
        this.lastLogPosition = stats.size;
        
        console.log(`📊 Log file size: ${stats.size} bytes`);
        console.log(`🔍 Watching for workflow completion patterns...`);
        
        // Start monitoring loop
        this.monitoringInterval = setInterval(() => {
            this.checkForWorkflowCompletions();
        }, 5000); // Check every 5 seconds
        
        // Stop after 1 hour
        setTimeout(() => {
            this.stopMonitoring();
        }, 60 * 60 * 1000);
        
        console.log('✅ Monitoring active for 1 hour');
    }
    
    checkForWorkflowCompletions() {
        try {
            const stats = fs.statSync(this.logFile);
            const currentSize = stats.size;
            
            if (currentSize <= this.lastLogPosition) {
                return; // No new data
            }
            
            // Read new log data
            const buffer = Buffer.alloc(currentSize - this.lastLogPosition);
            const fd = fs.openSync(this.logFile, 'r');
            fs.readSync(fd, buffer, 0, buffer.length, this.lastLogPosition);
            fs.closeSync(fd);
            
            const newLogData = buffer.toString('utf8');
            this.lastLogPosition = currentSize;
            
            // Check for workflow completion patterns
            const lines = newLogData.split('\n');
            
            for (const line of lines) {
                if (this.workflowPattern.test(line)) {
                    console.log(`🔍 WORKFLOW COMPLETION DETECTED: ${line.trim()}`);
                    this.processWorkflowCompletion(line, lines);
                }
            }
            
        } catch (error) {
            console.error(`❌ Log monitoring error: ${error.message}`);
        }
    }
    
    async processWorkflowCompletion(completionLine, recentLines) {
        this.cycleCount++;
        
        // Extract workflow information from recent log lines
        const workflowData = this.extractWorkflowData(completionLine, recentLines);
        
        console.log(`📱 Sending notification for workflow cycle #${this.cycleCount}...`);
        
        // Send notification
        await this.notifier.notifyWorkflowCompleted({
            success: !completionLine.toLowerCase().includes('failed') && !completionLine.toLowerCase().includes('error'),
            duration: workflowData.duration || 'Unknown',
            stepsCompleted: workflowData.steps || 5,
            totalSteps: 5,
            portfolio: {
                totalValue: workflowData.portfolioValue || 0,
                utilization: workflowData.utilization || 0,
                totalPnL: workflowData.pnl || 0
            },
            deployments: workflowData.deployments || 0,
            optimizations: workflowData.optimizations || 0
        });
        
        console.log(`✅ Notification sent for cycle #${this.cycleCount}`);
    }
    
    extractWorkflowData(completionLine, recentLines) {
        const data = {
            duration: 'Unknown',
            portfolioValue: 0,
            utilization: 0,
            pnl: 0,
            deployments: 0,
            optimizations: 0,
            steps: 5
        };
        
        // Look at last 50 lines for context
        const contextLines = recentLines.slice(-50);
        
        for (const line of contextLines) {
            // Extract duration
            const durationMatch = line.match(/(\d+)s/);
            if (durationMatch) {
                data.duration = `${durationMatch[1]}s`;
            }
            
            // Extract portfolio value
            const valueMatch = line.match(/Portfolio.*\$([0-9,]+\.?\d*)/i);
            if (valueMatch) {
                data.portfolioValue = parseFloat(valueMatch[1].replace(/,/g, ''));
            }
            
            // Extract utilization
            const utilizationMatch = line.match(/Utilization.*?([0-9.]+)%/i);
            if (utilizationMatch) {
                data.utilization = parseFloat(utilizationMatch[1]);
            }
            
            // Extract P&L
            const pnlMatch = line.match(/P&L.*\$?([0-9.-]+)/i);
            if (pnlMatch) {
                data.pnl = parseFloat(pnlMatch[1]);
            }
            
            // Extract deployments
            const deploymentMatch = line.match(/(\d+)\/(\d+)\s+successful|Deployed.*\$([0-9.]+)/i);
            if (deploymentMatch) {
                data.deployments = parseInt(deploymentMatch[1] || '0');
            }
            
            // Extract optimizations
            const optimizationMatch = line.match(/(\d+)\s+position.*optimized|(\d+)\s+action.*performed/i);
            if (optimizationMatch) {
                data.optimizations = parseInt(optimizationMatch[1] || optimizationMatch[2] || '0');
            }
        }
        
        return data;
    }
    
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        console.log('🛑 STOPPING WORKFLOW COMPLETION MONITORING...');
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.isMonitoring = false;
        
        console.log(`📊 MONITORING SESSION COMPLETE:`);
        console.log(`   • Total cycles detected: ${this.cycleCount}`);
        console.log(`   • Monitoring duration: 1 hour`);
        console.log(`   • Log file: ${this.logFile}`);
        
        process.exit(0);
    }
}

// Start the notification patch
const patch = new TaskMasterNotificationPatch();

patch.startMonitoring().catch(error => {
    console.error('❌ Failed to start monitoring:', error.message);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down monitoring...');
    patch.stopMonitoring();
});

process.on('SIGTERM', () => {
    console.log('🛑 Terminating monitoring...');
    patch.stopMonitoring();
});
