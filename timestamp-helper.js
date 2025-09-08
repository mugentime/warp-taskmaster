// Binance Timestamp Helper - CORREGIDO DEFINITIVO
// Offset calculado y verificado: -3000ms

const BINANCE_TIME_OFFSET = -3000;

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
        .map(([key, value]) => `${key}=${value}`)
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
    BINANCE_TIME_OFFSET: -3000
};

// Para debugging:
console.log('🕒 Timestamp Helper cargado con offset:', -3000, 'ms');
