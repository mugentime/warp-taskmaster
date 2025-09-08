#!/usr/bin/env node
/**
 * Direct Binance Futures Balance Checker
 * Checks both SPOT and FUTURES balances
 */

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: ['.env.local', '.env'] });

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;

const BASE_URL = 'https://api.binance.com';
const FUTURES_URL = 'https://fapi.binance.com';

function createSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

async function checkSpotBalance() {
    console.log('\n💰 VERIFICANDO BALANCE SPOT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.get(`${BASE_URL}/api/v3/account`, {
            headers: {
                'X-MBX-APIKEY': API_KEY
            },
            params: {
                timestamp,
                signature
            },
            timeout: 10000
        });

        const account = response.data;
        let totalUSDT = 0;
        
        console.log('✅ CUENTA SPOT CONECTADA');
        console.log(`🏦 Can Trade: ${account.canTrade ? 'YES' : 'NO'}`);
        console.log(`💸 Can Withdraw: ${account.canWithdraw ? 'YES' : 'NO'}`);
        
        console.log('\n📊 BALANCES PRINCIPALES:');
        account.balances
            .filter(balance => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
            .forEach(balance => {
                const free = parseFloat(balance.free);
                const locked = parseFloat(balance.locked);
                const total = free + locked;
                
                if (total > 0.001) { // Solo mostrar balances significativos
                    console.log(`   ${balance.asset}: ${total.toFixed(6)} (Free: ${free.toFixed(6)}, Locked: ${locked.toFixed(6)})`);
                    
                    if (balance.asset === 'USDT') {
                        totalUSDT = total;
                    }
                }
            });
        
        console.log(`\n💰 TOTAL USDT en SPOT: ${totalUSDT.toFixed(6)} USDT`);
        return { success: true, totalUSDT, canTrade: account.canTrade };
        
    } catch (error) {
        console.log('❌ Error en SPOT:', error.response?.data?.msg || error.message);
        return { success: false, error: error.message, totalUSDT: 0 };
    }
}

async function checkFuturesBalance() {
    console.log('\n🚀 VERIFICANDO BALANCE FUTUROS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.get(`${FUTURES_URL}/fapi/v2/account`, {
            headers: {
                'X-MBX-APIKEY': API_KEY
            },
            params: {
                timestamp,
                signature
            },
            timeout: 10000
        });

        const account = response.data;
        
        console.log('✅ CUENTA FUTUROS CONECTADA');
        console.log(`💰 Total Wallet Balance: ${parseFloat(account.totalWalletBalance).toFixed(6)} USDT`);
        console.log(`📊 Available Balance: ${parseFloat(account.availableBalance).toFixed(6)} USDT`);
        console.log(`💹 Unrealized PnL: ${parseFloat(account.totalUnrealizedProfit).toFixed(6)} USDT`);
        console.log(`🏦 Can Trade: ${account.canTrade ? 'YES' : 'NO'}`);
        console.log(`💸 Can Withdraw: ${account.canWithdraw ? 'YES' : 'NO'}`);
        
        // Check for open positions
        const positions = account.positions.filter(pos => parseFloat(pos.positionAmt) !== 0);
        
        if (positions.length > 0) {
            console.log(`\n📍 POSICIONES ABIERTAS (${positions.length}):`);
            positions.forEach((pos, index) => {
                const side = parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT';
                const pnl = parseFloat(pos.unrealizedProfit);
                const pnlColor = pnl >= 0 ? '💚' : '❤️';
                
                console.log(`   ${index + 1}. ${pos.symbol} - ${side}`);
                console.log(`      Size: ${Math.abs(parseFloat(pos.positionAmt))} | Entry: $${parseFloat(pos.entryPrice).toFixed(4)}`);
                console.log(`      ${pnlColor} PnL: ${pnl.toFixed(6)} USDT | Mark Price: $${parseFloat(pos.markPrice).toFixed(4)}`);
            });
        } else {
            console.log('\n📍 No hay posiciones abiertas');
        }
        
        return {
            success: true,
            totalWalletBalance: parseFloat(account.totalWalletBalance),
            availableBalance: parseFloat(account.availableBalance),
            unrealizedPnL: parseFloat(account.totalUnrealizedProfit),
            canTrade: account.canTrade,
            openPositions: positions.length
        };
        
    } catch (error) {
        console.log('❌ Error en FUTUROS:', error.response?.data?.msg || error.message);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🔍 VERIFICACIÓN COMPLETA DE BALANCES BINANCE');
    console.log('═══════════════════════════════════════════════');
    console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.slice(-8)}`);
    
    if (!API_KEY || !API_SECRET) {
        console.log('❌ ERROR: No se encontraron las credenciales de API');
        return;
    }
    
    // Check both accounts
    const spotResult = await checkSpotBalance();
    const futuresResult = await checkFuturesBalance();
    
    // Summary
    console.log('\n📋 RESUMEN GENERAL');
    console.log('═══════════════════');
    
    if (spotResult.success) {
        console.log(`💰 SPOT Total: ${spotResult.totalUSDT.toFixed(6)} USDT`);
    } else {
        console.log('❌ SPOT: Error de conexión');
    }
    
    if (futuresResult.success) {
        console.log(`🚀 FUTUROS Total: ${futuresResult.totalWalletBalance.toFixed(6)} USDT`);
        console.log(`📊 FUTUROS Disponible: ${futuresResult.availableBalance.toFixed(6)} USDT`);
        console.log(`📍 Posiciones Abiertas: ${futuresResult.openPositions}`);
        
        const totalBalance = spotResult.totalUSDT + futuresResult.totalWalletBalance;
        console.log(`\n💎 BALANCE TOTAL (Spot + Futuros): ${totalBalance.toFixed(6)} USDT`);
        
        // Trading readiness
        if (futuresResult.availableBalance >= 10) {
            console.log('🟢 LISTO PARA TRADING DE FUTUROS');
        } else if (futuresResult.availableBalance > 0) {
            console.log('🟡 Balance bajo para futuros - considera transferir más USDT');
        } else {
            console.log('🔴 Sin balance en futuros - necesitas transferir USDT desde spot');
        }
    } else {
        console.log('❌ FUTUROS: Error de conexión');
    }
}

main().catch(console.error);
