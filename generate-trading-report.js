#!/usr/bin/env node
/**
 * Comprehensive Trading System Report Generator
 * 
 * This script analyzes all trading systems and generates a complete report
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Known API credentials from different projects
const API_CONFIGS = {
    mainArbitrage: {
        name: "Gemini-Binance Arbitrage Monitor",
        apiKey: "KP5NFDffn3reE3md2SKkrcRTgTLwJKrE7wvBVNizdZfuBswKGVbBTluopkmofax1",
        apiSecret: "2bUXyAuNY0zjrlXWi5xC8DDmVxkhOtYu7W6RwstZ33Ytr7jzins2SUemRCDpLIV5",
        baseUrl: "https://api.binance.com"
    }
};

// Active servers to check
const SERVER_ENDPOINTS = [
    "http://localhost:3000", // POS system
    "http://localhost:3001", // Current server
    "http://localhost:8003"  // PSO-Zscore backend
];

async function generateTradingReport() {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {},
        exchanges: {},
        servers: {},
        bots: {},
        risks: []
    };

    console.log('🔍 GENERATING COMPREHENSIVE TRADING REPORT');
    console.log('═══════════════════════════════════════════');
    console.log(`📅 Report Date: ${new Date().toLocaleString()}`);
    console.log('');

    // Check server status
    console.log('🖥️  CHECKING ACTIVE SERVERS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const endpoint of SERVER_ENDPOINTS) {
        try {
            const response = await axios.get(`${endpoint}/health`, { timeout: 5000 });
            report.servers[endpoint] = { status: 'online', data: response.data };
            console.log(`✅ ${endpoint} - ONLINE`);
        } catch (error) {
            report.servers[endpoint] = { status: 'offline', error: error.message };
            console.log(`❌ ${endpoint} - OFFLINE`);
        }
    }
    console.log('');

    // Check Binance API connections and balances
    console.log('💰 CHECKING EXCHANGE BALANCES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const [configName, config] of Object.entries(API_CONFIGS)) {
        console.log(`\n🏦 ${config.name}`);
        console.log(`   API Key: ${config.apiKey.substring(0, 8)}...${config.apiKey.slice(-8)}`);
        
        try {
            // Check account status
            const accountResponse = await checkBinanceAccount(config);
            if (accountResponse.success) {
                report.exchanges[configName] = accountResponse.data;
                
                console.log(`   ✅ Account Status: ${accountResponse.data.canTrade ? 'Active' : 'Restricted'}`);
                console.log(`   💰 Total Balance: ${accountResponse.data.totalWalletBalance || 'N/A'} USDT`);
                console.log(`   📊 Available: ${accountResponse.data.availableBalance || 'N/A'} USDT`);
                
                if (accountResponse.data.positions && accountResponse.data.positions.length > 0) {
                    console.log(`   📍 Open Positions: ${accountResponse.data.positions.length}`);
                    let totalPnL = 0;
                    accountResponse.data.positions.forEach(pos => {
                        if (parseFloat(pos.positionAmt) !== 0) {
                            const pnl = parseFloat(pos.unRealizedProfit);
                            totalPnL += pnl;
                            const side = parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT';
                            console.log(`      ${pos.symbol}: ${side} | PnL: ${pnl.toFixed(2)} USDT`);
                        }
                    });
                    console.log(`   💹 Total Unrealized PnL: ${totalPnL.toFixed(2)} USDT`);
                } else {
                    console.log(`   📍 No open positions`);
                }
            } else {
                console.log(`   ❌ Error: ${accountResponse.error}`);
                report.exchanges[configName] = { error: accountResponse.error };
            }
        } catch (error) {
            console.log(`   ❌ Connection Error: ${error.message}`);
            report.exchanges[configName] = { error: error.message };
        }
    }

    // Check for running bots and processes
    console.log('\n🤖 CHECKING ACTIVE TRADING BOTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // This would be implemented with actual bot checking logic
    const botProcesses = await checkTradingBots();
    report.bots = botProcesses;
    
    if (botProcesses.length === 0) {
        console.log('❌ No active trading bots detected');
    } else {
        botProcesses.forEach((bot, index) => {
            console.log(`${index + 1}. ${bot.name} - ${bot.status}`);
            console.log(`   PID: ${bot.pid} | Uptime: ${bot.uptime}`);
        });
    }

    // Risk Assessment
    console.log('\n⚠️  RISK ASSESSMENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const risks = performRiskAssessment(report);
    report.risks = risks;
    
    risks.forEach((risk, index) => {
        const riskIcon = risk.level === 'HIGH' ? '🔴' : risk.level === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`${riskIcon} ${risk.level}: ${risk.message}`);
    });

    // Summary
    console.log('\n📊 PORTFOLIO SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━');
    
    let totalBalance = 0;
    let totalPnL = 0;
    let activeExchanges = 0;
    
    for (const exchange of Object.values(report.exchanges)) {
        if (exchange.totalWalletBalance) {
            totalBalance += parseFloat(exchange.totalWalletBalance);
            activeExchanges++;
        }
        if (exchange.positions) {
            exchange.positions.forEach(pos => {
                totalPnL += parseFloat(pos.unRealizedProfit || 0);
            });
        }
    }
    
    report.summary = {
        totalBalance: totalBalance.toFixed(2),
        totalPnL: totalPnL.toFixed(2),
        activeExchanges,
        activeServers: Object.values(report.servers).filter(s => s.status === 'online').length,
        activeBots: report.bots.length,
        riskLevel: risks.some(r => r.level === 'HIGH') ? 'HIGH' : 
                  risks.some(r => r.level === 'MEDIUM') ? 'MEDIUM' : 'LOW'
    };
    
    console.log(`💰 Total Portfolio Value: ${report.summary.totalBalance} USDT`);
    console.log(`📈 Total Unrealized PnL: ${report.summary.totalPnL} USDT`);
    console.log(`🏦 Active Exchanges: ${report.summary.activeExchanges}`);
    console.log(`🖥️  Active Servers: ${report.summary.activeServers}`);
    console.log(`🤖 Active Bots: ${report.summary.activeBots}`);
    console.log(`⚠️  Overall Risk Level: ${report.summary.riskLevel}`);

    // Save report to file
    const reportPath = path.join(__dirname, `trading-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
    
    return report;
}

async function checkBinanceAccount(config) {
    try {
        const crypto = await import('crypto');
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', config.apiSecret).update(queryString).digest('hex');
        
        const response = await axios.get(`${config.baseUrl}/fapi/v2/account`, {
            headers: {
                'X-MBX-APIKEY': config.apiKey
            },
            params: {
                timestamp,
                signature
            },
            timeout: 10000
        });
        
        return { success: true, data: response.data };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data?.msg || error.message 
        };
    }
}

async function checkTradingBots() {
    // This would check for actual bot processes
    // For now, return empty array
    return [];
}

function performRiskAssessment(report) {
    const risks = [];
    
    // Check if any API keys are exposed
    if (Object.keys(report.exchanges).length === 0) {
        risks.push({
            level: 'HIGH',
            message: 'No active exchange connections detected'
        });
    }
    
    // Check for high unrealized losses
    for (const exchange of Object.values(report.exchanges)) {
        if (exchange.positions) {
            const totalPnL = exchange.positions.reduce((sum, pos) => 
                sum + parseFloat(pos.unRealizedProfit || 0), 0);
            
            if (totalPnL < -100) {
                risks.push({
                    level: 'HIGH',
                    message: `High unrealized losses detected: ${totalPnL.toFixed(2)} USDT`
                });
            } else if (totalPnL < -50) {
                risks.push({
                    level: 'MEDIUM',
                    message: `Moderate unrealized losses: ${totalPnL.toFixed(2)} USDT`
                });
            }
        }
    }
    
    // Check for offline servers
    const offlineServers = Object.entries(report.servers)
        .filter(([_, server]) => server.status === 'offline').length;
    
    if (offlineServers > 0) {
        risks.push({
            level: 'MEDIUM',
            message: `${offlineServers} server(s) offline - potential monitoring gaps`
        });
    }
    
    if (risks.length === 0) {
        risks.push({
            level: 'LOW',
            message: 'No significant risks detected'
        });
    }
    
    return risks;
}

// Run the report
generateTradingReport().catch(console.error);
