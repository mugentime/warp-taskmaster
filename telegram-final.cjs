require('dotenv').config({ path: './backend/.env' });
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
    console.error('❌ Missing Telegram credentials');
    process.exit(1);
}

function sendTelegramMessage(text) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${token}/sendMessage`,
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

async function generateReport() {
    return new Promise((resolve) => {
        exec('node backend/full-portfolio-valuation.js', { encoding: 'utf8' }, (error, stdout, stderr) => {
            let report = '<b>📊 TASKMASTER REPORT</b>\n';
            report += `⏰ ${new Date().toLocaleString()}\n\n`;
            
            if (error) {
                report += '<b>💰 PORTFOLIO</b>\n';
                report += '❌ Data unavailable\n';
                report += `Error: ${error.message.substring(0, 50)}\n\n`;
            } else {
                try {
                    const lines = stdout.split('\n');
                    let botCount = 0;
                    let totalValue = '';
                    let nextEarnings = '';
                    
                    for (const line of lines) {
                        if (line.includes('🤖 BOT')) botCount++;
                        if (line.includes('Valor Total Cartera:')) totalValue = line.split(':')[1]?.trim() || '';
                        if (line.includes('Next Round Earnings:')) nextEarnings = line.split(':')[1]?.trim() || '';
                    }
                    
                    report += '<b>💰 PORTFOLIO</b>\n';
                    if (botCount > 0) {
                        report += `🤖 Active Bots: ${botCount}\n`;
                        if (totalValue) report += `💼 Value: ${totalValue}\n`;
                        if (nextEarnings) report += `💸 Next: ${nextEarnings}\n`;
                        report += '✅ All systems operational!\n\n';
                    } else {
                        report += '⚠️ No active bots detected\n\n';
                    }
                } catch (parseError) {
                    report += '<b>💰 PORTFOLIO</b>\n';
                    report += '⚠️ Data parsing failed\n\n';
                }
            }
            
            report += '<b>🖥️ SYSTEM</b>\n';
            report += `🔧 Node: ${process.version}\n`;
            report += `⏱️ Uptime: ${Math.floor(process.uptime() / 3600)}h\n`;
            report += '📱 Bot: Active\n\n';
            
            report += '<i>📡 Auto-report from TaskMaster</i>';
            
            resolve(report);
        });
    });
}

async function sendReport() {
    try {
        console.log('🚀 Generating report...');
        const message = await generateReport();
        
        console.log('📤 Sending message...');
        console.log('Message preview:', message.substring(0, 100) + '...');
        console.log('Message length:', message.length);
        const result = await sendTelegramMessage(message);
        
        console.log('✅ Report sent successfully!');
        console.log(`Message ID: ${result.message_id}`);
        
        // Log success
        const logDir = path.join(__dirname, '.logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logEntry = `[${new Date().toISOString()}] [JOB] Enhanced report sent successfully\n`;
        fs.appendFileSync(path.join(logDir, 'telegram-reports.log'), logEntry);
        const nextReport = new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString();
        console.log(`[${new Date().toLocaleTimeString()}] [JOB] Next report at: ${nextReport}`);
        
        return true;
    } catch (error) {
        console.error('❌ Failed to send report:', error.message);
        
        // Log error
        const logDir = path.join(__dirname, '.logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logEntry = `[${new Date().toISOString()}] [ERROR] Report failed: ${error.message}\n`;
        fs.appendFileSync(path.join(logDir, 'telegram-reports.log'), logEntry);
        
        return false;
    }
}

// Main execution
if (process.argv.includes('--test')) {
    console.log('🧪 Testing Telegram connection...');
    sendTelegramMessage('🧪 <b>TEST MESSAGE</b>\n\n✅ Final reporter working!\n⏰ ' + new Date().toLocaleString())
        .then(() => console.log('✅ Test successful'))
        .catch(err => console.error('❌ Test failed:', err.message));
} else {
    console.log('📊 Sending full report...');
    sendReport();
}
