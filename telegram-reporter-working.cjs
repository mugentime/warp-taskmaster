require('dotenv').config({ path: './backend/.env' });
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class TelegramReporter {
    constructor() {
        this.token = process.env.TELEGRAM_BOT_TOKEN;
        this.chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!this.token || !this.chatId) {
            throw new Error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
        }
        
        console.log('✅ Telegram credentials loaded');
    }
    
    sendMessage(text) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                chat_id: this.chatId,
                text: text,
                parse_mode: 'HTML'
            });

            const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${this.token}/sendMessage`,
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
    
    getPortfolioStatus() {
        return new Promise((resolve) => {
            exec('node backend/full-portfolio-valuation.js', { encoding: 'utf8' }, (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        error: error.message,
                        hasData: false
                    });
                    return;
                }

                try {
                    const lines = stdout.split('\n');
                    let activeBots = 0;
                    let totalValue = '';
                    let nextEarnings = '';
                    let fundingRates = [];
                    let botNames = [];

                    for (const line of lines) {
                        if (line.includes('Total Active Bots:')) {
                            activeBots = parseInt(line.split(':')[1]?.trim()) || 0;
                        }
                        if (line.includes('Valor Total Cartera:')) {
                            totalValue = line.split(':')[1]?.trim() || '';
                        }
                        if (line.includes('Next Round Earnings:')) {
                            nextEarnings = line.split(':')[1]?.trim() || '';
                        }
                        if (line.includes('🤖 BOT')) {
                            const botName = line.split(':')[1]?.trim();
                            if (botName) botNames.push(botName);
                        }
                        if (line.includes('Funding Rate:')) {
                            const rateMatch = line.match(/([-]?\d+\.\d+)%/);
                            if (rateMatch) {
                                fundingRates.push(parseFloat(rateMatch[1]));
                            }
                        }
                    }

                    resolve({
                        hasData: true,
                        activeBots: Math.max(activeBots, botNames.length),
                        totalValue,
                        nextEarnings,
                        fundingRates,
                        botNames,
                        rawOutput: lines.slice(0, 10) // First 10 lines for debugging
                    });
                } catch (parseError) {
                    resolve({
                        error: parseError.message,
                        hasData: false,
                        rawOutput: stdout.split('\n').slice(0, 10)
                    });
                }
            });
        });
    }
    
    getSystemStatus() {
        return new Promise((resolve) => {
            // Check if main processes are running
            const checks = {
                timestamp: new Date().toISOString(),
                uptime: Math.floor(process.uptime()),
                nodeVersion: process.version,
                platform: process.platform
            };
            
            // Check if backend server is accessible
            exec('netstat -an | findstr :3001', (error, stdout) => {
                checks.backendPort = stdout ? '✅ Port 3001 active' : '❌ Port 3001 not active';
                resolve(checks);
            });
        });
    }
    
    async generateReport() {
        console.log('📊 Generating Telegram report...');
        
        const [portfolioData, systemStatus] = await Promise.all([
            this.getPortfolioStatus(),
            this.getSystemStatus()
        ]);
        
        let message = `<b>📊 TASKMASTER TRADING REPORT</b>\n`;
        message += `⏰ ${new Date().toLocaleString()}\n\n`;
        
        // Portfolio Status
        message += `<b>💰 PORTFOLIO STATUS</b>\n`;
        if (portfolioData.hasData) {
            if (portfolioData.activeBots > 0) {
                message += `🤖 Active Bots: ${portfolioData.activeBots}\n`;
                if (portfolioData.totalValue) {
                    message += `💼 Total Value: ${portfolioData.totalValue}\n`;
                }
                if (portfolioData.nextEarnings) {
                    message += `💸 Next Earnings: ${portfolioData.nextEarnings}\n`;
                }
                if (portfolioData.fundingRates.length > 0) {
                    const avgRate = portfolioData.fundingRates.reduce((a, b) => a + b, 0) / portfolioData.fundingRates.length;
                    message += `📈 Avg Funding Rate: ${avgRate.toFixed(4)}%\n`;
                }
                message += `✅ All systems operational!\n`;
            } else {
                message += `❌ No active bots detected\n`;
                message += `⚠️ Check portfolio system\n`;
            }
        } else {
            message += `❌ Portfolio data unavailable\n`;
            message += `Error: ${portfolioData.error || 'Unknown'}\n`;
        }
        
        message += `\n`;
        
        // System Status
        message += `<b>🖥️ SYSTEM STATUS</b>\n`;
        message += `⏱️ Uptime: ${Math.floor(systemStatus.uptime / 3600)}h ${Math.floor((systemStatus.uptime % 3600) / 60)}m\n`;
        message += `🔧 Node.js: ${systemStatus.nodeVersion}\n`;
        message += `💻 Platform: ${systemStatus.platform}\n`;
        message += `🌐 Backend: ${systemStatus.backendPort}\n`;
        
        message += `\n`;
        
        // Additional Info
        message += `<b>🔄 AUTOMATION STATUS</b>\n`;
        message += `📱 Telegram Bot: ✅ Active\n`;
        message += `📊 Reports: Every 10 minutes\n`;
        message += `🤖 Commands: /portfolio, /roi, /status\n`;
        
        message += `\n<i>📡 Automated report from TaskMaster</i>`;
        
        return message;
    }
    
    async sendReport() {
        try {
            console.log('🚀 Generating and sending Telegram report...');
            
            const message = await this.generateReport();
            const result = await this.sendMessage(message);
            
            console.log('✅ Report sent successfully!');
            console.log(`Message ID: ${result.message_id}`);
            
            // Log the report
            const logMessage = `[${new Date().toISOString()}] [JOB] Enhanced report sent successfully\n`;
            const logDir = path.join(__dirname, '.logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            fs.appendFileSync(path.join(logDir, 'telegram-reports.log'), logMessage);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to send report:', error.message);
            
            // Log the error
            const logMessage = `[${new Date().toISOString()}] [ERROR] Report failed: ${error.message}\n`;
            const logDir = path.join(__dirname, '.logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            fs.appendFileSync(path.join(logDir, 'telegram-reports.log'), logMessage);
            
            return false;
        }
    }
    
    async testConnection() {
        try {
            const testMessage = `🧪 <b>TEST MESSAGE</b>\n\n✅ Telegram connection working!\n⏰ ${new Date().toLocaleString()}\n\n🤖 TaskMaster reporting system is active`;
            const result = await this.sendMessage(testMessage);
            console.log('✅ Test message sent successfully!');
            return true;
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            return false;
        }
    }
}

// CLI execution
async function main() {
    try {
        console.log('🔄 Starting TaskMaster Telegram Reporter...');
        
        const reporter = new TelegramReporter();
        
        if (process.argv.includes('--test')) {
            console.log('🧪 Running connection test...');
            await reporter.testConnection();
        } else {
            console.log('📊 Sending full report...');
            await reporter.sendReport();
        }
        
        console.log('🏁 Reporter execution completed');
    } catch (error) {
        console.error('❌ Reporter failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = TelegramReporter;
