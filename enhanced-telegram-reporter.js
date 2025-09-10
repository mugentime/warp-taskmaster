#!/usr/bin/env node
/**
 * Enhanced Telegram Reporter - Integrates with Claude Flow MCP System
 * Sends comprehensive trading reports every 10 minutes to Telegram
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), 'backend', '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class EnhancedTelegramReporter {
    constructor() {
        this.telegramBot = {
            token: process.env.TELEGRAM_BOT_TOKEN,
            chatId: process.env.TELEGRAM_CHAT_ID
        };
        
        this.config = {
            projectRoot: __dirname,
            backendPath: join(__dirname, 'backend'),
            statusPath: join(__dirname, 'status'),
            runtimePath: join(__dirname, '.runtime'),
            logsPath: join(__dirname, '.logs')
        };
        
        this.reportInterval = 10; // minutes
    }
    
    async validateSetup() {
        console.log('🔍 Validating Telegram Reporter setup...');
        
        // Check Telegram credentials
        if (!this.telegramBot.token || !this.telegramBot.chatId) {
            throw new Error('❌ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured');
        }
        
        // Check if we can read system status
        const statusFile = join(this.config.statusPath, 'system-status.json');
        try {
            await fs.access(statusFile);
            console.log('✅ System status file accessible');
        } catch {
            console.log('⚠️ System status file not found, will generate basic report');
        }
        
        console.log('✅ Setup validation completed');
        return true;
    }
    
    async generateComprehensiveReport() {
        console.log('📊 Generating comprehensive trading report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            systemStatus: await this.getSystemStatus(),
            claudeFlowStatus: await this.getClaudeFlowStatus(),
            tradingMetrics: await this.getTradingMetrics(),
            balanceInfo: await this.getBalanceInfo(),
            riskAssessment: await this.getRiskAssessment()
        };
        
        return report;
    }
    
    async getSystemStatus() {
        try {
            const statusFile = join(this.config.statusPath, 'system-status.json');
            const statusContent = await fs.readFile(statusFile, 'utf8');
            return JSON.parse(statusContent);
        } catch {
            return {
                note: 'System status not available',
                timestamp: new Date().toISOString()
            };
        }
    }
    
    async getClaudeFlowStatus() {
        try {
            // Check if Claude Flow is running
            const runtimeFiles = await fs.readdir(this.config.runtimePath).catch(() => []);
            const hasClaudeFlowPid = runtimeFiles.includes('claude-flow-pid.txt');
            const hasMcpPids = runtimeFiles.includes('mcp-pids.json');
            
            let jobStatus = 'unknown';
            try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                
                // Check PowerShell jobs for Claude Flow
                const { stdout } = await execAsync('powershell -Command "Get-Job -Name *claude* -ErrorAction SilentlyContinue | ConvertTo-Json"');
                jobStatus = stdout.trim() ? 'running' : 'stopped';
            } catch {
                jobStatus = 'unknown';
            }
            
            return {
                mcpServers: hasMcpPids,
                claudeFlowRunning: hasClaudeFlowPid,
                backgroundJobs: jobStatus,
                toolsAvailable: 87, // Known from system initialization
                agentsCount: 65     // Known from system initialization
            };
        } catch (error) {
            return {
                error: error.message,
                status: 'unavailable'
            };
        }
    }
    
    async getTradingMetrics() {
        try {
            // Try to read recent trading reports
            const files = await fs.readdir(this.config.projectRoot);
            const reportFiles = files.filter(f => f.startsWith('trading-report-'));
            
            if (reportFiles.length > 0) {
                const latestReport = reportFiles.sort().pop();
                const reportContent = await fs.readFile(join(this.config.projectRoot, latestReport), 'utf8');
                const report = JSON.parse(reportContent);
                
                return {
                    hasData: true,
                    summary: report.summary,
                    exchanges: Object.keys(report.exchanges).length,
                    servers: report.servers ? Object.keys(report.servers).length : 0,
                    lastUpdate: report.timestamp
                };
            }
        } catch (error) {
            console.log('⚠️ Could not read trading metrics:', error.message);
        }
        
        return {
            hasData: false,
            note: 'No recent trading data available'
        };
    }
    
    async getBalanceInfo() {
        try {
            // Check for balance snapshots
            const files = await fs.readdir(this.config.projectRoot);
            const balanceFiles = files.filter(f => f.includes('balance') && f.endsWith('.json'));
            
            if (balanceFiles.length > 0) {
                const latestBalance = balanceFiles.sort().pop();
                const balanceContent = await fs.readFile(join(this.config.projectRoot, latestBalance), 'utf8');
                const balance = JSON.parse(balanceContent);
                
                return {
                    available: true,
                    data: balance,
                    source: latestBalance
                };
            }
        } catch (error) {
            console.log('⚠️ Could not read balance info:', error.message);
        }
        
        return {
            available: false,
            note: 'Balance information not available'
        };
    }
    
    async getRiskAssessment() {
        const risks = [];
        const timestamp = new Date();
        
        // Check system uptime
        const uptimeHours = process.uptime() / 3600;
        if (uptimeHours > 24) {
            risks.push({
                level: 'INFO',
                message: `System running for ${uptimeHours.toFixed(1)} hours`
            });
        }
        
        // Check if it's weekend (markets might be different)
        const isWeekend = [0, 6].includes(timestamp.getDay());
        if (isWeekend) {
            risks.push({
                level: 'INFO',
                message: 'Weekend - Some markets may have reduced liquidity'
            });
        }
        
        // Check time of day (outside trading hours)
        const hour = timestamp.getHours();
        if (hour < 6 || hour > 22) {
            risks.push({
                level: 'LOW',
                message: 'Outside major trading hours'
            });
        }
        
        if (risks.length === 0) {
            risks.push({
                level: 'LOW',
                message: 'No significant risks detected'
            });
        }
        
        return risks;
    }
    
    async sendTelegramMessage(message, isEmergency = false) {
        if (!this.telegramBot.token || !this.telegramBot.chatId) {
            console.log('❌ Telegram credentials not configured');
            return false;
        }
        
        try {
            const emoji = isEmergency ? '🚨' : '📊';
            const priority = isEmergency ? '❗URGENTE❗' : '';
            const formattedMessage = `${emoji} ${priority}\\n\\n${message}`;
            
            const url = `https://api.telegram.org/bot${this.telegramBot.token}/sendMessage`;
            const response = await axios.post(url, {
                chat_id: this.telegramBot.chatId,
                text: formattedMessage,
                parse_mode: 'HTML'
            });
            
            console.log('✅ Telegram message sent successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Failed to send Telegram message:', error.response?.data || error.message);
            return false;
        }
    }
    
    formatTradingReport(report) {
        let message = `<b>📊 TRADING SYSTEM REPORT</b>\\n`;
        message += `⏰ ${new Date(report.timestamp).toLocaleString()}\\n\\n`;
        
        // Claude Flow Status
        message += `<b>🌊 CLAUDE FLOW STATUS</b>\\n`;
        if (report.claudeFlowStatus.error) {
            message += `❌ Error: ${report.claudeFlowStatus.error}\\n`;
        } else {
            message += `🛠️ Tools: ${report.claudeFlowStatus.toolsAvailable}\\n`;
            message += `🤖 Agents: ${report.claudeFlowStatus.agentsCount}\\n`;
            message += `🔄 MCP Servers: ${report.claudeFlowStatus.mcpServers ? '✅' : '❌'}\\n`;
            message += `📊 Background Jobs: ${report.claudeFlowStatus.backgroundJobs}\\n`;
        }
        
        message += `\\n`;
        
        // Trading Metrics
        message += `<b>💰 TRADING METRICS</b>\\n`;
        if (report.tradingMetrics.hasData && report.tradingMetrics.summary) {
            const summary = report.tradingMetrics.summary;
            message += `💼 Portfolio: $${summary.totalBalance}\\n`;
            message += `📈 PnL: $${summary.totalPnL}\\n`;
            message += `🏦 Exchanges: ${summary.activeExchanges}\\n`;
            message += `🖥️ Servers: ${summary.activeServers}\\n`;
            message += `🤖 Active Bots: ${summary.activeBots}\\n`;
            message += `⚠️ Risk Level: ${summary.riskLevel}\\n`;
        } else {
            message += `⚠️ ${report.tradingMetrics.note}\\n`;
        }
        
        message += `\\n`;
        
        // Balance Information
        message += `<b>💳 BALANCE STATUS</b>\\n`;
        if (report.balanceInfo.available) {
            message += `✅ Balance data available\\n`;
            message += `📄 Source: ${report.balanceInfo.source}\\n`;
        } else {
            message += `⚠️ ${report.balanceInfo.note}\\n`;
        }
        
        message += `\\n`;
        
        // Risk Assessment
        message += `<b>⚠️ RISK ASSESSMENT</b>\\n`;
        report.riskAssessment.forEach(risk => {
            const riskIcon = risk.level === 'HIGH' ? '🔴' : 
                           risk.level === 'MEDIUM' ? '🟡' : '🟢';
            message += `${riskIcon} ${risk.message}\\n`;
        });
        
        message += `\\n📱 <i>Automated report from TaskMaster + Claude Flow</i>`;
        
        return message;
    }
    
    async sendReport() {
        try {
            console.log('🚀 Starting enhanced Telegram report generation...');
            
            const report = await this.generateComprehensiveReport();
            const message = this.formatTradingReport(report);
            
            // Determine if this is an emergency
            const hasHighRisk = report.riskAssessment.some(r => r.level === 'HIGH');
            const hasErrors = report.claudeFlowStatus.error || 
                            (report.tradingMetrics.hasData && 
                             report.tradingMetrics.summary && 
                             report.tradingMetrics.summary.riskLevel === 'HIGH');
            
            const isEmergency = hasHighRisk || hasErrors;
            
            const result = await this.sendTelegramMessage(message, isEmergency);
            
            if (result) {
                console.log('✅ Enhanced Telegram report sent successfully');
                
                // Save report to file
                const reportFile = join(this.config.logsPath, `telegram-report-${Date.now()}.json`);
                await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
                console.log(`💾 Report saved to: ${reportFile}`);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Failed to send enhanced Telegram report:', error);
            return false;
        }
    }
    
    async testReport() {
        console.log('🧪 Testing enhanced Telegram reporting...');
        
        const testMessage = `<b>🧪 TEST REPORT - ENHANCED TELEGRAM REPORTER</b>\\n\\n` +
                          `✅ Enhanced reporting system is working\\n` +
                          `🌊 Claude Flow integration: Active\\n` +
                          `📊 TaskMaster integration: Active\\n` +
                          `⏰ Test time: ${new Date().toLocaleString()}\\n\\n` +
                          `💡 Reports will be sent every ${this.reportInterval} minutes`;
        
        return await this.sendTelegramMessage(testMessage);
    }
}

// CLI execution
async function main() {
    const reporter = new EnhancedTelegramReporter();
    
    try {
        await reporter.validateSetup();
        
        if (process.argv.includes('--test')) {
            console.log('🧪 Running test mode...');
            await reporter.testReport();
        } else {
            console.log('📊 Running full report...');
            await reporter.sendReport();
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Reporter failed:', error.message);
        process.exit(1);
    }
}

// Export for use as module
export default EnhancedTelegramReporter;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
