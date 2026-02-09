/**
 * Example: History Session - Deep Backtesting
 *
 * This example demonstrates the HistorySession for deep backtesting
 * and fetching large amounts of historical data.
 *
 * The HistorySession uses the history-data.tradingview.com endpoint
 * which is optimized for backtesting and historical data analysis.
 *
 * Features demonstrated:
 * 1. Basic historical data fetching
 * 2. Strategy backtesting with Pine Script
 * 3. Using the history-data endpoint with compression
 */

const TradingView = require('../main');

async function basicHistoricalData() {
  console.log('\n=== Example 1: Basic Historical Data ===\n');

  // Create client with standard endpoint
  const client = new TradingView.Client({
    server: 'data',
    compression: true, // Enable WebSocket compression
  });

  // Create a history session
  const history = new client.Session.History();

  // Handle errors
  history.onError((...err) => {
    console.error('History error:', ...err);
  });

  // Calculate date range (last 30 days)
  const to = Math.floor(Date.now() / 1000);
  const from = to - (30 * 24 * 60 * 60);

  console.log('Fetching BTCUSD 1-hour data for last 30 days...');

  try {
    // Fetch historical data
    const periods = await history.getHistoricalData(
      'COINBASE:BTCUSD',
      '60', // 1 hour timeframe
      from,
      to,
      30000 // 30 second timeout
    );

    console.log(`✓ Fetched ${periods.length} periods`);

    if (periods.length > 0) {
      const first = periods[periods.length - 1]; // Oldest
      const last = periods[0]; // Newest

      console.log('  First candle:', new Date(first.time * 1000).toISOString());
      console.log('    Open:', first.open, 'High:', first.max, 'Low:', first.min, 'Close:', first.close);
      console.log('  Last candle:', new Date(last.time * 1000).toISOString());
      console.log('    Open:', last.open, 'High:', last.max, 'Low:', last.min, 'Close:', last.close);
    }
  } catch (err) {
    console.error('Failed to fetch historical data:', err.message);
  }

  // Cleanup
  history.delete();
  await client.end();
}

async function backtestExample() {
  console.log('\n=== Example 2: Strategy Backtesting ===\n');

  // For strategy backtesting, you may want to use the history-data endpoint
  // Note: This requires authentication and a valid chartId for some features
  const client = new TradingView.Client({
    server: 'data', // or 'history-data' with appropriate chartId
    compression: true,
  });

  const history = new client.Session.History();

  history.onError((...err) => {
    console.error('History error:', ...err);
  });

  // Listen for data events
  history.onData((data) => {
    if (data.type === 'report') {
      console.log('✓ Strategy report received');
    }
  });

  // Calculate date range (last 90 days)
  const to = Math.floor(Date.now() / 1000);
  const from = to - (90 * 24 * 60 * 60);

  console.log('Running backtest on historical data...');
  console.log('Date range:', new Date(from * 1000).toISOString(), 'to', new Date(to * 1000).toISOString());

  // Example: Request data with a strategy
  // Note: This is a simplified example. In practice, you would provide
  // the actual encoded strategy script text from your Pine Script.
  try {
    const result = await history.requestHistoryData({
      symbol: 'COINBASE:BTCUSD',
      timeframe: '240', // 4-hour candles
      from,
      to,
      adjustment: 'splits',
      currency: 'USD',
      session: 'regular',
      // scriptText would be your encoded Pine Script strategy
      // scriptText: 'your-encoded-strategy-script',
    }, 60000); // 60 second timeout for large data

    console.log(`✓ Backtest complete`);
    console.log(`  Periods: ${result.periods.length}`);

    if (result.report) {
      const perf = result.report.performance?.all;
      if (perf) {
        console.log('  Performance:');
        console.log('    Total trades:', perf.totalTrades);
        console.log('    Net profit:', perf.netProfit?.toFixed(2) || 'N/A');
        console.log('    Win rate:', perf.percentProfitable?.toFixed(2) || 'N/A', '%');
        console.log('    Profit factor:', perf.profitFactor?.toFixed(2) || 'N/A');
      }
    }
  } catch (err) {
    console.error('Backtest failed:', err.message);
  }

  history.delete();
  await client.end();
}

async function usingUtilities() {
  console.log('\n=== Example 3: Using Utility Functions ===\n');

  // Timeframe normalization
  console.log('Timeframe normalization:');
  console.log('  "5m" ->', TradingView.utils.normalizeTimeframe('5m'));
  console.log('  "1h" ->', TradingView.utils.normalizeTimeframe('1h'));
  console.log('  "1D" ->', TradingView.utils.normalizeTimeframe('1D'));
  console.log('  "60" ->', TradingView.utils.normalizeTimeframe('60'));

  // Date to timestamp conversion
  console.log('\nTimestamp conversion:');
  const now = new Date();
  console.log('  Now:', TradingView.utils.toTVTimestamp(now));
  console.log('  Date string:', TradingView.utils.toTVTimestamp('2024-01-01'));

  // Backtest range calculation
  console.log('\nBacktest ranges:');
  const range1 = TradingView.utils.getBacktestRange({ days: 30 });
  console.log('  Last 30 days:', range1);

  const range2 = TradingView.utils.getBacktestRange({
    from: '2024-01-01',
    to: '2024-03-01',
  });
  console.log('  Jan-Mar 2024:', range2);

  // Symbol parsing
  console.log('\nSymbol parsing:');
  console.log('  COINBASE:BTCUSD ->', TradingView.utils.parseSymbol('COINBASE:BTCUSD'));
  console.log('  AAPL ->', TradingView.utils.parseSymbol('AAPL'));
  console.log('  Is valid "BTCUSD"?', TradingView.utils.isValidSymbol('BTCUSD'));
  console.log('  Is valid "INVALID@SYM"?', TradingView.utils.isValidSymbol('INVALID@SYM'));

  // Price formatting
  console.log('\nPrice formatting:');
  console.log('  12345.6789 ->', TradingView.utils.formatPrice(12345.6789, 2));
  console.log('  12345.6789 ->', TradingView.utils.formatPrice(12345.6789, 4));

  // Percentage change
  console.log('\nPercentage change:');
  console.log('  110 from 100 ->', TradingView.utils.percentChange(110, 100).toFixed(2) + '%');
  console.log('  90 from 100 ->', TradingView.utils.percentChange(90, 100).toFixed(2) + '%');
}

async function compressionExample() {
  console.log('\n=== Example 4: WebSocket Compression ===\n');

  // Compression is enabled by default and helps reduce bandwidth
  // especially for large historical data requests

  const client = new TradingView.Client({
    server: 'data',
    compression: true, // Enabled by default
  });

  console.log('WebSocket compression enabled:', true);
  console.log('This reduces bandwidth for large historical data transfers.');

  const history = new client.Session.History();

  // Fetch a large dataset to benefit from compression
  const to = Math.floor(Date.now() / 1000);
  const from = to - (365 * 24 * 60 * 60); // 1 year of data

  console.log('\nFetching 1 year of daily BTC data (compression beneficial)...');

  const startTime = Date.now();

  try {
    const periods = await history.getHistoricalData(
      'COINBASE:BTCUSD',
      'D', // Daily timeframe
      from,
      to,
      60000
    );

    const duration = Date.now() - startTime;
    console.log(`✓ Fetched ${periods.length} daily candles in ${duration}ms`);
  } catch (err) {
    console.error('Failed:', err.message);
  }

  history.delete();
  await client.end();
}

async function eventHandlingExample() {
  console.log('\n=== Example 5: Event Handling ===\n');

  const client = new TradingView.Client();
  const history = new client.Session.History();

  // Listen for all events
  history.onEvent((event, ...data) => {
    console.log(`  [Event: ${event}]`, data.length > 0 ? JSON.stringify(data[0]).slice(0, 100) : '');
  });

  // Specific event handlers
  history.onLoaded(({ requestId }) => {
    console.log(`  -> Data loaded for request ${requestId}`);
  });

  history.onComplete(() => {
    console.log('  -> All requests complete');
  });

  history.onError((...err) => {
    console.error('  -> Error:', ...err);
  });

  console.log('Making multiple requests...');

  const to = Math.floor(Date.now() / 1000);
  const from = to - (7 * 24 * 60 * 60); // 7 days

  try {
    // Make multiple sequential requests
    await history.getHistoricalData('COINBASE:BTCUSD', '60', from, to);
    await history.getHistoricalData('COINBASE:ETHUSD', '60', from, to);

    console.log('All requests finished successfully');
  } catch (err) {
    console.error('Request failed:', err.message);
  }

  history.delete();
  await client.end();
}

// Run all examples
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     TradingView History Session Examples               ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    await usingUtilities();
    await basicHistoricalData();
    await backtestExample();
    await compressionExample();
    await eventHandlingExample();
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }

  console.log('\n✓ All examples completed\n');
  process.exit(0);
}

main();
