/**
 * TradingView WebSocket API Example
 * 
 * This example demonstrates the WebSocket-based real-time data streaming
 * capabilities of the TradingView API client.
 * 
 * ## WebSocket Sessions
 * 
 * The Client provides three main session types:
 * 
 * 1. **Chart Session** (`client.Session.Chart`)
 *    - Real-time OHLCV candlestick data
 *    - Historical data fetching
 *    - Multiple timeframes and chart types
 *    - Technical indicator support
 * 
 * 2. **Quote Session** (`client.Session.Quote`)
 *    - Real-time price quotes
 *    - Best bid/ask prices
 *    - Volume and daily stats
 *    - Multi-symbol watching
 * 
 * 3. **History Session** (`client.Session.History`)
 *    - Deep historical data for backtesting
 *    - Large dataset support
 *    - Requires date range parameters
 * 
 * ## Connection Management
 * 
 * - Auto-reconnection with exponential backoff
 * - Heartbeat/ping monitoring
 * - Error handling and recovery
 * - Proper cleanup with delete() and end()
 */

const TradingView = require('../main');

// ==========================================
// CONFIGURATION
// ==========================================
const SYMBOL = 'BINANCE:BTCUSDT';
const TIMEFRAME = '15'; // 15 minutes
const TEST_DURATION = 30000; // Run for 30 seconds

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatPrice(price) {
  return price ? price.toFixed(2) : 'N/A';
}

function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString();
}

// ==========================================
// EXAMPLE 1: CHART SESSION (OHLCV Data)
// ==========================================
async function demoChartSession(client) {
  console.log('\n📊 [Chart Session] Starting...');

  const chart = new client.Session.Chart();

  // Handle errors
  chart.onError((error) => {
    console.error('  Chart error:', error);
  });

  // Called when symbol is loaded and ready
  chart.onSymbolLoaded(() => {
    console.log(`  ✓ Symbol loaded: ${chart.infos.description}`);
    console.log(`    Exchange: ${chart.infos.exchange}`);
    console.log(`    Currency: ${chart.infos.currency_id}`);
    console.log(`    Price scale: ${chart.infos.pricescale}`);
    console.log(`    Type: ${chart.infos.type}`);
  });

  // Called when price data updates
  chart.onUpdate(() => {
    if (!chart.periods || chart.periods.length === 0) return;

    const latest = chart.periods[0];
    console.log(
      `  [${formatTime(latest.time)}] O:${formatPrice(latest.open)} ` +
      `H:${formatPrice(latest.high)} L:${formatPrice(latest.low)} ` +
      `C:${formatPrice(latest.close)} V:${Math.round(latest.volume || 0)}`
    );
  });

  // Set the market and timeframe
  chart.setMarket(SYMBOL, {
    timeframe: TIMEFRAME,
    range: 100, // Initial number of bars to load
  });

  // Return cleanup function
  return () => {
    console.log('  📊 [Chart Session] Closing...');
    chart.delete();
  };
}

// ==========================================
// EXAMPLE 2: QUOTE SESSION (Real-time Quotes)
// ==========================================
async function demoQuoteSession(client) {
  console.log('\n💰 [Quote Session] Starting...');

  const quote = new client.Session.Quote();

  // Watch multiple symbols using Market instances
  const symbols = [
    'BINANCE:BTCUSDT',
    'BINANCE:ETHUSDT',
    'BINANCE:SOLUSDT',
  ];

  const markets = [];

  symbols.forEach((symbol) => {
    const market = new quote.Market(symbol);

    market.onError((error) => {
      console.error(`  [${symbol}] Error:`, error);
    });

    market.onLoaded(() => {
      console.log(`  ✓ ${symbol} loaded`);
    });

    market.onData((data) => {
      if (!data.lp) return; // Skip if no last price

      const change = data.ch ? `${data.ch > 0 ? '+' : ''}${data.ch.toFixed(2)}` : '0.00';
      const changePct = data.chp ? `(${data.chp > 0 ? '+' : ''}${data.chp.toFixed(2)}%)` : '';

      console.log(
        `  ${data.description || symbol}: ${formatPrice(data.lp)} ` +
        `${change} ${changePct} | ` +
        `Bid: ${formatPrice(data.bid)} Ask: ${formatPrice(data.ask)}`
      );
    });

    markets.push(market);
  });

  console.log(`  Watching ${symbols.length} symbols...`);

  return () => {
    console.log('  💰 [Quote Session] Closing...');
    markets.forEach((m) => m.close());
    quote.delete();
  };
}

// ==========================================
// EXAMPLE 3: TECHNICAL INDICATOR
// ==========================================
async function demoIndicator(client) {
  console.log('\n📈 [Indicator] Loading RSI indicator...');

  // Note: Use a separate client for indicators to avoid
  // hitting subscription limits on the public endpoint
  const indicatorClient = new TradingView.Client();
  
  // Wait for connection
  await new Promise((resolve) => {
    if (indicatorClient.connected) resolve();
    else indicatorClient.onConnected(resolve);
  });

  const chart = new indicatorClient.Session.Chart();

  chart.onError((error) => {
    console.error('  Chart error:', error);
  });

  chart.onSymbolLoaded(async () => {
    console.log(`  ✓ Chart ready for indicator`);

    try {
      // Get built-in RSI indicator
      const indicator = await TradingView.getIndicator('STD;RSI');

      // Configure indicator inputs (must be done BEFORE creating Study)
      indicator.setOption('Length', 14);
      indicator.setOption('Source', 'close');

      // Create study from indicator
      const study = new chart.Study(indicator);

      study.onError((error) => {
        console.error('  Study error:', error);
      });

      study.onUpdate(() => {
        if (!study.periods || study.periods.length === 0) return;

        const latest = study.periods[0];
        const rsi = latest.RSI || latest.rsi || latest['Relative Strength Index'];

        if (rsi !== undefined) {
          const signal = rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : 'NEUTRAL';
          console.log(`  RSI: ${rsi.toFixed(2)} [${signal}]`);
        }
      });

      console.log('  ✓ RSI indicator active');
    } catch (error) {
      console.error('  Failed to load indicator:', error.message);
    }
  });

  chart.setMarket(SYMBOL, {
    timeframe: TIMEFRAME,
    range: 100,
  });

  return () => {
    console.log('  📈 [Indicator] Closing...');
    chart.delete();
    indicatorClient.end();
  };
}

// ==========================================
// EXAMPLE 4: MULTIPLE TIMEFRAMES
// ==========================================
async function demoMultiTimeframe(client) {
  console.log('\n⏰ [Multi-Timeframe] Starting...');

  const timeframes = ['5', '15', '60', '240']; // 5m, 15m, 1h, 4h
  const charts = [];

  timeframes.forEach((tf) => {
    const chart = new client.Session.Chart();

    chart.onError((error) => {
      console.error(`  [${tf}m] Error:`, error);
    });

    chart.onUpdate(() => {
      if (!chart.periods || chart.periods.length === 0) return;
      const latest = chart.periods[0];
      console.log(`  [${tf.padStart(3, ' ')}m] Close: ${formatPrice(latest.close)}`);
    });

    chart.setMarket(SYMBOL, {
      timeframe: tf,
      range: 10, // Smaller range for each
    });

    charts.push(chart);
  });

  return () => {
    console.log('  ⏰ [Multi-Timeframe] Closing...');
    charts.forEach((chart) => chart.delete());
  };
}

// ==========================================
// MAIN DEMO RUNNER
// ==========================================
async function runDemo() {
  console.log('=== TradingView WebSocket API Demo ===');
  console.log(`Symbol: ${SYMBOL}`);
  console.log(`Test duration: ${TEST_DURATION / 1000} seconds\n`);

  // Create WebSocket client
  const client = new TradingView.Client({
    // Optional: Enable debug logging
    // debug: true,
  });

  // Track client-level events
  client.onConnected(() => {
    console.log('🔌 WebSocket connected');
  });

  client.onDisconnected(() => {
    console.log('🔌 WebSocket disconnected');
  });

  client.onReconnecting(({ attempt }) => {
    console.log(`🔄 Reconnecting... (attempt ${attempt})`);
  });

  client.onError((error) => {
    console.error('❌ Client error:', error);
  });

  // Wait for connection
  await new Promise((resolve) => {
    if (client.connected) {
      resolve();
    } else {
      client.onConnected(resolve);
      // Timeout after 10 seconds
      setTimeout(() => {
        console.error('Connection timeout');
        process.exit(1);
      }, 10000);
    }
  });

  const cleanupFunctions = [];

  try {
    // Run examples
    cleanupFunctions.push(await demoChartSession(client));

    // Wait a bit between examples
    await new Promise((r) => setTimeout(r, 2000));

    cleanupFunctions.push(await demoQuoteSession(client));

    await new Promise((r) => setTimeout(r, 2000));

    cleanupFunctions.push(await demoIndicator(client));

    await new Promise((r) => setTimeout(r, 2000));

    cleanupFunctions.push(await demoMultiTimeframe(client));

    // Run for specified duration
    console.log(`\n⏳ Running for ${TEST_DURATION / 1000} seconds...`);
    await new Promise((r) => setTimeout(r, TEST_DURATION));

  } catch (error) {
    console.error('\n❌ Demo error:', error);
  } finally {
    // Cleanup in reverse order
    console.log('\n=== Cleaning up ===');
    cleanupFunctions.reverse().forEach((cleanup) => cleanup());

    // Close client
    console.log('🔌 Closing WebSocket client...');
    client.end();

    console.log('\n✅ Demo completed!');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Caught SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Run the demo
runDemo().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
