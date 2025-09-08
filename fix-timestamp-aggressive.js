#!/usr/bin/env node
/**
 * Aggressive Binance Timestamp Fix
 * Prueba múltiples offsets para encontrar el correcto
 */

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = 'https://api.binance.com';
const FUTURES_URL = 'https://fapi.binance.com';

function createSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

async function testTimestampWithOffset(offsetMs) {
    const timestamp = Date.now() + offsetMs;
    const queryString = `timestamp=${timestamp}`;
    const signature = createSignature(queryString, API_SECRET);
    
    try {
        const response = await axios.get(`${BASE_URL}/api/v3/account`, {
            headers: {
                'X-MBX-APIKEY': API_KEY
            },
            params: {
                timestamp,
                signature
            },
            timeout: 5000
        });
        
        return { success: true, offset: offsetMs, response: response.data };
    } catch (error) {
        return { 
            success: false, 
            offset: offsetMs, 
            error: error.response?.data?.msg || error.message 
        };
    }
}

async function findWorkingOffset() {
    console.log('🔍 BUSCANDO OFFSET CORRECTO PARA TIMESTAMP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Probar diferentes offsets negativos (tiempo hacia atrás)
    const offsetsToTest = [
        -2000, -1500, -1000, -800, -600, -400, -200, -100, -50,
        0, 50, 100, 200, 400, 600, 800, 1000, 1500, 2000
    ];
    
    for (const offset of offsetsToTest) {
        console.log(`🧪 Probando offset: ${offset}ms...`);
        
        const result = await testTimestampWithOffset(offset);
        
        if (result.success) {
            console.log(`✅ ÉXITO con offset: ${offset}ms`);
            return offset;
        } else {
            console.log(`❌ Falló con offset ${offset}ms: ${result.error}`);
        }
        
        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('❌ No se encontró un offset que funcione');
    return null;
}

async function testFullBalance(workingOffset) {
    console.log(`\n💰 PROBANDO BALANCE COMPLETO CON OFFSET: ${workingOffset}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        // Test SPOT
        const spotTimestamp = Date.now() + workingOffset;
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
        const futuresTimestamp = Date.now() + workingOffset;
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
        
        return { spotUSDT, futuresUSDT, totalBalance };
        
    } catch (error) {
        console.log('❌ Error en balance completo:', error.response?.data?.msg || error.message);
        return null;
    }
}

async function createTimestampHelper(offset) {
    console.log('\n📝 CREANDO HELPER DE TIMESTAMP CORREGIDO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const helperCode = `// Binance Timestamp Helper - CORREGIDO
// Offset calculado automáticamente: ${offset}ms

const BINANCE_TIME_OFFSET = ${offset};

function getBinanceTimestamp() {
    return Date.now() + BINANCE_TIME_OFFSET;
}

function createBinanceSignature(queryString, apiSecret) {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
}

// Función helper para crear requests autenticados
function createAuthenticatedRequest(params, apiSecret) {
    const timestamp = getBinanceTimestamp();
    const paramsWithTimestamp = { ...params, timestamp };
    
    const queryString = Object.entries(paramsWithTimestamp)
        .map(([key, value]) => \`\${key}=\${value}\`)
        .join('&');
    
    const signature = createBinanceSignature(queryString, apiSecret);
    
    return {
        params: { ...paramsWithTimestamp, signature },
        timestamp,
        queryString
    };
}

module.exports = {
    getBinanceTimestamp,
    createBinanceSignature,
    createAuthenticatedRequest,
    BINANCE_TIME_OFFSET: ${offset}
};

// Para debugging:
console.log('🕒 Timestamp Helper cargado con offset:', ${offset}, 'ms');
`;

    const fs = await import('fs');
    fs.writeFileSync('./timestamp-helper.js', helperCode);
    
    console.log(`✅ Helper guardado: timestamp-helper.js`);
    console.log(`📊 Offset final: ${offset}ms`);
}

async function main() {
    console.log('🚨 ARREGLO AGRESIVO DE TIMESTAMP PARA TRADING');
    console.log('═══════════════════════════════════════════════');
    
    if (!API_KEY || !API_SECRET) {
        console.log('❌ No hay credenciales API');
        return;
    }
    
    // Encontrar el offset que funciona
    const workingOffset = await findWorkingOffset();
    
    if (workingOffset !== null) {
        console.log(`\n🎉 OFFSET ENCONTRADO: ${workingOffset}ms`);
        
        // Probar balance completo
        const balanceResult = await testFullBalance(workingOffset);
        
        if (balanceResult) {
            console.log('\n✅ TIMESTAMP COMPLETAMENTE ARREGLADO');
            console.log('═══════════════════════════════════════');
            
            // Crear helper
            await createTimestampHelper(workingOffset);
            
            console.log('\n🚀 TRADING AHORA HABILITADO');
            console.log('Usa el archivo timestamp-helper.js en tus scripts');
            
        } else {
            console.log('\n❌ Balance test falló con el offset encontrado');
        }
    } else {
        console.log('\n💥 CRÍTICO: No se pudo encontrar un offset que funcione');
        console.log('═══════════════════════════════════════════════════');
        console.log('Posibles causas:');
        console.log('1. Problema de conectividad severo');
        console.log('2. API keys inválidas o expiradas');
        console.log('3. Restricción IP o geográfica');
        console.log('4. Problema del reloj del sistema muy severo');
    }
}

main().catch(console.error);
