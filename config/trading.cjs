// Load environment variables from .env file
require('dotenv').config({ path: ['.env.local', '.env'] });

/**
 * Centralized Trading Configuration
 * Eliminates ambiguity in boolean parsing and environment detection
 */

// Helper function to parse booleans correctly
const parseBool = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const lowercased = value.toLowerCase().trim();
        return ['1', 'true', 'yes', 'on', 'enabled'].includes(lowercased);
    }
    return false;
};

// Helper function to parse integers with defaults
const parseIntSafe = (value, defaultValue = 0) => {
    const parsed = Number.parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
};

// Environment-based configuration
const BINANCE_ENV = (process.env.BINANCE_ENV || 'live').toLowerCase();
const IS_TESTNET = BINANCE_ENV === 'testnet';

// Trading Configuration
const config = {
    // Environment
    BINANCE_ENV,
    IS_TESTNET,
    NODE_ENV: process.env.NODE_ENV || 'production',
    
    // Trading Mode
    DRY_RUN: parseBool(process.env.DRY_RUN),
    
    // API Configuration
    BINANCE_API_KEY: process.env.BINANCE_API_KEY?.trim() || '',
    BINANCE_API_SECRET: process.env.BINANCE_API_SECRET?.trim() || process.env.BINANCE_SECRET_KEY?.trim() || '',
    
    // Base URLs
    SPOT_BASE_URL: IS_TESTNET 
        ? 'https://testnet.binance.vision'
        : 'https://api.binance.com',
    
    FUTURES_BASE_URL: IS_TESTNET 
        ? 'https://testnet.binancefuture.com'
        : 'https://fapi.binance.com',
    
    // Request Configuration
    RECV_WINDOW: parseIntSafe(process.env.RECV_WINDOW, 10000),
    TIMESTAMP_OFFSET: parseIntSafe(process.env.TIMESTAMP_OFFSET, -2000),
    
    // Rate Limiting
    API_WEIGHT_LIMIT_PER_MINUTE: 1200,
    UID_WEIGHT_LIMIT_PER_MINUTE: 180000,
    
    // Server Configuration
    PORT: parseIntSafe(process.env.PORT, 3001),
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    
    // Trading Limits (Safety)
    MAX_LEVERAGE: parseIntSafe(process.env.MAX_LEVERAGE, 20),
    MIN_ORDER_SIZE_USDT: parseFloat(process.env.MIN_ORDER_SIZE_USDT) || 5.0,
    MAX_ORDER_SIZE_USDT: parseFloat(process.env.MAX_ORDER_SIZE_USDT) || 1000.0,
    
    // Validation
    isValid() {
        const errors = [];
        
        if (!this.BINANCE_API_KEY) {
            errors.push('BINANCE_API_KEY is required');
        }
        
        if (!this.BINANCE_API_SECRET) {
            errors.push('BINANCE_API_SECRET (or BINANCE_SECRET_KEY) is required');
        }
        
        if (this.BINANCE_API_KEY && this.BINANCE_API_KEY.length < 10) {
            errors.push('BINANCE_API_KEY appears to be too short');
        }
        
        if (this.BINANCE_API_SECRET && this.BINANCE_API_SECRET.length < 10) {
            errors.push('BINANCE_API_SECRET appears to be too short');
        }
        
        if (errors.length > 0) {
            return { valid: false, errors };
        }
        
        return { valid: true, errors: [] };
    },
    
    // Get sanitized config for logging (removes secrets)
    getSanitized() {
        return {
            BINANCE_ENV: this.BINANCE_ENV,
            IS_TESTNET: this.IS_TESTNET,
            NODE_ENV: this.NODE_ENV,
            DRY_RUN: this.DRY_RUN,
            SPOT_BASE_URL: this.SPOT_BASE_URL,
            FUTURES_BASE_URL: this.FUTURES_BASE_URL,
            RECV_WINDOW: this.RECV_WINDOW,
            TIMESTAMP_OFFSET: this.TIMESTAMP_OFFSET,
            PORT: this.PORT,
            LOG_LEVEL: this.LOG_LEVEL,
            MAX_LEVERAGE: this.MAX_LEVERAGE,
            MIN_ORDER_SIZE_USDT: this.MIN_ORDER_SIZE_USDT,
            MAX_ORDER_SIZE_USDT: this.MAX_ORDER_SIZE_USDT,
            API_KEY_LENGTH: this.BINANCE_API_KEY?.length || 0,
            API_SECRET_LENGTH: this.BINANCE_API_SECRET?.length || 0,
        };
    }
};

// Only log and validate when run directly (not when imported)
if (require.main === module) {
    // Log configuration at startup
    console.log('🔧 Trading Configuration Loaded:');
    console.log('═══════════════════════════════════');
    const sanitized = config.getSanitized();
    Object.entries(sanitized).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });

    // Validate configuration
    const validation = config.isValid();
    if (!validation.valid) {
        console.error('❌ Configuration Validation Failed:');
        validation.errors.forEach(error => console.error(`   • ${error}`));
        process.exit(1);
    } else {
        console.log('✅ Configuration is valid');
    }

    console.log('═══════════════════════════════════');
}

module.exports = config;
