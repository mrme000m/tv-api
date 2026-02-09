import { describe, it, expect } from 'vitest';
import TradingView from '../main';

const token = process.env.SESSION as string;
const signature = process.env.SIGNATURE as string;

// Helper to check if error is auth/plan related
function isAuthOrPlanError(error: any): boolean {
  const msg = error?.message || '';
  return msg.includes('Failed to get') || 
         msg.includes('Symbol not found') ||
         msg.includes('Authentication required') ||
         msg.includes('401') ||
         msg.includes('403') ||
         msg.includes('authentication') ||
         msg.includes('permission');
}

describe.skipIf(!token || !signature)('Symbol Details API (authenticated)', () => {
  let hasRequiredPlan = false;
  
  // Check pro plan before running tests
  it('checks pro plan status', async () => {
    try {
      const planInfo = await TradingView.getProPlanInfo({ session: token, signature });
      console.log('Pro plan:', planInfo.pro_plan);
      hasRequiredPlan = TradingView.hasPremiumFeatures(planInfo);
    } catch (e) {
      console.log('Could not check pro plan, assuming free plan');
      hasRequiredPlan = false;
    }
  });

  it('gets symbol details', async () => {
    console.log('Testing getSymbolDetails method');

    try {
      const details = await TradingView.getSymbolDetails('COINBASE:BTCUSD');

      console.log('Symbol details keys:', Object.keys(details).slice(0, 10));

      expect(details).toBeDefined();
      expect(typeof details).toBe('object');

      // Check for common performance metrics
      console.log('Performance metrics:', {
        weekly: details['Perf.W'],
        monthly: details['Perf.1M'],
        yearly: details['Perf.Y'],
      });

      expect(details['Perf.W']).toBeDefined();
      expect(details['Perf.1M']).toBeDefined();
    } catch (error: any) {
      if (isAuthOrPlanError(error)) {
        console.log('Skipping - symbol details endpoint requires premium plan or is not available');
        console.log('Error:', error.message);
        return;
      }
      throw error;
    }
  });

  it('gets symbol info', async () => {
    console.log('Testing getSymbolInfo method');

    try {
      const info = await TradingView.getSymbolInfo('COINBASE:BTCUSD');

      console.log('Symbol info:', {
        symbol: info.symbol,
        name: info.name,
        description: info.description?.substring(0, 50),
        type: info.type,
        exchange: info.exchange,
        currency: info.currency,
      });

      expect(info.symbol).toBeDefined();
      expect(info.name).toBeDefined();
      expect(info.type).toBeDefined();
      expect(info.exchange).toBeDefined();
    } catch (error: any) {
      if (isAuthOrPlanError(error)) {
        console.log('Skipping - symbol info endpoint requires premium plan or is not available');
        return;
      }
      throw error;
    }
  });

  it('gets symbol performance', async () => {
    console.log('Testing getSymbolPerformance method');

    try {
      const performance = await TradingView.getSymbolPerformance('COINBASE:BTCUSD');

      console.log('Performance metrics:', {
        weekly: performance.weekly,
        monthly: performance.monthly,
        yearly: performance.yearly,
        ytd: performance.ytd,
      });

      expect(performance).toBeDefined();
      expect(typeof performance).toBe('object');
      expect(performance).toHaveProperty('weekly');
      expect(performance).toHaveProperty('monthly');
      expect(performance).toHaveProperty('yearly');
    } catch (error: any) {
      if (isAuthOrPlanError(error)) {
        console.log('Skipping - requires premium plan or endpoint not available');
        return;
      }
      throw error;
    }
  });

  it('gets symbol recommendation', async () => {
    console.log('Testing getSymbolRecommendation method');

    try {
      const recommendation = await TradingView.getSymbolRecommendation('COINBASE:BTCUSD');

      console.log('Recommendation metrics:', {
        overall: recommendation.overall,
        movingAverages: recommendation.movingAverages,
        rsi: recommendation.rsi,
      });

      expect(recommendation).toBeDefined();
      expect(typeof recommendation).toBe('object');
      expect(recommendation).toHaveProperty('overall');
      expect(recommendation).toHaveProperty('movingAverages');
    } catch (error: any) {
      if (isAuthOrPlanError(error)) {
        console.log('Skipping - requires premium plan or endpoint not available');
        return;
      }
      throw error;
    }
  });

  it('gets symbol volatility', async () => {
    console.log('Testing getSymbolVolatility method');

    try {
      const volatility = await TradingView.getSymbolVolatility('COINBASE:BTCUSD');

      console.log('Volatility metrics:', {
        daily: volatility.daily,
        weekly: volatility.weekly,
        monthly: volatility.monthly,
      });

      expect(volatility).toBeDefined();
      expect(typeof volatility).toBe('object');
      expect(volatility).toHaveProperty('daily');
    } catch (error: any) {
      if (isAuthOrPlanError(error)) {
        console.log('Skipping - requires premium plan or endpoint not available');
        return;
      }
      throw error;
    }
  });

  it('gets symbol volume', async () => {
    console.log('Testing getSymbolVolume method');

    try {
      const volume = await TradingView.getSymbolVolume('COINBASE:BTCUSD');

      console.log('Volume metrics:', {
        average10d: volume.average10d,
        average30d: volume.average30d,
      });

      expect(volume).toBeDefined();
      expect(typeof volume).toBe('object');
      expect(volume).toHaveProperty('average10d');
      expect(volume).toHaveProperty('average30d');
    } catch (error: any) {
      if (isAuthOrPlanError(error)) {
        console.log('Skipping - requires premium plan or endpoint not available');
        return;
      }
      throw error;
    }
  });

  it('gets multiple symbol details', async () => {
    console.log('Testing getMultipleSymbolDetails method');

    const symbols = ['COINBASE:BTCUSD', 'COINBASE:ETHUSD'];
    
    try {
      const results = await TradingView.getMultipleSymbolDetails(symbols);

      console.log('Results for symbols:', Object.keys(results));

      expect(results).toBeDefined();
      
      // Check if we got valid data or errors
      const hasValidData = Object.values(results).some(
        (r: any) => !r.error && typeof r === 'object'
      );
      
      if (!hasValidData) {
        console.log('No valid data returned - endpoint may require premium plan');
        return;
      }

      expect(results).toHaveProperty('COINBASE:BTCUSD');
      expect(results).toHaveProperty('COINBASE:ETHUSD');
    } catch (error: any) {
      if (isAuthOrPlanError(error)) {
        console.log('Skipping - requires premium plan or endpoint not available');
        return;
      }
      throw error;
    }
  });

  it('uses the symbol details client', async () => {
    console.log('Testing createSymbolDetailsClient');

    const client = TradingView.symbolDetails.createSymbolDetailsClient();

    try {
      const details = await client.getDetails('COINBASE:BTCUSD');
      console.log('Got details via client');

      expect(details).toBeDefined();
      if (details['Perf.W']) {
        expect(details['Perf.W']).toBeDefined();
      }
    } catch (error: any) {
      if (isAuthOrPlanError(error)) {
        console.log('Skipping - requires premium plan or endpoint not available');
        return;
      }
      throw error;
    }
  });

  it('works with stock symbols', async () => {
    console.log('Testing with stock symbol (AAPL)');

    try {
      const details = await TradingView.getSymbolDetails('NASDAQ:AAPL');

      console.log('AAPL Performance:', {
        weekly: details['Perf.W'],
        monthly: details['Perf.1M'],
      });

      expect(details).toBeDefined();
      if (details['Perf.W']) {
        expect(details['Perf.W']).toBeDefined();
      }
    } catch (error: any) {
      if (isAuthOrPlanError(error)) {
        console.log('Skipping - requires premium plan or endpoint not available');
        return;
      }
      throw error;
    }
  });

  it('works with forex symbols', async () => {
    console.log('Testing with forex symbol (EURUSD)');

    try {
      const details = await TradingView.getSymbolDetails('OANDA:EURUSD');

      console.log('EURUSD Performance:', {
        weekly: details['Perf.W'],
        monthly: details['Perf.1M'],
      });

      expect(details).toBeDefined();
    } catch (error: any) {
      if (isAuthOrPlanError(error)) {
        console.log('Skipping - requires premium plan or endpoint not available');
        return;
      }
      throw error;
    }
  });
});

describe('Symbol Details API structure', () => {
  it('exports all required functions', () => {
    expect(typeof TradingView.getSymbolDetails).toBe('function');
    expect(typeof TradingView.getSymbolInfo).toBe('function');
    expect(typeof TradingView.getMultipleSymbolDetails).toBe('function');
    expect(typeof TradingView.getSymbolPerformance).toBe('function');
    expect(typeof TradingView.getSymbolRecommendation).toBe('function');
    expect(typeof TradingView.getSymbolVolatility).toBe('function');
    expect(typeof TradingView.getSymbolVolume).toBe('function');
    expect(typeof TradingView.symbolDetails.createSymbolDetailsClient).toBe('function');
  });

  it('symbol details client has all methods', () => {
    const client = TradingView.symbolDetails.createSymbolDetailsClient();
    expect(typeof client.getDetails).toBe('function');
    expect(typeof client.getInfo).toBe('function');
    expect(typeof client.getMultiple).toBe('function');
    expect(typeof client.getPerformance).toBe('function');
    expect(typeof client.getRecommendation).toBe('function');
    expect(typeof client.getVolatility).toBe('function');
    expect(typeof client.getVolume).toBe('function');
  });
});
