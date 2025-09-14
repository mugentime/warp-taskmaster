// Automated Telegram Status Reporter
// Sends bot status, profit, ROI, and account updates every 5 minutes
require('dotenv').config();
const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const TELEGRAM_BOT_TOKEN = '8220024038:AAF9pY8vb6CkOjWSu0vXTzYVUNfpMiGEGZA';
const TELEGRAM_CHAT_ID = '1828005335';
const REPORT_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

console.log('📊 Starting Auto Telegram Reporter...');
console.log(`⏰ Report Interval: ${REPORT_INTERVAL / 1000 / 60} minutes`);
console.log('📱 Telegram Chat ID:', TELEGRAM_CHAT_ID);

// State tracking for profit calculations
let lastBalance = null;
let sessionStartTime = new Date();
let reportCount = 0;

// Send message to Telegram
function sendTelegramMessage(text, parseMode = 'HTML') {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: parseMode
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    if (result.ok) {
                        resolve(result.result);
                    } else {
                        reject(new Error(result.description));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Get backend health status
async function getBackendHealth() {
    try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
            const data = await response.json();
            return {
                status: 'Online',
                uptime: Math.floor(data.uptime),
                healthy: true
            };
        } else {
            return { status: 'Offline', healthy: false };
        }
    } catch (error) {
        return { status: 'Offline', healthy: false, error: error.message };
    }
}

// Get account balance
async function getAccountBalance() {
    try {
        if (fs.existsSync('./get-overall-balance.js')) {
            const output = execSync('node get-overall-balance.js', { 
                encoding: 'utf8', 
                timeout: 30000 
            });
            
            // Try to parse balance information from output
            const lines = output.split('\n');
            let totalBalance = null;
            let availableBalance = null;
            
            for (const line of lines) {
                if (line.includes('Total') || line.includes('total')) {
                    const match = line.match(/[\d,]+\.?\d*/);
                    if (match) totalBalance = parseFloat(match[0].replace(/,/g, ''));
                }
                if (line.includes('Available') || line.includes('available')) {
                    const match = line.match(/[\d,]+\.?\d*/);
                    if (match) availableBalance = parseFloat(match[0].replace(/,/g, ''));
                }
            }
            
            return {
                total: totalBalance,
                available: availableBalance,
                raw: output.trim(),
                success: true
            };
        } else {
            return { success: false, error: 'Balance script not found' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Calculate profit and ROI
function calculateProfitROI(currentBalance, previousBalance) {
    if (!previousBalance || !currentBalance) {
        return { profit: 0, roi: 0, hasData: false };
    }
    
    const profit = currentBalance - previousBalance;
    const roi = previousBalance > 0 ? (profit / previousBalance) * 100 : 0;
    
    return {
        profit: profit,
        roi: roi,
        hasData: true,
        profitFormatted: profit >= 0 ? `+$${profit.toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`,
        roiFormatted: roi >= 0 ? `+${roi.toFixed(2)}%` : `${roi.toFixed(2)}%`
    };
}

// Generate comprehensive status report
async function generateStatusReport() {
    const reportTime = new Date();
    reportCount++;
    
    console.log(`📊 Generating report #${reportCount} at ${reportTime.toLocaleString()}`);
    
    // Get all data
    const backendHealth = await getBackendHealth();
    const balanceData = await getAccountBalance();
    
    // Calculate session duration
    const sessionDuration = Math.floor((reportTime - sessionStartTime) / 1000 / 60); // minutes
    
    // Calculate profit/ROI
    let profitData = { profit: 0, roi: 0, hasData: false };
    if (balanceData.success && balanceData.total) {
        if (lastBalance === null) {
            lastBalance = balanceData.total; // Set initial balance
        } else {
            profitData = calculateProfitROI(balanceData.total, lastBalance);
        }
    }
    
    // Build status report
    let report = `📊 <b>TaskMaster Auto Report #${reportCount}</b>\n\n`;
    
    // System Status
    report += `🔧 <b>System Status:</b>\n`;
    report += `• Backend: ${backendHealth.healthy ? '✅' : '❌'} ${backendHealth.status}\n`;
    if (backendHealth.uptime) {
        report += `• Uptime: ${Math.floor(backendHealth.uptime / 60)}m ${backendHealth.uptime % 60}s\n`;
    }
    report += `• Reporter: ✅ Active (${sessionDuration}m)\n\n`;
    
    // Account Balance
    report += `💰 <b>Account Balance:</b>\n`;
    if (balanceData.success) {
        if (balanceData.total) {
            report += `• Total: $${balanceData.total.toFixed(2)}\n`;
        }
        if (balanceData.available) {
            report += `• Available: $${balanceData.available.toFixed(2)}\n`;
        }
        if (!balanceData.total && !balanceData.available) {
            report += `• Status: Connected (parsing balance...)\n`;
        }
    } else {
        report += `• Status: ❌ ${balanceData.error}\n`;
    }
    report += '\n';
    
    // Profit & ROI
    report += `📈 <b>Performance (5min):</b>\n`;
    if (profitData.hasData) {
        const profitEmoji = profitData.profit >= 0 ? '📈' : '📉';
        report += `• Profit: ${profitEmoji} ${profitData.profitFormatted}\n`;
        report += `• ROI: ${profitData.roiFormatted}\n`;
    } else {
        report += `• Status: 🔄 Collecting data...\n`;
    }
    report += '\n';
    
    // Bot Activity (placeholder - can be enhanced)
    report += `🤖 <b>Bot Activity:</b>\n`;
    report += `• Trading Mode: ${process.env.DRY_RUN === 'false' ? '🟢 Live' : '🟡 Paper'}\n`;
    report += `• Auto Reports: ✅ Every 5min\n`;
    report += `• Last Update: ${reportTime.toLocaleTimeString()}\n\n`;
    
    // Quick Actions
    report += `⚡ <b>Quick Commands:</b>\n`;
    report += `• /status - Manual status check\n`;
    report += `• /balance - Detailed balance\n`;
    report += `• /health - System health\n`;
    
    return report;
}

// Send automated report
async function sendAutomaticReport() {
    try {
        console.log('🔄 Generating automatic status report...');
        
        const report = await generateStatusReport();
        await sendTelegramMessage(report);
        
        console.log('✅ Automatic report sent successfully');
        
        // Update last balance for next calculation
        const balanceData = await getAccountBalance();
        if (balanceData.success && balanceData.total) {
            lastBalance = balanceData.total;
        }
        
    } catch (error) {
        console.error('❌ Failed to send automatic report:', error.message);
        
        // Send error notification
        try {
            await sendTelegramMessage(
                `⚠️ <b>Auto Reporter Error</b>\n\n` +
                `❌ Failed to generate report #${reportCount + 1}\n` +
                `🔧 Error: ${error.message}\n` +
                `⏰ Time: ${new Date().toLocaleString()}\n\n` +
                `🔄 Will retry in 5 minutes...`
            );
        } catch (notifyError) {
            console.error('❌ Failed to send error notification:', notifyError.message);
        }
    }
}

// Add fetch polyfill for Node.js
if (!global.fetch) {
    const https = require('https');
    const http = require('http');
    global.fetch = function(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const protocol = urlObj.protocol === 'https:' ? https : http;
            
            const req = protocol.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        json: () => Promise.resolve(JSON.parse(data))
                    });
                });
            });
            
            req.on('error', reject);
            req.end();
        });
    };
}

// Start the auto reporter
async function startAutoReporter() {
    console.log('🚀 TaskMaster Auto Reporter starting...');
    
    // Send startup notification
    try {
        await sendTelegramMessage(
            `📊 <b>Auto Reporter Started</b>\n\n` +
            `✅ Monitoring: Bot status, profit, ROI, account\n` +
            `⏰ Frequency: Every 5 minutes\n` +
            `🎯 Profit tracking: Active\n` +
            `📱 Notifications: Enabled\n\n` +
            `First report coming in 5 minutes...`
        );
        console.log('✅ Startup notification sent');
    } catch (error) {
        console.error('❌ Failed to send startup notification:', error.message);
    }
    
    // Start the reporting interval
    setInterval(sendAutomaticReport, REPORT_INTERVAL);
    
    console.log(`🔄 Auto reporter active - sending reports every ${REPORT_INTERVAL / 1000 / 60} minutes`);
}

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down auto reporter...');
    try {
        await sendTelegramMessage(
            `🛑 <b>Auto Reporter Stopped</b>\n\n` +
            `📊 Total reports sent: ${reportCount}\n` +
            `⏰ Session duration: ${Math.floor((new Date() - sessionStartTime) / 1000 / 60)} minutes\n` +
            `🔄 Auto reporting disabled.`
        );
    } catch (error) {
        console.error('❌ Failed to send shutdown notification:', error.message);
    }
    process.exit(0);
});

// Start if run directly
if (require.main === module) {
    startAutoReporter().catch(console.error);
}

module.exports = { startAutoReporter, sendTelegramMessage };
