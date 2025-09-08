#!/usr/bin/env node
/**
 * Binance Timestamp Fix
 * Calcula el offset de tiempo con Binance y lo usa para trading
 */

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = 'https://api.binance.com';
const FUTURES_URL = 'https://fapi.binance.com';

let timeOffset = 0;

async function getBinanceServerTime() {
    try {
        const response = await axios.get(`${BASE_URL}/api/v3/time`);
        return response.data.serverTime;
    } catch (error) {
        console.log('❌ Error obteniendo tiempo de Binance:', error.message);
        return null;
    }
}

async function calculateTimeOffset() {
    console.log('⏰ CALCULANDO OFFSET DE TIEMPO CON BINANCE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const localTime = Date.now();
    const serverTime = await getBinanceServerTime();
    
    if (serverTime) {
        timeOffset = serverTime - localTime;
        console.log(`🕒 Tiempo Local: ${new Date(localTime).toISOString()}`);
        console.log(`🌐 Tiempo Binance: ${new Date(serverTime).toISOString()}`);
        console.log(`📊 Offset: ${timeOffset} ms`);
        
        if (Math.abs(timeOffset) > 1000) {
            console.log(`⚠️ WARNING: Offset grande (${timeOffset}ms) - puede afectar trading`);
        } else {
            console.log(`✅ Offset aceptable (${timeOffset}ms)`);
        }
        
        return timeOffset;
    } else {
        console.log('❌ No se pudo obtener tiempo del servidor');
        return 0;
    }
}

function getAdjustedTimestamp() {
    return Date.now() + timeOffset;
}

function createSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

async function testWithFixedTimestamp() {
    console.log('\n🧪 PROBANDO CON TIMESTAMP CORREGIDO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!API_KEY || !API_SECRET) {
        console.log('❌ No hay credenciales API');
        return false;
    }
    
    try {
        // Test SPOT
        console.log('💰 Probando SPOT...');
        const spotTimestamp = getAdjustedTimestamp();
        const spotQueryString = `timestamp=${spotTimestamp}`;
        const spotSignature = createSignature(spotQueryString, API_SECRET);
        
        const spotResponse = await axios.get(`${BASE_URL}/api/v3/account`, {
            headers: {
                'X-MBX-APIKEY': API_KEY
            },
            params: {
                timestamp: spotTimestamp,
                signature: spotSignature
            },
            timeout: 10000
        });
        
        const spotUSDT = spotResponse.data.balances
            .filter(b => b.asset === 'USDT')
            .reduce((total, b) => total + parseFloat(b.free) + parseFloat(b.locked), 0);
        
        console.log(`✅ SPOT: ${spotUSDT.toFixed(6)} USDT`);
        
        // Test FUTURES
        console.log('🚀 Probando FUTURES...');
        const futuresTimestamp = getAdjustedTimestamp();
        const futuresQueryString = `timestamp=${futuresTimestamp}`;
        const futuresSignature = createSignature(futuresQueryString, API_SECRET);
        
        const futuresResponse = await axios.get(`${FUTURES_URL}/fapi/v2/account`, {
            headers: {
                'X-MBX-APIKEY': API_KEY
            },
            params: {
                timestamp: futuresTimestamp,
                signature: futuresSignature
            },
            timeout: 10000
        });
        
        const futuresUSDT = parseFloat(futuresResponse.data.totalWalletBalance);
        console.log(`✅ FUTURES: ${futuresUSDT.toFixed(6)} USDT`);
        
        const totalBalance = spotUSDT + futuresUSDT;
        console.log(`💎 BALANCE TOTAL: ${totalBalance.toFixed(6)} USDT`);
        
        return true;
        
    } catch (error) {
        console.log('❌ Error:', error.response?.data?.msg || error.message);
        return false;
    }
}

async function generateFixedTimestampHelper() {
    console.log('\n📝 GENERANDO HELPER PARA TIMESTAMP CORREGIDO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const helperCode = `
// Timestamp Helper - USAR ESTO EN LUGAR DE Date.now()
const BINANCE_TIME_OFFSET = ${timeOffset};

function getBinanceTimestamp() {
    return Date.now() + BINANCE_TIME_OFFSET;
}

// Ejemplo de uso:
// const timestamp = getBinanceTimestamp();
// const queryString = \`timestamp=\${timestamp}\`;

module.exports = { getBinanceTimestamp, BINANCE_TIME_OFFSET: ${timeOffset} };
`;

    // Guardar helper
    const fs = await import('fs');
    const path = await import('path');
    
    const helperPath = path.resolve('../warp-taskmaster/timestamp-helper.js');
    fs.writeFileSync(helperPath, helperCode);
    
    console.log(`✅ Helper guardado en: ${helperPath}`);
    console.log(`📊 Offset configurado: ${timeOffset} ms`);
    
    return helperPath;
}

async function main() {
    console.log('🔧 SOLUCIONANDO PROBLEMA DE TIMESTAMP PARA TRADING');
    console.log('═══════════════════════════════════════════════════');
    
    // Calcular offset
    await calculateTimeOffset();
    
    // Probar con timestamp corregido
    const success = await testWithFixedTimestamp();
    
    if (success) {
        console.log('\n🎉 TIMESTAMP CORREGIDO - TRADING HABILITADO');
        console.log('═══════════════════════════════════════════');
        
        // Generar helper
        await generateFixedTimestampHelper();
        
        console.log('\n📋 SIGUIENTE PASO:');
        console.log('1. Usar getBinanceTimestamp() en lugar de Date.now()');
        console.log('2. El offset ya está calculado y guardado');
        console.log('3. Sistemas de trading ahora funcionarán correctamente');
        
    } else {
        console.log('\n❌ AÚN HAY PROBLEMAS DE TIMESTAMP');
        console.log('═══════════════════════════════════════');
        console.log('Posibles soluciones:');
        console.log('1. Ejecutar como administrador: w32tm /resync /force');
        console.log('2. Verificar conectividad a internet');
        console.log('3. Contactar soporte de Binance si persiste');
    }
}

main().catch(console.error);
