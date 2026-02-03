# TradingView API Usage Examples

## Table of Contents
- [Basic Chart Setup](#basic-chart-setup)
- [Real-time Price Monitoring](#real-time-price-monitoring)
- [Historical Data Retrieval](#historical-data-retrieval)
- [Technical Analysis](#technical-analysis)
- [Indicator Management](#indicator-management)
- [User Authentication](#user-authentication)
- [Advanced Chart Types](#advanced-chart-types)
- [Replay Mode](#replay-mode)
- [Drawing Analysis](#drawing-analysis)
- [Error Handling Patterns](#error-handling-patterns)

## Basic Chart Setup

### Simple Chart Connection
```javascript
const TradingView = require('@mathieuc/tradingview');

const client = new TradingView.Client();

const chart = new client.Session.Chart();

// Set the market and timeframe
chart.setMarket('BINANCE:BTCEUR', {
  timeframe: 'D', // Daily timeframe
});

// Handle errors
chart.onError((error) => {
  console.error('Chart error:', error);
});

// When the symbol is loaded
chart.onSymbolLoaded(() => {
  console.log(`Market "${chart.infos.description}" loaded!`);
});

// When price updates
chart.onUpdate(() => {
  if (!chart.periods[0]) return;
  console.log(`[${chart.infos.description}]: ${chart.periods[0].close} ${chart.infos.currency_id}`);
});

// Clean up after 30 seconds
setTimeout(() => {
  chart.delete();
  client.end();
}, 30000);
```

### Multiple Charts
```javascript
const TradingView = require('@mathieuc/tradingview');

const client = new TradingView.Client();

// Create multiple chart sessions
const btcChart = new client.Session.Chart();
const ethChart = new client.Session.Chart();

btcChart.setMarket('BINANCE:BTCEUR', { timeframe: '1H' });
ethChart.setMarket('BINANCE:ETHEUR', { timeframe: '1H' });

// Handle BTC updates
btcChart.onUpdate(() => {
  if (!btcChart.periods[0]) return;
  console.log(`BTC: ${btcChart.periods[0].close}`);
});

// Handle ETH updates
ethChart.onUpdate(() => {
  if (!ethChart.periods[0]) return;
  console.log(`ETH: ${ethChart.periods[0].close}`);
});

// Clean up after 60 seconds
setTimeout(() => {
  btcChart.delete();
  ethChart.delete();
  client.end();
}, 60000);
```

## Real-time Price Monitoring

### Price Alert System
```javascript
const TradingView = require('@mathieuc/tradingview');

class PriceAlert {
  constructor(market, alertPrice, callback) {
    this.market = market;
    this.alertPrice = alertPrice;
    this.callback = callback;
    this.client = new TradingView.Client();
    this.chart = new this.client.Session.Chart();
    
    this.setupChart();
  }
  
  setupChart() {
    this.chart.setMarket(this.market, { timeframe: '1' }); // 1 minute timeframe
    
    this.chart.onUpdate(() => {
      if (!this.chart.periods[0]) return;
      
      const currentPrice = this.chart.periods[0].close;
      
      if (currentPrice >= this.alertPrice.high) {
        this.callback('HIGH', currentPrice, this.alertPrice.high);
      } else if (currentPrice <= this.alertPrice.low) {
        this.callback('LOW', currentPrice, this.alertPrice.low);
      }
    });
    
    this.chart.onError((error) => {
      console.error('Chart error:', error);
    });
  }
  
  destroy() {
    this.chart.delete();
    this.client.end();
  }
}

// Usage
const alert = new PriceAlert('BINANCE:BTCEUR', { high: 70000, low: 65000 }, (type, current, threshold) => {
  console.log(`Price alert: ${type} - Current: ${current}, Threshold: ${threshold}`);
});
```

### Volume-Based Monitoring
```javascript
const TradingView = require('@mathieuc/tradingview');

const client = new TradingView.Client();
const chart = new client.Session.Chart();

chart.setMarket('BINANCE:BTCEUR', { timeframe: '5' }); // 5-minute timeframe

let previousVolume = 0;

chart.onUpdate(() => {
  if (chart.periods.length < 2) return;
  
  const currentPeriod = chart.periods[0];
  const previousPeriod = chart.periods[1];
  
  // Calculate volume difference
  const volumeChange = currentPeriod.volume - previousVolume;
  previousVolume = currentPeriod.volume;
  
  // Alert on high volume
  if (volumeChange > 1000000) { // 1 million units
    console.log(`High volume detected: ${volumeChange} units`);
  }
  
  console.log(`Price: ${currentPeriod.close}, Volume: ${currentPeriod.volume}`);
});

setTimeout(() => {
  chart.delete();
  client.end();
}, 60000);
```

## Historical Data Retrieval

### Deep History Fetching
```javascript
const TradingView = require('@mathieuc/tradingview');

async function fetchHistoricalData(symbol, timeframe, periods) {
  const client = new TradingView.Client();
  const chart = new client.Session.Chart();
  
  // Set the market
  chart.setMarket(symbol, { 
    timeframe: timeframe,
    range: 100 // Start with 100 periods
  });
  
  // Wait for the initial data to load
  await new Promise(resolve => {
    chart.onSymbolLoaded(() => {
      console.log(`Market ${symbol} loaded`);
      resolve();
    });
  });
  
  // Fetch additional data in batches
  const batchSize = 100;
  let remaining = periods - 100;
  
  while (remaining > 0) {
    const toFetch = Math.min(batchSize, remaining);
    const result = await chart.fetchMoreAsync(toFetch, 5000); // 5 second timeout
    
    if (result.gotMore) {
      console.log(`Fetched ${result.added} additional periods`);
      remaining -= result.added;
    } else {
      console.log('Failed to fetch more data, stopping');
      break;
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Return the historical data
  const historicalData = [...chart.periods].reverse(); // Reverse to get chronological order
  
  chart.delete();
  await client.end();
  
  return historicalData;
}

// Usage
fetchHistoricalData('BINANCE:BTCEUR', '1D', 365)
  .then(data => {
    console.log(`Retrieved ${data.length} daily periods`);
    console.log('First period:', data[0]);
    console.log('Latest period:', data[data.length - 1]);
  })
  .catch(error => {
    console.error('Error fetching historical data:', error);
  });
```

### Data Export to CSV
```javascript
const fs = require('fs');
const TradingView = require('@mathieuc/tradingview');

async function exportToCSV(symbol, timeframe, periods, filename) {
  const data = await fetchHistoricalData(symbol, timeframe, periods);
  
  // Convert to CSV format
  const csvHeader = 'timestamp,open,high,low,close,volume\n';
  const csvRows = data.map(period => 
    `${new Date(period.time * 1000).toISOString()},${period.open},${period.max},${period.min},${period.close},${period.volume}`
  ).join('\n');
  
  // Write to file
  fs.writeFileSync(filename, csvHeader + csvRows);
  console.log(`Data exported to ${filename}`);
}

// Usage
exportToCSV('BINANCE:BTCEUR', '1D', 365, 'btc_daily_data.csv');
```

## Technical Analysis

### Get Technical Analysis
```javascript
const TradingView = require('@mathieuc/tradingview');

async function analyzeMarket(symbol) {
  try {
    const ta = await TradingView.getTA(symbol);
    console.log(`Technical Analysis for ${symbol}:`);
    
    console.log('1-minute analysis:');
    console.log('  Other:', ta['1'].Other);
    console.log('  All:', ta['1'].All);
    console.log('  MA:', ta['1'].MA);
    
    console.log('Daily analysis:');
    console.log('  Other:', ta['1D'].Other);
    console.log('  All:', ta['1D'].All);
    console.log('  MA:', ta['1D'].MA);
    
  } catch (error) {
    console.error('Error getting technical analysis:', error);
  }
}

// Usage
analyzeMarket('BINANCE:BTCEUR');
```

### Real-time TA Updates
```javascript
const TradingView = require('@mathieuc/tradingview');

class RealTimeTA {
  constructor(symbol) {
    this.symbol = symbol;
    this.client = new TradingView.Client();
    this.chart = new this.client.Session.Chart();
    
    this.setupChart();
  }
  
  setupChart() {
    // Set up chart for real-time updates
    this.chart.setMarket(this.symbol, { timeframe: '1' });
    
    this.chart.onUpdate(() => {
      // Get latest technical analysis periodically
      if (Math.random() < 0.01) { // Approximately every 100 updates
        TradingView.getTA(this.symbol)
          .then(ta => {
            console.log(`Real-time TA for ${this.symbol}:`);
            console.log('  All:', ta['1'].All);
            console.log('  MA:', ta['1'].MA);
          })
          .catch(error => {
            console.error('Error getting TA:', error);
          });
      }
    });
  }
  
  destroy() {
    this.chart.delete();
    this.client.end();
  }
}

// Usage
const taMonitor = new RealTimeTA('BINANCE:BTCEUR');
setTimeout(() => taMonitor.destroy(), 300000); // Run for 5 minutes
```

## Indicator Management

### Search and Display Indicators
```javascript
const TradingView = require('@mathieuc/tradingview');

async function searchAndDisplayIndicators(searchTerm) {
  try {
    const results = await TradingView.searchIndicator(searchTerm);
    
    console.log(`Found ${results.length} indicators for "${searchTerm}":`);
    
    results.forEach((indicator, index) => {
      console.log(`${index + 1}. ${indicator.name}`);
      console.log(`   ID: ${indicator.id}`);
      console.log(`   Version: ${indicator.version}`);
      console.log(`   Type: ${indicator.type}`);
      console.log(`   Access: ${indicator.access}`);
      console.log(`   Author: ${indicator.author.username}`);
    });
    
    return results;
  } catch (error) {
    console.error('Error searching indicators:', error);
    return [];
  }
}

// Usage
searchAndDisplayIndicators('RSI').then(results => {
  if (results.length > 0) {
    // Get details of the first result
    results[0].get().then(indicator => {
      console.log('Detailed indicator info:', indicator);
    });
  }
});
```

### Adding Indicators to Charts
```javascript
const TradingView = require('@mathieuc/tradingview');

async function addIndicatorToChart() {
  const client = new TradingView.Client();
  const chart = new client.Session.Chart();
  
  // Set up the chart
  chart.setMarket('BINANCE:BTCEUR', { timeframe: '1H' });
  
  // Wait for chart to load
  await new Promise(resolve => {
    chart.onSymbolLoaded(resolve);
  });
  
  // Search for RSI indicator
  const indicators = await TradingView.searchIndicator('RSI');
  
  if (indicators.length > 0) {
    const rsiIndicator = await indicators[0].get();
    
    // Add the indicator to the chart
    const rsiStudy = new chart.Study(rsiIndicator);
    
    rsiStudy.onUpdate(() => {
      // Get RSI value
      const rsiValues = rsiStudy.values.RSI;
      if (rsiValues && rsiValues.length > 0) {
        const latestRsi = rsiValues[rsiValues.length - 1];
        console.log(`RSI: ${latestRsi}`);
        
        // Check for overbought/oversold
        if (latestRsi > 70) {
          console.log('RSI: OVERBOUGHT');
        } else if (latestRsi < 30) {
          console.log('RSI: OVERSOLD');
        }
      }
    });
    
    rsiStudy.onError((error) => {
      console.error('RSI study error:', error);
    });
  }
  
  // Clean up after 5 minutes
  setTimeout(() => {
    if (rsiStudy) rsiStudy.remove();
    chart.delete();
    client.end();
  }, 300000);
}

// Usage
addIndicatorToChart();
```

## User Authentication

### Login and Get User Info
```javascript
const TradingView = require('@mathieuc/tradingview');

async function authenticateUser(username, password) {
  try {
    console.log('Logging in...');
    const user = await TradingView.loginUser(username, password);
    
    console.log('Login successful!');
    console.log('User info:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Reputation: ${user.reputation}`);
    console.log(`  Followers: ${user.followers}`);
    console.log(`  Following: ${user.following}`);
    
    // Use session info for other authenticated requests
    console.log('Session ID:', user.session);
    console.log('Signature:', user.signature);
    
    return user;
  } catch (error) {
    console.error('Login failed:', error.message);
    return null;
  }
}

// Usage
authenticateUser(process.env.TV_USERNAME, process.env.TV_PASSWORD);
```

### Get Private Indicators
```javascript
const TradingView = require('@mathieuc/tradingview');

async function getPrivateIndicators(sessionId, signature) {
  try {
    const indicators = await TradingView.getPrivateIndicators(sessionId, signature);
    
    console.log(`Found ${indicators.length} private indicators:`);
    
    indicators.forEach((indicator, index) => {
      console.log(`${index + 1}. ${indicator.name}`);
      console.log(`   ID: ${indicator.id}`);
      console.log(`   Version: ${indicator.version}`);
      console.log(`   Type: ${indicator.type}`);
    });
    
    return indicators;
  } catch (error) {
    console.error('Error getting private indicators:', error);
    return [];
  }
}

// Usage
getPrivateIndicators(process.env.TV_SESSION_ID, process.env.TV_SIGNATURE);
```

## Advanced Chart Types

### Heikin Ashi Chart
```javascript
const TradingView = require('@mathieuc/tradingview');

const client = new TradingView.Client();
const chart = new client.Session.Chart();

// Set up Heikin Ashi chart
chart.setMarket('BINANCE:BTCEUR', {
  timeframe: '1H',
  type: 'HeikinAshi'
});

chart.onSymbolLoaded(() => {
  console.log('Heikin Ashi chart loaded');
});

chart.onUpdate(() => {
  if (!chart.periods[0]) return;
  console.log(`Heikin Ashi: ${chart.periods[0].close}`);
});

// Clean up after 2 minutes
setTimeout(() => {
  chart.delete();
  client.end();
}, 120000);
```

### Renko Chart
```javascript
const TradingView = require('@mathieuc/tradingview');

const client = new TradingView.Client();
const chart = new client.Session.Chart();

// Set up Renko chart
chart.setMarket('BINANCE:BTCEUR', {
  timeframe: '1H',
  type: 'Renko',
  inputs: {
    boxSize: 100, // Box size of 100 units
    style: 'ATR', // Use ATR for box sizing
    atrLength: 14 // ATR length
  }
});

chart.onSymbolLoaded(() => {
  console.log('Renko chart loaded');
});

chart.onUpdate(() => {
  if (!chart.periods[0]) return;
  console.log(`Renko: ${chart.periods[0].close}`);
});

// Clean up after 2 minutes
setTimeout(() => {
  chart.delete();
  client.end();
}, 120000);
```

## Replay Mode

### Historical Replay
```javascript
const TradingView = require('@mathieuc/tradingview');

async function replayHistory() {
  const client = new TradingView.Client();
  const chart = new client.Session.Chart();
  
  // Calculate a timestamp 7 days ago
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
  
  // Set up replay mode starting from 7 days ago
  chart.setMarket('BINANCE:BTCEUR', {
    timeframe: '1H',
    replay: sevenDaysAgo
  });
  
  // Wait for replay to load
  await new Promise(resolve => {
    chart.onReplayLoaded(() => {
      console.log('Replay mode loaded');
      resolve();
    });
  });
  
  // Listen for replay point updates
  chart.onReplayPoint((index) => {
    console.log(`Replay at point: ${index}`);
  });
  
  // Listen for replay end
  chart.onReplayEnd(() => {
    console.log('Replay ended');
  });
  
  // Start replay at 100ms intervals
  await chart.replayStart(100);
  
  // Stop replay after 30 seconds
  setTimeout(async () => {
    await chart.replayStop();
    chart.delete();
    client.end();
  }, 30000);
}

// Usage
replayHistory();
```

## Drawing Analysis

### Get Chart Drawings
```javascript
const TradingView = require('@mathieuc/tradingview');

async function getChartDrawings(layoutId, sessionId, signature) {
  try {
    // Get drawings from a specific layout
    const drawings = await TradingView.getDrawings(
      layoutId,
      '', // No symbol filter
      { id: -1, session: sessionId, signature: signature }
    );
    
    console.log(`Found ${drawings.length} drawings:`);
    
    drawings.forEach((drawing, index) => {
      console.log(`${index + 1}. ${drawing.type} - ID: ${drawing.id}`);
      console.log(`   Symbol: ${drawing.symbol}`);
      console.log(`   Points: ${drawing.points.length}`);
      console.log(`   Z-order: ${drawing.zorder}`);
      
      // Log the first and last points
      if (drawing.points.length > 0) {
        const firstPoint = drawing.points[0];
        const lastPoint = drawing.points[drawing.points.length - 1];
        console.log(`   First point: (${firstPoint.time_t}, ${firstPoint.price})`);
        console.log(`   Last point: (${lastPoint.time_t}, ${lastPoint.price})`);
      }
    });
    
    return drawings;
  } catch (error) {
    console.error('Error getting drawings:', error);
    return [];
  }
}

// Usage
getChartDrawings(
  process.env.LAYOUT_ID,
  process.env.TV_SESSION_ID,
  process.env.TV_SIGNATURE
);
```

## Error Handling Patterns

### Comprehensive Error Handling
```javascript
const TradingView = require('@mathieuc/tradingview');

class RobustChart {
  constructor(symbol, options = {}) {
    this.symbol = symbol;
    this.options = options;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    this.init();
  }
  
  async init() {
    try {
      this.client = new TradingView.Client(this.options);
      this.chart = new this.client.Session.Chart();
      
      // Set up error handlers
      this.client.onError((error) => {
        console.error('Client error:', error);
        this.handleClientError(error);
      });
      
      this.chart.onError((error) => {
        console.error('Chart error:', error);
        this.handleChartError(error);
      });
      
      // Set up chart
      this.chart.setMarket(this.symbol, this.options);
      
      this.chart.onSymbolLoaded(() => {
        console.log(`Market ${this.symbol} loaded successfully`);
        this.reconnectAttempts = 0; // Reset on success
      });
      
      this.chart.onUpdate((changes) => {
        console.log(`Chart updated: ${changes.join(', ')}`);
      });
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.attemptReconnect();
    }
  }
  
  handleClientError(error) {
    console.error('Handling client error:', error);
    this.attemptReconnect();
  }
  
  handleChartError(error) {
    console.error('Handling chart error:', error);
    // Try to recreate the chart
    try {
      this.chart.delete();
      this.chart = new this.client.Session.Chart();
      this.chart.setMarket(this.symbol, this.options);
    } catch (recreateError) {
      console.error('Failed to recreate chart:', recreateError);
      this.attemptReconnect();
    }
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Clean up current instances
    if (this.chart) {
      this.chart.delete();
    }
    
    if (this.client) {
      this.client.end();
    }
    
    // Retry after delay
    setTimeout(() => {
      this.init();
    }, 2000 * this.reconnectAttempts); // Exponential backoff
  }
  
  destroy() {
    if (this.chart) {
      this.chart.delete();
    }
    
    if (this.client) {
      this.client.end();
    }
  }
}

// Usage
const robustChart = new RobustChart('BINANCE:BTCEUR', { timeframe: '1H' });

// Clean up after 5 minutes
setTimeout(() => {
  robustChart.destroy();
}, 300000);
```

### Timeout Wrapper
```javascript
function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

// Usage with historical data fetch
async function safeHistoricalFetch(symbol, timeframe, periods) {
  try {
    const data = await withTimeout(
      fetchHistoricalData(symbol, timeframe, periods),
      30000, // 30 second timeout
      'Historical data fetch timed out'
    );
    
    console.log(`Successfully retrieved ${data.length} periods`);
    return data;
  } catch (error) {
    console.error('Historical fetch failed:', error.message);
    return null;
  }
}