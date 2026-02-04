# TradingView API Usage Examples

This document provides practical examples of how to use the TradingView API wrapper for various trading and analysis tasks.

## Table of Contents

1. [Simple Chart Connection](#simple-chart-connection)
2. [Multiple Charts](#multiple-charts)
3. [Price Alert System](#price-alert-system)
4. [Volume-Based Monitoring](#volume-based-monitoring)
5. [Deep History Fetching](#deep-history-fetching)
6. [Data Export to CSV](#data-export-to-csv)
7. [Get Technical Analysis](#get-technical-analysis)
8. [Real-time TA Updates](#real-time-ta-updates)
9. [Extended Technical Analysis](#extended-technical-analysis)
10. [Batch Technical Analysis](#batch-technical-analysis)
11. [Advanced Technical Analysis with Insights](#advanced-technical-analysis-with-insights)
12. [Formatting Technical Ratings](#formatting-technical-ratings)
13. [Getting Indicator Information](#getting-indicator-information)
14. [Search and Display Indicators](#search-and-display-indicators)
15. [Adding Indicators to Charts](#adding-indicators-to-charts)
16. [Login and Get User Info](#login-and-get-user-info)
17. [Get Private Indicators](#get-private-indicators)
18. [Heikin Ashi Chart](#heikin-ashi-chart)
19. [Renko Chart](#renko-chart)
20. [Historical Replay](#historical-replay)
21. [Get Chart Drawings](#get-chart-drawings)
22. [Comprehensive Error Handling](#comprehensive-error-handling)
23. [Timeout Wrapper](#timeout-wrapper)
24. [Reconnect Handling](#reconnect-handling)

## Simple Chart Connection

```javascript
const { Client } = require('./src/client');
const { getHistory } = require('./src/history');

const client = new Client();

// Connect to a symbol and get recent data
async function simpleConnection() {
  await client.connect('BINANCE:BTCEUR');
  
  // Get the last 10 minutes of data
  const history = await getHistory('BINANCE:BTCEUR', '1', 10);
  console.log(history);
  
  client.end();
}

simpleConnection();
```

## Multiple Charts

```javascript
const { Client } = require('./src/client');
const { getHistory } = require('./src/history');

const client = new Client();

async function multipleCharts() {
  const symbols = ['BINANCE:BTCEUR', 'BINANCE:ETHEUR', 'BINANCE:XRPEUR'];
  
  // Connect to multiple symbols
  for (const symbol of symbols) {
    await client.connect(symbol);
  }
  
  // Get recent data for each
  for (const symbol of symbols) {
    const history = await getHistory(symbol, '5', 5);
    console.log(`${symbol}:`, history.t.slice(-3), history.c.slice(-3));
  }
  
  client.end();
}

multipleCharts();
```

## Price Alert System

```javascript
const { Client } = require('./src/client');

class PriceAlertSystem {
  constructor() {
    this.client = new Client();
    this.alerts = new Map();
  }
  
  addAlert(symbol, threshold, callback) {
    this.alerts.set(symbol, { threshold, callback });
    this.client.connect(symbol);
    
    this.client.Session.subscribe(symbol, '1', (data) => {
      const currentPrice = data.v.close;
      const alert = this.alerts.get(symbol);
      
      if (alert && currentPrice >= alert.threshold) {
        alert.callback(symbol, currentPrice);
      }
    });
  }
  
  stop() {
    this.client.end();
  }
}

const alertSystem = new PriceAlertSystem();

alertSystem.addAlert('BINANCE:BTCEUR', 50000, (symbol, price) => {
  console.log(`ALERT: ${symbol} reached ${price}!`);
  alertSystem.stop();
});
```

## Volume-Based Monitoring

```javascript
const { Client } = require('./src/client');

const client = new Client();

async function volumeMonitoring() {
  await client.connect('BINANCE:BTCEUR');
  
  client.Session.subscribe('BINANCE:BTCEUR', '1', (data) => {
    const volume = data.v.volume;
    const close = data.v.close;
    
    if (volume > 1000000) { // Alert if volume exceeds 1M
      console.log(`High volume detected: ${volume.toFixed(2)} at price ${close.toFixed(2)}`);
    }
  });
}

volumeMonitoring();
```

## Deep History Fetching

```javascript
const { getHistory } = require('./src/history');

async function deepHistory() {
  // Get 500 days of daily data
  const history = await getHistory('BINANCE:BTCEUR', '1D', 500);
  
  console.log(`Fetched ${history.t.length} daily data points`);
  console.log('First date:', new Date(history.t[0] * 1000));
  console.log('Last date:', new Date(history.t[history.t.length - 1] * 1000));
  console.log('Price range:', Math.min(...history.c), 'to', Math.max(...history.c));
}

deepHistory();
```

## Data Export to CSV

```javascript
const fs = require('fs');
const { getHistory } = require('./src/history');

async function exportToCSV() {
  const history = await getHistory('BINANCE:BTCEUR', '1', 100);
  
  let csv = 'timestamp,open,high,low,close,volume\n';
  
  for (let i = 0; i < history.t.length; i++) {
    csv += `${history.t[i]},${history.o[i]},${history.h[i]},${history.l[i]},${history.c[i]},${history.v[i]}\n`;
  }
  
  fs.writeFileSync('trading_data.csv', csv);
  console.log('Data exported to trading_data.csv');
}

exportToCSV();
```

## Get Technical Analysis

```javascript
const { getTA } = require('./src/miscRequests');

async function getTechnicalAnalysis() {
  const ta = await getTA('BINANCE:BTCEUR');
  console.log('Technical Analysis:', ta);
  
  if (ta && ta.recommendation) {
    console.log(`Recommendation: ${ta.recommendation}`);
    console.log(`Summary:`, ta.summary);
    console.log(`Oscillators:`, ta.oscillators);
    console.log(`Moving Averages:`, ta.moving_averages);
  }
}

getTechnicalAnalysis();
```

## Real-time TA Updates

```javascript
const { Client } = require('./src/client');
const { getTA } = require('./src/miscRequests');

const client = new Client();

async function realTimeTAUpdates() {
  const symbol = 'BINANCE:BTCEUR';
  
  await client.connect(symbol);
  
  // Update TA every 5 minutes
  setInterval(async () => {
    try {
      const ta = await getTA(symbol);
      if (ta) {
        console.log(new Date().toISOString(), '- TA Update:', ta.recommendation);
      }
    } catch (error) {
      console.error('TA Update Error:', error.message);
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  client.Session.subscribe(symbol, '1', (data) => {
    // React to price changes if needed
    console.log(`Price update: ${data.v.close}`);
  });
}

realTimeTAUpdates();
```

## Extended Technical Analysis

```javascript
const { getExtendedTA } = require('./src/taExtension');

async function extendedTechnicalAnalysis() {
  const extendedTA = await getExtendedTA('BINANCE:BTCUSDT', {
    timeframes: ['1h', '4h', '1D'],
    indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
    additionalFields: [
      'RSI', 'MACD.macd', 'Stoch.K', 'Williams.Percent', 
      'CCI20', 'ADX', 'ATR', 'PSAR', 'AO', 'Mom'
    ]
  });
  
  if (extendedTA) {
    console.log('Symbol:', extendedTA.symbol);
    console.log('Timeframes:', Object.keys(extendedTA.timeframes));
    
    // Show 1D analysis
    if (extendedTA.timeframes['1D']) {
      console.log('\n1D Analysis:');
      console.log('Summary:', extendedTA.timeframes['1D'].summary);
      console.log('RSI:', extendedTA.timeframes['1D'].RSI);
      console.log('MACD:', extendedTA.timeframes['1D']['MACD.macd']);
      console.log('Stochastic K:', extendedTA.timeframes['1D']['Stoch.K']);
      console.log('Williams %R:', extendedTA.timeframes['1D']['Williams.Percent']);
      console.log('CCI20:', extendedTA.timeframes['1D']['CCI20']);
      console.log('ADX:', extendedTA.timeframes['1D']['ADX']);
      console.log('ATR:', extendedTA.timeframes['1D']['ATR']);
      console.log('PSAR:', extendedTA.timeframes['1D']['PSAR']);
      console.log('Awesome Oscillator:', extendedTA.timeframes['1D']['AO']);
      console.log('Momentum:', extendedTA.timeframes['1D']['Mom']);
    }
  } else {
    console.log('No extended TA data available');
  }
}

extendedTechnicalAnalysis();
```

## Batch Technical Analysis

```javascript
const { getBatchTA } = require('./src/taExtension');

async function batchTechnicalAnalysis() {
  const symbols = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT'];
  
  const batchTA = await getBatchTA(symbols, {
    timeframes: ['1D'],
    indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
    additionalFields: ['RSI', 'MACD.macd']
  });
  
  console.log(`Received data for ${Object.keys(batchTA).length} symbols:\n`);
  
  for (const [symbol, data] of Object.entries(batchTA)) {
    if (data.timeframes['1D']) {
      console.log(`${symbol}:`);
      console.log(`  Rating: ${data.timeframes['1D'].summary.rating}`);
      console.log(`  Signal: ${data.timeframes['1D'].summary.signal}`);
      console.log(`  RSI: ${data.timeframes['1D'].RSI}`);
      console.log(`  MACD: ${data.timeframes['1D']['MACD.macd']}`);
      console.log('');
    }
  }
}

batchTechnicalAnalysis();
```

## Advanced Technical Analysis with Insights

```javascript
const { getAdvancedTA } = require('./src/taExtension');

async function advancedTechnicalAnalysis() {
  const advancedTA = await getAdvancedTA('BINANCE:BTCUSDT', {
    timeframes: ['1D'],
    indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
    advancedIndicators: [
      'RSI', 'MACD.macd', 'Stoch.K', 'Williams.Percent', 
      'CCI20', 'ADX', 'ATR', 'PSAR', 'AO', 'Mom',
      'SMA5', 'SMA20', 'EMA5', 'EMA20', 'HMA5', 'HMA20',
      'BB.lower', 'BB.upper', 'BB.width', 'BB.b',
      'KC.lower', 'KC.upper', 'KC.middle', 'KC.width',
      'DC.lower', 'DC.upper', 'DC.middle', 'DC.width',
      'Aroon.Up', 'Aroon.Down', 'Aroon_Osc',
      'PivotPoints.Classic.S3', 'PivotPoints.Classic.S2', 'PivotPoints.Classic.S1',
      'PivotPoints.Classic.Middle', 'PivotPoints.Classic.R1', 'PivotPoints.Classic.R2', 'PivotPoints.Classic.R3',
      'PivotPoints.Fibonacci.S3', 'PivotPoints.Fibonacci.S2', 'PivotPoints.Fibonacci.S1',
      'PivotPoints.Fibonacci.Middle', 'PivotPoints.Fibonacci.R1', 'PivotPoints.Fibonacci.R2', 'PivotPoints.Fibonacci.R3',
      'PivotPoints.Woodie.S3', 'PivotPoints.Woodie.S2', 'PivotPoints.Woodie.S1',
      'PivotPoints.Woodie.Middle', 'PivotPoints.Woodie.R1', 'PivotPoints.Woodie.R2', 'PivotPoints.Woodie.R3',
      'PivotPoints.Camarilla.S3', 'PivotPoints.Camarilla.S2', 'PivotPoints.Camarilla.S1',
      'PivotPoints.Camarilla.Middle', 'PivotPoints.Camarilla.R1', 'PivotPoints.Camarilla.R2', 'PivotPoints.Camarilla.R3',
      'Bulls power', 'Bears power', 'ADR', 'ADR percentage', 'ATR percentage'
    ]
  });
  
  if (advancedTA) {
    console.log('Symbol:', advancedTA.symbol);
    console.log('Timeframes:', Object.keys(advancedTA.timeframes));
    
    if (advancedTA.timeframes['1D']) {
      console.log('\n1D Analysis:');
      console.log('Summary:', advancedTA.timeframes['1D'].summary);
      console.log('Insights:', advancedTA.timeframes['1D'].insights);
      console.log('Available Indicators:', Object.keys(advancedTA.indicators));
      
      // Show key indicator values
      console.log('\nKey Indicator Values:');
      console.log('RSI:', advancedTA.timeframes['1D'].RSI);
      console.log('MACD:', advancedTA.timeframes['1D']['MACD.macd']);
      console.log('Stochastic K:', advancedTA.timeframes['1D']['Stoch.K']);
      console.log('Williams %R:', advancedTA.timeframes['1D']['Williams.Percent']);
      console.log('CCI20:', advancedTA.timeframes['1D']['CCI20']);
      console.log('ADX:', advancedTA.timeframes['1D']['ADX']);
      console.log('ATR:', advancedTA.timeframes['1D']['ATR']);
      console.log('PSAR:', advancedTA.timeframes['1D']['PSAR']);
      console.log('Awesome Oscillator:', advancedTA.timeframes['1D']['AO']);
      console.log('Momentum:', advancedTA.timeframes['1D']['Mom']);
      console.log('SMA5:', advancedTA.timeframes['1D']['SMA5']);
      console.log('EMA5:', advancedTA.timeframes['1D']['EMA5']);
      console.log('HMA5:', advancedTA.timeframes['1D']['HMA5']);
      console.log('Aroon Up:', advancedTA.timeframes['1D']['Aroon.Up']);
      console.log('Aroon Down:', advancedTA.timeframes['1D']['Aroon.Down']);
      console.log('ADR:', advancedTA.timeframes['1D']['ADR']);
      console.log('ADR %:', advancedTA.timeframes['1D']['ADR percentage']);
      console.log('ATR %:', advancedTA.timeframes['1D']['ATR percentage']);
      console.log('Bulls Power:', advancedTA.timeframes['1D']['Bulls power']);
      console.log('Bears Power:', advancedTA.timeframes['1D']['Bears power']);
    }
  } else {
    console.log('No advanced TA data available');
  }
}

advancedTechnicalAnalysis();
```

## Formatting Technical Ratings

```javascript
const { formatTechnicalRating } = require('./src/taExtension');

function demonstrateRatingFormatting() {
  const ratings = [0.8, 0.3, 0.0, -0.2, -0.7];
  
  console.log('Rating Formatting Examples:');
  for (const rating of ratings) {
    console.log(`${rating} -> ${formatTechnicalRating(rating)}`);
  }
}

demonstrateRatingFormatting();
```

## Getting Indicator Information

```javascript
const { getIndicatorInfo, getIndicatorDetails } = require('./src/taExtension');

async function demonstrateIndicatorInfo() {
  // Get info for a single indicator
  console.log('RSI Info:', getIndicatorInfo('RSI'));
  console.log('MACD Info:', getIndicatorInfo('MACD.macd'));
  console.log('SMA5 Info:', getIndicatorInfo('SMA5'));
  
  // Get details for multiple indicators
  const indicators = [
    'RSI', 'MACD.macd', 'SMA5', 'EMA5', 'Stoch.K', 'Williams.Percent',
    'Ultimate.Osc', 'AO', 'CCI20', 'ADX', 'ATR', 'PSAR',
    'Aroon.Up', 'Aroon.Down', 'Aroon_Osc',
    'ADR', 'ADR percentage', 'ATR percentage',
    'Bulls power', 'Bears power'
  ];
  
  const details = getIndicatorDetails(indicators);
  
  console.log('\nDetailed Indicator Information:');
  for (const [indicator, description] of Object.entries(details)) {
    console.log(`${indicator}: ${description}`);
  }
}

demonstrateIndicatorInfo();
```

## Search and Display Indicators

```javascript
const { searchIndicator } = require('./src/miscRequests');

async function searchAndDisplayIndicators() {
  const results = await searchIndicator('RSI');
  
  console.log(`Found ${results.length} indicators matching 'RSI':`);
  
  for (const indicator of results) {
    console.log(`- ${indicator.name} by ${indicator.author.name}`);
    console.log(`  Description: ${indicator.description}`);
    console.log(`  ID: ${indicator.id}`);
    console.log('');
  }
}

searchAndDisplayIndicators();
```

## Adding Indicators to Charts

```javascript
const { Client } = require('./src/client');

const client = new Client();

async function addIndicatorsToChart() {
  await client.connect('BINANCE:BTCEUR');
  
  // Subscribe to updates
  client.Session.subscribe('BINANCE:BTCEUR', '1', (data) => {
    const close = data.v.close;
    const volume = data.v.volume;
    
    // Simple RSI calculation (example)
    // In practice, you'd use a more sophisticated approach
    console.log(`Price: ${close}, Volume: ${volume}`);
  });
}

addIndicatorsToChart();
```

## Login and Get User Info

```javascript
const { loginUser, getUser } = require('./src/miscRequests');

async function loginAndGetUserInfo() {
  try {
    // Login with credentials
    const loginResult = await loginUser('username', 'password');
    
    if (loginResult.session && loginResult.signature) {
      console.log('Login successful');
      
      // Get user information
      const userInfo = await getUser(loginResult.session, loginResult.signature);
      console.log('User Info:', userInfo);
    } else {
      console.log('Login failed');
    }
  } catch (error) {
    console.error('Login error:', error.message);
  }
}

loginAndGetUserInfo();
```

## Get Private Indicators

```javascript
const { getPrivateIndicators } = require('./src/miscRequests');

async function getPrivateIndicatorsExample() {
  try {
    // Get private indicators (requires valid session)
    const indicators = await getPrivateIndicators('session_string', 'signature_string');
    
    console.log(`Found ${indicators.length} private indicators:`);
    
    for (const indicator of indicators) {
      console.log(`- ${indicator.name} (ID: ${indicator.pineId})`);
      console.log(`  Version: ${indicator.version}`);
      console.log(`  Author: ${indicator.author.name}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error getting private indicators:', error.message);
  }
}

// Note: This requires valid session and signature
// getPrivateIndicatorsExample();
```

## Heikin Ashi Chart

```javascript
const { Client } = require('./src/client');
const { getHistory } = require('./src/history');

const client = new Client();

async function heikinAshiChart() {
  const history = await getHistory('BINANCE:BTCEUR', '5', 100);
  
  // Convert to Heikin Ashi
  const ha = {
    t: history.t,
    o: new Array(history.o.length),
    h: new Array(history.h.length),
    l: new Array(history.l.length),
    c: new Array(history.c.length)
  };
  
  // Calculate Heikin Ashi values
  for (let i = 0; i < history.c.length; i++) {
    if (i === 0) {
      ha.o[i] = (history.o[i] + history.c[i]) / 2;
    } else {
      ha.o[i] = (ha.o[i-1] + ha.c[i-1]) / 2;
    }
    
    ha.c[i] = (history.o[i] + history.h[i] + history.l[i] + history.c[i]) / 4;
    ha.h[i] = Math.max(history.h[i], ha.o[i], ha.c[i]);
    ha.l[i] = Math.min(history.l[i], ha.o[i], ha.c[i]);
  }
  
  console.log('Heikin Ashi values calculated for last 5 candles:');
  for (let i = Math.max(0, ha.c.length - 5); i < ha.c.length; i++) {
    console.log(`HA[${i}]: O:${ha.o[i].toFixed(2)}, H:${ha.h[i].toFixed(2)}, L:${ha.l[i].toFixed(2)}, C:${ha.c[i].toFixed(2)}`);
  }
  
  client.end();
}

heikinAshiChart();
```

## Renko Chart

```javascript
const { Client } = require('./src/client');
const { getHistory } = require('./src/history');

const client = new Client();

async function renkoChart() {
  const history = await getHistory('BINANCE:BTCEUR', '5', 200);
  
  // Simple Renko brick calculation (example)
  const brickSize = 100; // 100 USD bricks
  const renko = {
    t: [],
    o: [],
    h: [],
    l: [],
    c: []
  };
  
  if (history.c.length > 0) {
    renko.o[0] = history.o[0];
    renko.h[0] = history.h[0];
    renko.l[0] = history.l[0];
    renko.c[0] = history.c[0];
    renko.t[0] = history.t[0];
    
    for (let i = 1; i < history.c.length; i++) {
      const prevClose = renko.c[renko.c.length - 1];
      const currentPrice = history.c[i];
      
      const diff = currentPrice - prevClose;
      const nBricks = Math.floor(Math.abs(diff) / brickSize);
      
      if (nBricks > 0) {
        for (let j = 0; j < nBricks; j++) {
          let direction = diff > 0 ? 1 : -1;
          let newClose = prevClose + direction * brickSize * (j + 1);
          
          renko.o.push(newClose - direction * brickSize);
          renko.c.push(newClose);
          renko.h.push(Math.max(newClose, newClose - direction * brickSize));
          renko.l.push(Math.min(newClose, newClose - direction * brickSize));
          renko.t.push(history.t[i]);
        }
      }
    }
  }
  
  console.log(`Generated ${renko.c.length} Renko bricks with size ${brickSize}:`);
  for (let i = Math.max(0, renko.c.length - 5); i < renko.c.length; i++) {
    console.log(`Brick[${i}]: O:${renko.o[i].toFixed(2)}, H:${renko.h[i].toFixed(2)}, L:${renko.l[i].toFixed(2)}, C:${renko.c[i].toFixed(2)}`);
  }
  
  client.end();
}

renkoChart();
```

## Historical Replay

```javascript
const { getHistory } = require('./src/history');

async function historicalReplay() {
  const history = await getHistory('BINANCE:BTCEUR', '60', 24); // Last 24 hours
  
  console.log('Starting historical replay...');
  
  for (let i = 0; i < history.t.length; i++) {
    const time = new Date(history.t[i] * 1000);
    const open = history.o[i];
    const high = history.h[i];
    const low = history.l[i];
    const close = history.c[i];
    const volume = history.v[i];
    
    console.log(`${time.toISOString()} OHLCV: ${open},${high},${low},${close},${volume}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
  }
  
  console.log('Historical replay completed.');
}

historicalReplay();
```

## Get Chart Drawings

```javascript
const { getDrawings } = require('./src/miscRequests');

async function getChartDrawingsExample() {
  try {
    // Get drawings for a specific layout (requires valid session)
    const drawings = await getDrawings('layout_id', {
      session: 'session_string',
      signature: 'signature_string'
    });
    
    console.log('Chart drawings:', drawings);
  } catch (error) {
    console.error('Error getting drawings:', error.message);
  }
}

// Note: This requires valid layout ID, session and signature
// getChartDrawingsExample();
```

## Comprehensive Error Handling

```javascript
const { Client } = require('./src/client');
const { getHistory, getTA } = require('./src');

const client = new Client();

async function comprehensiveErrorHandling() {
  try {
    // Attempt to connect to a valid symbol
    await client.connect('BINANCE:BTCEUR');
    
    // Try to get history
    try {
      const history = await getHistory('BINANCE:BTCEUR', '1', 10);
      console.log('History fetched successfully:', history.c.slice(-3));
    } catch (historyError) {
      console.error('History fetch failed:', historyError.message);
    }
    
    // Try to get TA
    try {
      const ta = await getTA('BINANCE:BTCEUR');
      console.log('TA fetched successfully:', ta ? ta.recommendation : 'No TA data');
    } catch (taError) {
      console.error('TA fetch failed:', taError.message);
    }
    
    // Subscribe with error handling
    client.Session.subscribe('BINANCE:BTCEUR', '1', (data) => {
      try {
        // Process data safely
        console.log(`Received update: Close=${data.v.close}, Volume=${data.v.volume}`);
      } catch (processError) {
        console.error('Error processing data:', processError.message);
      }
    });
    
  } catch (connectError) {
    console.error('Connection failed:', connectError.message);
  } finally {
    // Ensure cleanup happens
    setTimeout(() => {
      client.end();
      console.log('Client connection ended');
    }, 5000);
  }
}

comprehensiveErrorHandling();
```

## Timeout Wrapper

```javascript
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    )
  ]);
}

const { getHistory } = require('./src/history');

async function timeoutExample() {
  try {
    // Wrap the API call with a timeout
    const history = await withTimeout(
      getHistory('BINANCE:BTCEUR', '1', 100),
      5000 // 5 second timeout
    );
    
    console.log('History fetched within timeout:', history.c.slice(-3));
  } catch (error) {
    if (error.message.includes('timed out')) {
      console.log('Operation timed out');
    } else {
      console.error('Operation failed:', error.message);
    }
  }
}

timeoutExample();
```

## Reconnect Handling

If you run long-lived bots or stream market data continuously, you’ll eventually hit transient network hiccups.
This library provides:

- Connection lifecycle events: `onReconnecting`, `onReconnected`, `onConnectTimeout`
- Reconnect/backoff tuning options via `Client` constructor
- **Auto session rehydration**: chart/quote sessions automatically re-create and re-subscribe after reconnect

### Minimal example

```javascript
const TradingView = require('./main');

const client = new TradingView.Client({
  token: process.env.SESSION,
  signature: process.env.SIGNATURE,

  // Connect + retry tuning
  connectTimeoutMs: 10_000,
  reconnectMaxRetries: 20,
  reconnectFastFirstDelayMs: 250,
  reconnectBaseDelayMs: 500,
  reconnectMaxDelayMs: 30_000,
  reconnectMultiplier: 2,
  reconnectJitter: true,
});

client.onReconnecting(({ attempt, maxRetries }) => {
  console.log(`Reconnecting… ${attempt + 1}/${maxRetries}`);
});

client.onReconnected(() => {
  console.log('Reconnected (rehydration completed)');
});

client.onConnectTimeout(({ timeoutMs }) => {
  console.warn(`Connect timed out after ${timeoutMs}ms`);
});

// Create sessions/subscriptions once; they will be restored after reconnect.
const chart = new client.Session.Chart();
chart.setMarket('BINANCE:BTCEUR', { timeframe: '1', range: 100 });
```

### Full example

See `examples/ReconnectHandling.js`.