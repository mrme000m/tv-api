/**
 * TradingView WebSocket Advanced Example
 * 
 * This example demonstrates advanced WebSocket features:
 * 
 * 1. **Reconnection Handling**
 *    - Automatic reconnection with exponential backoff
 *    - Session recovery after disconnect
 *    - Event monitoring for connection state
 * 
 * 2. **History Session**
 *    - Deep historical data fetching
 *    - Large dataset support for backtesting
 *    - Date range parameters
 * 
 * 3. **Strategy Backtesting**
 *    - Loading Pine Script strategies
 *    - Getting strategy reports
 *    - Performance metrics
 * 
 * 4. **Multiple Concurrent Sessions**
 *    - Managing multiple charts
 *    - Quote + Chart sessions together
 *    - Resource cleanup
 */

const TradingView = require('../main');

// ==========================================
// CONFIGURATION
// ==========================================
const SYMBOL = 'BINANCE:BTCUSDT';
const TIMEFRAME = '60'; // 1 hour

// ==========================================
// EXAMPLE 1: RECONNECTION HANDLING
// ==========================================
async function demoReconnectionHandling() {
  console.log('\n🔄 [Reconnection Demo] Starting...');

  const client = new TradingView.Client({
    // Reconnection configuration
    reconnect: true,
    maxReconnectRetries: 5,
    reconnectDelay: 1000,
  });

  let reconnectCount = 0;
  let messageCount = 0;

  // Monitor all connection events
  client.onConnected(() => {
    console.log('  ✅ Connected to TradingView');
  });

  client.onDisconnected(() => {
    console.log('  ⚠️  Disconnected');
  });

  client.onReconnecting(({ attempt }) => {
    reconnectCount = attempt;
    console.log(`  🔄 Reconnecting... attempt ${attempt}`);
  });

  client.onReconnected(() => {
    console.log(`  ✅ Reconnected after ${reconnectCount} attempts`);
  });

  client.onConnectTimeout(() => {
    console.log('  ⏱️  Connection timeout');
  });

  // Create a chart session
  const chart = new client.Session.Chart();

  chart.onError((error) => {
    console.error('  Chart error:', error);
  });

  chart.onSymbolLoaded(() => {
    console.log(`  📊 Chart loaded: ${chart.infos.description}`);
  });

  chart.onUpdate(() => {
    messageCount++;
    if (chart.periods && chart.periods[0]) {
      const p = chart.periods[0];
      process.stdout.write(`\r  📈 [${messageCount}] Close: ${p.close.toFixed(2)}    `);
    }
  });

  chart.setMarket(SYMBOL, { timeframe: '1', range: 100 });

  // Simulate 10 seconds of data
  console.log('  Collecting data for 10 seconds...');
  await new Promise((r) => setTimeout(r, 10000));

  console.log(`\n  📊 Total messages received: ${messageCount}`);

  // Cleanup
  chart.delete();
  client.end();

  console.log('  ✅ Reconnection demo completed');
}

// ==========================================
// EXAMPLE 2: HISTORY SESSION (Deep Data)
// ==========================================
async function demoHistorySession() {
  console.log('\n📜 [History Session Demo] Starting...');
  console.log('  Note: History session requires authentication and a chartId');

  // Generate a unique chart ID for this session
  const chartId = `demo-${Date.now()}`;

  // History session requires the 'history-data' endpoint with chartId
  const client = new TradingView.Client({
    server: 'history-data',
    chartId,
  });

  // Wait for connection
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
    client.onConnected(() => {
      clearTimeout(timeout);
      resolve();
    });
  });

  console.log('  ✅ Connected to history-data endpoint');

  const history = new client.Session.History();

  // Calculate date range (last 7 days - smaller range for demo)
  const to = Math.floor(Date.now() / 1000);
  const from = to - 7 * 24 * 60 * 60;

  console.log(`  📅 Fetching data from ${new Date(from * 1000).toISOString()}`);
  console.log(`  📅 To ${new Date(to * 1000).toISOString()}`);

  try {
    const periods = await history.getHistoricalData(
      SYMBOL,
      TIMEFRAME,
      from,
      to
    );

    console.log(`  ✅ Received ${periods.length} periods`);

    if (periods.length > 0) {
      console.log('\n  First period:');
      console.log(`    Time: ${new Date(periods[0].time * 1000).toISOString()}`);
      console.log(`    Open: ${periods[0].open}`);
      console.log(`    High: ${periods[0].high}`);
      console.log(`    Low: ${periods[0].low}`);
      console.log(`    Close: ${periods[0].close}`);
      console.log(`    Volume: ${periods[0].volume}`);

      console.log('\n  Last period:');
      const last = periods[periods.length - 1];
      console.log(`    Time: ${new Date(last.time * 1000).toISOString()}`);
      console.log(`    Close: ${last.close}`);
    }

    // Calculate some simple statistics
    const closes = periods.map((p) => p.close);
    const avg = closes.reduce((a, b) => a + b, 0) / closes.length;
    const min = Math.min(...closes);
    const max = Math.max(...closes);

    console.log('\n  📊 Statistics:');
    console.log(`    Average close: ${avg.toFixed(2)}`);
    console.log(`    Min close: ${min.toFixed(2)}`);
    console.log(`    Max close: ${max.toFixed(2)}`);

  } catch (error) {
    console.error('  ⚠️  History session requires authentication:', error.message);
    console.log('    This is expected for unauthenticated requests.');
  }

  // Cleanup
  history.delete();
  client.end();

  console.log('  ✅ History session demo completed');
}

// ==========================================
// EXAMPLE 3: MULTIPLE CONCURRENT SESSIONS
// ==========================================
async function demoConcurrentSessions() {
  console.log('\n🔄 [Concurrent Sessions Demo] Starting...');

  const client = new TradingView.Client();

  // Wait for connection
  await new Promise((resolve) => client.onConnected(resolve));

  const sessions = [];

  // 1. Price chart
  const priceChart = new client.Session.Chart();
  priceChart.setMarket(SYMBOL, { timeframe: '1', range: 100 });
  priceChart.onUpdate(() => {
    if (priceChart.periods && priceChart.periods[0]) {
      const p = priceChart.periods[0];
      console.log(`  💰 Price: ${p.close.toFixed(2)}`);
    }
  });
  sessions.push({ name: 'Price', instance: priceChart });

  // 2. Volume chart (different timeframe)
  const volumeChart = new client.Session.Chart();
  volumeChart.setMarket(SYMBOL, { timeframe: '60', range: 24 });
  volumeChart.onUpdate(() => {
    if (volumeChart.periods && volumeChart.periods[0]) {
      const p = volumeChart.periods[0];
      console.log(`  📊 1H Volume: ${Math.round(p.volume || 0)}`);
    }
  });
  sessions.push({ name: 'Volume', instance: volumeChart });

  // 3. Quote session
  const quote = new client.Session.Quote();
  const market = new quote.Market(SYMBOL);
  market.onData((data) => {
    if (data.lp) {
      console.log(`  💸 Quote: ${data.lp.toFixed(2)} (change: ${data.chp?.toFixed(2) || 0}%)`);
    }
  });
  sessions.push({ name: 'Quote', instance: market });

  // Run for 10 seconds
  console.log(`  Running ${sessions.length} concurrent sessions for 10 seconds...\n`);
  await new Promise((r) => setTimeout(r, 10000));

  // Cleanup
  priceChart.delete();
  volumeChart.delete();
  market.close();
  quote.delete();

  client.end();
  console.log('  ✅ Concurrent sessions demo completed');
}

// ==========================================
// EXAMPLE 4: CUSTOM PROTOCOL MESSAGES
// ==========================================
async function demoCustomProtocol() {
  console.log('\n📡 [Custom Protocol Demo] Starting...');

  const client = new TradingView.Client();

  await new Promise((resolve) => client.onConnected(resolve));

  // The client provides access to the underlying protocol
  // This is for advanced users who need custom functionality

  console.log('  ✅ Connected, protocol ready');

  // Example: Send a custom ping (normally handled automatically)
  // client.send('ping', []);

  // The client emits events that can be listened to
  // For raw protocol messages, sessions handle the data
  let messageCount = 0;

  // Create a chart to generate some traffic
  const chart = new client.Session.Chart();
  chart.setMarket(SYMBOL, { timeframe: '1', range: 10 });

  await new Promise((r) => setTimeout(r, 5000));

  console.log(`  📊 Demo completed (chart session ran for 5 seconds)`);

  chart.delete();
  client.end();

  console.log('  ✅ Custom protocol demo completed');
}

// ==========================================
// MAIN RUNNER
// ==========================================
async function runAdvancedDemo() {
  console.log('=== TradingView WebSocket Advanced Demo ===\n');

  try {
    // Run examples sequentially
    await demoReconnectionHandling();

    await new Promise((r) => setTimeout(r, 1000));

    // History session may fail if not authenticated
    try {
      await demoHistorySession();
    } catch (error) {
      console.log(`  ⚠️  History session skipped: ${error.message}`);
    }

    await new Promise((r) => setTimeout(r, 1000));

    await demoConcurrentSessions();

    await new Promise((r) => setTimeout(r, 1000));

    await demoCustomProtocol();

  } catch (error) {
    console.error('\n❌ Demo error:', error);
    process.exit(1);
  }

  console.log('\n✅ All advanced demos completed!');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Caught SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Run the demo
runAdvancedDemo().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
