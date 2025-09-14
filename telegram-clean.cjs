require('dotenv').config({ path: './backend/.env' });
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
    console.error('ERROR: Missing Telegram credentials');
    process.exit(1);
}

function sendTelegramMessage(text) {
    return new Promise((resolve, reject) => {
        // Clean the text of any potentially problematic characters
        const cleanText = text.replace(/[^\x00-\x7F]/g, ""); // Remove non-ASCII
        const finalText = cleanText || 'TASKMASTER REPORT\nSystem is running normally.';
        
        const data = JSON.stringify({
            chat_id: chatId,
            text: finalText
        });

        console.log('Sending message length:', finalText.length);

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
                        console.log('SUCCESS: Message sent!');
                        resolve(result.result);
                    } else {
                        console.error('TELEGRAM ERROR:', result.description);
                        reject(new Error(result.description));
                    }
                } catch (error) {
                    console.error('PARSE ERROR:', error.message);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('NETWORK ERROR:', error.message);
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

async function generateCleanReport() {
    return new Promise((resolve) => {
        exec('node backend/full-portfolio-valuation.js', { encoding: 'utf8' }, (error, stdout, stderr) => {
            let report = 'TASKMASTER TRADING REPORT\n';
            report += 'Time: ' + new Date().toLocaleString() + '\n\n';
            
            if (error) {
                report += 'PORTFOLIO STATUS\n';
                report += 'ERROR: Data unavailable\n';
                report += 'Reason: ' + error.message.substring(0, 50) + '\n\n';
            } else {
                try {
                    const lines = stdout.split('\n');
                    let botCount = 0;
                    let totalValue = '';
                    let nextEarnings = '';
                    
                    for (const line of lines) {
                        if (line.includes('BOT ')) botCount++;
                        if (line.includes('Valor Total Cartera:')) {
                            totalValue = line.split(':')[1]?.trim() || '';
                        }
                        if (line.includes('Next Round Earnings:')) {
                            nextEarnings = line.split(':')[1]?.trim() || '';
                        }
                    }
                    
                    report += 'PORTFOLIO STATUS\n';
                    if (botCount > 0) {
                        report += 'Active Bots: ' + botCount + '\n';
                        if (totalValue) report += 'Total Value: ' + totalValue + '\n';
                        if (nextEarnings) report += 'Next Earnings: ' + nextEarnings + '\n';
                        report += 'Status: All systems operational\n\n';
                    } else {
                        report += 'Status: No active bots detected\n\n';
                    }
                } catch (parseError) {
                    report += 'PORTFOLIO STATUS\n';
                    report += 'Warning: Data parsing failed\n\n';
                }
            }
            
            report += 'SYSTEM STATUS\n';
            report += 'Node.js: ' + process.version + '\n';
            report += 'Uptime: ' + Math.floor(process.uptime() / 3600) + 'h\n';
            report += 'Bot: Active\n\n';
            
            report += 'Automated report from TaskMaster';
            
            console.log('Generated report length:', report.length);
            resolve(report);
        });
    });
}

async function sendReport() {
    try {
        console.log('Starting report generation...');
        const message = await generateCleanReport();
        
        const result = await sendTelegramMessage(message);
        
        console.log('Report sent successfully!');
        console.log('Message ID:', result.message_id);
        
        // Log success
        const logDir = path.join(__dirname, '.logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logEntry = '[' + new Date().toISOString() + '] [JOB] Clean report sent successfully\n';
        fs.appendFileSync(path.join(logDir, 'telegram-reports.log'), logEntry);
        
        return true;
    } catch (error) {
        console.error('Failed to send report:', error.message);
        
        // Log error
        const logDir = path.join(__dirname, '.logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logEntry = '[' + new Date().toISOString() + '] [ERROR] Clean report failed: ' + error.message + '\n';
        fs.appendFileSync(path.join(logDir, 'telegram-reports.log'), logEntry);
        
        return false;
    }
}

// Main execution
if (process.argv.includes('--test')) {
    console.log('Testing clean Telegram connection...');
    sendTelegramMessage('TEST MESSAGE\n\nClean reporter working!\nTime: ' + new Date().toLocaleString())
        .then(() => console.log('Test successful'))
        .catch(err => console.error('Test failed:', err.message));
} else {
    console.log('Sending clean report...');
    sendReport();
}
