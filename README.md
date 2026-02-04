# TradingView API Client

A comprehensive Node.js client for interacting with TradingView's public and private APIs, including real-time market data, charting capabilities, technical analysis, and indicator management.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Examples](#running-examples)
- [Configuration](#configuration)
- [Dependencies](#dependencies)
- [Package Manager Setup](#package-manager-setup)
- [Troubleshooting](#troubleshooting)
- [Contribution Guidelines](#contribution-guidelines)

## Overview

This library provides a complete interface to TradingView's APIs, enabling developers to:
- Access real-time market data through WebSocket connections
- Create and manage chart sessions with historical data
- Retrieve technical analysis and indicators
- Search for markets and symbols
- Manage Pine script indicators
- Perform user authentication and session management

## Features

- **Real-time Data**: WebSocket-based streaming of market data
- **Chart Sessions**: Create and manage chart sessions with customizable timeframes
- **Technical Analysis**: Access to TradingView's technical analysis tools
- **Indicator Management**: Search, create, and manage Pine script indicators
- **Market Search**: Comprehensive symbol search functionality
- **Replay Mode**: Historical data replay capabilities
- **Authentication**: Support for user login and session management
- **Custom Chart Types**: Support for Heikin Ashi, Renko, Kagi, and other chart types
- **Error Handling**: Comprehensive error handling and recovery mechanisms

## Installation

### Prerequisites
- Node.js >= 14.0.0

### Install via npm
```bash
npm install @mathieuc/tradingview
```

### Install via yarn
```bash
yarn add @mathieuc/tradingview
```

### Install via pnpm
```bash
pnpm add @mathieuc/tradingview
```

## Quick Start

### Running Examples

This repository contains runnable scripts in the [`examples/`](./examples) folder.

Common ones:
- `examples/Search.js` (markets + `searchIndicator`)
- `examples/IndicatorSearchApi.js` (new `TradingView.indicators` wrapper)
- `examples/FetchPublicScriptSource.js` (search → info → auth check → raw source fetch)

Run an example:
```bash
pnpm run example examples/Search.js
pnpm run example examples/IndicatorSearchApi.js
pnpm run example examples/FetchPublicScriptSource.js
```


### Basic Chart Example
```javascript
const TradingView = require('@mathieuc/tradingview');

// Create a WebSocket client
const client = new TradingView.Client();

// Initialize a chart session
const chart = new client.Session.Chart();

// Set the market and timeframe
chart.setMarket('BINANCE:BTCEUR', {
  timeframe: 'D',
});

// Listen for errors
chart.onError((...err) => {
  console.error('Chart error:', ...err);
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

// Close the chart and client after 30 seconds
setTimeout(() => {
  chart.delete();
  client.end();
}, 30000);
```

### Market Search Example
```javascript
const TradingView = require('@mathieuc/tradingview');

// Search for markets
TradingView.searchMarketV3('BINANCE:').then((results) => {
  console.log('Found Markets:', results);
});

// Search for indicators
TradingView.searchIndicator('RSI').then((results) => {
  console.log('Found Indicators:', results);
});
```

### Authentication Example
```javascript
const TradingView = require('@mathieuc/tradingview');

// Login with credentials
TradingView.loginUser('your_username', 'your_password')
  .then(user => {
    console.log('Logged in as:', user.username);
    
    // Use session info for authenticated requests
    return TradingView.getPrivateIndicators(user.session, user.signature);
  })
  .then(indicators => {
    console.log('Your private indicators:', indicators);
  })
  .catch(err => {
    console.error('Login error:', err.message);
  });
```

## Architecture

### System Components

#### 1. Client Module ([`src/client.js`](src/client.js:47))
The core WebSocket client that manages connections to TradingView's servers. Handles authentication, reconnection logic, and packet communication.

**Key Features:**
- Automatic reconnection with exponential backoff
- Heartbeat monitoring
- Session management
- Event handling system

**Reconnect handling:**
- Lifecycle callbacks: `onReconnecting`, `onReconnected`, `onConnectTimeout`
- Auto session rehydration on reconnect (re-create chart/quote sessions + resubscribe)
- Disable auto rehydration with `new Client({ autoRehydrate: false })`
- Example: `examples/ReconnectHandling.js`

#### 2. HTTP Module ([`src/http.js`](src/http.js:1))
Centralized HTTP client using Axios with consistent defaults and headers.

#### 3. Protocol Module ([`src/protocol.js`](src/protocol.js:12))
Handles TradingView's WebSocket packet formatting and parsing.

#### 4. Chart Session ([`src/chart/session.js`](src/chart/session.js:117))
Manages chart sessions with real-time data streaming and historical data retrieval.

#### 5. Quote Session ([`src/quote/session.js`](src/quote/session.js:1))
Handles quote data for specific symbols.

#### 6. Study/Indicator Module ([`src/chart/study.js`](src/chart/study.js:1))
Manages technical indicators and Pine scripts on charts.

#### 7. Utility Functions ([`src/utils.js`](src/utils.js:1))
Shared utility functions for session ID generation and cookie management.

### Data Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│   Client    │────│  WebSocket  │────│ TradingView API │
│             │    │ Connection  │    │                 │
└─────────────┘    └─────────────┘    └─────────────────┘
        │                                      │
        │                               ┌─────▼─────┐
        │                               │ Protocol  │
        │                               │ Parsing   │
        │                               └─────┬─────┘
        │                                     │
        ▼                              ┌─────▼─────┐
┌─────────────┐                       │ Chart/Quote │
│ Applications│                       │ Sessions    │
│             │                       └─────────────┘
└─────────────┘
```

## API Documentation

### Main Module Exports

#### `TradingView.Client`
WebSocket client for real-time data communication.

**Constructor Options:**
- `token`: User auth token (in 'sessionid' cookie)
- `signature`: User auth token signature (in 'sessionid_sign' cookie)
- `DEBUG`: Enable debug mode
- `server`: Server type ('data' | 'prodata' | 'widgetdata')
- `location`: Auth page location

**Methods:**
- `onConnected(cb)`: Called when client connects
- `onDisconnected(cb)`: Called when client disconnects
- `onLogged(cb)`: Called when client authenticates
- `onPing(cb)`: Called when server pings client
- `onData(cb)`: Called when unparsed data received
- `onError(cb)`: Called when client error occurs
- `onEvent(cb)`: Called when any client event occurs
- `send(type, data)`: Send custom packet
- `end()`: Close the WebSocket connection

**Properties:**
- `isOpen`: True if client is connected
- `isLogged`: True if client is authenticated

#### `TradingView.Session.Chart`
Chart session for market data visualization.

**Methods:**
- `setMarket(symbol, options)`: Set the chart market
- `setSeries(timeframe, range, reference)`: Set the chart series
- `setTimezone(timezone)`: Set the chart timezone
- `fetchMore(number)`: Fetch additional historical data
- `fetchMoreAsync(number, timeout)`: Fetch additional data with promise
- `onSymbolLoaded(cb)`: Called when symbol loads
- `onUpdate(cb)`: Called when chart updates
- `onError(cb)`: Called when chart error occurs
- `delete()`: Remove the chart session

**Chart Types:**
- `HeikinAshi`: Heikin Ashi charts
- `Renko`: Renko charts
- `LineBreak`: Line Break charts
- `Kagi`: Kagi charts
- `PointAndFigure`: Point & Figure charts
- `Range`: Range bars

**Options for setMarket:**
- `timeframe`: Chart timeframe ('1', '5', '15', '30', '60', '1D', etc.)
- `range`: Number of periods to load (default: 100)
- `to`: Last candle timestamp
- `adjustment`: Adjustment type ('splits' | 'dividends')
- `backadjustment`: Backadjustment of futures contracts
- `session`: Chart session ('regular' | 'extended')
- `currency`: Chart currency
- `type`: Custom chart type
- `inputs`: Custom chart inputs
- `replay`: Replay mode starting point

#### `TradingView.Session.Quote`
Quote session for real-time symbol data.

**Methods:**
- `setMarket(symbol)`: Set the quote market
- `onData(cb)`: Called when quote data updates
- `onError(cb)`: Called when quote error occurs
- `delete()`: Remove the quote session

### Utility Functions

#### `TradingView.getTA(id)`
Get technical analysis for a market symbol.

#### `TradingView.searchMarketV3(search, filter, offset)`
Search for markets with advanced filtering.

#### `TradingView.searchIndicator(search)`
Search for Pine script indicators.

#### `TradingView.indicators` (new)
A higher-level indicators/scripts wrapper that exposes:
- public script search (`searchPublicScripts`)
- library browsing (`browsePublicLibrary`)
- metadata (`getScriptInfo`)
- authorization checks (`isAuthorizedToGet`)
- raw source payload fetch (`getScriptSource`)

See `examples/IndicatorSearchApi.js` and `examples/FetchPublicScriptSource.js`.

#### `TradingView.loginUser(username, password, remember, userAgent)`
Login with TradingView credentials.

#### `TradingView.getUser(session, signature, location)`
Get user info from session cookie.

#### `TradingView.getPrivateIndicators(session, signature)`
Get user's private indicators.

### Classes

#### `PineIndicator`
Class representing a Pine script indicator with inputs and plots.

#### `BuiltInIndicator`
Class for built-in TradingView indicators.

#### `PinePermManager`
Class for managing Pine script permissions.

## Configuration

### Environment Variables
Create a `.env` file to store sensitive information:
```
# From your TradingView cookies:
# sessionid -> SESSION
# sessionid_sign -> SIGNATURE
SESSION=your_session_id
SIGNATURE=your_signature
TV_USERNAME=your_username
TV_PASSWORD=your_password
```

### Client Options
```javascript
const client = new TradingView.Client({
  token: process.env.SESSION,
  signature: process.env.SIGNATURE,
  DEBUG: true, // Enable debug mode
  server: 'data', // or 'prodata' for premium data
  location: 'https://www.tradingview.com/'
});
```

## Dependencies

### Runtime Dependencies
- `axios`: HTTP client for API requests
- `ws`: WebSocket client for real-time data
- `jszip`: ZIP compression/decompression for data parsing

### Development Dependencies
- `vitest`: Testing framework
- `eslint`: Code linting
- `dotenv`: Environment variable loading
- `@babel/eslint-parser`: Babel ESLint parser

## Package Manager Setup

This project uses [pnpm](https://pnpm.io/) as the package manager, managed by [mise](https://mise.jdx.dev/) for consistent development environments.

### Quick Setup

For new contributors, we recommend using [mise](https://mise.jdx.dev/) to manage your Node.js and pnpm versions:

```bash
# Install mise if you don't have it (https://mise.jdx.dev/)
# Then install the correct versions and dependencies:
mise install

# Use mise to run pnpm with the pinned versions
mise pnpm install
mise pnpm test
mise pnpm run example examples/SimpleChart.js
```

Or use the provided setup script:
```bash
./scripts/setup-pnpm.sh
```

For more details, see the [full package manager setup guide](./docs/PACKAGE_MANAGER_SETUP.md).

## Troubleshooting

### Common Issues

#### Connection Problems
- Verify your internet connection
- Check firewall settings
- Ensure you're using the correct server (data/prodata/widgetdata)
- Enable DEBUG mode to see detailed connection logs

#### Authentication Errors
- Confirm session ID and signature are valid
- Check that cookies are properly formatted
- Verify that your TradingView account is active

#### Rate Limiting
- TradingView may apply rate limits to API requests
- Implement retry logic with exponential backoff
- Space out requests to avoid triggering limits

#### Chart Loading Failures
- Verify market symbol format (e.g., 'BINANCE:BTCEUR')
- Check that the symbol is supported by TradingView
- Ensure sufficient permissions for private charts

### Debugging Tips

Enable debug mode to see detailed packet information:
```javascript
const client = new TradingView.Client({ DEBUG: true });
```

Handle errors appropriately:
```javascript
chart.onError((error) => {
  console.error('Chart error:', error);
  // Implement recovery logic here
});
```

Monitor connection status:
```javascript
client.onConnected(() => {
  console.log('Connected to TradingView');
});

client.onDisconnected(() => {
  console.log('Disconnected from TradingView');
});
```

## Contribution Guidelines

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/tradingview-api.git`
3. Install dependencies:
   - Using npm: `npm install`
   - Using yarn: `yarn install`
   - Using pnpm (recommended): `pnpm install`
   
   For consistent development environment, consider using [mise](https://mise.jdx.dev/) to manage your Node.js and pnpm versions:
   ```bash
   mise install  # Installs the correct Node.js and pnpm versions
   pnpm install  # Installs project dependencies
   ```
4. Create a feature branch: `git checkout -b feature-name`

### Code Standards
- Follow existing code style and patterns
- Write comprehensive JSDoc comments
- Add tests for new functionality
- Ensure all tests pass before submitting

### Testing
Run the test suite:
```bash
# Using npm
npm test

# Using yarn
yarn test

# Using pnpm
pnpm test

# Non-interactive / CI-friendly (runs once and exits)
# Using mise (recommended):
mise pnpm run test:ci
# Or direct pnpm:
pnpm run test:ci
```

### Pull Requests
- Describe the changes clearly
- Include tests for new functionality
- Update documentation as needed
- Reference any related issues

### Reporting Issues
- Check existing issues before creating new ones
- Provide detailed reproduction steps
- Include error messages and stack traces
- Specify your environment (Node.js version, OS, etc.)

---

**Note**: This library is an unofficial integration with TradingView's public/private web endpoints. Long-term stability may be impacted by upstream, undocumented API changes made by TradingView.

For support, please check the GitHub repository issues or submit a pull request with improvements.