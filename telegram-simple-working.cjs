require('dotenv').config({ path: './backend/.env' });
const https = require('https');
const { exec } = require('child_process');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

console.log('🔄 Starting simple Telegram reporter...');

if (!token || !chatId) {
    console.error('❌ Missing Telegram credentials');
    process.exit(1);
}

console.log('✅ Credentials loaded');

function sendTelegramMessage(text) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        });

        console.log('📤 Sending message, length:', text.length);

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
                        console.log('✅ Message sent successfully!');
                        resolve(result.result);
                    } else {
                        console.error('❌ Telegram API error:', result.description);
                        reject(new Error(result.description));
                    }
                } catch (error) {
                    console.error('❌ Parse error:', error.message);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Network error:', error.message);
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

async function generateSimpleReport() {
    return new Promise((resolve) => {
        console.log('📊 Getting portfolio data...');
        
        exec('node backend/full-portfolio-valuation.js', { encoding: 'utf8' }, async (error, stdout, stderr) => {
            let report = `<b>📊 TASKMASTER REPORT</b>\n`;
            report += `⏰ ${new Date().toLocaleString()}\n\n`;
            
            if (error) {
                console.log('⚠️ Portfolio script error:', error.message);
                report += `<b>💰 PORTFOLIO</b>\n`;
                report += `❌ Data unavailable\n`;
                report += `Error: ${error.message.substring(0, 100)}\n\n`;
            } else {
                try {
                    const lines = stdout.split('\n');
                    let botCount = 0;
                    let totalValue = '';
                    let nextEarnings = '';
                    
                    // Parse output
                    for (const line of lines) {
                        if (line.includes('🤖 BOT')) {
                            botCount++;
                        }
                        if (line.includes('Valor Total Cartera:')) {
                            totalValue = line.split(':')[1]?.trim() || '';
                        }
                        if (line.includes('Next Round Earnings:')) {
                            nextEarnings = line.split(':')[1]?.trim() || '';
                        }
                    }
                    
                    report += `<b>💰 PORTFOLIO</b>\n`;
                    if (botCount > 0) {
                        report += `🤖 Active Bots: ${botCount}\n`;
                        if (totalValue) report += `💼 Value: ${totalValue}\n`;
                        if (nextEarnings) report += `💸 Next: ${nextEarnings}\n`;
                        report += `✅ Systems operational!\n\n`;
                    } else {
                        report += `⚠️ No active bots\n\n`;
                    }
                } catch (parseError) {
                    console.log('⚠️ Parse error:', parseError.message);
                    report += `<b>💰 PORTFOLIO</b>\n`;
                    report += `⚠️ Data parsing failed\n\n`;
                }
            }
            
            // System info
            report += `<b>🖥️ SYSTEM</b>\n`;
            report += `🔧 Node: ${process.version}\n`;
            report += `⏱️ Uptime: ${Math.floor(process.uptime() / 3600)}h\n`;
            report += `📱 Bot: Active\n\n`;
            
            report += `<i>📡 Auto-report from TaskMaster</i>`;
            
            console.log('📝 Report generated, length:', report.length);
            resolve(report);
        });
    });
}

async function sendReport() {
    try {
        const message = await generateSimpleReport();
        await sendTelegramMessage(message);
        console.log('✅ Report sent successfully!');
        return true;
    } catch (error) {
        console.error('❌ Failed to send report:', error.message);
        return false;
    }
}

// Main execution
if (process.argv.includes('--test')) {
    console.log('🧪 Test mode...');
    sendTelegramMessage('🧪 <b>TEST</b>\n\n✅ Simple reporter working!\n⏰ ' + new Date().toLocaleString())
        .then(() => console.log('✅ Test completed'))
        .catch(err => console.error('❌ Test failed:', err.message));
} else {
    console.log('📊 Full report mode...');
    sendReport()
        .then(() => console.log('🏁 Done'))
        .catch(err => console.error('❌ Failed:', err.message));
}
