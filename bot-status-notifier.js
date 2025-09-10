// Periodic Bot Status Telegram Notifier - Sends updates every 15 minutes
require('dotenv').config();
const axios = require('axios');
const { execSync } = require('child_process');

// Telegram config from .env
const TELEGRAM_BOT_TOKEN = '8220024038:AAF9pY8vb6CkOjWSu0vXTzYVUNfpMiGEGZA';
const TELEGRAM_CHAT_ID = '1828005335';
const INTERVAL_MINUTES = 15;

async function sendTelegramMessage(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        
        console.log(`✅ [${new Date().toLocaleTimeString()}] Telegram notification sent`);
        return true;
    } catch (error) {
        console.error(`❌ [${new Date().toLocaleTimeString()}] Telegram notification failed:`, error.message);
        return false;
    }
}

async function getBotStatus() {
    try {
        // Get bot status using existing script
        const botStatus = execSync('node backend/check-all-bots.js', { encoding: 'utf8', timeout: 30000 });
        
        // Parse the output to extract key information
        const lines = botStatus.split('\n');
        let activeBots = 0;
        let totalPnL = 'N/A';
        let totalNotional = '$0';
        let nextEarnings = '$0';
        let portfolioHealth = 'Unknown';
        let botDetails = [];
        
        // Extract summary data
        for (const line of lines) {
            if (line.includes('Total Active Bots:')) {
                activeBots = parseInt(line.split(':')[1].trim()) || 0;
            }
            if (line.includes('Total P&L:')) {
                totalPnL = line.split(':')[1].trim();
            }
            if (line.includes('Total Notional:')) {
                totalNotional = line.split(':')[1].trim();
            }
            if (line.includes('Next Round Earnings:')) {
                nextEarnings = line.split(':')[1].trim();
            }
            if (line.includes('Portfolio Health:')) {
                portfolioHealth = line.split(':')[1].trim();
            }
        }
        
        // Extract individual bot details
        let currentBot = {};
        let inBotSection = false;
        
        for (const line of lines) {
            if (line.includes('🤖 BOT')) {
                if (Object.keys(currentBot).length > 0) {
                    botDetails.push(currentBot);
                }
                currentBot = {
                    name: line.split(':')[1]?.trim() || 'Unknown Bot'
                };
                inBotSection = true;
            } else if (inBotSection && line.includes('💰 Funding Rate:')) {
                currentBot.fundingRate = line.split(':')[1]?.trim();
            } else if (inBotSection && line.includes('💵 Notional Value:')) {
                currentBot.notional = line.split(':')[1]?.trim();
            } else if (inBotSection && line.includes('💸 Expected Earning:')) {
                currentBot.expectedEarning = line.split(':')[1]?.trim();
            } else if (inBotSection && line.includes('⏰ Next Funding:')) {
                currentBot.nextFunding = line.split(':')[1]?.trim();
            } else if (line.includes('📋 SUMMARY:')) {
                if (Object.keys(currentBot).length > 0) {
                    botDetails.push(currentBot);
                }
                inBotSection = false;
            }
        }
        
        return {
            activeBots,
            totalPnL,
            totalNotional,
            nextEarnings,
            portfolioHealth,
            botDetails,
            timestamp: new Date()
        };
        
    } catch (error) {
        console.error('Failed to get bot status:', error.message);
        return {
            error: error.message,
            timestamp: new Date()
        };
    }
}

function formatStatusMessage(status) {
    if (status.error) {
        return `🚨 <b>BOT STATUS UPDATE - ERROR</b>\n\n` +
               `❌ Failed to get status: ${status.error}\n\n` +
               `⏰ <i>${status.timestamp.toLocaleString()}</i>`;
    }
    
    let message = `🤖 <b>BOT STATUS UPDATE</b>\n\n`;
    
    // Summary
    message += `📊 <b>SUMMARY:</b>\n`;
    message += `🤖 Active Bots: <b>${status.activeBots}</b>\n`;
    message += `💰 Total P&L: <b>${status.totalPnL}</b>\n`;
    message += `💵 Total Notional: <b>${status.totalNotional}</b>\n`;
    message += `💸 Next Earnings: <b>${status.nextEarnings}</b>\n`;
    message += `🏥 Health: <b>${status.portfolioHealth}</b>\n\n`;
    
    // Individual bot details
    if (status.botDetails && status.botDetails.length > 0) {
        message += `🔍 <b>BOT DETAILS:</b>\n`;
        status.botDetails.forEach((bot, idx) => {
            message += `\n<b>${idx + 1}. ${bot.name}</b>\n`;
            if (bot.fundingRate) message += `   📈 Rate: ${bot.fundingRate}\n`;
            if (bot.notional) message += `   💵 Value: ${bot.notional}\n`;
            if (bot.expectedEarning) message += `   💸 Earning: ${bot.expectedEarning}\n`;
            if (bot.nextFunding) message += `   ⏰ Next: ${bot.nextFunding}\n`;
        });
    } else {
        message += `⚠️ <b>No active bots detected</b>\n`;
    }
    
    message += `\n⏰ <i>${status.timestamp.toLocaleString()}</i>`;
    
    return message;
}

async function sendStatusUpdate() {
    console.log(`🔄 [${new Date().toLocaleTimeString()}] Getting bot status...`);
    
    const status = await getBotStatus();
    const message = formatStatusMessage(status);
    
    console.log(`📱 [${new Date().toLocaleTimeString()}] Sending Telegram update...`);
    await sendTelegramMessage(message);
}

// Main execution
async function startPeriodicNotifications() {
    console.log(`🚀 Starting periodic bot status notifications every ${INTERVAL_MINUTES} minutes...`);
    console.log(`📱 Sending to Telegram chat ID: ${TELEGRAM_CHAT_ID}`);
    
    // Send initial notification
    await sendStatusUpdate();
    
    // Set up periodic notifications
    setInterval(async () => {
        await sendStatusUpdate();
    }, INTERVAL_MINUTES * 60 * 1000);
    
    console.log(`✅ Periodic notifications started. Next update in ${INTERVAL_MINUTES} minutes.`);
}

// Start if run directly
if (require.main === module) {
    startPeriodicNotifications().catch(console.error);
}

module.exports = { startPeriodicNotifications, sendStatusUpdate };
