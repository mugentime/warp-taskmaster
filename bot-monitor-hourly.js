#!/usr/bin/env node
/**
 * MONITOREO AVANZADO DE TRADING BOT
 * Reportes cada 5 minutos por 1 hora
 * Acciones detalladas y oportunidades
 */

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = 'https://api.binance.com';
const FUTURES_URL = 'https://fapi.binance.com';
const TIMESTAMP_OFFSET = -5000;

function getBinanceTimestamp() {
    return Date.now() + TIMESTAMP_OFFSET;
}

function createSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

// Obtener balance actual
async function getCurrentBalance() {
    try {
        // SPOT
        const spotTimestamp = getBinanceTimestamp();
        const spotQueryString = `timestamp=${spotTimestamp}`;
        const spotSignature = createSignature(spotQueryString, API_SECRET);
        
        const spotResponse = await axios.get(`${BASE_URL}/api/v3/account`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { timestamp: spotTimestamp, signature: spotSignature }
        });
        
        const spotUSDT = spotResponse.data.balances
            .filter(b => b.asset === 'USDT')
            .reduce((total, b) => total + parseFloat(b.free) + parseFloat(b.locked), 0);
        
        // FUTURES
        const futuresTimestamp = getBinanceTimestamp();
        const futuresQueryString = `timestamp=${futuresTimestamp}`;
        const futuresSignature = createSignature(futuresQueryString, API_SECRET);
        
        const futuresResponse = await axios.get(`${FUTURES_URL}/fapi/v2/account`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { timestamp: futuresTimestamp, signature: futuresSignature }
        });
        
        const futuresUSDT = parseFloat(futuresResponse.data.totalWalletBalance);
        const unrealizedPNL = parseFloat(futuresResponse.data.totalUnrealizedProfit);
        
        return {
            spot: spotUSDT,
            futures: futuresUSDT,
            total: spotUSDT + futuresUSDT,
            unrealizedPNL,
            availableBalance: parseFloat(futuresResponse.data.availableBalance)
        };
        
    } catch (error) {
        return { spot: 0, futures: 0, total: 0, unrealizedPNL: 0, availableBalance: 0 };
    }
}

// Obtener posiciones abiertas
async function getOpenPositions() {
    try {
        const timestamp = getBinanceTimestamp();
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.get(`${FUTURES_URL}/fapi/v2/positionRisk`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { timestamp, signature }
        });
        
        return response.data.filter(pos => parseFloat(pos.positionAmt) !== 0);
        
    } catch (error) {
        console.log('❌ Error obteniendo posiciones:', error.message);
        return [];
    }
}

// Obtener mejores oportunidades
async function getTopOpportunities() {
    try {
        const response = await axios.get(`${FUTURES_URL}/fapi/v1/premiumIndex`);
        
        const opportunities = response.data
            .filter(item => item.symbol.endsWith('USDT'))
            .map(item => ({
                symbol: item.symbol,
                fundingRate: parseFloat(item.lastFundingRate),
                aprEstimate: Math.abs(parseFloat(item.lastFundingRate)) * 3 * 365 * 100,
                nextFundingTime: parseInt(item.nextFundingTime)
            }))
            .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
            .slice(0, 5);
        
        return opportunities;
        
    } catch (error) {
        return [];
    }
}

// Obtener estado del rebalancer
async function getRebalancerStatus() {
    try {
        const response = await axios.get('http://localhost:3001/api/v1/rebalancer/status');
        return response.data;
    } catch (error) {
        return { status: 'Desconectado', error: error.message };
    }
}

// Obtener historial de órdenes recientes
async function getRecentOrders() {
    try {
        const timestamp = getBinanceTimestamp();
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.get(`${FUTURES_URL}/fapi/v1/allOrders`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { 
                timestamp, 
                signature,
                limit: 10
            }
        });
        
        return response.data
            .filter(order => {
                const orderTime = parseInt(order.time);
                const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                return orderTime > fiveMinutesAgo;
            })
            .sort((a, b) => parseInt(b.time) - parseInt(a.time));
        
    } catch (error) {
        return [];
    }
}

// Generar reporte detallado
async function generateDetailedReport() {
    console.log('\n🔍 GENERANDO REPORTE DETALLADO...');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`⏰ TIMESTAMP: ${new Date().toLocaleString()}`);
    console.log('');
    
    // 1. Balance actual
    const balance = await getCurrentBalance();
    console.log('💰 BALANCE ACTUAL:');
    console.log(`   📊 SPOT: ${balance.spot.toFixed(6)} USDT`);
    console.log(`   🚀 FUTURES: ${balance.futures.toFixed(6)} USDT`);
    console.log(`   💎 TOTAL: ${balance.total.toFixed(6)} USDT`);
    console.log(`   📈 PNL No Realizado: ${balance.unrealizedPNL.toFixed(6)} USDT`);
    console.log(`   💵 Balance Disponible: ${balance.availableBalance.toFixed(6)} USDT`);
    
    // 2. Posiciones abiertas
    const positions = await getOpenPositions();
    console.log('\n🎯 POSICIONES ABIERTAS:');
    if (positions.length > 0) {
        positions.forEach(pos => {
            const side = parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT';
            const pnl = parseFloat(pos.unRealizedProfit);
            const pnlColor = pnl >= 0 ? '📈' : '📉';
            console.log(`   ${pnlColor} ${pos.symbol}: ${side} ${Math.abs(parseFloat(pos.positionAmt))} (PNL: ${pnl.toFixed(4)} USDT)`);
        });
    } else {
        console.log('   ❌ Sin posiciones abiertas');
    }
    
    // 3. Órdenes recientes
    const recentOrders = await getRecentOrders();
    console.log('\n📋 ÓRDENES RECIENTES (últimos 5 min):');
    if (recentOrders.length > 0) {
        recentOrders.forEach(order => {
            const time = new Date(parseInt(order.time)).toLocaleTimeString();
            const status = order.status === 'FILLED' ? '✅' : order.status === 'CANCELED' ? '❌' : '⏳';
            console.log(`   ${status} ${time} - ${order.symbol} ${order.side} ${order.origQty} @ ${order.price}`);
        });
    } else {
        console.log('   ❌ Sin órdenes en los últimos 5 minutos');
    }
    
    // 4. Top oportunidades
    const opportunities = await getTopOpportunities();
    console.log('\n🏆 TOP 5 OPORTUNIDADES ACTUALES:');
    opportunities.forEach((opp, i) => {
        const direction = opp.fundingRate > 0 ? 'SHORT PERP' : 'LONG PERP';
        const timeToFunding = Math.floor((opp.nextFundingTime - Date.now()) / (1000 * 60 * 60));
        console.log(`   ${i+1}. ${opp.symbol}: ${opp.aprEstimate.toFixed(2)}% APR (${direction}) - ${timeToFunding}h`);
    });
    
    // 5. Estado del sistema
    const rebalancerStatus = await getRebalancerStatus();
    console.log('\n⚖️ ESTADO DEL SISTEMA:');
    console.log(`   🤖 Rebalancer: ${rebalancerStatus.status}`);
    if (rebalancerStatus.opportunitiesCount) {
        console.log(`   📊 Oportunidades monitoreadas: ${rebalancerStatus.opportunitiesCount}`);
    }
    if (rebalancerStatus.lastAction) {
        console.log(`   🎯 Última acción: ${rebalancerStatus.lastAction}`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    
    return {
        balance,
        positions,
        recentOrders,
        opportunities,
        rebalancerStatus
    };
}

// Función principal de monitoreo
async function startHourlyMonitoring() {
    console.log('🚀 INICIANDO MONITOREO DETALLADO POR 1 HORA');
    console.log('📅 Reportes cada 5 minutos');
    console.log('⏰ Duración: 60 minutos');
    console.log('');
    
    let reportCount = 0;
    const maxReports = 12; // 12 reportes en 1 hora (cada 5 min)
    
    // Reporte inicial
    await generateDetailedReport();
    reportCount++;
    
    const interval = setInterval(async () => {
        if (reportCount >= maxReports) {
            console.log('\n🏁 MONITOREO COMPLETADO - 1 HORA FINALIZADA');
            console.log('📊 Total de reportes generados:', reportCount);
            clearInterval(interval);
            process.exit(0);
            return;
        }
        
        console.log(`\n📋 REPORTE ${reportCount + 1}/${maxReports}`);
        await generateDetailedReport();
        reportCount++;
        
    }, 5 * 60 * 1000); // Cada 5 minutos
    
    // Mantener el proceso activo
    process.on('SIGINT', () => {
        console.log('\n🛑 Monitoreo interrumpido por el usuario');
        clearInterval(interval);
        process.exit(0);
    });
}

// Ejecutar monitoreo
startHourlyMonitoring().catch(console.error);
