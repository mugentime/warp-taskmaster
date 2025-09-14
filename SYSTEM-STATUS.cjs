#!/usr/bin/env node
// SYSTEM STATUS - Quick check for new Warp AI instances

console.log('\n🤖 TASKMASTER SYSTEM STATUS CHECK');
console.log('═══════════════════════════════════════\n');

console.log('🎯 WHAT THIS APP IS:');
console.log('   Unified Arbitrage Portfolio Management System');
console.log('   NOT individual trading bots - ONE master engine\n');

const { exec } = require('child_process');

// Quick checks
console.log('📊 Quick System Checks:\n');

// Check TaskMaster
exec('node backend/scripts/start-master-engine.js status', (error, stdout) => {
    console.log('🚀 TaskMaster Engine:');
    if (error) {
        console.log('   ❌ Not running or error checking');
    } else {
        console.log('   ✅ ' + stdout.split('\n')[0]);
    }
    console.log('');
    
    // Check PM2
    exec('pm2 status', (error, stdout) => {
        console.log('📱 PM2 Services:');
        if (error) {
            console.log('   ❌ PM2 not available or no services');
        } else {
            const lines = stdout.split('\n');
            const onlineCount = (stdout.match(/online/g) || []).length;
            console.log(`   ✅ ${onlineCount} services online`);
        }
        console.log('');
        
        // Final info
        console.log('📖 DOCUMENTATION:');
        console.log('   • README-WARP-AI.md - Complete system guide');
        console.log('   • PROJECT-STRUCTURE.md - File/folder explanations');
        console.log('');
        console.log('🔧 USEFUL COMMANDS:');
        console.log('   • node backend/quick-position-check.js');  
        console.log('   • node backend/check-real-balance.js');
        console.log('   • node backend/find-best-opportunities.js');
        console.log('');
        console.log('✅ System status check complete!');
    });
});
