// Send immediate report
require('dotenv').config();
const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

const TELEGRAM_BOT_TOKEN = '8220024038:AAF9pY8vb6CkOjWSu0vXTzYVUNfpMiGEGZA';
const TELEGRAM_CHAT_ID = '1828005335';

function sendTelegramMessage(text) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'HTML'
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

// Add fetch polyfill
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

async function sendImmediateReport() {
    console.log('🔄 Generating immediate status report...');
    
    // Get backend health
    let backendHealth = { status: 'Offline', healthy: false };
    try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
            const data = await response.json();
            backendHealth = {
                status: 'Online',
                uptime: Math.floor(data.uptime),
                healthy: true
            };
        }
    } catch (error) {
        backendHealth.error = error.message;
    }
    
    // Get balance
    let balanceData = { success: false, error: 'Script not available' };
    try {
        if (fs.existsSync('./get-overall-balance.js')) {
            const output = execSync('node get-overall-balance.js', { 
                encoding: 'utf8', 
                timeout: 30000 
            });
            
            const lines = output.split('\n');
            let totalBalance = null;
            for (const line of lines) {
                if (line.includes('Total') || line.includes('total')) {
                    const match = line.match(/[\d,]+\.?\d*/);
                    if (match) totalBalance = parseFloat(match[0].replace(/,/g, ''));
                }
            }
            
            balanceData = {
                total: totalBalance,
                raw: output.trim(),
                success: true
            };
        }
    } catch (error) {
        balanceData.error = error.message;
    }
    
    // Build report
    let report = `📊 <b>TaskMaster Immediate Report</b>\n\n`;
    
    // System Status
    report += `🔧 <b>System Status:</b>\n`;
    report += `• Backend: ${backendHealth.healthy ? '✅' : '❌'} ${backendHealth.status}\n`;
    if (backendHealth.uptime) {
        report += `• Uptime: ${Math.floor(backendHealth.uptime / 60)}m ${backendHealth.uptime % 60}s\n`;
    }
    report += `• Auto Reporter: ✅ Active\n\n`;
    
    // Account Balance
    report += `💰 <b>Account Balance:</b>\n`;
    if (balanceData.success && balanceData.total) {
        report += `• Total: $${balanceData.total.toFixed(2)}\n`;
    } else {
        report += `• Status: ${balanceData.success ? '🔄 Checking...' : '❌ ' + balanceData.error}\n`;
    }
    report += '\n';
    
    // Status
    report += `📈 <b>Performance:</b>\n`;
    report += `• Status: 🔄 Baseline established\n`;
    report += `• Next profit calc: In 5 minutes\n\n`;
    
    // Bot Info
    report += `🤖 <b>Bot Activity:</b>\n`;
    report += `• Trading Mode: ${process.env.DRY_RUN === 'false' ? '🟢 Live' : '🟡 Paper'}\n`;
    report += `• Auto Reports: ✅ Every 5min\n`;
    report += `• Manual Report: ✅ Now\n\n`;
    
    report += `⚡ This was a manual report. Automatic reports continue every 5 minutes.`;
    
    try {
        await sendTelegramMessage(report);
        console.log('✅ Immediate report sent successfully!');
    } catch (error) {
        console.error('❌ Failed to send report:', error.message);
    }
}

sendImmediateReport();
