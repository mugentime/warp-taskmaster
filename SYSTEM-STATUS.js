#!/usr/bin/env node
// SYSTEM STATUS - Quick check for new Warp AI instances

console.log('\n🤖 TASKMASTER SYSTEM STATUS CHECK');
console.log('═══════════════════════════════════════\n');

import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runCommand(command, description) {
    return new Promise((resolve) => {
        console.log(`📊 ${description}:`);
        exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                console.log(`   ❌ ${error.message.split('\n')[0]}`);
            } else {
                console.log(`   ✅ ${stdout.trim().split('\n')[0]}`);
            }
            console.log('');
            resolve();
        });
    });
}

async function systemCheck() {
    console.log('🎯 WHAT THIS APP IS:');
    console.log('   Unified Arbitrage Portfolio Management System');
    console.log('   NOT individual trading bots - ONE master engine\n');
    
    // Check TaskMaster Engine
    await runCommand('node backend/scripts/start-master-engine.js status', 'TaskMaster Engine Status');
    
    // Check PM2 Services
    await runCommand('pm2 status', 'PM2 Services Status');
    
    // Check Portfolio
    console.log('💰 Portfolio Status:');
    exec('node backend/check-real-balance.js', { cwd: __dirname }, (error, stdout) => {
        if (!error) {
            const lines = stdout.split('\n');
            const totalLine = lines.find(l => l.includes('Total Portfolio Value:'));
            const utilizationLine = lines.find(l => l.includes('Real Available:'));
            
            if (totalLine) console.log(`   💵 ${totalLine.trim()}`);
            if (utilizationLine) console.log(`   📊 ${utilizationLine.trim()}`);
        }
        console.log('');
        
        // Check Positions
        console.log('🎯 Active Positions:');
        exec('node backend/quick-position-check.js', { cwd: __dirname }, (error, stdout) => {
            if (!error) {
                const lines = stdout.split('\n');
                const positionsLine = lines.find(l => l.includes('Active positions:'));
                if (positionsLine) console.log(`   📈 ${positionsLine.trim()}`);
                
                const positionLines = lines.filter(l => l.includes('USDT:'));
                positionLines.slice(0, 3).forEach(line => {
                    console.log(`   • ${line.trim()}`);
                });
            }
            
            console.log('\n📱 Telegram Reports: Every 10 minutes');
            console.log('🔄 Rebalancing: Every 5 minutes');
            console.log('\n✅ System overview complete!');
            console.log('📖 Read README-WARP-AI.md for full documentation');
        });
    });
}

systemCheck();
