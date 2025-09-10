require('dotenv').config({ path: './backend/.env' });

async function testMessage() {
    const message = `📊 TASKMASTER REPORT\n⏰ ${new Date().toLocaleString()}\n\n💰 PORTFOLIO: All systems operational\n🖥️ SYSTEM: Running normally\n\n📡 Automated report`;
    
    console.log('Generated message:');
    console.log('='.repeat(50));
    console.log(message);
    console.log('='.repeat(50));
    console.log('Message length:', message.length);
    console.log('Is empty?', message.trim().length === 0);
    
    return message;
}

testMessage();
