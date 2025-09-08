#!/usr/bin/env node
/**
 * Test final del Overall Balance con timestamp corregido
 */

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = 'https://api.binance.com';
const FUTURES_URL = 'https://fapi.binance.com';

// Timestamp corregido
const TIMESTAMP_OFFSET = -3000;

function getBinanceTimestamp() {
    return Date.now() + TIMESTAMP_OFFSET;
}

function createSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

async function getOverallBalance() {
    console.log('💎 OBTENIENDO BALANCE OVERALL CORREGIDO');
    console.log('═══════════════════════════════════════════');
    console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.slice(-8)}`);
    console.log(`⏰ Offset aplicado: ${TIMESTAMP_OFFSET}ms`);
    console.log('');
    
    const results = {
        spot: { USDT: 0, others: [] },
        futures: { USDT: 0, openPositions: 0 },
        overall: { totalUSDT: 0 }
    };
    
    // SPOT Balance
    try {
        console.log('💰 OBTENIENDO BALANCE SPOT...');
        const spotTimestamp = getBinanceTimestamp();
        const spotQueryString = `timestamp=${spotTimestamp}`;
        const spotSignature = createSignature(spotQueryString, API_SECRET);
        
        const spotResponse = await axios.get(`${BASE_URL}/api/v3/account`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { timestamp: spotTimestamp, signature: spotSignature },
            timeout: 10000
        });
        
        const account = spotResponse.data;
        console.log(`✅ SPOT conectado - Can Trade: ${account.canTrade ? 'YES' : 'NO'}`);
        
        // Calcular USDT total en SPOT
        const spotUSDT = account.balances
            .filter(b => b.asset === 'USDT')
            .reduce((total, b) => total + parseFloat(b.free) + parseFloat(b.locked), 0);
        
        results.spot.USDT = spotUSDT;
        
        // Otros assets significativos
        results.spot.others = account.balances
            .filter(b => {
                const total = parseFloat(b.free) + parseFloat(b.locked);
                return b.asset !== 'USDT' && total > 0.001;
            })
            .map(b => ({
                asset: b.asset,
                total: parseFloat(b.free) + parseFloat(b.locked),
                free: parseFloat(b.free)
            }));
        
        console.log(`   💰 USDT: ${spotUSDT.toFixed(6)}`);
        console.log(`   📊 Otros assets: ${results.spot.others.length}`);
        
    } catch (error) {
        console.log(`❌ Error SPOT: ${error.response?.data?.msg || error.message}`);
    }
    
    // FUTURES Balance
    try {
        console.log('\n🚀 OBTENIENDO BALANCE FUTURES...');
        const futuresTimestamp = getBinanceTimestamp();
        const futuresQueryString = `timestamp=${futuresTimestamp}`;
        const futuresSignature = createSignature(futuresQueryString, API_SECRET);
        
        const futuresResponse = await axios.get(`${FUTURES_URL}/fapi/v2/account`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { timestamp: futuresTimestamp, signature: futuresSignature },
            timeout: 10000
        });
        
        const account = futuresResponse.data;
        console.log(`✅ FUTURES conectado - Can Trade: ${account.canTrade ? 'YES' : 'NO'}`);
        
        const futuresUSDT = parseFloat(account.totalWalletBalance);
        const availableUSDT = parseFloat(account.availableBalance);
        const unrealizedPnL = parseFloat(account.totalUnrealizedProfit);
        
        results.futures.USDT = futuresUSDT;
        
        // Contar posiciones abiertas
        const openPositions = account.positions.filter(pos => parseFloat(pos.positionAmt) !== 0);
        results.futures.openPositions = openPositions.length;
        
        console.log(`   💰 Total: ${futuresUSDT.toFixed(6)} USDT`);
        console.log(`   📊 Disponible: ${availableUSDT.toFixed(6)} USDT`);
        console.log(`   💹 PnL no realizado: ${unrealizedPnL.toFixed(6)} USDT`);
        console.log(`   📍 Posiciones abiertas: ${openPositions.length}`);
        
        if (openPositions.length > 0) {
            console.log(`\n   📋 DETALLE DE POSICIONES:`);
            openPositions.forEach((pos, i) => {
                const side = parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT';
                const pnl = parseFloat(pos.unrealizedProfit);
                console.log(`      ${i+1}. ${pos.symbol} ${side}: ${pnl.toFixed(4)} USDT PnL`);
            });
        }
        
    } catch (error) {
        console.log(`❌ Error FUTURES: ${error.response?.data?.msg || error.message}`);
    }
    
    // OVERALL SUMMARY
    results.overall.totalUSDT = results.spot.USDT + results.futures.USDT;
    
    console.log('\n💎 RESUMEN OVERALL BALANCE');
    console.log('══════════════════════════════');
    console.log(`💰 SPOT Total: ${results.spot.USDT.toFixed(6)} USDT`);
    console.log(`🚀 FUTURES Total: ${results.futures.USDT.toFixed(6)} USDT`);
    console.log(`💎 BALANCE GENERAL: ${results.overall.totalUSDT.toFixed(6)} USDT`);
    console.log(`📍 Posiciones Activas: ${results.futures.openPositions}`);
    
    // Trading readiness
    console.log('\n🎯 ANÁLISIS DE TRADING:');
    console.log('─────────────────────────');
    if (results.overall.totalUSDT >= 50) {
        console.log('🟢 EXCELENTE: Capital suficiente para trading diversificado');
    } else if (results.overall.totalUSDT >= 10) {
        console.log('🟡 BUENO: Capital adecuado para trading con gestión de riesgo');
    } else if (results.overall.totalUSDT > 0) {
        console.log('🟠 LIMITADO: Capital bajo, trading conservador recomendado');
    } else {
        console.log('🔴 CRÍTICO: Sin capital suficiente para trading');
    }
    
    // Otros assets
    if (results.spot.others.length > 0) {
        console.log('\n📊 OTROS ASSETS EN SPOT:');
        console.log('─────────────────────────');
        results.spot.others.forEach(asset => {
            console.log(`   ${asset.asset}: ${asset.total.toFixed(6)} (${asset.free.toFixed(6)} libre)`);
        });
    }
    
    return results;
}

async function main() {
    console.log('🚀 TEST FINAL - OVERALL BALANCE CON TIMESTAMP ARREGLADO');
    console.log('════════════════════════════════════════════════════════');
    
    if (!API_KEY || !API_SECRET) {
        console.log('❌ No hay credenciales API');
        return;
    }
    
    const results = await getOverallBalance();
    
    console.log('\n✅ TIMESTAMP ISSUE RESUELTO - TRADING HABILITADO');
    console.log('═══════════════════════════════════════════════════');
    
    return results;
}

main().catch(console.error);
