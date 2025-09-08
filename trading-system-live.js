#!/usr/bin/env node
/**
 * SISTEMA DE TRADING EN VIVO
 * Incluye transferencias, conversiones y trading automático
 * USANDO BALANCE REAL: $44+ USDT
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
const TIMESTAMP_OFFSET = -5000;

function getBinanceTimestamp() {
    return Date.now() + TIMESTAMP_OFFSET;
}

function createSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

// FUNCIÓN 1: TRANSFERENCIAS UNIVERSALES
async function universalTransfer(type, asset, amount, fromSymbol = null, toSymbol = null) {
    console.log(`💸 TRANSFERENCIA UNIVERSAL: ${amount} ${asset}`);
    console.log(`   Tipo: ${type}`);
    
    try {
        const timestamp = getBinanceTimestamp();
        const params = {
            type,
            asset,
            amount,
            timestamp
        };
        
        if (fromSymbol) params.fromSymbol = fromSymbol;
        if (toSymbol) params.toSymbol = toSymbol;
        
        const queryString = Object.entries(params)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.post(`${BASE_URL}/sapi/v1/asset/transfer`, null, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { ...params, signature },
            timeout: 15000
        });
        
        console.log('✅ Transferencia exitosa:', response.data);
        return { success: true, data: response.data };
        
    } catch (error) {
        const errorMsg = error.response?.data?.msg || error.message;
        console.log('❌ Error en transferencia:', errorMsg);
        return { success: false, error: errorMsg };
    }
}

// FUNCIÓN 2: CONVERTIR ASSETS
async function convertAsset(fromAsset, toAsset, fromAmount) {
    console.log(`🔄 CONVERTIR: ${fromAmount} ${fromAsset} → ${toAsset}`);
    
    try {
        // Primero obtener quote
        const timestamp = getBinanceTimestamp();
        const quoteParams = {
            fromAsset,
            toAsset,
            fromAmount,
            timestamp
        };
        
        const quoteQueryString = Object.entries(quoteParams)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        
        const quoteSignature = createSignature(quoteQueryString, API_SECRET);
        
        const quoteResponse = await axios.post(`${BASE_URL}/sapi/v1/convert/getQuote`, null, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { ...quoteParams, signature: quoteSignature },
            timeout: 10000
        });
        
        const quote = quoteResponse.data;
        console.log(`💱 Quote obtenido: ${quote.toAmount} ${toAsset} (Rate: ${quote.ratio})`);
        
        // Confirmar conversión
        const confirmTimestamp = getBinanceTimestamp();
        const confirmParams = {
            quoteId: quote.quoteId,
            timestamp: confirmTimestamp
        };
        
        const confirmQueryString = Object.entries(confirmParams)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        
        const confirmSignature = createSignature(confirmQueryString, API_SECRET);
        
        const confirmResponse = await axios.post(`${BASE_URL}/sapi/v1/convert/acceptQuote`, null, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: { ...confirmParams, signature: confirmSignature },
            timeout: 10000
        });
        
        console.log('✅ Conversión exitosa:', confirmResponse.data);
        return { success: true, quote, conversion: confirmResponse.data };
        
    } catch (error) {
        const errorMsg = error.response?.data?.msg || error.message;
        console.log('❌ Error en conversión:', errorMsg);
        return { success: false, error: errorMsg };
    }
}

// FUNCIÓN 3: CREAR BOT DE TRADING
async function createTradingBot(symbol, strategy, investment, leverage = 5) {
    console.log(`🤖 CREANDO BOT DE TRADING:`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Strategy: ${strategy}`);
    console.log(`   Investment: ${investment} USDT`);
    console.log(`   Leverage: ${leverage}x`);
    
    const botData = {
        id: `bot_${Date.now()}`,
        name: `AutoBot_${symbol}_${strategy}`,
        symbol,
        strategyType: strategy,
        investment: parseFloat(investment),
        leverage: parseInt(leverage),
        autoManaged: true,
        apiKey: API_KEY,
        apiSecret: API_SECRET
    };
    
    try {
        const response = await axios.post('http://localhost:3001/api/v1/launch-bot', botData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });
        
        console.log('✅ Bot creado exitosamente!');
        console.log('🤖 Detalles del bot:', response.data);
        return { success: true, bot: response.data };
        
    } catch (error) {
        const errorMsg = error.response?.data?.details || error.message;
        console.log('❌ Error creando bot:', errorMsg);
        return { success: false, error: errorMsg };
    }
}

// FUNCIÓN 4: OBTENER OPORTUNIDADES DE FUNDING
async function getFundingOpportunities() {
    console.log('📊 OBTENIENDO MEJORES OPORTUNIDADES DE FUNDING...');
    
    try {
        const response = await axios.get(`${FUTURES_URL}/fapi/v1/premiumIndex`, {
            timeout: 10000
        });
        
        const opportunities = response.data
            .filter(item => item.symbol.endsWith('USDT'))
            .map(item => ({
                symbol: item.symbol,
                fundingRate: parseFloat(item.lastFundingRate),
                aprEstimate: Math.abs(parseFloat(item.lastFundingRate)) * 3 * 365 * 100
            }))
            .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
            .slice(0, 10);
        
        console.log('🏆 TOP 10 OPORTUNIDADES:');
        opportunities.forEach((opp, i) => {
            const direction = opp.fundingRate > 0 ? 'SHORT PERP' : 'LONG PERP';
            console.log(`   ${i+1}. ${opp.symbol}: ${(opp.aprEstimate).toFixed(2)}% APR (${direction})`);
        });
        
        return opportunities;
        
    } catch (error) {
        console.log('❌ Error obteniendo oportunidades:', error.message);
        return [];
    }
}

// FUNCIÓN 5: MONITOREO EN TIEMPO REAL
async function startRealTimeMonitoring() {
    console.log('👁️ INICIANDO MONITOREO EN TIEMPO REAL...');
    
    const monitorInterval = setInterval(async () => {
        try {
            // Obtener balance actual
            const balance = await getCurrentBalance();
            
            // Obtener bots activos
            const botsResponse = await axios.get('http://localhost:3001/api/v1/bots');
            const activeBots = botsResponse.data;
            
            // Obtener estado del rebalancer
            const rebalancerResponse = await axios.get('http://localhost:3001/api/v1/rebalancer/status');
            const rebalancer = rebalancerResponse.data;
            
            console.log('\n📊 MONITOREO EN VIVO:');
            console.log(`💰 Balance Total: ${balance.total} USDT`);
            console.log(`🤖 Bots Activos: ${activeBots.length}`);
            console.log(`⚖️ Rebalancer: ${rebalancer.status}`);
            console.log(`🕒 ${new Date().toLocaleTimeString()}`);
            
        } catch (error) {
            console.log('⚠️ Error en monitoreo:', error.message);
        }
    }, 60000); // Cada 1 minuto
    
    return monitorInterval;
}

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
        
        return {
            spot: spotUSDT,
            futures: futuresUSDT,
            total: spotUSDT + futuresUSDT
        };
        
    } catch (error) {
        return { spot: 0, futures: 0, total: 0 };
    }
}

// FUNCIÓN PRINCIPAL
async function main() {
    console.log('🚀 SISTEMA DE TRADING EN VIVO ACTIVADO');
    console.log('═══════════════════════════════════════');
    console.log(`💰 Capital disponible: ~$44 USDT`);
    console.log(`🕒 Inicio: ${new Date().toLocaleString()}`);
    console.log('');
    
    // 1. Obtener balance inicial
    const initialBalance = await getCurrentBalance();
    console.log(`💎 Balance inicial: ${initialBalance.total.toFixed(6)} USDT`);
    console.log(`   📊 SPOT: ${initialBalance.spot.toFixed(6)} USDT`);
    console.log(`   🚀 FUTURES: ${initialBalance.futures.toFixed(6)} USDT`);
    
    // 2. Obtener mejores oportunidades
    const opportunities = await getFundingOpportunities();
    
    if (opportunities.length > 0) {
        console.log('\n🎯 SELECCIONANDO MEJOR OPORTUNIDAD...');
        const bestOpp = opportunities[0];
        const strategy = bestOpp.fundingRate > 0 ? 'Short Perp' : 'Long Perp';
        
        console.log(`🏆 Mejor oportunidad: ${bestOpp.symbol}`);
        console.log(`📈 APR estimado: ${bestOpp.aprEstimate.toFixed(2)}%`);
        console.log(`🎯 Estrategia: ${strategy}`);
        
        // 3. Crear bot con 80% del balance futures
        const investmentAmount = initialBalance.futures * 0.8;
        
        if (investmentAmount >= 10) {
            console.log(`\n🤖 CREANDO BOT CON $${investmentAmount.toFixed(2)} USDT...`);
            
            const botResult = await createTradingBot(
                bestOpp.symbol,
                strategy,
                investmentAmount.toFixed(2),
                3 // Leverage conservador
            );
            
            if (botResult.success) {
                console.log('✅ BOT DE TRADING ACTIVO!');
            }
        } else {
            console.log('⚠️ Balance insuficiente para crear bot (mínimo $10)');
        }
    }
    
    // 4. Test de conversión (pequeña cantidad)
    console.log('\n🔄 PROBANDO FUNCIÓN DE CONVERSIÓN...');
    if (initialBalance.spot > 0.1) {
        const convertResult = await convertAsset('USDT', 'BNB', '0.1');
        if (convertResult.success) {
            console.log('✅ Función de conversión operativa');
        }
    }
    
    // 5. Test de transferencia
    console.log('\n💸 PROBANDO FUNCIÓN DE TRANSFERENCIA...');
    const transferResult = await universalTransfer('MAIN_UMFUTURE', 'USDT', '1');
    if (transferResult.success) {
        console.log('✅ Sistema de transferencias operativo');
    }
    
    // 6. Iniciar monitoreo
    console.log('\n👁️ INICIANDO MONITOREO CONTINUO...');
    const monitoringInterval = await startRealTimeMonitoring();
    
    console.log('\n🎉 SISTEMA DE TRADING COMPLETAMENTE ACTIVO');
    console.log('════════════════════════════════════════');
    console.log('El sistema está operando con fondos reales.');
    console.log('Monitoreo cada 1 minuto.');
    console.log('Presiona Ctrl+C para detener.');
    
    // Mantener el script corriendo
    process.on('SIGINT', () => {
        console.log('\n🛑 Deteniendo sistema de trading...');
        clearInterval(monitoringInterval);
        process.exit(0);
    });
}

// Ejecutar siempre la función principal
main().catch(console.error);

export {
    universalTransfer,
    convertAsset,
    createTradingBot,
    getFundingOpportunities,
    startRealTimeMonitoring,
    getCurrentBalance
};
