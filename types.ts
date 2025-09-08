
export interface FundingData {
  symbol: string;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  // Enhanced properties
  fundingRatePercent?: string;
  annualizedRate?: string;
  volume24h?: number;
  quoteVolume24h?: number;
  liquidity?: number;
  priceChange24h?: number;
  liquidityScore?: number;
  riskScore?: number;
  timestamp?: number;
  nextFunding?: string;
}

export interface ArbitrageOpportunity {
  symbol: string;
  fundingRate: number;
  fundingRatePercent: string;
  annualizedRate: string;
  strategy: string;
  rating: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  score: number;
  liquidity: number;
  liquidityScore: number;
  riskScore: number;
  markPrice: number;
  nextFunding: string;
  estimatedReturn8h: string;
  detectedAt: string;
}

export interface FundingRateResponse {
  success: boolean;
  data: FundingData[];
  summary: {
    totalSymbols: number;
    opportunitiesFound: number;
    highOpportunities: number;
    avgFundingRate: string;
  };
  lastUpdated: number;
  cacheAge: number;
}

export interface ArbitrageOpportunitiesResponse {
  success: boolean;
  opportunities: ArbitrageOpportunity[];
  filters: {
    minRating: string;
    limit: number;
  };
  summary: {
    totalOpportunities: number;
    filtered: number;
    ratings: {
      extreme: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  lastUpdated: number;
  cacheAge: number;
}

export interface ActiveBot {
  id: string;
  name: string;
  symbol: string;
  strategyType: 'Short Perp' | 'Long Perp';
  investment: number;
  leverage: number;
  startTime: number;
  fundingRevenue: number;
  status?: 'running';
  autoManaged?: boolean;
}

export interface DashboardData {
  topPositiveFunding: FundingData[];
  topNegativeFunding: FundingData[];
}

export interface EncryptedPayload {
  salt: string;
  iv: string;
  data: string;
}

export interface AccountBalance {
  totalWalletBalance: string;
  usdtAvailableBalance: string;
  // Comprehensive balance data
  totalValueUSDT?: string;
  totalAssets?: number;
  detailedBalances?: {
    asset: string;
    free: string;
    locked: string;
    total: string;
    priceUSDT: string;
    valueUSDT: string;
    canConvert: boolean;
  }[];
  summary?: {
    stablecoins: string;
    crypto: string;
    unconvertible: number;
  };
}

export interface AccountStatusResponse {
  success: boolean;
  balance?: AccountBalance;
  message?: string;
  details?: string;
}



// FIX: Added missing type definitions to resolve import errors.
export interface PnLSummaryData {
  totalPnl: number;
  pnl24h: number;
  winRate: number;
}

export interface SpreadHistoryPoint {
  time: string | number;
  spread: number;
}

export interface PositionData {
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
}

// FIX: Added missing type definition for OfficialBotStrategy to resolve import error.
export interface OfficialBotStrategy {
  name: string;
  type: string;
  description: string;
}