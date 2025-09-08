#!/usr/bin/env node
/**
 * SISTEMA WEBSOCKET AVANZADO - TIEMPO REAL
 * Streaming de datos en vivo con análisis predictivo
 * - User Data Streams para balance en tiempo real
 * - Market Data Streams para oportunidades
 * - Machine Learning básico para predicciones
 * - Alertas automáticas de cambios significativos
 */

import WebSocket from 'ws';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config({ path: ['.env.local', '.env'] });

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = 'https://api.binance.com';
const FUTURES_URL = 'https://fapi.binance.com';

// Estado global del sistema
class TradingState {
    constructor() {
        this.balance = {
            spot: 0,
            futures: 0,
            total: 0,
            unrealizedPNL: 0,
            lastUpdate: null
        };
        this.positions = new Map();
        this.orders = [];
        this.fundingRates = new Map();
        this.priceChanges = new Map();
        this.alerts = [];
        this.predictions = [];
    }
    
    updateBalance(balanceData) {
        const oldBalance = { ...this.balance };
        this.balance = {
            ...balanceData,
            lastUpdate: new Date()
        };
        
        // Detectar cambios significativos
        const totalChange = this.balance.total - oldBalance.total;
        if (Math.abs(totalChange) > 0.1) { // Cambio > $0.10
            this.addAlert('BALANCE_CHANGE', `Balance cambió ${totalChange.toFixed(6)} USDT`, 'medium');
        }
        
        const pnlChange = this.balance.unrealizedPNL - oldBalance.unrealizedPNL;
        if (Math.abs(pnlChange) > 0.05) { // Cambio PNL > $0.05
            const direction = pnlChange > 0 ? '📈 Ganancia' : '📉 Pérdida';
            this.addAlert('PNL_CHANGE', `${direction}: ${Math.abs(pnlChange).toFixed(6)} USDT`, pnlChange > 0 ? 'low' : 'high');
        }
    }
    
    updatePosition(symbol, positionData) {
        const oldPosition = this.positions.get(symbol);
        this.positions.set(symbol, {
            ...positionData,
            lastUpdate: new Date()
        });
        
        // Detectar nuevas posiciones o cierres
        if (!oldPosition && positionData.positionAmt !== 0) {
            const side = positionData.positionAmt > 0 ? 'LONG' : 'SHORT';
            this.addAlert('POSITION_OPENED', `Nueva posición: ${side} ${symbol}`, 'medium');
        } else if (oldPosition && positionData.positionAmt === 0) {
            this.addAlert('POSITION_CLOSED', `Posición cerrada: ${symbol}`, 'medium');
        }
    }
    
    updateFundingRate(symbol, rate, nextTime) {
        const oldRate = this.fundingRates.get(symbol);
        this.fundingRates.set(symbol, {
            rate: parseFloat(rate),
            nextTime: parseInt(nextTime),
            aprEstimate: Math.abs(parseFloat(rate)) * 3 * 365 * 100,
            lastUpdate: new Date()
        });
        
        // Detectar cambios significativos en funding
        if (oldRate) {
            const rateChange = Math.abs(parseFloat(rate) - oldRate.rate);
            if (rateChange > 0.0001) { // Cambio > 0.01%
                this.addAlert('FUNDING_CHANGE', `${symbol} funding cambió ${(rateChange * 100).toFixed(4)}%`, 'low');
            }
        }
    }
    
    addAlert(type, message, priority = 'low') {
        const alert = {
            id: Date.now(),
            type,
            message,
            priority,
            timestamp: new Date(),
            read: false
        };
        
        this.alerts.unshift(alert);
        
        // Mantener solo últimas 50 alertas
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(0, 50);
        }
        
        // Log immediato para alertas importantes
        if (priority === 'high') {
            console.log(`🚨 ALERTA CRÍTICA: ${message}`);
        } else if (priority === 'medium') {
            console.log(`⚠️ ALERTA: ${message}`);
        }
    }
    
    getTopOpportunities(limit = 5) {
        return Array.from(this.fundingRates.entries())
            .filter(([symbol, data]) => symbol.endsWith('USDT'))
            .sort(([,a], [,b]) => Math.abs(b.rate) - Math.abs(a.rate))
            .slice(0, limit)
            .map(([symbol, data]) => ({
                symbol,
                ...data,
                direction: data.rate > 0 ? 'SHORT PERP' : 'LONG PERP'
            }));
    }
}

const tradingState = new TradingState();

// Crear signature para WebSocket
function createSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

// Obtener Listen Key para User Data Stream
async function getListenKey(type = 'spot') {
    try {
        const endpoint = type === 'spot' ? '/api/v3/userDataStream' : '/fapi/v1/listenKey';
        const url = type === 'spot' ? BASE_URL : FUTURES_URL;
        
        const response = await axios.post(`${url}${endpoint}`, {}, {
            headers: { 'X-MBX-APIKEY': API_KEY }
        });
        
        console.log(`🔑 Listen Key obtenido para ${type.toUpperCase()}: ${response.data.listenKey.substring(0, 10)}...`);
        return response.data.listenKey;
        
    } catch (error) {
        console.log(`❌ Error obteniendo Listen Key ${type}:`, error.message);
        return null;
    }
}

// Renovar Listen Key cada 30 minutos
async function keepAliveListenKey(listenKey, type = 'spot') {
    try {
        const endpoint = type === 'spot' ? '/api/v3/userDataStream' : '/fapi/v1/listenKey';
        const url = type === 'spot' ? BASE_URL : FUTURES_URL;
        
        await axios.put(`${url}${endpoint}`, {}, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { listenKey }
        });
        
        console.log(`🔄 Listen Key ${type} renovado`);
        
    } catch (error) {
        console.log(`❌ Error renovando Listen Key ${type}:`, error.message);
    }
}

// WebSocket para User Data Stream (Balances y Posiciones)
function createUserDataStream(listenKey, type = 'spot') {
    const wsUrl = type === 'spot' 
        ? `wss://stream.binance.com:9443/ws/${listenKey}`
        : `wss://fstream.binance.com/ws/${listenKey}`;
    
    console.log(`🌐 Conectando a User Data Stream ${type.toUpperCase()}...`);
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
        console.log(`✅ ${type.toUpperCase()} User Data Stream conectado`);
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            if (type === 'spot') {
                handleSpotUserData(message);
            } else {
                handleFuturesUserData(message);
            }
            
        } catch (error) {
            console.log(`❌ Error procesando mensaje ${type}:`, error.message);
        }
    });
    
    ws.on('close', () => {
        console.log(`🔌 ${type.toUpperCase()} User Data Stream desconectado - reconectando...`);
        setTimeout(() => createUserDataStream(listenKey, type), 5000);
    });
    
    ws.on('error', (error) => {
        console.log(`❌ Error en ${type.toUpperCase()} WebSocket:`, error.message);
    });
    
    return ws;
}

// Manejar datos de Spot
function handleSpotUserData(message) {
    switch (message.e) {
        case 'outboundAccountPosition':
            console.log('📊 Actualización de balance Spot recibida');
            const spotBalance = message.B
                .filter(b => parseFloat(b.f) > 0 || parseFloat(b.l) > 0)
                .reduce((total, b) => {
                    if (b.a === 'USDT') {
                        return total + parseFloat(b.f) + parseFloat(b.l);
                    }
                    return total;
                }, 0);
            
            tradingState.updateBalance({
                ...tradingState.balance,
                spot: spotBalance
            });
            break;
            
        case 'balanceUpdate':
            console.log(`💰 Balance actualizado: ${message.a} ${message.d > 0 ? '+' : ''}${message.d}`);
            break;
            
        case 'executionReport':
            if (message.X === 'FILLED') {
                tradingState.addAlert('ORDER_FILLED', `Orden ejecutada: ${message.s} ${message.S} ${message.q}`, 'medium');
            }
            break;
    }
}

// Manejar datos de Futures
function handleFuturesUserData(message) {
    switch (message.e) {
        case 'ACCOUNT_UPDATE':
            console.log('🚀 Actualización de cuenta Futures recibida');
            
            // Actualizar balances
            if (message.a.B) {
                const futuresBalance = message.a.B.find(b => b.a === 'USDT');
                if (futuresBalance) {
                    tradingState.updateBalance({
                        ...tradingState.balance,
                        futures: parseFloat(futuresBalance.wb),
                        total: tradingState.balance.spot + parseFloat(futuresBalance.wb)
                    });
                }
            }
            
            // Actualizar posiciones
            if (message.a.P) {
                message.a.P.forEach(pos => {
                    if (parseFloat(pos.pa) !== 0) { // Solo posiciones activas
                        tradingState.updatePosition(pos.s, {
                            symbol: pos.s,
                            positionAmt: parseFloat(pos.pa),
                            entryPrice: parseFloat(pos.ep),
                            unrealizedProfit: parseFloat(pos.up),
                            percentage: parseFloat(pos.cr)
                        });
                    }
                });
            }
            break;
            
        case 'ORDER_TRADE_UPDATE':
            if (message.o.X === 'FILLED') {
                tradingState.addAlert('FUTURES_ORDER_FILLED', 
                    `Futures: ${message.o.s} ${message.o.S} ${message.o.q} @ ${message.o.L}`, 'medium');
            }
            break;
    }
}

// WebSocket para Market Data (Funding Rates)
function createMarketDataStream() {
    const wsUrl = 'wss://fstream.binance.com/ws/!markPrice@arr';
    
    console.log('📈 Conectando a Market Data Stream...');
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
        console.log('✅ Market Data Stream conectado');
    });
    
    ws.on('message', (data) => {
        try {
            const messages = JSON.parse(data);
            
            if (Array.isArray(messages)) {
                messages.forEach(msg => {
                    if (msg.s && msg.s.endsWith('USDT')) {
                        tradingState.updateFundingRate(msg.s, msg.r, msg.T);
                    }
                });
                
                // Log cada 100 actualizaciones
                if (messages.length > 100) {
                    console.log(`📊 ${messages.length} funding rates actualizados`);
                }
            }
            
        } catch (error) {
            console.log('❌ Error procesando market data:', error.message);
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 Market Data Stream desconectado - reconectando...');
        setTimeout(() => createMarketDataStream(), 5000);
    });
    
    return ws;
}

// Análisis predictivo simple
class PredictiveAnalysis {
    constructor() {
        this.priceHistory = new Map();
        this.fundingHistory = new Map();
    }
    
    addPriceData(symbol, price) {
        if (!this.priceHistory.has(symbol)) {
            this.priceHistory.set(symbol, []);
        }
        
        const history = this.priceHistory.get(symbol);
        history.push({ price: parseFloat(price), timestamp: Date.now() });
        
        // Mantener solo últimos 100 puntos
        if (history.length > 100) {
            history.shift();
        }
    }
    
    calculateTrend(symbol, periods = 10) {
        const history = this.priceHistory.get(symbol);
        if (!history || history.length < periods) return null;
        
        const recent = history.slice(-periods);
        const firstPrice = recent[0].price;
        const lastPrice = recent[recent.length - 1].price;
        
        const trend = (lastPrice - firstPrice) / firstPrice * 100;
        
        return {
            symbol,
            trend: trend.toFixed(4),
            direction: trend > 0 ? 'UP' : 'DOWN',
            strength: Math.abs(trend) > 1 ? 'STRONG' : 'WEAK'
        };
    }
    
    predictNextMove(symbol) {
        const trend = this.calculateTrend(symbol);
        if (!trend) return null;
        
        const fundingData = tradingState.fundingRates.get(symbol);
        if (!fundingData) return null;
        
        // Lógica simple de predicción
        let confidence = 50; // Base 50%
        
        // Si trend y funding van en direcciones opuestas, mayor probabilidad de reversión
        if ((trend.direction === 'UP' && fundingData.rate > 0) ||
            (trend.direction === 'DOWN' && fundingData.rate < 0)) {
            confidence += 20;
        }
        
        // Si funding rate es muy alto, mayor probabilidad de reversión
        if (Math.abs(fundingData.rate) > 0.001) {
            confidence += 15;
        }
        
        return {
            symbol,
            prediction: trend.direction === 'UP' ? 'Possible reversal DOWN' : 'Possible reversal UP',
            confidence: Math.min(confidence, 95),
            reasoning: `Trend ${trend.direction}, Funding ${fundingData.rate > 0 ? 'Long pays Short' : 'Short pays Long'}`
        };
    }
}

const predictiveAnalysis = new PredictiveAnalysis();

// Reporte en tiempo real
function generateRealTimeReport() {
    console.clear();
    console.log('🚀 SISTEMA WEBSOCKET EN TIEMPO REAL');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`⏰ ${new Date().toLocaleString()}`);
    console.log('');
    
    // Balance en tiempo real
    console.log('💰 BALANCE EN TIEMPO REAL:');
    console.log(`   📊 SPOT: ${tradingState.balance.spot.toFixed(6)} USDT`);
    console.log(`   🚀 FUTURES: ${tradingState.balance.futures.toFixed(6)} USDT`);
    console.log(`   💎 TOTAL: ${tradingState.balance.total.toFixed(6)} USDT`);
    console.log(`   📈 PNL: ${tradingState.balance.unrealizedPNL.toFixed(6)} USDT`);
    
    // Posiciones activas
    const activePositions = Array.from(tradingState.positions.values()).filter(p => p.positionAmt !== 0);
    if (activePositions.length > 0) {
        console.log('\n🎯 POSICIONES EN VIVO:');
        activePositions.forEach(pos => {
            const side = pos.positionAmt > 0 ? 'LONG' : 'SHORT';
            const pnlColor = pos.unrealizedProfit >= 0 ? '📈' : '📉';
            console.log(`   ${pnlColor} ${pos.symbol}: ${side} ${Math.abs(pos.positionAmt)} (PNL: ${pos.unrealizedProfit.toFixed(4)} USDT)`);
        });
    }
    
    // Top oportunidades en tiempo real
    const topOps = tradingState.getTopOpportunities(3);
    if (topOps.length > 0) {
        console.log('\n🏆 TOP OPORTUNIDADES LIVE:');
        topOps.forEach((opp, i) => {
            console.log(`   ${i+1}. ${opp.symbol}: ${opp.aprEstimate.toFixed(2)}% APR (${opp.direction})`);
        });
    }
    
    // Alertas recientes
    const recentAlerts = tradingState.alerts.slice(0, 5);
    if (recentAlerts.length > 0) {
        console.log('\n🚨 ALERTAS RECIENTES:');
        recentAlerts.forEach(alert => {
            const icon = alert.priority === 'high' ? '🚨' : alert.priority === 'medium' ? '⚠️' : 'ℹ️';
            console.log(`   ${icon} ${alert.message} (${alert.timestamp.toLocaleTimeString()})`);
        });
    }
    
    // Predicciones
    const predictions = topOps.map(opp => predictiveAnalysis.predictNextMove(opp.symbol)).filter(p => p);
    if (predictions.length > 0) {
        console.log('\n🔮 PREDICCIONES IA:');
        predictions.forEach(pred => {
            console.log(`   🤖 ${pred.symbol}: ${pred.prediction} (${pred.confidence}% confianza)`);
        });
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
}

// Sistema principal
async function startWebSocketSystem() {
    console.log('🌐 INICIANDO SISTEMA WEBSOCKET AVANZADO');
    console.log('🔄 Conectando a streams en tiempo real...');
    console.log('');
    
    try {
        // Obtener Listen Keys
        const spotListenKey = await getListenKey('spot');
        const futuresListenKey = await getListenKey('futures');
        
        if (!spotListenKey || !futuresListenKey) {
            throw new Error('No se pudieron obtener Listen Keys');
        }
        
        // Crear conexiones WebSocket
        const spotWs = createUserDataStream(spotListenKey, 'spot');
        const futuresWs = createUserDataStream(futuresListenKey, 'futures');
        const marketWs = createMarketDataStream();
        
        // Renovar Listen Keys cada 30 minutos
        setInterval(() => {
            keepAliveListenKey(spotListenKey, 'spot');
            keepAliveListenKey(futuresListenKey, 'futures');
        }, 30 * 60 * 1000);
        
        // Reporte en tiempo real cada 10 segundos
        setInterval(generateRealTimeReport, 10000);
        
        // Guardar estado cada 5 minutos
        setInterval(async () => {
            try {
                const stateSnapshot = {
                    timestamp: new Date().toISOString(),
                    balance: tradingState.balance,
                    positions: Array.from(tradingState.positions.entries()),
                    topOpportunities: tradingState.getTopOpportunities(10),
                    recentAlerts: tradingState.alerts.slice(0, 20)
                };
                
                await fs.writeFile(
                    `realtime-state-${new Date().toISOString().split('T')[0]}.json`,
                    JSON.stringify(stateSnapshot, null, 2)
                );
                
                console.log('💾 Estado en tiempo real guardado');
                
            } catch (error) {
                console.log('❌ Error guardando estado:', error.message);
            }
        }, 5 * 60 * 1000);
        
        console.log('✅ Sistema WebSocket completamente activo');
        console.log('📊 Monitoring en tiempo real iniciado');
        console.log('🤖 IA predictiva activada');
        
        // Reporte inicial
        setTimeout(generateRealTimeReport, 2000);
        
    } catch (error) {
        console.log('❌ Error iniciando sistema WebSocket:', error.message);
    }
}

// Manejar cierre limpio
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando sistema WebSocket...');
    
    // Guardar estado final
    const finalState = {
        timestamp: new Date().toISOString(),
        balance: tradingState.balance,
        positions: Array.from(tradingState.positions.entries()),
        alerts: tradingState.alerts,
        sessionDuration: Date.now()
    };
    
    await fs.writeFile(`final-state-${Date.now()}.json`, JSON.stringify(finalState, null, 2));
    console.log('💾 Estado final guardado');
    
    process.exit(0);
});

// Iniciar sistema
startWebSocketSystem().catch(console.error);
