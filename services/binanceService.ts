
import type { DashboardData, FundingData, ActiveBot } from '../types';

const FUTURES_API_URL = 'https://fapi.binance.com';
const SPOT_API_URL = 'https://api.binance.com';

// Cache valid arbitrage symbols to avoid repeated API calls
let validArbitrageSymbols: Set<string> | null = null;
let lastSymbolFetch = 0;
const SYMBOL_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getValidArbitrageSymbols = async (): Promise<Set<string>> => {
    const now = Date.now();
    if (validArbitrageSymbols && (now - lastSymbolFetch) < SYMBOL_CACHE_DURATION) {
        return validArbitrageSymbols;
    }
    
    try {
        // Fetch symbols from both spot and futures markets
        const [spotResponse, futuresResponse] = await Promise.all([
            fetch(`${SPOT_API_URL}/api/v3/exchangeInfo`),
            fetch(`${FUTURES_API_URL}/fapi/v1/exchangeInfo`)
        ]);
        
        if (!spotResponse.ok || !futuresResponse.ok) {
            console.warn('Failed to fetch symbol info, using fallback validation');
            return new Set(); // Empty set will cause no filtering
        }
        
        const [spotData, futuresData] = await Promise.all([
            spotResponse.json(),
            futuresResponse.json()
        ]);
        
        const spotSymbols = new Set<string>(
            spotData.symbols
                .filter((s: any) => s.status === 'TRADING' && s.symbol.endsWith('USDT'))
                .map((s: any) => s.symbol as string)
        );
        
        const futuresSymbols = new Set<string>(
            futuresData.symbols
                .filter((s: any) => s.status === 'TRADING' && s.symbol.endsWith('USDT'))
                .map((s: any) => s.symbol as string)
        );
        
        // Only symbols that exist in BOTH markets can be used for arbitrage
        validArbitrageSymbols = new Set<string>(
            [...spotSymbols].filter((symbol: string) => futuresSymbols.has(symbol))
        );
        
        lastSymbolFetch = now;
        console.log(`Found ${validArbitrageSymbols.size} valid arbitrage symbols (exist on both spot and futures)`);
        
        return validArbitrageSymbols;
        
    } catch (error) {
        console.error('Error fetching valid arbitrage symbols:', error);
        return new Set(); // Return empty set on error
    }
};

const fetchLiveFundingData = async (): Promise<FundingData[]> => {
    try {
        const response = await fetch(`${FUTURES_API_URL}/fapi/v1/premiumIndex`);
        if (!response.ok) {
            throw new Error(`Binance API error: ${response.statusText}`);
        }
        const data: any[] = await response.json();
        
        return data.map(item => ({
            symbol: item.symbol,
            markPrice: parseFloat(item.markPrice),
            indexPrice: parseFloat(item.indexPrice),
            fundingRate: parseFloat(item.lastFundingRate),
            nextFundingTime: item.nextFundingTime,
        }));
    } catch (error) {
        console.error('Error fetching live funding data:', error);
        return [];
    }
};

export const fetchDashboardData = async (): Promise<DashboardData> => {
    const unfilteredFundingData = await fetchLiveFundingData();
    const validSymbols = await getValidArbitrageSymbols();
    
    // Process all funding data to find top opportunities
    // Only show symbols that exist on BOTH spot and futures markets
    const sortedByFunding = [...unfilteredFundingData]
      .filter(d => 
        d.fundingRate !== 0 && 
        d.symbol.endsWith('USDT') && 
        (validSymbols.size === 0 || validSymbols.has(d.symbol)) // If validation failed, show all (fallback)
      )
      .sort((a, b) => b.fundingRate - a.fundingRate);

    const topPositiveFunding = sortedByFunding.slice(0, 8);
    const topNegativeFunding = sortedByFunding.slice(-8).reverse();

    return {
        topPositiveFunding,
        topNegativeFunding,
    };
};

/**
 * Simulates a funding revenue update for an active bot.
 * In a real application, this would be based on actual funding events.
 * Here, we simulate a small, steady positive return to represent fee collection.
 */
export const simulateRevenueUpdate = (bot: ActiveBot): ActiveBot => {
    // Simulate a small, steady accrual based on a positive APR
    const simulatedAPR = 0.25; // 25% APR for simulation
    const dailyRate = simulatedAPR / 365;
    const intervalRate = dailyRate / (24 * 60 * (60 / 3)); // Assuming update every 3 seconds
    
    const revenueIncrease = bot.investment * intervalRate;

    const newRevenue = bot.fundingRevenue + revenueIncrease;
    
    return { ...bot, fundingRevenue: newRevenue };
};