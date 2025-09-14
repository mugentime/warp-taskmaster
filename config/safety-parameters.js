// Safety and Risk Management Configuration

module.exports = {
  // Global System Parameters
  global: {
    minUsdtBuffer: 10.0,         // Minimum USDT to keep as buffer
    maxPortfolioUtil: 0.95,      // Maximum portfolio utilization (95%)
    emergencyStopLoss: 0.15,     // Emergency stop at 15% portfolio loss
    rebalanceInterval: 300000,   // Rebalance every 5 minutes (300,000ms)
    telegramUpdateFreq: 600000,  // Telegram updates every 10 minutes
  },
  
  // Position-specific Parameters
  positions: {
    HOLOUSDT: {
      maxLeverage: 20,
      minHedgeRatio: 0.70,
      targetHedgeRatio: 0.95,
      maxPositionValue: 250.00,
      minMarginBuffer: 5.00,
      emergencyCloseThreshold: 0.80  // Close at 80% margin usage
    },
    OMNIUSDT: {
      maxLeverage: 25,
      minHedgeRatio: 0.70,
      targetHedgeRatio: 1.00,
      maxPositionValue: 120.00,
      minMarginBuffer: 2.00,
      emergencyCloseThreshold: 0.80
    }
  },

  // Funding Rate Thresholds
  fundingRates: {
    minAcceptable: -0.005,     // -0.5% minimum funding rate
    warningLevel: -0.003,      // Warning at -0.3%
    closeThreshold: -0.001     // Close position at -0.1%
  },

  // Rebalancing Parameters
  rebalancing: {
    triggerThreshold: 0.05,    // Rebalance at 5% deviation
    maxSingleTrade: 20.00,     // Maximum single rebalance trade
    minTradeSize: 5.00,        // Minimum trade size
    cooldownPeriod: 3600000    // 1-hour cooldown between major rebalances
  },

  // Emergency Procedures
  emergency: {
    maxDrawdown: 0.10,         // Maximum 10% drawdown
    maxDailyLoss: 0.05,        // Maximum 5% daily loss
    minHealthScore: 0.60,      // Minimum 60% health score
    recoveryMode: {
      enabled: true,
      maxLeverage: 10,         // Reduced leverage in recovery
      minUsdtBuffer: 20.00,    // Double normal buffer
      cooldownHours: 24
    }
  },

  // Monitoring Thresholds
  monitoring: {
    marginAlert: 0.80,         // Alert at 80% margin usage
    balanceAlert: 0.70,        // Alert at 70% hedge ratio
    fundingAlert: -0.005,      // Alert at -0.5% funding rate
    healthCheckInterval: 60000, // Health check every minute
    maxPositionAge: 2592000000 // Max 30 days position age
  },

  // Notification Settings
  notifications: {
    telegram: {
      enabled: true,
      criticalAlerts: true,    // Immediate notification for critical issues
      dailyReports: true,      // Daily summary reports
      statusUpdates: true      // Regular status updates
    },
    thresholds: {
      profit: 0.01,            // Notify on 1% profit
      loss: 0.02,              // Notify on 2% loss
      margin: 0.75,            // Notify at 75% margin usage
      funding: 0.002           // Notify on 0.2% funding rate change
    }
  }
};
