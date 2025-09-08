#!/usr/bin/env node
/**
 * Direct Binance API Test
 * Tests API connection and gets account info
 */

import axios from 'axios';
import crypto from 'crypto';

// API credentials from GEmini-binance-futures project
const API_KEY = 'KP5NFDffn3reE3md2SKkrcRTgTLwJKrE7wvBVNizdZfuBswKGVbBTluopkmofax1';
const API_SECRET = '2bUXyAuNY0zjrlXWi5xC8DDmVxkhOtYu7W6RwstZ33Ytr7jzins2SUemRCDpLIV5';

// Binance Futures API endpoints
const BASE_URL = 'https://fapi.binance.com';
const TESTNET_URL = 'https://testnet.binancefuture.com';

async function testBinanceAPI() {
    console.log('🔍 TESTING BINANCE FUTURES API CONNECTION');
    console.log('═══════════════════════════════════════════');
    console.log(`API Key: ${API_KEY.substring(0, 8)}...${API_KEY.slice(-8)}`);
    console.log('');

    // Test both mainnet and testnet
    const endpoints = [
        { name: 'Mainnet', url: BASE_URL },
        { name: 'Testnet', url: TESTNET_URL }
    ];

    for (const endpoint of endpoints) {
        console.log(`\n🔗 Testing ${endpoint.name} (${endpoint.url})`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
            // Test 1: Exchange Info (no auth required)
            console.log('1️⃣ Testing Exchange Info...');
            const exchangeInfo = await axios.get(`${endpoint.url}/fapi/v1/exchangeInfo`, {
                timeout: 10000
            });
            console.log('   ✅ Exchange Info OK - API endpoint reachable');

            // Test 2: Account Info (requires authentication)
            console.log('2️⃣ Testing Account Authentication...');
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}`;
            const signature = crypto.createHmac('sha256', API_SECRET).update(queryString).digest('hex');

            const accountResponse = await axios.get(`${endpoint.url}/fapi/v2/account`, {
                headers: {
                    'X-MBX-APIKEY': API_KEY
                },
                params: {
                    timestamp,
                    signature
                },
                timeout: 10000
            });

            const account = accountResponse.data;
            console.log('   ✅ Authentication OK');
            console.log(`   💰 Total Wallet Balance: ${account.totalWalletBalance} USDT`);
            console.log(`   📊 Available Balance: ${account.availableBalance} USDT`);
            console.log(`   🏦 Can Trade: ${account.canTrade ? 'YES' : 'NO'}`);
            console.log(`   💸 Can Withdraw: ${account.canWithdraw ? 'YES' : 'NO'}`);

            // Test 3: Get Positions
            console.log('3️⃣ Checking Open Positions...');
            const positionsResponse = await axios.get(`${endpoint.url}/fapi/v2/positionRisk`, {
                headers: {
                    'X-MBX-APIKEY': API_KEY
                },
                params: {
                    timestamp: Date.now(),
                    signature: crypto.createHmac('sha256', API_SECRET).update(`timestamp=${Date.now()}`).digest('hex')
                },
                timeout: 10000
            });

            const positions = positionsResponse.data.filter(pos => parseFloat(pos.positionAmt) !== 0);
            
            if (positions.length > 0) {
                console.log(`   📍 Open Positions: ${positions.length}`);
                let totalUnrealizedPnL = 0;
                
                positions.forEach((pos, index) => {
                    const pnl = parseFloat(pos.unRealizedProfit);
                    totalUnrealizedPnL += pnl;
                    const side = parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT';
                    const pnlColor = pnl >= 0 ? '🟢' : '🔴';
                    
                    console.log(`   ${index + 1}. ${pos.symbol}`);
                    console.log(`      Side: ${side} | Size: ${Math.abs(parseFloat(pos.positionAmt))}`);
                    console.log(`      Entry: $${parseFloat(pos.entryPrice).toFixed(4)} | Current: $${parseFloat(pos.markPrice).toFixed(4)}`);
                    console.log(`      ${pnlColor} PnL: ${pnl.toFixed(4)} USDT (${parseFloat(pos.percentage).toFixed(2)}%)`);
                });
                
                console.log(`   💹 Total Unrealized PnL: ${totalUnrealizedPnL.toFixed(4)} USDT`);
            } else {
                console.log('   ✅ No open positions');
            }

            // Test 4: Get 24h Ticker Statistics
            console.log('4️⃣ Getting Market Data...');
            const ticker24h = await axios.get(`${endpoint.url}/fapi/v1/ticker/24hr?symbol=BTCUSDT`, {
                timeout: 10000
            });

            const btcTicker = ticker24h.data;
            console.log(`   💹 BTC/USDT: $${parseFloat(btcTicker.lastPrice).toFixed(2)}`);
            console.log(`   📈 24h Change: ${parseFloat(btcTicker.priceChangePercent).toFixed(2)}%`);
            console.log(`   📊 24h Volume: ${parseFloat(btcTicker.volume).toFixed(0)} BTC`);

            console.log('\n   ✅ ALL TESTS PASSED - API CONNECTION HEALTHY');

        } catch (error) {
            console.log('   ❌ Error:', error.message);
            
            if (error.response) {
                console.log('   📝 Status:', error.response.status);
                if (error.response.data) {
                    console.log('   💬 Message:', error.response.data.msg || JSON.stringify(error.response.data));
                    
                    // Handle specific Binance errors
                    const errorMsg = error.response.data.msg;
                    if (errorMsg && errorMsg.includes('Invalid API-key')) {
                        console.log('   💡 FIX: Check API key validity and permissions');
                    } else if (errorMsg && errorMsg.includes('Signature')) {
                        console.log('   💡 FIX: Check API secret and signature generation');
                    } else if (errorMsg && errorMsg.includes('IP')) {
                        console.log('   💡 FIX: Check IP whitelist restrictions');
                    }
                }
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                console.log('   💡 FIX: Check internet connection or API endpoint');
            }
        }
    }
}

// Test server connection on port 3001
async function testLocalServer() {
    console.log('\n\n🖥️  TESTING LOCAL SERVERS');
    console.log('═══════════════════════════');
    
    const ports = [3000, 3001, 8003];
    
    for (const port of ports) {
        try {
            const response = await axios.get(`http://localhost:${port}/`, { timeout: 3000 });
            console.log(`✅ Port ${port}: ONLINE - ${response.status}`);
        } catch (error) {
            if (error.response) {
                console.log(`⚠️  Port ${port}: Responding but error ${error.response.status}`);
            } else {
                console.log(`❌ Port ${port}: OFFLINE`);
            }
        }
    }
}

// Run tests
testBinanceAPI()
    .then(() => testLocalServer())
    .catch(console.error);
