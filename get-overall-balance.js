#!/usr/bin/env node
/**
 * Binance Overall Balance Checker
 * Obtiene el balance consolidado de TODAS las cuentas y wallets
 */

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: ['.env.local', '.env'] });

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const TIMESTAMP_OFFSET = parseInt(process.env.TIMESTAMP_OFFSET) || 0;

const BASE_URL = 'https://api.binance.com';
const FUTURES_URL = 'https://fapi.binance.com';

function createSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

async function getUniversalTransferHistory() {
    console.log('📊 OBTENIENDO HISTORIAL DE TRANSFERENCIAS UNIVERSALES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        const timestamp = Date.now() + TIMESTAMP_OFFSET;
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.get(`${BASE_URL}/sapi/v1/asset/query/trading-fee`, {
            headers: {
                'X-MBX-APIKEY': API_KEY
            },
            params: {
                timestamp,
                signature
            },
            timeout: 10000
        });

        console.log('✅ Información de trading fees obtenida');
        return response.data;
        
    } catch (error) {
        console.log('⚠️ No se pudo obtener historial de transferencias:', error.response?.data?.msg || error.message);
        return null;
    }
}

async function getWalletBalance() {
    console.log('💼 OBTENIENDO BALANCE CONSOLIDADO DE WALLET');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        const timestamp = Date.now() + TIMESTAMP_OFFSET;
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.get(`${BASE_URL}/sapi/v3/asset/getUserAsset`, {
            headers: {
                'X-MBX-APIKEY': API_KEY
            },
            params: {
                timestamp,
                signature
            },
            timeout: 10000
        });

        console.log('✅ Balance consolidado obtenido');
        return response.data;
        
    } catch (error) {
        console.log('⚠️ No se pudo obtener balance consolidado:', error.response?.data?.msg || error.message);
        return null;
    }
}

async function getCapitalBalance() {
    console.log('🏦 OBTENIENDO BALANCE GENERAL DE CAPITAL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        const timestamp = Date.now() + TIMESTAMP_OFFSET;
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, API_SECRET);
        
        const response = await axios.get(`${BASE_URL}/sapi/v3/capital/config/getall`, {
            headers: {
                'X-MBX-APIKEY': API_KEY
            },
            params: {
                timestamp,
                signature
            },
            timeout: 10000
        });

        console.log('✅ Configuración de capital obtenida');
        return response.data;
        
    } catch (error) {
        console.log('⚠️ No se pudo obtener configuración de capital:', error.response?.data?.msg || error.message);
        return null;
    }
}

async function getAccountSnapshot() {
    console.log('📸 OBTENIENDO SNAPSHOT DE CUENTA COMPLETA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        // Spot snapshot
        const spotTimestamp = Date.now() + TIMESTAMP_OFFSET;
        const spotQueryString = `type=SPOT&timestamp=${spotTimestamp}`;
        const spotSignature = createSignature(spotQueryString, API_SECRET);
        
        const spotSnapshot = await axios.get(`${BASE_URL}/sapi/v1/accountSnapshot`, {
            headers: {
                'X-MBX-APIKEY': API_KEY
            },
            params: {
                type: 'SPOT',
                timestamp: spotTimestamp,
                signature: spotSignature
            },
            timeout: 10000
        });

        console.log('✅ Snapshot SPOT obtenido');
        
        // Futures snapshot
        const futuresTimestamp = Date.now() + TIMESTAMP_OFFSET;
        const futuresQueryString = `type=FUTURES&timestamp=${futuresTimestamp}`;
        const futuresSignature = createSignature(futuresQueryString, API_SECRET);
        
        const futuresSnapshot = await axios.get(`${BASE_URL}/sapi/v1/accountSnapshot`, {
            headers: {
                'X-MBX-APIKEY': API_KEY
            },
            params: {
                type: 'FUTURES',
                timestamp: futuresTimestamp,
                signature: futuresSignature
            },
            timeout: 10000
        });

        console.log('✅ Snapshot FUTURES obtenido');
        
        return {
            spot: spotSnapshot.data,
            futures: futuresSnapshot.data
        };
        
    } catch (error) {
        console.log('⚠️ No se pudo obtener snapshot:', error.response?.data?.msg || error.message);
        return null;
    }
}

async function getDetailedPortfolioBalance() {
    console.log('📈 ANÁLISIS DETALLADO DEL PORTFOLIO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const results = {
        spot: null,
        futures: null,
        wallet: null,
        snapshot: null,
        overall: {
            totalUSDT: 0,
            totalBTC: 0,
            accounts: {},
            summary: {}
        }
    };
    
    // Get individual balances first (we know these work)
    try {
        // Spot balance
        const spotTimestamp = Date.now() + TIMESTAMP_OFFSET;
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
        
        results.spot = spotResponse.data;
        
        // Calculate spot USDT and all spot assets value
        const spotUSDT = results.spot.balances
            .filter(b => b.asset === 'USDT')
            .reduce((total, b) => total + parseFloat(b.free) + parseFloat(b.locked), 0);
        
        // Get current prices to calculate total spot value
        try {
            const pricesResponse = await axios.get(`${BASE_URL}/api/v3/ticker/price`);
            const prices = {};
            pricesResponse.data.forEach(p => {
                prices[p.symbol] = parseFloat(p.price);
            });
            
            let totalSpotValue = 0;
            results.spot.balances.forEach(balance => {
                const total = parseFloat(balance.free) + parseFloat(balance.locked);
                if (total > 0) {
                    if (balance.asset === 'USDT') {
                        totalSpotValue += total;
                    } else {
                        const symbol = balance.asset + 'USDT';
                        const price = prices[symbol];
                        if (price) {
                            totalSpotValue += total * price;
                        }
                    }
                }
            });
            
            results.overall.accounts.spot = { USDT: spotUSDT, totalValue: totalSpotValue };
            results.overall.totalUSDT += totalSpotValue; // Use total spot value, not just USDT
        } catch (priceError) {
            console.log('⚠️ Could not get prices for spot asset valuation, using USDT only');
            results.overall.accounts.spot = { USDT: spotUSDT };
            results.overall.totalUSDT += spotUSDT;
        }
        
        console.log(`✅ SPOT: ${spotUSDT.toFixed(6)} USDT`);
        
    } catch (error) {
        console.log('❌ Error obteniendo balance SPOT:', error.response?.data?.msg || error.message);
    }
    
    try {
        // Futures balance
        const futuresTimestamp = Date.now() + TIMESTAMP_OFFSET;
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
        
        results.futures = futuresResponse.data;
        
        const futuresUSDT = parseFloat(results.futures.totalWalletBalance);
        results.overall.accounts.futures = { USDT: futuresUSDT };
        results.overall.totalUSDT += futuresUSDT;
        
        console.log(`✅ FUTURES: ${futuresUSDT.toFixed(6)} USDT`);
        
    } catch (error) {
        console.log('❌ Error obteniendo balance FUTURES:', error.response?.data?.msg || error.message);
    }
    
    // Try to get additional wallet information
    results.wallet = await getWalletBalance();
    results.snapshot = await getAccountSnapshot();
    
    // Calculate overall summary
    results.overall.summary = {
        totalAccounts: Object.keys(results.overall.accounts).length,
        totalUSDTValue: results.overall.totalUSDT,
        largestAccount: results.overall.totalUSDT > 0 ? 
            (results.overall.accounts.futures?.USDT > results.overall.accounts.spot?.USDT ? 'FUTURES' : 'SPOT') : 
            'NONE',
        tradingReady: results.overall.totalUSDT >= 10
    };
    
    return results;
}

async function main() {
    console.log('🌍 VERIFICACIÓN COMPLETA DE BALANCE GENERAL (OVERALL)');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🔑 API Key: ${API_KEY?.substring(0, 8)}...${API_KEY?.slice(-8)}`);
    
    if (!API_KEY || !API_SECRET) {
        console.log('❌ ERROR: No se encontraron las credenciales de API');
        return;
    }
    
    const portfolioBalance = await getDetailedPortfolioBalance();
    
    console.log('\n💎 RESUMEN OVERALL BALANCE');
    console.log('══════════════════════════════');
    console.log(`💰 TOTAL PORTFOLIO VALUE: $${portfolioBalance.overall.totalUSDT.toFixed(2)}`);
    console.log(`🏦 Cuentas Activas: ${portfolioBalance.overall.summary.totalAccounts}`);
    console.log(`👑 Cuenta Principal: ${portfolioBalance.overall.summary.largestAccount}`);
    console.log(`🚀 Listo para Trading: ${portfolioBalance.overall.summary.tradingReady ? 'SÍ' : 'NO'}`);
    
    console.log('\n📊 DESGLOSE POR CUENTA:');
    console.log('─────────────────────────');
    Object.entries(portfolioBalance.overall.accounts).forEach(([account, balances]) => {
        if (balances.totalValue) {
            console.log(`${account.toUpperCase()}: $${balances.totalValue.toFixed(2)} (USDT: $${balances.USDT?.toFixed(2) || '0.00'})`);
        } else {
            console.log(`${account.toUpperCase()}: $${balances.USDT?.toFixed(2) || '0.00'}`);
        }
    });
    
    // Additional wallet info if available
    if (portfolioBalance.wallet && Array.isArray(portfolioBalance.wallet)) {
        console.log('\n🏦 INFORMACIÓN ADICIONAL DE WALLETS:');
        console.log('─────────────────────────────────────');
        portfolioBalance.wallet
            .filter(asset => parseFloat(asset.free) > 0.001)
            .forEach(asset => {
                console.log(`${asset.asset}: ${parseFloat(asset.free).toFixed(6)} (Free: ${asset.free}, Locked: ${asset.locked})`);
            });
    }
    
    // Snapshot info if available
    if (portfolioBalance.snapshot) {
        console.log('\n📸 INFORMACIÓN DE SNAPSHOT:');
        console.log('─────────────────────────────');
        if (portfolioBalance.snapshot.spot && portfolioBalance.snapshot.spot.snapshotVos.length > 0) {
            const latestSpot = portfolioBalance.snapshot.spot.snapshotVos[0];
            console.log(`SPOT Snapshot: ${latestSpot.data.totalAssetOfBtc} BTC total`);
        }
        if (portfolioBalance.snapshot.futures && portfolioBalance.snapshot.futures.snapshotVos.length > 0) {
            const latestFutures = portfolioBalance.snapshot.futures.snapshotVos[0];
            console.log(`FUTURES Snapshot: ${latestFutures.data.totalWalletBalance} USDT total`);
        }
    }
    
    console.log('\n🎯 CONCLUSIÓN:');
    console.log('──────────────');
    if (portfolioBalance.overall.totalUSDT >= 50) {
        console.log('🟢 EXCELENTE: Balance suficiente para trading activo y diversificado');
    } else if (portfolioBalance.overall.totalUSDT >= 10) {
        console.log('🟡 BUENO: Balance adecuado para trading con gestión de riesgo');
    } else if (portfolioBalance.overall.totalUSDT > 0) {
        console.log('🟠 LIMITADO: Balance bajo, considera depositar más fondos');
    } else {
        console.log('🔴 CRÍTICO: Sin balance suficiente para trading');
    }
    
    return portfolioBalance;
}

main().catch(console.error);
