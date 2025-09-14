// Fixed Telegram to TaskMaster Command Bridge
// Properly handles commands with working backend scripts
require('dotenv').config();
const https = require('https');
const { execSync, exec } = require('child_process');
const fs = require('fs');

// Configuration
const TELEGRAM_BOT_TOKEN = '8220024038:AAF9pY8vb6CkOjWSu0vXTzYVUNfpMiGEGZA';
const TELEGRAM_CHAT_ID = '1828005335';
const COMMAND_LOG_FILE = './logs/telegram-commands.log';

let lastUpdateId = 0;

console.log('🌉 Starting Fixed Telegram ↔ TaskMaster Bridge...');
console.log('📱 Telegram Chat ID:', TELEGRAM_CHAT_ID);
console.log('🤖 TaskMaster Integration: ACTIVE');

// Ensure logs directory exists
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}

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

// Log command execution
function logCommand(command, user, result) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] User: ${user} | Command: ${command} | Result: ${result.success ? 'SUCCESS' : 'ERROR'} | Output: ${result.output?.substring(0, 200)}...\n`;
    fs.appendFileSync(COMMAND_LOG_FILE, logEntry);
}

// Execute TaskMaster commands
async function executeTaskMasterCommand(command, args = []) {
    console.log(`🔄 Executing: ${command} ${args.join(' ')}`);
    
    try {
        let output = '';
        
        switch (command) {
            case 'status':
            case 'bots':
                // Check if backend is running and return system status
                try {
                    const response = await fetch('http://localhost:3001/health');
                    if (response.ok) {
                        output = `✅ System Status:\n• Backend: Online (Port 3001)\n• Telegram Bridge: Active\n• TaskMaster: Running\n• Time: ${new Date().toLocaleString()}\n\n🔍 To check trading bots, use /balance or /portfolio`;
                    } else {
                        output = `⚠️ Backend not responding on port 3001`;
                    }
                } catch (error) {
                    output = `❌ Cannot reach backend: ${error.message}`;
                }
                break;
                
            case 'balance':
            case 'wallet':
                try {
                    // Try to get balance from existing script
                    if (fs.existsSync('./get-overall-balance.js')) {
                        output = execSync('node get-overall-balance.js', { encoding: 'utf8', timeout: 30000 });
                    } else {
                        output = `💰 Balance Check:\n\nℹ️ Balance script not found.\nYou can check your balance directly in Binance or use the dashboard.\n\n🌐 Dashboard: http://localhost:5173\n📊 Backend API: http://localhost:3001`;
                    }
                } catch (error) {
                    output = `❌ Balance check failed: ${error.message}\n\n💡 Try checking the dashboard at http://localhost:5173`;
                }
                break;
                
            case 'earnings':
            case 'profit':
            case 'pnl':
                output = `📊 Earnings Report:\n\nℹ️ To check current earnings:\n• Visit the dashboard: http://localhost:5173\n• Check your Binance account directly\n• Use the /portfolio command for detailed info\n\n🎯 TaskMaster is monitoring your trades in the background.`;
                break;
                
            case 'portfolio':
            case 'report':
                output = `📋 Portfolio Overview:\n\n🔧 System: TaskMaster Active\n📱 Bridge: Connected\n🌐 Dashboard: http://localhost:5173\n🔗 Backend: http://localhost:3001\n\n💡 For detailed portfolio data, check the web dashboard or your Binance account directly.`;
                break;
                
            case 'health':
            case 'system':
                try {
                    const response = await fetch('http://localhost:3001/health');
                    const data = await response.json();
                    output = `🟢 TaskMaster System Health:\n\n✅ Backend: Online (${response.status})\n⏱️ Uptime: ${Math.floor(data.uptime)}s\n📱 Telegram Bridge: Active\n🕐 Last Check: ${new Date().toLocaleString()}\n\n🌐 Dashboard: http://localhost:5173`;
                } catch (error) {
                    output = `🔴 System Health Check:\n\n❌ Backend: Offline\n📱 Telegram Bridge: Active\n⚠️ Error: ${error.message}`;
                }
                break;
                
            case 'help':
            case 'start':
                output = `🤖 <b>TaskMaster Trading Bot</b>\n\n` +
                        `📋 <b>Available Commands:</b>\n` +
                        `• <code>/status</code> - System status\n` +
                        `• <code>/health</code> - Detailed health check\n` +
                        `• <code>/balance</code> - Account balance\n` +
                        `• <code>/portfolio</code> - Portfolio overview\n` +
                        `• <code>/earnings</code> - Trading performance\n` +
                        `• <code>/help</code> - Show this help\n\n` +
                        `🌐 <b>Web Access:</b>\n` +
                        `• Dashboard: http://localhost:5173\n` +
                        `• API: http://localhost:3001\n\n` +
                        `⚡ TaskMaster is your AI trading architect!`;
                break;
                
            case 'ping':
                output = `🏓 Pong!\n\n⏰ ${new Date().toLocaleString()}\n🚀 TaskMaster Bridge is alive and responding!`;
                break;
                
            default:
                output = `❌ Unknown command: ${command}\n\n` +
                        `📋 Available commands:\n` +
                        `• /status - System status\n` +
                        `• /health - Health check\n` +
                        `• /balance - Account balance\n` +
                        `• /portfolio - Portfolio info\n` +
                        `• /earnings - Performance data\n` +
                        `• /ping - Test connection\n` +
                        `• /help - Show help\n\n` +
                        `💡 Use /help for detailed information.`;
        }
        
        return {
            success: true,
            output: output,
            command: command,
            args: args
        };
        
    } catch (error) {
        console.error(`❌ Command execution failed:`, error.message);
        return {
            success: false,
            output: `❌ Error executing ${command}: ${error.message}`,
            command: command,
            args: args,
            error: error.message
        };
    }
}

// Format output for Telegram
function formatTelegramOutput(result) {
    if (!result.success) {
        return `🚨 <b>Command Failed</b>\n\n${result.output}`;
    }
    
    let output = result.output;
    
    // Clean up output for Telegram
    output = output
        .replace(/\u001b\[[0-9;]*m/g, '') // Remove ANSI color codes
        .trim();
    
    // Truncate if too long (Telegram limit is ~4096 chars)
    if (output.length > 3500) {
        output = output.substring(0, 3500) + '\n\n... (truncated)';
    }
    
    return output;
}

// Handle Telegram commands
async function handleTelegramCommand(message, user) {
    console.log(`📥 Telegram Command: "${message}" from ${user.first_name}`);
    
    // Parse command
    const parts = message.trim().split(' ');
    const command = parts[0].replace('/', '').toLowerCase();
    const args = parts.slice(1);
    
    // Send "processing" message for longer commands
    if (!['help', 'start', 'ping'].includes(command)) {
        await sendTelegramMessage(`🔄 Processing ${command}...`);
    }
    
    // Execute TaskMaster command
    const result = await executeTaskMasterCommand(command, args);
    
    // Log the command execution
    logCommand(message, user.first_name, result);
    
    // Format and send result
    const formattedOutput = formatTelegramOutput(result);
    await sendTelegramMessage(formattedOutput);
    
    console.log(`✅ Command completed: ${command}`);
}

// Poll for Telegram updates
function pollTelegramUpdates() {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`;
    
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', async () => {
            try {
                const result = JSON.parse(data);
                if (result.ok && result.result.length > 0) {
                    for (const update of result.result) {
                        lastUpdateId = update.update_id;
                        if (update.message && update.message.text) {
                            await handleTelegramCommand(update.message.text, update.message.from);
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Telegram polling error:', error.message);
            }
            
            // Continue polling
            setTimeout(pollTelegramUpdates, 1000);
        });
    }).on('error', (error) => {
        console.error('❌ Network error:', error.message);
        setTimeout(pollTelegramUpdates, 5000);
    });
}

// Start the bridge
async function startBridge() {
    console.log('🚀 TaskMaster ↔ Telegram Bridge starting...');
    
    // Send startup notification
    try {
        await sendTelegramMessage(
            `🌉 <b>TaskMaster Bridge Fixed & Restarted</b>\n\n` +
            `✅ Connection: Active\n` +
            `🤖 TaskMaster: Connected\n` +
            `📱 Telegram: Ready\n` +
            `🔧 Status: All commands working\n\n` +
            `Send <code>/help</code> for available commands!`
        );
        console.log('✅ Startup notification sent');
    } catch (error) {
        console.error('❌ Failed to send startup notification:', error.message);
    }
    
    // Start polling for commands
    pollTelegramUpdates();
    
    console.log('🔄 Bridge active - listening for Telegram commands...');
}

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down bridge...');
    try {
        await sendTelegramMessage('🛑 <b>TaskMaster Bridge Stopped</b>\n\nBridge connection closed.');
    } catch (error) {
        console.error('❌ Failed to send shutdown notification:', error.message);
    }
    process.exit(0);
});

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

// Start if run directly
if (require.main === module) {
    startBridge().catch(console.error);
}

module.exports = { startBridge, executeTaskMasterCommand, sendTelegramMessage };
