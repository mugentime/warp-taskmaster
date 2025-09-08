import type { ArbitrageOpportunitiesResponse, FundingRateResponse, ArbitrageOpportunity } from '../types';

const API_BASE = '/api/v1';

export interface ArbitrageApiService {
    getOpportunities: (minRating?: string, limit?: number) => Promise<ArbitrageOpportunitiesResponse>;
    getFundingRates: () => Promise<FundingRateResponse>;
    getSymbolFundingRate: (symbol: string) => Promise<any>;
    refreshFundingRates: () => Promise<any>;
    getMonitorStatus: () => Promise<any>;
}

// Get arbitrage opportunities with filtering
export const getArbitrageOpportunities = async (
    minRating: string = 'MEDIUM', 
    limit: number = 50
): Promise<ArbitrageOpportunitiesResponse> => {
    const response = await fetch(`${API_BASE}/arbitrage-opportunities?minRating=${minRating}&limit=${limit}`);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch opportunities: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
};

// Get all funding rates with enhanced data
export const getEnhancedFundingRates = async (): Promise<FundingRateResponse> => {
    const response = await fetch(`${API_BASE}/funding-rates`);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch funding rates: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
};

// Get funding rate for specific symbol
export const getSymbolFundingRate = async (symbol: string) => {
    const response = await fetch(`${API_BASE}/funding-rates/${symbol}`);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch symbol data: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
};

// Force refresh funding rates
export const refreshFundingRates = async () => {
    const response = await fetch(`${API_BASE}/funding-rates/refresh`, {
        method: 'POST'
    });
    
    if (!response.ok) {
        throw new Error(`Failed to refresh funding rates: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
};

// Get monitor status
export const getFundingRateMonitorStatus = async () => {
    const response = await fetch(`${API_BASE}/funding-rates/monitor-status`);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch monitor status: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
};

// Helper function to format opportunities for legacy components
export const convertOpportunityToFundingData = (opportunity: ArbitrageOpportunity) => {
    return {
        symbol: opportunity.symbol,
        markPrice: opportunity.markPrice,
        indexPrice: opportunity.markPrice, // Use mark price as fallback
        fundingRate: opportunity.fundingRate,
        nextFundingTime: new Date(opportunity.nextFunding).getTime(),
        fundingRatePercent: opportunity.fundingRatePercent,
        annualizedRate: opportunity.annualizedRate,
        liquidity: opportunity.liquidity,
        liquidityScore: opportunity.liquidityScore,
        riskScore: opportunity.riskScore
    };
};

// Test API connectivity
export const testArbitrageApiConnectivity = async () => {
    try {
        const status = await getFundingRateMonitorStatus();
        return {
            success: true,
            status: 'Connected',
            details: status
        };
    } catch (error) {
        return {
            success: false,
            status: 'Disconnected',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

export const arbitrageApiService: ArbitrageApiService = {
    getOpportunities: getArbitrageOpportunities,
    getFundingRates: getEnhancedFundingRates,
    getSymbolFundingRate,
    refreshFundingRates,
    getMonitorStatus: getFundingRateMonitorStatus
};
