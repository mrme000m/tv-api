import { describe, it, expect } from 'vitest';
import TradingView from '../main';

const token = process.env.SESSION as string;
const signature = process.env.SIGNATURE as string;

describe.skipIf(!token || !signature)('Symbol Details API (authenticated)', () => {
  it('gets symbol details', async () => {
    console.log('Testing getSymbolDetails method');

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
  });

  it('gets symbol info', async () => {
    console.log('Testing getSymbolInfo method');

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
  });

  it('gets symbol performance', async () => {
    console.log('Testing getSymbolPerformance method');

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
  });

  it('gets symbol recommendation', async () => {
    console.log('Testing getSymbolRecommendation method');

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
  });

  it('gets symbol volatility', async () => {
    console.log('Testing getSymbolVolatility method');

    const volatility = await TradingView.getSymbolVolatility('COINBASE:BTCUSD');

    console.log('Volatility metrics:', {
      daily: volatility.daily,
      weekly: volatility.weekly,
      monthly: volatility.monthly,
    });

    expect(volatility).toBeDefined();
    expect(typeof volatility).toBe('object');
    expect(volatility).toHaveProperty('daily');
  });

  it('gets symbol volume', async () => {
    console.log('Testing getSymbolVolume method');

    const volume = await TradingView.getSymbolVolume('COINBASE:BTCUSD');

    console.log('Volume metrics:', {
      average10d: volume.average10d,
      average30d: volume.average30d,
    });

    expect(volume).toBeDefined();
    expect(typeof volume).toBe('object');
    expect(volume).toHaveProperty('average10d');
    expect(volume).toHaveProperty('average30d');
  });

  it('gets multiple symbol details', async () => {
    console.log('Testing getMultipleSymbolDetails method');

    const symbols = ['COINBASE:BTCUSD', 'COINBASE:ETHUSD'];
    const results = await TradingView.getMultipleSymbolDetails(symbols);

    console.log('Results for symbols:', Object.keys(results));

    expect(results).toBeDefined();
    expect(results).toHaveProperty('COINBASE:BTCUSD');
    expect(results).toHaveProperty('COINBASE:ETHUSD');

    // Check that both have performance data
    expect(results['COINBASE:BTCUSD']).toHaveProperty('Perf.W');
    expect(results['COINBASE:ETHUSD']).toHaveProperty('Perf.W');
  });

  it('uses the symbol details client', async () => {
    console.log('Testing createSymbolDetailsClient');

    const client = TradingView.symbolDetails.createSymbolDetailsClient();

    const details = await client.getDetails('COINBASE:BTCUSD');
    console.log('Got details via client');

    expect(details).toBeDefined();
    expect(details['Perf.W']).toBeDefined();
  });

  it('works with stock symbols', async () => {
    console.log('Testing with stock symbol (AAPL)');

    const details = await TradingView.getSymbolDetails('NASDAQ:AAPL');

    console.log('AAPL Performance:', {
      weekly: details['Perf.W'],
      monthly: details['Perf.1M'],
    });

    expect(details).toBeDefined();
    expect(details['Perf.W']).toBeDefined();
  });

  it('works with forex symbols', async () => {
    console.log('Testing with forex symbol (EURUSD)');

    const details = await TradingView.getSymbolDetails('OANDA:EURUSD');

    console.log('EURUSD Performance:', {
      weekly: details['Perf.W'],
      monthly: details['Perf.1M'],
    });

    expect(details).toBeDefined();
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
