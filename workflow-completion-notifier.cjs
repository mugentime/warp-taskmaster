/**
 * 🔔 WORKFLOW COMPLETION TELEGRAM NOTIFIER
 * ═══════════════════════════════════════════════
 * 
 * Sends a Telegram message every time TaskMaster completes
 * a full workflow cycle (capital allocation → deployment → optimization)
 * 
 * Features:
 * - Real-time workflow completion notifications 
 * - Detailed cycle performance metrics
 * - Hourly summary statistics
 * - Automatic duration tracking (1 hour by default)
 * - Integration with existing TaskMaster workflow auditor
 */

require('dotenv').config();
const https = require('https');

class WorkflowCompletionNotifier {
    constructor(durationHours = 1) {
        this.durationHours = durationHours;
        this.startTime = Date.now();
        this.endTime = this.startTime + (durationHours * 60 * 60 * 1000);
        this.completionCount = 0;
        this.totalCycles = 0;
        this.successfulCycles = 0;
        this.failedCycles = 0;
        
        // Telegram configuration
        this.telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!this.telegramToken || !this.telegramChatId) {
            console.error('❌ Telegram not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env');
            process.exit(1);
        }
        
        console.log(`🔔 WORKFLOW COMPLETION NOTIFIER ACTIVE`);
        console.log(`⏰ Duration: ${durationHours} hour(s)`);
        console.log(`📱 Will send notifications to Telegram chat: ${this.telegramChatId}`);
        console.log(`🕐 End time: ${new Date(this.endTime).toLocaleString()}`);
        
        this.sendStartupMessage();
    }
    
    async sendStartupMessage() {
        const message = `🔔 WORKFLOW COMPLETION NOTIFIER STARTED
═══════════════════════════════════════════
${new Date().toLocaleString()}

⏰ Duration: ${this.durationHours} hour(s)  
🔄 Will notify on every completed workflow cycle
🕐 Monitoring until: ${new Date(this.endTime).toLocaleString()}

🤖 TaskMaster workflow notifications active`;

        await this.sendTelegramMessage(message);
    }
    
    async notifyWorkflowCompleted(workflowData) {
        // Check if we're still within the monitoring period
        if (Date.now() > this.endTime) {
            console.log('⏰ Monitoring period ended - stopping notifications');
            await this.sendFinalSummary();
            process.exit(0);
        }
        
        this.totalCycles++;
        
        if (workflowData.success) {
            this.successfulCycles++;
            this.completionCount++;
        } else {
            this.failedCycles++;
        }
        
        const cycleNumber = this.totalCycles;
        const duration = workflowData.duration || 'Unknown';
        const portfolio = workflowData.portfolio || {};
        const deployments = workflowData.deployments || 0;
        const optimizations = workflowData.optimizations || 0;
        
        // Calculate estimated cycles per hour
        const elapsedMinutes = (Date.now() - this.startTime) / (1000 * 60);
        const cyclesPerHour = elapsedMinutes > 0 ? Math.round((this.totalCycles / elapsedMinutes) * 60) : 0;
        
        const message = `🔄 WORKFLOW CYCLE #${cycleNumber} COMPLETED
${new Date().toLocaleString()}

${workflowData.success ? '✅' : '❌'} Status: ${workflowData.success ? 'SUCCESS' : 'FAILED'}
⏱️ Duration: ${duration}
🎯 Steps: ${workflowData.stepsCompleted || 'N/A'}/${workflowData.totalSteps || 'N/A'}

💰 Portfolio: $${portfolio.totalValue?.toFixed(2) || 'N/A'}
📈 Utilization: ${portfolio.utilization?.toFixed(1) || 'N/A'}%
🚀 New Deployments: ${deployments}
⚡ Optimizations: ${optimizations}
💵 Unrealized P&L: ${portfolio.totalPnL >= 0 ? '+' : ''}$${portfolio.totalPnL?.toFixed(2) || 'N/A'}

📊 SESSION STATS:
• Successful: ${this.successfulCycles}/${this.totalCycles}
• Success Rate: ${this.totalCycles > 0 ? ((this.successfulCycles/this.totalCycles)*100).toFixed(1) : '0'}%
• Rate: ~${cyclesPerHour}/hour
• Remaining: ${Math.round((this.endTime - Date.now()) / (1000 * 60))} min`;

        await this.sendTelegramMessage(message);
    }
    
    async sendFinalSummary() {
        const totalDuration = Math.round((Date.now() - this.startTime) / (1000 * 60));
        const averageCycleTime = this.totalCycles > 0 ? (totalDuration / this.totalCycles).toFixed(1) : 'N/A';
        const cyclesPerHour = totalDuration > 0 ? Math.round((this.totalCycles / totalDuration) * 60) : 0;
        
        const message = `📊 WORKFLOW MONITORING SESSION COMPLETE
═══════════════════════════════════════════
${new Date().toLocaleString()}

⏰ FINAL STATISTICS (${this.durationHours}h session):
• Total Cycles: ${this.totalCycles}
• Successful: ${this.successfulCycles}
• Failed: ${this.failedCycles}
• Success Rate: ${this.totalCycles > 0 ? ((this.successfulCycles/this.totalCycles)*100).toFixed(1) : '0'}%

🚀 PERFORMANCE METRICS:
• Average Cycle Time: ${averageCycleTime} min
• Cycles/Hour: ${cyclesPerHour}
• Total Duration: ${totalDuration} minutes

🤖 TaskMaster workflow monitoring ended`;

        await this.sendTelegramMessage(message);
    }
    
    async sendTelegramMessage(message) {
        return new Promise((resolve) => {
            const data = JSON.stringify({
                chat_id: this.telegramChatId,
                text: message,
                parse_mode: 'HTML'
            });
            
            const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${this.telegramToken}/sendMessage`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data, 'utf8')
                }
            };
            
            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        console.log(`📱 Telegram notification sent (cycle #${this.totalCycles})`);
                    } else {
                        console.error(`❌ Telegram send failed: ${res.statusCode} - ${responseData}`);
                    }
                    resolve(res.statusCode === 200);
                });
            });
            
            req.on('error', (error) => {
                console.error(`❌ Telegram request error: ${error.message}`);
                resolve(false);
            });
            
            req.setTimeout(10000, () => {
                console.error('❌ Telegram request timeout');
                req.destroy();
                resolve(false);
            });
            
            req.write(data);
            req.end();
        });
    }
}

// Export for integration with TaskMaster
module.exports = WorkflowCompletionNotifier;

// If run directly, start the notifier in standalone mode
if (require.main === module) {
    console.log('🔔 Starting Workflow Completion Notifier in standalone mode...');
    
    const notifier = new WorkflowCompletionNotifier(1); // 1 hour by default
    
    // Simulate workflow completions for testing
    let testCycle = 1;
    
    const simulateWorkflow = setInterval(() => {
        const mockWorkflowData = {
            success: Math.random() > 0.1, // 90% success rate
            duration: `${Math.round(60 + Math.random() * 120)}s`, // 60-180 seconds
            stepsCompleted: 5,
            totalSteps: 5,
            portfolio: {
                totalValue: 1000 + (testCycle * 10),
                utilization: 85 + Math.random() * 10,
                totalPnL: -5 + Math.random() * 20
            },
            deployments: Math.floor(Math.random() * 3),
            optimizations: Math.floor(Math.random() * 5)
        };
        
        notifier.notifyWorkflowCompleted(mockWorkflowData);
        testCycle++;
    }, 2000); // Every 2 seconds for testing
    
    // Stop simulation after 30 seconds (for testing)
    setTimeout(() => {
        clearInterval(simulateWorkflow);
        console.log('🔄 Test simulation ended');
    }, 30000);
}
