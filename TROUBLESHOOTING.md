# TradingView API Troubleshooting Guide

## Table of Contents
- [Common Issues](#common-issues)
- [Connection Problems](#connection-problems)
- [Authentication Issues](#authentication-issues)
- [Data Problems](#data-problems)
- [Chart Issues](#chart-issues)
- [Indicator Problems](#indicator-problems)
- [Performance Issues](#performance-issues)
- [Debugging Techniques](#debugging-techniques)
- [Rate Limiting](#rate-limiting)
- [Environment-Specific Issues](#environment-specific-issues)

## Common Issues

### Invalid Market Symbols
**Problem**: Chart fails to load with an error about the market symbol.
**Solution**: Verify the symbol format is correct (e.g., 'BINANCE:BTCEUR', 'NASDAQ:AAPL').
```javascript
// Correct format: Exchange:SYMBOL
chart.setMarket('BINANCE:BTCEUR'); // ✓ Correct
chart.setMarket('BTCEUR');         // ✗ Incorrect
```

### WebSocket Connection Fails
**Problem**: Client fails to connect to TradingView's WebSocket.
**Solution**: Check your internet connection and firewall settings.
```javascript
const client = new TradingView.Client({ DEBUG: true }); // Enable debug mode

client.onConnected(() => {
  console.log('Connected successfully');
});

client.onDisconnected(() => {
  console.log('Disconnected');
});

client.onError((error) => {
  console.error('Client error:', error);
});
```

### Memory Leaks with Long-Running Applications
**Problem**: Application memory usage grows over time.
**Solution**: Implement proper cleanup and consider limiting stored data:
```javascript
// Set a maximum number of stored periods
chart.setMarket('BINANCE:BTCEUR', { 
  timeframe: '1', 
  range: 1000  // Limit to 1000 periods
});

// Clean up properly
process.on('SIGINT', () => {
  chart.delete();
  client.end();
  process.exit(0);
});
```

## Connection Problems

### Network Connectivity Issues
**Symptoms**: 
- `Error: connect ECONNREFUSED`
- `WebSocket was closed before the connection was established`
- Client remains in connecting state indefinitely

**Solutions**:
1. Check internet connectivity
2. Verify proxy settings if behind corporate firewall
3. Try different server endpoints:
```javascript
// Try different servers
const client = new TradingView.Client({ server: 'prodata' }); // Premium data
// or
const client = new TradingView.Client({ server: 'widgetdata' }); // Widget data
```

### Firewall/Proxy Blocking
**Symptoms**: Connection timeouts or refused connections
**Solutions**:
1. Check if WebSocket traffic (wss://) is blocked
2. Configure proxy settings if needed
3. Contact network administrator to whitelist TradingView domains

### Server Unavailability
**Symptoms**: Consistent connection failures across multiple attempts
**Solutions**:
1. Check TradingView status page
2. Verify you're using the correct server endpoint
3. Implement retry logic with exponential backoff

## Authentication Issues

### Expired Session Tokens
**Symptoms**: 
- Authentication fails with "invalid session" error
- Previously working tokens suddenly stop working

**Solutions**:
1. Refresh your session tokens:
```javascript
// Get fresh tokens by logging in again
TradingView.loginUser(username, password)
  .then(user => {
    // Store new session and signature
    console.log('New session:', user.session);
    console.log('New signature:', user.signature);
  });
```

2. Verify token format:
```javascript
// Valid session token format
const isValidSession = (session) => /^[\w\d]+$/.test(session);
const isValidSignature = (signature) => /^[a-fA-F0-9]+$/.test(signature);
```

### Invalid Credentials
**Symptoms**: Login fails with authentication error
**Solutions**:
1. Verify username/email and password are correct
2. Check that account is not suspended or locked
3. Ensure you're using the correct TradingView domain for your region

### Session Cookie Issues
**Symptoms**: Getting user info fails despite having session cookie
**Solutions**:
```javascript
// Properly format cookies
const user = await TradingView.getUser(
  process.env.SESSION,
  process.env.SIGNATURE || ''
);
```

## Data Problems

### Missing Historical Data
**Symptoms**: Chart loads but historical data is incomplete or missing
**Solutions**:
1. Check if the market supports the requested timeframe
2. Verify sufficient range is requested:
```javascript
// Request more data if needed
chart.setMarket('BINANCE:BTCEUR', { 
  timeframe: '1D', 
  range: 365  // Request 365 days
});

// Fetch additional data
await chart.fetchMore(100); // Fetch 100 more periods
```

### Data Gaps
**Symptoms**: Periods are missing from the data stream
**Solutions**:
1. Check if the market has gaps during certain hours
2. Verify the timeframe is supported by the market
3. Implement gap detection and handling:
```javascript
chart.onUpdate(() => {
  if (chart.periods.length > 1) {
    const current = chart.periods[0];
    const previous = chart.periods[1];
    const expectedTimeDiff = getTimeDifferenceForTimeframe(chart.infos.timeframe);
    
    if ((previous.time - current.time) > expectedTimeDiff * 2) {
      console.log('Gap detected in data');
      // Handle gap - maybe refetch data
    }
  }
});
```

### Incorrect Price Scales
**Symptoms**: Prices appear incorrect or with unexpected precision
**Solutions**: Check the market's price scale:
```javascript
chart.onSymbolLoaded(() => {
  console.log('Price scale:', chart.infos.pricescale);
  // Use the price scale to format prices correctly
});
```

## Chart Issues

### Chart Not Updating
**Symptoms**: Chart loads but doesn't receive real-time updates
**Solutions**:
1. Verify event listeners are properly attached:
```javascript
chart.onUpdate(() => {
  console.log('Chart updated'); // Should log when data arrives
});
```

2. Check if the market is actively trading
3. Verify WebSocket connection is still open:
```javascript
if (!client.isOpen) {
  console.log('Client is not connected');
}
```

### Timezone Issues
**Symptoms**: Timestamps appear in wrong timezone
**Solutions**: Explicitly set the timezone:
```javascript
// Set to exchange timezone or specific timezone
chart.setTimezone('exchange'); // Use exchange timezone
// or
chart.setTimezone('America/New_York'); // Use specific timezone
```

### Invalid Chart Types
**Symptoms**: Chart fails to load when using custom chart types
**Solutions**: Verify chart type is supported:
```javascript
// Valid chart types
const validTypes = ['HeikinAshi', 'Renko', 'LineBreak', 'Kagi', 'PointAndFigure', 'Range'];

if (validTypes.includes(chartType)) {
  chart.setMarket('BINANCE:BTCEUR', { 
    type: chartType,
    inputs: chartInputs 
  });
}
```

## Indicator Problems

### Indicator Not Loading
**Symptoms**: Study creation fails or indicator doesn't appear on chart
**Solutions**:
1. Verify indicator exists and is accessible:
```javascript
// Search for the indicator first
const indicators = await TradingView.searchIndicator('RSI');
if (indicators.length > 0) {
  const rsiIndicator = await indicators[0].get();
  const rsiStudy = new chart.Study(rsiIndicator);
}
```

2. Check if indicator requires authentication:
```javascript
// Some indicators require login
const client = new TradingView.Client({
  token: process.env.SESSION,
  signature: process.env.SIGNATURE
});
```

### Indicator Calculation Errors
**Symptoms**: Indicator values are NaN or incorrect
**Solutions**:
1. Verify chart has sufficient data:
```javascript
// Wait for chart to load data before adding indicators
await new Promise(resolve => {
  chart.onSymbolLoaded(() => {
    // Chart loaded, now add indicator
    const study = new chart.Study(indicator);
    resolve();
  });
});
```

2. Check indicator inputs:
```javascript
// Verify inputs are valid
const validInputs = {
  length: 14,  // Common RSI length
  source: 'close'  // Valid source
};

const study = new chart.Study(indicator, { inputs: validInputs });
```

## Performance Issues

### High Memory Usage
**Symptoms**: Process memory grows continuously
**Solutions**:
1. Limit stored data:
```javascript
// The chart automatically limits data if maxPeriods is set
// But you can also manually clean up periodically
setInterval(() => {
  if (chart.periods.length > 1000) {
    // Keep only recent data
    chart.#trimPeriodsIfNeeded(); // Internal method to trim excess
  }
}, 60000); // Every minute
```

2. Implement proper cleanup:
```javascript
const cleanup = () => {
  if (study) study.remove();
  if (chart) chart.delete();
  if (client) client.end();
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
```

### Slow Data Updates
**Symptoms**: Delayed or infrequent data updates
**Solutions**:
1. Check network connection
2. Reduce the number of concurrent charts
3. Optimize event handlers:
```javascript
// Debounce expensive operations
let updateTimer;
chart.onUpdate(() => {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    // Expensive operation here
    processChartData(chart.periods);
  }, 100); // Update every 100ms max
});
```

### CPU Spikes
**Symptoms**: High CPU usage during data processing
**Solutions**:
1. Move heavy computations off the main thread
2. Batch operations:
```javascript
// Instead of processing each update individually
let updateBatch = [];
chart.onUpdate(() => {
  updateBatch.push([...chart.periods]); // Copy data
  
  // Process batch periodically
  if (updateBatch.length > 10) {
    processBatch(updateBatch);
    updateBatch = [];
  }
});
```

## Debugging Techniques

### Enable Debug Mode
```javascript
// Enable detailed logging
const client = new TradingView.Client({ DEBUG: true });
```

### Monitor Connection State
```javascript
// Track connection state
let isConnected = false;
let isLoggedIn = false;

client.onConnected(() => {
  isConnected = true;
  console.log('Connected to TradingView');
});

client.onDisconnected(() => {
  isConnected = false;
  console.log('Disconnected from TradingView');
});

client.onLogged(() => {
  isLoggedIn = true;
  console.log('Logged in to TradingView');
});
```

### Log All Events
```javascript
// Catch all events for debugging
client.onEvent((eventName, ...data) => {
  console.log(`Event: ${eventName}`, data);
});
```

### Monitor Data Flow
```javascript
// Track data updates
let lastUpdate = Date.now();
let updateCount = 0;

chart.onUpdate(() => {
  updateCount++;
  const now = Date.now();
  const timeDiff = now - lastUpdate;
  
  console.log(`Update ${updateCount}: ${timeDiff}ms since last update`);
  console.log(`Periods: ${chart.periods.length}`);
  
  lastUpdate = now;
});
```

## Rate Limiting

### Identifying Rate Limits
**Symptoms**:
- Sudden connection drops
- Requests returning errors
- Slower response times

### Solutions:
1. Implement request throttling:
```javascript
class ThrottledAPI {
  constructor(maxRequestsPerSecond = 10) {
    this.maxRPS = maxRequestsPerSecond;
    this.requests = [];
    
    // Clean old requests every second
    setInterval(() => {
      const now = Date.now();
      this.requests = this.requests.filter(req => now - req < 1000);
    }, 1000);
  }
  
  async makeRequest(fn) {
    // Wait if we've hit the limit
    while (this.requests.length >= this.maxRPS) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.requests.push(Date.now());
    return await fn();
  }
}

const throttled = new ThrottledAPI(5); // 5 requests per second

// Use it
await throttled.makeRequest(() => TradingView.searchMarketV3('BTC'));
```

2. Add delays between requests:
```javascript
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

for (const symbol of symbols) {
  const data = await TradingView.getTA(symbol);
  await delay(100); // 100ms delay between requests
}
```

## Environment-Specific Issues

### Docker Containers
**Issues**: WebSocket connections may fail in containerized environments
**Solutions**:
1. Ensure proper networking configuration
2. Check if host network mode is needed:
```dockerfile
# Dockerfile
EXPOSE 8080
# Make sure WebSocket ports are accessible
```

```bash
# Run with host network if needed
docker run --network=host your-image
```

### Cloud Environments
**Issues**: Corporate firewalls or security groups blocking connections
**Solutions**:
1. Whitelist TradingView domains
2. Use specific IP ranges if required by security policy

### Corporate Networks
**Issues**: Proxy servers or content filters blocking connections
**Solutions**:
1. Configure proxy settings
2. Use HTTPS endpoints
3. Contact IT department for whitelisting

### Mobile/Edge Devices
**Issues**: Limited resources or unstable connections
**Solutions**:
1. Reduce data frequency
2. Implement aggressive caching
3. Optimize for low bandwidth

---

## Additional Resources

- Check the [API Specification](API_SPEC.md) for detailed method documentation
- Review [Usage Examples](USAGE_EXAMPLES.md) for implementation patterns
- Monitor TradingView's official status page for service disruptions
- Join the community forums for peer support

For persistent issues, consider opening an issue on the GitHub repository with detailed logs and reproduction steps.