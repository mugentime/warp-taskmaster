#!/usr/bin/env node
/**
 * Quick Futures Balance Checker
 * 
 * This script safely checks your Binance futures balance using the new diagnostics API
 * Requirements: Your .env file must contain BINANCE_API_KEY and BINANCE_API_SECRET
 */

import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables from multiple files (same as backend)
dotenv.config({ path: ['.env.local', '.env'] });

async function checkFuturesBalance() {
    // Read API credentials from environment variables
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;
    
    if (!apiKey || !apiSecret) {
        console.log('❌ ERROR: Binance API credentials not found.');
        console.log('');
        console.log('Please make sure your .env file contains:');
        console.log('BINANCE_API_KEY="your_api_key_here"');
        console.log('BINANCE_API_SECRET="your_api_secret_here"');
        console.log('');
        console.log('You can copy .env.example to .env and fill in your credentials.');
        return;
    }
    
    console.log('🔍 Checking Binance Futures Balance...');
    console.log('API Key:', apiKey.substring(0, 8) + '...' + apiKey.slice(-4));
    console.log('');
    
    try {
        // Call the diagnostics endpoint
        const response = await axios.get('http://localhost:3001/api/v1/diagnostics/futures/balances', {
            params: {
                apiKey,
                apiSecret
            },
            timeout: 30000 // 30 second timeout
        });
        
        if (response.data.success) {
            const data = response.data.data;
            
            console.log('✅ FUTURES ACCOUNT BALANCE');
            console.log('═══════════════════════════');
            console.log(`💰 Wallet Balance:      ${data.walletBalance.toFixed(4)} USDT`);
            console.log(`💵 Available Balance:   ${data.availableBalance.toFixed(4)} USDT`);
            console.log(`📊 Margin Balance:      ${data.marginBalance.toFixed(4)} USDT`);
            console.log(`📈 Unrealized PnL:      ${data.crossUnPnl.toFixed(4)} USDT`);
            console.log('');
            console.log(`🏦 Account Status:`);
            console.log(`   ✅ Can Trade:        ${data.canTrade ? 'YES' : 'NO'}`);
            console.log(`   ✅ Can Withdraw:     ${data.canWithdraw ? 'YES' : 'NO'}`);
            console.log(`   📋 Total Assets:     ${data.totalAssets}`);
            console.log('');
            
            if (data.openPositions > 0) {
                console.log(`📍 OPEN POSITIONS (${data.openPositions})`);
                console.log('═══════════════════════════');
                data.positions.forEach((pos, index) => {
                    const side = pos.positionAmt > 0 ? 'LONG' : 'SHORT';
                    const pnlColor = pos.unrealizedProfit >= 0 ? '💚' : '❤️';
                    console.log(`${index + 1}. ${pos.symbol} - ${side}`);
                    console.log(`   Amount: ${Math.abs(pos.positionAmt)} | Entry: $${pos.entryPrice}`);
                    console.log(`   ${pnlColor} PnL: ${pos.unrealizedProfit.toFixed(4)} USDT (${pos.percentage.toFixed(2)}%)`);
                });
                console.log('');
            } else {
                console.log('📍 No open positions');
                console.log('');
            }
            
            // Check if balance is sufficient for trading
            const minTradingBalance = 10; // Minimum recommended USDT for trading
            if (data.availableBalance >= minTradingBalance) {
                console.log('🟢 TRADING STATUS: Ready for trading');
            } else {
                console.log('🟡 TRADING STATUS: Low balance - consider transferring more USDT to futures');
                console.log(`   Recommended minimum: ${minTradingBalance} USDT`);
            }
            
        } else {
            console.log('❌ Failed to get futures balance');
            console.log('Response:', response.data);
        }
        
    } catch (error) {
        console.log('❌ ERROR: Failed to check futures balance');
        
        if (error.response) {
            // HTTP error response
            console.log('Status:', error.response.status);
            if (error.response.data?.error) {
                console.log('Error:', error.response.data.error);
                
                // Handle common Binance API errors
                if (error.response.data.error.message) {
                    const msg = error.response.data.error.message;
                    if (msg.includes('API-key format invalid')) {
                        console.log('');
                        console.log('💡 FIX: Check that your BINANCE_API_KEY is correct');
                        console.log('   It should start with your API key string (no quotes in .env)');
                    } else if (msg.includes('Signature for this request is not valid')) {
                        console.log('');
                        console.log('💡 FIX: Check that your BINANCE_API_SECRET is correct');
                        console.log('   Make sure there are no extra spaces or characters');
                    } else if (msg.includes('Invalid API-key')) {
                        console.log('');
                        console.log('💡 FIX: Your API key may be disabled or expired');
                        console.log('   Check your Binance API key management page');
                    }
                }
            } else {
                console.log('Error details:', error.response.data);
            }
        } else if (error.code === 'ECONNREFUSED') {
            console.log('');
            console.log('💡 FIX: Backend server is not running on port 3001');
            console.log('   Start the backend server with: npm start');
        } else {
            console.log('Error details:', error.message);
        }
    }
}

// Run the balance check
checkFuturesBalance().catch(console.error);
