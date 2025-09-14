// Debug Message Monitor - Watches for Telegram debug messages and displays them
const fs = require('fs');
const path = require('path');

const DEBUG_FILE = './logs/telegram-debug.log';
let lastSize = 0;

console.log('🔧 TaskMaster Debug Monitor Started');
console.log('====================================');
console.log('📱 Monitoring Telegram debug messages...');
console.log('💬 Send "/debug <message>" from Telegram to see messages here');
console.log('');

function checkForNewMessages() {
    if (!fs.existsSync(DEBUG_FILE)) {
        return;
    }
    
    const stats = fs.statSync(DEBUG_FILE);
    const currentSize = stats.size;
    
    if (currentSize > lastSize) {
        // File has grown, read new content
        const content = fs.readFileSync(DEBUG_FILE, 'utf8');
        const lines = content.split('\n');
        
        // Find new lines since last check
        const newLines = lines.filter(line => {
            if (!line.trim()) return false;
            try {
                const timestamp = line.match(/\[(.*?)\]/)?.[1];
                if (timestamp) {
                    const messageTime = new Date(timestamp).getTime();
                    const checkTime = Date.now() - 5000; // Last 5 seconds
                    return messageTime > checkTime;
                }
            } catch (error) {
                return false;
            }
            return false;
        });
        
        newLines.forEach(line => {
            if (line.includes('TELEGRAM_DEBUG:')) {
                const timestamp = line.match(/\[(.*?)\]/)?.[1];
                const message = line.split('TELEGRAM_DEBUG:')[1]?.trim();
                
                console.log('\n📱 TELEGRAM DEBUG MESSAGE:');
                console.log('==========================');
                console.log(`⏰ Time: ${new Date(timestamp).toLocaleString()}`);
                console.log(`💬 Message: ${message}`);
                console.log('📝 Response: Type your response below...');
                console.log('');
                
                // Optional: Beep to get attention
                process.stdout.write('\x07');
            }
        });
        
        lastSize = currentSize;
    }
}

// Check every 2 seconds for new messages
setInterval(checkForNewMessages, 2000);

// Initial setup
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}

if (!fs.existsSync(DEBUG_FILE)) {
    fs.writeFileSync(DEBUG_FILE, '');
}

lastSize = fs.existsSync(DEBUG_FILE) ? fs.statSync(DEBUG_FILE).size : 0;

console.log('✅ Monitor ready! Telegram debug messages will appear here.');
console.log('');

// Keep process alive
process.stdin.resume();
