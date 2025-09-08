#!/usr/bin/env node
/**
 * SISTEMA OPTIMIZADO DE BALANCE - BINANCE API
 * Implementando mejores prácticas del análisis técnico
 * - Uso eficiente de weights
 * - Endpoints V3 optimizados
 * - Recolección proactiva de datos
 * - WebSocket para tiempo real
 */

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config({ path: ['.env.local', '.env'] });

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = 'https://api.binance.com';
const FUTURES_URL = 'https://fapi.binance.com';
const TIMESTAMP_OFFSET = -5000;

// Sistema de límites de peso
class WeightManager {
    constructor() {
        this.weights = {
            minute: 0,
            maxMinute: 1200,
            uid: 0,
            maxUID: 180000
        };
        this.resetTime = Date.now() + 60000;
    }
    
    canRequest(weight) {
        if (Date.now() > this.resetTime) {
            this.weights.minute = 0;
            this.weights.uid = 0;
            this.resetTime = Date.now() + 60000;
        }
        
        return (this.weights.minute + weight <= this.weights.maxMinute) &&
               (this.weights.uid + weight <= this.weights.maxUID);
    }
    
    addWeight(weight) {
        this.weights.minute += weight;
        this.weights.uid += weight;
        console.log(`⚖️ Weight usado: ${this.weights.minute}/${this.weights.maxMinute} (1min), ${this.weights.uid}/${this.weights.maxUID} (UID)`);
    }
}

const weightManager = new WeightManager();

function getBinanceTimestamp() {
    return Date.now() + TIMESTAMP_OFFSET;
}

function createSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

// OPTIMIZACIÓN 1: Usar endpoint V3 para Futures (solo posiciones activas)
async function getFuturesBalanceOptimized() {
    if (!weightManager.canRequest(5)) {
        throw new Error('Rate limit alcanzado - esperando reset');
    }
    
    console.log('🚀 Obteniendo balance Futures (V3 optimizado)...');
    
    try {
        const timestamp = getBinanceTimestamp();
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.get(`${FUTURES_URL}/fapi/v3/account`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { timestamp, signature },
            timeout: 10000
        });
        
        weightManager.addWeight(5);
        
        const data = response.data;
        const activePositions = data.positions.filter(pos => parseFloat(pos.positionAmt) !== 0);
        
        return {
            totalWalletBalance: parseFloat(data.totalWalletBalance),
            totalUnrealizedProfit: parseFloat(data.totalUnrealizedProfit),
            totalMarginBalance: parseFloat(data.totalMarginBalance),
            availableBalance: parseFloat(data.availableBalance),
            totalInitialMargin: parseFloat(data.totalInitialMargin),
            activePositions: activePositions.map(pos => ({
                symbol: pos.symbol,
                positionAmt: parseFloat(pos.positionAmt),
                entryPrice: parseFloat(pos.entryPrice),
                unrealizedProfit: parseFloat(pos.unrealizedProfit),
                percentage: parseFloat(pos.percentage)
            })),
            balances: data.assets.filter(asset => parseFloat(asset.walletBalance) > 0)
        };
        
    } catch (error) {
        console.log('❌ Error obteniendo balance Futures:', error.message);
        return null;
    }
}

// OPTIMIZACIÓN 2: Balance Spot con filtro de ceros
async function getSpotBalanceOptimized() {
    if (!weightManager.canRequest(20)) {
        throw new Error('Rate limit alcanzado - esperando reset');
    }
    
    console.log('📊 Obteniendo balance Spot (sin ceros)...');
    
    try {
        const timestamp = getBinanceTimestamp();
        const queryString = `omitZeroBalances=true&timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.get(`${BASE_URL}/api/v3/account`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { omitZeroBalances: 'true', timestamp, signature },
            timeout: 10000
        });
        
        weightManager.addWeight(20);
        
        const nonZeroBalances = response.data.balances
            .filter(balance => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
            .map(balance => ({
                asset: balance.asset,
                free: parseFloat(balance.free),
                locked: parseFloat(balance.locked),
                total: parseFloat(balance.free) + parseFloat(balance.locked)
            }));
        
        return {
            balances: nonZeroBalances,
            totalAssetsUSDT: nonZeroBalances.find(b => b.asset === 'USDT')?.total || 0,
            accountType: response.data.accountType,
            canTrade: response.data.canTrade
        };
        
    } catch (error) {
        console.log('❌ Error obteniendo balance Spot:', error.message);
        return null;
    }
}

// RECOLECCIÓN PROACTIVA: Guardar snapshot diario
async function saveBalanceSnapshot() {
    console.log('💾 Guardando snapshot de balance...');
    
    const timestamp = new Date().toISOString();
    const spotBalance = await getSpotBalanceOptimized();
    const futuresBalance = await getFuturesBalanceOptimized();
    
    if (!spotBalance || !futuresBalance) {
        console.log('❌ No se pudo obtener balance completo para snapshot');
        return;
    }
    
    const snapshot = {
        timestamp,
        date: new Date().toDateString(),
        spot: spotBalance,
        futures: futuresBalance,
        totalUSDT: spotBalance.totalAssetsUSDT + futuresBalance.totalWalletBalance,
        unrealizedPNL: futuresBalance.totalUnrealizedProfit
    };
    
    try {
        // Guardar en archivo JSON
        const filename = `balance-snapshot-${new Date().toISOString().split('T')[0]}.json`;
        await fs.writeFile(filename, JSON.stringify(snapshot, null, 2));
        console.log(`✅ Snapshot guardado: ${filename}`);
        
        // Mantener solo últimos 30 días
        await cleanupOldSnapshots();
        
        return snapshot;
        
    } catch (error) {
        console.log('❌ Error guardando snapshot:', error.message);
    }
}

// Limpiar snapshots antiguos (más de 30 días)
async function cleanupOldSnapshots() {
    try {
        const files = await fs.readdir('./');
        const snapshotFiles = files.filter(f => f.startsWith('balance-snapshot-'));
        
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        for (const file of snapshotFiles) {
            const dateMatch = file.match(/balance-snapshot-(\d{4}-\d{2}-\d{2})\.json/);
            if (dateMatch) {
                const fileDate = new Date(dateMatch[1]).getTime();
                if (fileDate < thirtyDaysAgo) {
                    await fs.unlink(file);
                    console.log(`🗑️ Eliminado snapshot antiguo: ${file}`);
                }
            }
        }
    } catch (error) {
        // Ignorar errores de limpieza
    }
}

// OPTIMIZACIÓN 3: Income History para análisis de funding
async function getFundingIncomeHistory(days = 7) {
    if (!weightManager.canRequest(30)) {
        console.log('⚠️ Weight insuficiente para income history');
        return [];
    }
    
    console.log(`📈 Obteniendo historial de funding (${days} días)...`);
    
    try {
        const timestamp = getBinanceTimestamp();
        const startTime = timestamp - (days * 24 * 60 * 60 * 1000);
        
        const queryString = `incomeType=FUNDING_FEE&startTime=${startTime}&timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.get(`${FUTURES_URL}/fapi/v1/income`, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { 
                incomeType: 'FUNDING_FEE',
                startTime,
                timestamp,
                signature 
            },
            timeout: 10000
        });
        
        weightManager.addWeight(30);
        
        const fundingHistory = response.data.map(item => ({
            symbol: item.symbol,
            income: parseFloat(item.income),
            time: new Date(parseInt(item.time)),
            tranId: item.tranId
        }));
        
        // Calcular estadísticas
        const totalFunding = fundingHistory.reduce((sum, item) => sum + item.income, 0);
        const avgPerDay = totalFunding / days;
        
        console.log(`💰 Funding total ${days} días: ${totalFunding.toFixed(6)} USDT`);
        console.log(`📊 Promedio diario: ${avgPerDay.toFixed(6)} USDT`);
        
        return {
            history: fundingHistory,
            totalFunding,
            avgPerDay,
            period: days
        };
        
    } catch (error) {
        console.log('❌ Error obteniendo funding history:', error.message);
        return { history: [], totalFunding: 0, avgPerDay: 0, period: days };
    }
}

// REPORTE COMPLETO OPTIMIZADO
async function generateOptimizedReport() {
    console.log('\n🔍 GENERANDO REPORTE OPTIMIZADO...');
    console.log('═══════════════════════════════════════');
    console.log(`⏰ ${new Date().toLocaleString()}`);
    console.log('');
    
    // Balance actual usando endpoints optimizados
    const spotBalance = await getSpotBalanceOptimized();
    const futuresBalance = await getFuturesBalanceOptimized();
    
    if (!spotBalance || !futuresBalance) {
        console.log('❌ No se pudo obtener balance completo');
        return;
    }
    
    // Mostrar balance principal
    console.log('💰 BALANCE OPTIMIZADO:');
    console.log(`   📊 SPOT Total: ${spotBalance.totalAssetsUSDT.toFixed(6)} USDT`);
    console.log(`   🚀 FUTURES Wallet: ${futuresBalance.totalWalletBalance.toFixed(6)} USDT`);
    console.log(`   💎 TOTAL COMBINED: ${(spotBalance.totalAssetsUSDT + futuresBalance.totalWalletBalance).toFixed(6)} USDT`);
    console.log(`   📈 PNL No Realizado: ${futuresBalance.totalUnrealizedProfit.toFixed(6)} USDT`);
    console.log(`   💵 Balance Disponible: ${futuresBalance.availableBalance.toFixed(6)} USDT`);
    
    // Posiciones activas (solo las que tienen balance)
    if (futuresBalance.activePositions.length > 0) {
        console.log('\n🎯 POSICIONES ACTIVAS:');
        futuresBalance.activePositions.forEach(pos => {
            const side = pos.positionAmt > 0 ? 'LONG' : 'SHORT';
            const pnlColor = pos.unrealizedProfit >= 0 ? '📈' : '📉';
            console.log(`   ${pnlColor} ${pos.symbol}: ${side} ${Math.abs(pos.positionAmt)} @ ${pos.entryPrice} (PNL: ${pos.unrealizedProfit.toFixed(4)} USDT)`);
        });
    } else {
        console.log('\n🎯 POSICIONES ACTIVAS: ❌ Sin posiciones abiertas');
    }
    
    // Assets Spot con balance
    if (spotBalance.balances.length > 0) {
        console.log('\n📊 ASSETS SPOT CON BALANCE:');
        spotBalance.balances.forEach(asset => {
            console.log(`   💰 ${asset.asset}: ${asset.total.toFixed(6)} (Libre: ${asset.free.toFixed(6)}, Bloqueado: ${asset.locked.toFixed(6)})`);
        });
    }
    
    // Historial de funding (últimos 3 días para no gastar mucho weight)
    const fundingHistory = await getFundingIncomeHistory(3);
    if (fundingHistory.history.length > 0) {
        console.log('\n💸 FUNDING FEES (últimos 3 días):');
        console.log(`   💰 Total recibido: ${fundingHistory.totalFunding.toFixed(6)} USDT`);
        console.log(`   📊 Promedio diario: ${fundingHistory.avgPerDay.toFixed(6)} USDT`);
        console.log(`   📈 APR estimado: ${(fundingHistory.avgPerDay * 365 / futuresBalance.totalWalletBalance * 100).toFixed(2)}%`);
    }
    
    console.log('\n═══════════════════════════════════════');
    
    return {
        spot: spotBalance,
        futures: futuresBalance,
        funding: fundingHistory,
        totalBalance: spotBalance.totalAssetsUSDT + futuresBalance.totalWalletBalance
    };
}

// MONITOREO INTELIGENTE con gestión de weights
async function startIntelligentMonitoring() {
    console.log('🧠 INICIANDO MONITOREO INTELIGENTE');
    console.log('📊 Gestión automática de rate limits');
    console.log('⚖️ Uso eficiente de API weights');
    console.log('💾 Snapshots automáticos diarios');
    console.log('');
    
    // Snapshot inicial
    await saveBalanceSnapshot();
    
    let reportCount = 0;
    const maxReports = 12; // 1 hora de monitoreo
    
    // Reporte inicial
    await generateOptimizedReport();
    reportCount++;
    
    const interval = setInterval(async () => {
        if (reportCount >= maxReports) {
            console.log('\n🏁 MONITOREO INTELIGENTE COMPLETADO');
            clearInterval(interval);
            
            // Snapshot final
            await saveBalanceSnapshot();
            process.exit(0);
            return;
        }
        
        console.log(`\n📋 REPORTE OPTIMIZADO ${reportCount + 1}/${maxReports}`);
        
        // Verificar si tenemos suficiente weight
        if (weightManager.canRequest(50)) { // Reservar weight para reporte completo
            await generateOptimizedReport();
        } else {
            console.log('⚠️ Rate limit alcanzado - esperando reset...');
            console.log(`💰 Balance rápido disponible en próximo ciclo`);
        }
        
        reportCount++;
        
        // Guardar snapshot cada 6 reportes (30 minutos)
        if (reportCount % 6 === 0) {
            await saveBalanceSnapshot();
        }
        
    }, 5 * 60 * 1000); // Cada 5 minutos
    
    process.on('SIGINT', () => {
        console.log('\n🛑 Monitoreo interrumpido - guardando snapshot final...');
        saveBalanceSnapshot().then(() => {
            clearInterval(interval);
            process.exit(0);
        });
    });
}

// Ejecutar sistema optimizado
startIntelligentMonitoring().catch(console.error);
