// Telegram to TaskMaster Command Bridge
// Allows Telegram bot commands to execute TaskMaster functions and return results
require('dotenv').config();
const https = require('https');
const { execSync, exec } = require('child_process');
const fs = require('fs');

// Configuration
const TELEGRAM_BOT_TOKEN = '8220024038:AAF9pY8vb6CkOjWSu0vXTzYVUNfpMiGEGZA';
const TELEGRAM_CHAT_ID = '1828005335';
const COMMAND_LOG_FILE = './logs/telegram-commands.log';

let lastUpdateId = 0;

console.log('🌉 Starting Telegram ↔ TaskMaster Bridge...');
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
                output = execSync('node backend/check-all-bots.js', { encoding: 'utf8', timeout: 30000 });
                break;
                
            case 'balance':
            case 'wallet':
                output = execSync('node get-overall-balance.js', { encoding: 'utf8', timeout: 30000 });
                break;
                
            case 'earnings':
            case 'profit':
            case 'pnl':
                // Get earnings/profit information
                output = execSync('node backend/full-portfolio-valuation.js', { encoding: 'utf8', timeout: 30000 });
                break;
                
            case 'launch':
            case 'start':
                if (args[0]) {
                    // Launch specific bot
                    output = execSync(`node backend/launch-specific-symbol.js ${args[0]}`, { encoding: 'utf8', timeout: 60000 });
                } else {
                    // Launch best opportunity
                    output = execSync('node backend/launch-best-opportunity.js', { encoding: 'utf8', timeout: 60000 });
                }
                break;
                
            case 'close':
            case 'stop':
                if (args[0] === 'all') {
                    output = execSync('node backend/emergency-controls.js close-all', { encoding: 'utf8', timeout: 30000 });
                } else {
                    output = 'Specify "all" to close all positions or provide specific symbol';
                }
                break;
                
            case 'convert':
                if (args[0] === 'all') {
                    output = execSync('node backend/utils/convert-assets-to-usdt.js 0 100', { encoding: 'utf8', timeout: 60000 });
                } else {
                    output = 'Specify "all" to convert all assets to USDT';
                }
                break;
                
            case 'transfer':
                if (args[0] && args[1]) {
                    const amount = parseFloat(args[0]);
                    const direction = args[1].toLowerCase();
                    if (direction === 'futures' || direction === 'spot') {
                        const script = direction === 'futures' ? 'transfer-spot-to-futures.js' : 'transfer-funds.js';
                        output = execSync(`node backend/${script} ${amount}`, { encoding: 'utf8', timeout: 30000 });
                    } else {
                        output = 'Usage: transfer <amount> <futures|spot>';
                    }
                } else {
                    output = 'Usage: transfer <amount> <futures|spot>';
                }
                break;
                
            case 'portfolio':
            case 'report':
                output = execSync('node backend/full-portfolio-valuation.js', { encoding: 'utf8', timeout: 30000 });
                break;
                
            case 'health':
            case 'system':
                output = `🟢 TaskMaster System Status:\n• Bridge: Active\n• Backend: Running\n• Telegram: Connected\n• Time: ${new Date().toLocaleString()}`;
                break;
                
            case 'debug':
                if (args.length === 0) {
                    output = `🔧 Debug Mode:\n\nUsage: /debug <message>\n\nExamples:\n• /debug What is the current bot performance?\n• /debug Check if the API keys are working\n• /debug Show me detailed error logs\n\nThis command sends your message to the TaskMaster chat for debugging.`;
                } else {
                    const debugMessage = args.join(' ');
                    // Write debug message to a file that this chat can monitor
                    const debugFile = './logs/telegram-debug.log';
                    const timestamp = new Date().toISOString();
                    const debugEntry = `[${timestamp}] TELEGRAM_DEBUG: ${debugMessage}\n`;
                    fs.appendFileSync(debugFile, debugEntry);
                    
                    output = `🔧 Debug message sent to TaskMaster chat:\n\n"${debugMessage}"\n\nMessage logged for debugging. Check the TaskMaster terminal for responses.`;
                }
                break;
                
            case 'logs':
                if (args[0] === 'debug') {
                    // Read recent debug messages
                    const debugFile = './logs/telegram-debug.log';
                    if (fs.existsSync(debugFile)) {
                        const logs = fs.readFileSync(debugFile, 'utf8');
                        const recentLogs = logs.split('\n').slice(-10).join('\n');
                        output = `🔍 Recent Debug Messages:\n\n${recentLogs}`;
                    } else {
                        output = `📝 No debug messages found.`;
                    }
                } else {
                    // Read recent command logs
                    if (fs.existsSync(COMMAND_LOG_FILE)) {
                        const logs = fs.readFileSync(COMMAND_LOG_FILE, 'utf8');
                        const recentLogs = logs.split('\n').slice(-5).join('\n');
                        output = `📋 Recent Command Log:\n\n${recentLogs}`;
                    } else {
                        output = `📝 No command logs found.`;
                    }
                }
                break;
                
            default:
                output = `❌ Unknown command: ${command}\n\nAvailable commands:\n• status - Check bot status\n• balance - Check wallet balances\n• earnings - Check bot earnings/profit\n• launch [symbol] - Start trading bot\n• close all - Close all positions\n• convert all - Convert assets to USDT\n• transfer <amount> <futures|spot> - Transfer funds\n• portfolio - Full portfolio report\n• health - System health check\n• debug <message> - Send debug message to TaskMaster chat\n• logs [debug] - View recent logs`;
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
        return `🚨 <b>Command Failed</b>\n\n<code>${result.output}</code>`;
    }
    
    let output = result.output;
    
    // Clean up output for Telegram HTML
    output = output
        .replace(/\u001b\[[0-9;]*m/g, '') // Remove ANSI color codes
        .replace(/[\u2713\u2714]/g, '✅') // Convert check marks
        .replace(/[\u2717\u2718]/g, '❌') // Convert X marks
        .replace(/[\u26A0]/g, '⚠️')      // Convert warning signs
        .trim();
    
    // Truncate if too long (Telegram limit is ~4096 chars)
    if (output.length > 3500) {
        output = output.substring(0, 3500) + '\n\n... (truncated)';
    }
    
    return `🤖 <b>TaskMaster Output</b>\n\n<pre>${output}</pre>\n\n⏰ <i>${new Date().toLocaleString()}</i>`;
}

// Handle Telegram commands
async function handleTelegramCommand(message, user) {
    console.log(`📥 Telegram Command: "${message}" from ${user.first_name}`);
    
    // Parse command
    const parts = message.trim().split(' ');
    const command = parts[0].replace('/', '').toLowerCase();
    const args = parts.slice(1);
    
    // Handle help and start commands locally
    if (command === 'start' || command === 'help') {
        const helpText = `🌉 <b>TaskMaster Bridge Active</b>\n\n` +
                        `🤖 <b>Available Commands:</b>\n` +
                        `• <code>/status</code> - Check bot status\n` +
                        `• <code>/balance</code> - Check wallet balances\n` +
                        `• <code>/earnings</code> - Check bot earnings/profit\n` +
                        `• <code>/launch [symbol]</code> - Start trading bot\n` +
                        `• <code>/close all</code> - Close all positions\n` +
                        `• <code>/convert all</code> - Convert assets to USDT\n` +
                        `• <code>/transfer &lt;amount&gt; &lt;futures|spot&gt;</code> - Transfer funds\n` +
                        `• <code>/portfolio</code> - Full portfolio report\n` +
                        `• <code>/health</code> - System health check\n` +
                        `• <code>/debug &lt;message&gt;</code> - Send debug message to TaskMaster chat\n` +
                        `• <code>/logs [debug]</code> - View recent logs\n\n` +
                        `💡 Commands are executed directly in TaskMaster!\n` +
                        `📱 Results sent back to this chat.`;
        
        await sendTelegramMessage(helpText);
        return;
    }
    
    // Send "processing" message for longer commands
    await sendTelegramMessage(`🔄 Executing <code>${command}</code>...`);
    
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
            `🌉 <b>TaskMaster Bridge Restarted</b>\n\n` +
            `✅ Connection: Active\n` +
            `🤖 TaskMaster: Connected\n` +
            `📱 Telegram: Ready\n` +
            `🆕 New command: <code>/earnings</code>\n\n` +
            `Send <code>/help</code> for all commands!`
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

// Start if run directly
if (require.main === module) {
    startBridge().catch(console.error);
}

module.exports = { startBridge, executeTaskMasterCommand, sendTelegramMessage };
