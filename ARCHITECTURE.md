# TradingView API Architecture

## Table of Contents
- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Communication Protocols](#communication-protocols)
- [Session Management](#session-management)
- [Error Handling Architecture](#error-handling-architecture)
- [Security Model](#security-model)
- [Performance Considerations](#performance-considerations)

## System Overview

The TradingView API client is a comprehensive Node.js library that provides a complete interface to TradingView's public and private APIs. The architecture is designed around a WebSocket-based real-time communication system with HTTP fallbacks for static data requests.

### Core Principles
- **Real-time Communication**: WebSocket-based streaming for live market data
- **Session Abstraction**: Encapsulated session management for different data types
- **Event-Driven Architecture**: Asynchronous event handling for all data updates
- **Modular Design**: Separated concerns for maintainability and extensibility

## Component Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │  TV API Client  │    │ TradingView API │
│                 │    │                 │    │                 │
│  Business Logic │◄──►│  WebSocket      │◄──►│  WebSocket      │
│                 │    │  HTTP Client    │    │  HTTP Endpoints │
│  Data Storage   │    │  Session Mgmt   │    │                 │
│                 │    │  Error Handler  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Detailed Component Breakdown

#### 1. Client Component ([`src/client.js`](src/client.js:47))

The Client component serves as the central hub for all communications with TradingView's servers.

**Responsibilities:**
- WebSocket connection management
- Authentication handling
- Packet formatting and parsing
- Reconnection logic
- Session registry

**Key Features:**
- Automatic reconnection with exponential backoff
- Heartbeat monitoring to detect connection issues
- Session management for different types (chart, quote, replay)
- Event emission system

**Configuration Options:**
- `token`: Authentication token
- `signature`: Token signature
- `server`: API server selection
- `DEBUG`: Debug mode

#### 2. HTTP Client ([`src/http.js`](src/http.js:1))

Handles all HTTP requests to TradingView's REST API endpoints.

**Responsibilities:**
- HTTP request execution
- Request/response interceptors
- Error handling
- Consistent headers and timeouts

**Configuration:**
- Default 15-second timeout
- Origin header enforcement
- Consistent request defaults

#### 3. Protocol Handler ([`src/protocol.js`](src/protocol.js:12))

Manages TradingView's custom WebSocket packet protocol.

**Responsibilities:**
- Packet formatting (`~m~<length>~m~<data>` format)
- Packet parsing and splitting
- Compression/decompression handling
- Protocol error detection

#### 4. Chart Session ([`src/chart/session.js`](src/chart/session.js:117))

Manages chart-related data streams and historical data retrieval.

**Responsibilities:**
- Market data subscription
- Historical data fetching
- Timeframe management
- Replay mode handling
- Study/indicator integration

**Features:**
- Configurable timeframes and ranges
- Historical data pagination
- Replay mode support
- Custom chart types (Heikin Ashi, Renko, etc.)

#### 5. Quote Session ([`src/quote/session.js`](src/quote/session.js:1))

Handles real-time quote data for specific symbols.

**Responsibilities:**
- Real-time quote updates
- Market status monitoring
- Error handling

#### 6. Study/Indicator Handler ([`src/chart/study.js`](src/chart/study.js:1))

Manages technical indicators and Pine script integration on charts.

**Responsibilities:**
- Indicator creation and management
- Plot data processing
- Graphic object handling
- Strategy report processing

#### 7. Utility Functions ([`src/utils.js`](src/utils.js:1))

Shared utilities across the system.

**Functions:**
- Session ID generation
- Cookie formatting
- Helper functions

## Data Flow

### Real-time Data Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ TradingView     │    │ Protocol Parser │    │ Session Handler │
│ WebSocket       │───►│                 │───►│                 │
│ Server          │    │ - Parse packets │    │ - Route data to │
│                 │    │ - Validate      │    │   correct       │
│ - Market data   │    │ - Error check   │    │   session       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │              ┌────────▼────────┐              │
        │              │ Event Emitter   │              │
        │              │                 │              │
        │              │ - Emit events   │              │
        │              │ - Notify        │              │
        │              │   subscribers   │              │
        │              └────────┬────────┘              │
        │                       │                       │
        ▼              ┌────────▼────────┐              ▼
┌─────────────────┐    │ Application     │    ┌─────────────────┐
│ WebSocket       │    │ Event Handlers  │    │ Data Processing │
│ Connection      │    │                 │    │                 │
│                 │    │ - onSymbolLoad  │    │ - Update models │
│ - Heartbeat     │    │ - onUpdate      │    │ - Store data    │
│ - Reconnect     │    │ - onError       │    │ - Process       │
└─────────────────┘    └─────────────────┘    │   indicators    │
                                              └─────────────────┘
```

### Historical Data Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Application     │    │ Chart Session   │    │ TradingView     │
│ Request         │───►│                 │───►│ HTTP API        │
│ fetchMore()     │    │ - Format        │    │                 │
│                 │    │   request       │    │ - Process       │
└─────────────────┘    │ - Queue request │    │   request       │
        │              │ - Handle        │    │ - Return        │
        │              │   response      │    │   data          │
        │              └─────────┬───────┘    └─────────┬───────┘
        │                        │                      │
        │               ┌────────▼────────┐             │
        │               │ Cache Manager   │             │
        │               │                 │             │
        │               │ - Store data    │             │
        │               │ - Merge with    │             │
        │               │   existing      │             │
        │               │ - Invalidate    │             │
        │               │   cache         │             │
        │               └─────────┬───────┘             │
        │                         │                     │
        ▼                ┌────────▼────────┐    ┌───────▼───────┐
┌─────────────────┐    │ Periods Storage │    │ Application   │
│ Cache Access    │◄───┤                 │◄───┤ Data Access   │
│ get periods     │    │ - Store by      │    │ periods       │
│ property        │    │   timestamp     │    │ property      │
└─────────────────┘    │ - Sort/Filter   │    └───────────────┘
                       │ - Limit size    │
                       └─────────────────┘
```

## Communication Protocols

### WebSocket Protocol
TradingView uses a custom framing protocol over WebSocket:

```
~m~<message_length>~m~<json_payload>
```

**Message Format:**
- `~m~` - Message delimiter
- `<message_length>` - Length of JSON payload in characters
- `~m~` - Message delimiter
- `<json_payload>` - Actual JSON data

**Example:**
```
~m~52~m~{"m":"set_auth_token","p":["unauthorized_user_token"]}
```

### Packet Types
- **Authentication**: `set_auth_token`
- **Market Data**: `resolve_symbol`, `create_series`, `modify_series`
- **Data Updates**: `du`, `timescale_update`
- **Heartbeat**: Ping/Pong packets
- **Errors**: `protocol_error`, `symbol_error`, `series_error`

### HTTP API Endpoints
The client communicates with various TradingView endpoints:

- `wss://data.tradingview.com/socket.io/websocket` - WebSocket endpoint
- `https://symbol-search.tradingview.com/symbol_search` - Symbol search
- `https://scanner.tradingview.com/global/scan` - Technical analysis scan
- `https://pine-facade.tradingview.com/pine-facade` - Pine script operations
- `https://www.tradingview.com/accounts/signin/` - Authentication

## Session Management

### Session Types
The system supports multiple session types:

#### Chart Sessions
- Handle market data and charting
- Support multiple timeframes
- Manage historical data retrieval
- Support custom chart types

#### Quote Sessions
- Handle real-time quote data
- Lightweight compared to chart sessions
- Optimized for quick updates

#### Replay Sessions
- Handle historical replay mode
- Simulate past market conditions
- Coordinate with chart sessions

### Session Lifecycle
```
┌─────────────────┐
│ Session Create  │
│ - Generate ID   │
│ - Register      │
│   with client   │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Session Active  │
│ - Receive data  │
│ - Emit events   │
│ - Handle errors │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Session Cleanup │
│ - Remove from   │
│   registry      │
│ - Clear event   │
│   listeners     │
│ - Free memory   │
└─────────────────┘
```

### Session Registry
The client maintains a registry of active sessions:

```javascript
this.#sessions = {
  'cs_xxxxxxxxxxxx': { type: 'chart', onData: handler },
  'qs_xxxxxxxxxxxx': { type: 'quote', onData: handler },
  'rs_xxxxxxxxxxxx': { type: 'replay', onData: handler }
};
```

## Error Handling Architecture

### Hierarchical Error Handling
The system implements a hierarchical error handling approach:

```
┌─────────────────────────┐
│ Application Level       │
│ - Business logic errors │
│ - Data validation       │
└─────────┬───────────────┘
          │
┌─────────▼───────────────┐
│ Session Level           │
│ - Session-specific      │
│   errors                │
│ - Data processing       │
│   errors                │
└─────────┬───────────────┘
          │
┌─────────▼───────────────┐
│ Client Level            │
│ - Network errors        │
│ - Authentication        │
│   errors                │
│ - Protocol errors       │
└─────────┬───────────────┘
          │
┌─────────▼───────────────┐
│ Global Fallback         │
│ - Unhandled errors      │
│ - Logging               │
│ - Recovery attempts     │
└─────────────────────────┘
```

### Error Types
- **Network Errors**: Connection failures, timeouts
- **Protocol Errors**: Malformed packets, unexpected data
- **Authentication Errors**: Invalid tokens, expired sessions
- **Business Logic Errors**: Invalid parameters, unsupported operations
- **Resource Errors**: Memory exhaustion, rate limiting

### Error Recovery Strategies
1. **Automatic Reconnection**: With exponential backoff
2. **Session Recreation**: Restore sessions after reconnection
3. **Graceful Degradation**: Continue operation with reduced functionality
4. **Fallback Mechanisms**: Alternative data sources or methods

## Security Model

### Authentication Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User Credentials│    │ Session Token   │    │ TradingView     │
│ (username/     │───►│ Generation      │───►│ Authentication  │
│ password)       │    │                 │    │ Server          │
└─────────────────┘    │ - Login API     │    │                 │
        │              │ - Cookie        │    │ - Validate      │
        │              │   extraction    │    │   credentials   │
        │              │ - Token         │    │ - Generate      │
        │              │   retrieval     │    │   session       │
        │              └─────────┬───────┘    └─────────┬───────┘
        │                        │                      │
        ▼               ┌────────▼────────┐             ▼
┌─────────────────┐    │ Secure Storage  │    ┌─────────────────┐
│ Credential      │    │                 │    │ Secure          │
│ Management      │◄───┤ - Store tokens  │◄───┤ Token Usage     │
│                 │    │ - Encrypt if    │    │                 │
│ - Environment   │    │   needed        │    │ - WebSocket     │
│   variables     │    │ - Session       │    │   authentication│
│ - Secure store  │    │   management    │    │ - API requests  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Security Measures
- **Token Encryption**: Sensitive tokens should be encrypted at rest
- **Secure Transmission**: All data transmitted over WSS/HTTPS
- **Input Validation**: Validate all user inputs to prevent injection
- **Session Management**: Proper session cleanup and expiration

### Privacy Considerations
- **Minimal Data Collection**: Only collect necessary data
- **User Consent**: Clear indication of data usage
- **Data Retention**: Proper cleanup of temporary data

## Performance Considerations

### Memory Management
- **Data Limiting**: Configurable limits on stored historical data
- **Garbage Collection**: Proper cleanup of unused objects
- **Caching**: Efficient caching strategies for frequently accessed data

### Network Optimization
- **Connection Pooling**: Reuse WebSocket connections when possible
- **Batching**: Combine multiple requests when beneficial
- **Compression**: Use compression for large data transfers

### Event Handling
- **Debouncing**: Prevent excessive event processing
- **Throttling**: Limit event frequency
- **Asynchronous Processing**: Non-blocking event handling

### Scalability Patterns
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Main Process    │    │ Worker Process  │    │ Worker Process  │
│ (Orchestration) │    │ (Data Source 1) │    │ (Data Source 2) │
│                 │    │                 │    │                 │
│ - Coordinate    │───►│ - Manage        │───►│ - Manage        │
│   workers       │    │   WebSocket     │    │   WebSocket     │
│ - Distribute    │    │   connection    │    │   connection    │
│   work          │    │ - Process       │    │ - Process       │
│ - Aggregate     │    │   data          │    │   data          │
│   results       │    │ - Handle errors │    │ - Handle errors │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Performance Monitoring
- **Metrics Collection**: Track connection health, data throughput
- **Resource Usage**: Monitor memory, CPU, and network usage
- **Response Times**: Measure API response and processing times
- **Error Rates**: Track and analyze error frequencies

---

## Integration Patterns

### Event-Driven Integration
```javascript
// Subscribe to events
client.onConnected(() => { /* Handle connection */ });
chart.onUpdate(() => { /* Process data */ });
study.onUpdate(() => { /* Process indicator data */ });
```

### Promise-Based Operations
```javascript
// Async operations
const user = await TradingView.loginUser(username, password);
const ta = await TradingView.getTA('BINANCE:BTCEUR');
const result = await chart.fetchMoreAsync(100);
```

### Observer Pattern Implementation
The system implements an observer pattern for event handling:

```javascript
// Event registration
chart.#callbacks.update.push(handler);

// Event notification
chart.#handleEvent('update', changes);
```

This architecture provides a scalable, maintainable, and efficient interface to TradingView's APIs while maintaining separation of concerns and proper error handling throughout the system.