# AI Coding Assistant Instructions for TradingView API Client

## Project Overview
This is a Node.js client library for TradingView's unofficial APIs. It provides real-time WebSocket-based market data streaming, chart management, technical indicators, and Pine script integration. **Critical**: This is reverse-engineered from TradingView's protocol—stability depends on matching their undocumented message formats exactly.

## Core Architecture

### Session Pattern (Fundamental to Entire Codebase)
The library uses a **Session factory pattern**. The Client creates session instances that handle specific data types:

```javascript
const client = new TradingView.Client();
const chart = new client.Session.Chart();      // For OHLCV data
const quote = new client.Session.Quote();      // For real-time quotes
```

**Why this pattern matters:**
- Sessions are factories that wrap the client's send/receive bridge
- Each session type has its own event emitter and state
- Sessions are NOT directly exposed to the user; examples show `client.Session.Chart()`
- All session implementations follow: constructor→attach to client→emit events when data arrives

### Key Components & Their Responsibilities

1. **Client** (`src/client.js`): WebSocket connection hub
   - Manages WS connection state, reconnection logic (exponential backoff), heartbeat
   - Routes protocol packets to registered sessions
   - Emits global events: `connected`, `logged`, `ping`, `data`, `error`
   - Session registry: `this.#sessions = {}`

2. **Protocol Handler** (`src/protocol.js`): TradingView's packet format
   - Format: `~m~<length>~m~<data>` (custom framing, not standard WS subprotocol)
   - Handles packet splitting (one WS frame may contain partial packets)
   - Responsible for jszip decompression when packets are gzipped

3. **Chart Session** (`src/chart/session.js`): Market data streaming
   - `setMarket(symbol, {timeframe, range, to, type, replay})` initiates subscription
   - Maintains `chart.periods` array (newest bar at index 0, chronological order reversed)
   - Supports timeframe changes via `setSeries()` and history fetching via `fetchMore()`
   - Returns period objects: `{time, open, high/max, low/min, close, volume}`
   - Replay mode for historical playback

4. **Study (Indicator)** (`src/chart/study.js`): Technical indicators on charts
   - Created from indicator objects via `new chart.Study(indicatorInstance)`
   - Emits `study.periods` (indicator plot values) and `study.strategyReport` for Pine strategies
   - Strategy reports contain: `performance`, `trades`, `history`

5. **HTTP Client** (`src/http.js`): Static REST calls
   - Used for one-time requests (search, login, fetch indicator metadata)
   - 15-second default timeout; includes origin header enforcement

### Data Flow: Real-time Update Cycle

```
TradingView WS → Protocol Parse → Route to Session → 
  Session.onData handler → Update state (periods, quotes, etc) → 
  Emit 'update' event → User callback fires
```

**Critical detail**: Sessions NEVER call user callbacks directly. They emit events. User subscribes via `chart.onUpdate(() => {...})`.

## Common Workflows & Patterns

### 1. Streaming Live Candles
```javascript
const chart = new client.Session.Chart();
chart.setMarket('BINANCE:BTCEUR', { timeframe: '5' }); // '5' = 5 min
chart.onUpdate(() => {
  const bar = chart.periods[0]; // Newest bar
  console.log(`Close: ${bar.close}, Time: ${bar.time}`);
});
```
**Pattern**: `setMarket()` triggers WS subscription → updates flow in → onUpdate fires. Always check `chart.periods.length > 0` before accessing `periods[0]`.

### 2. Fetching Historical Data
```javascript
chart.setMarket('BINANCE:BTCEUR', { timeframe: '1D', range: 100 });
// Wait for initial load
await new Promise(resolve => chart.onSymbolLoaded(resolve));
// Fetch more bars backward
await chart.fetchMoreAsync(200, 5000);
```
**Pattern**: `range` is initial bar count; `fetchMore()` requests older bars. Use `to` (unix seconds) parameter for deterministic snapshots (important for backtesting).

### 3. Adding Indicators to Charts
```javascript
const indicator = await TradingView.getIndicator('STD;EMA'); // Built-in or Pine ID
// MUST set options BEFORE creating study
indicator.setOption('Length', 50);
const study = new chart.Study(indicator);
study.onUpdate(() => {
  const values = study.values.EMA;
});
```
**Critical pattern**: `setOption()` calls must happen BEFORE `new chart.Study()`. Changing options after study creation has no effect.

### 4. Strategy/Backtest Report
```javascript
const indicator = await TradingView.getIndicator('USER;myStrategyId', 'last', session, sig);
const study = new chart.Study(indicator);
const report = await Promise.race([
  new Promise(resolve => {
    study.onUpdate(() => {
      if (study.strategyReport?.performance) resolve(study.strategyReport);
    });
  }),
  new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 30000))
]);
console.log(report.performance); // Profit factor, win rate, etc.
```
**Pattern**: Strategy report arrives asynchronously in later updates; always use timeout to prevent hanging.

## Protocol & Message Formats

### Pine Script ID Formats
TradingView uses these ID prefixes:
- `STD;EMA` = Built-in study
- `PUB;abc123def456...` = Community public script
- `USER;abc123def456...` = Your private script (requires `SESSION`/`SIGNATURE` cookies)

**Candidate generation** (from [scripts/tv-strategy-grid-sweep.ts](scripts/tv-strategy-grid-sweep.ts) in sibling LPB repo):
- Try base ID, then `ID%Strategy`, then `ID_Strategy` variants for strategies
- URL encoding: normalize `%3B` → `;` (users may paste encoded IDs)

### Session/Market Subscription Packet Format
Not documented by TradingView. Examples show it's a series of `~m~` packets encoding symbol, timeframe, chart type. The Client class abstracts this away—just call `setMarket()`.

### Study/Strategy Report Parsing
Reports may arrive as:
- Plain JSON in `study.strategyReport`
- Compressed blobs that the library decompresses automatically
- Async arrival (in `du` or `timescale_update` protocol messages, not immediate)

## Testing & Development

### Run Tests
```bash
npm test  # Runs vitest (see vitest config in vite.config.js)
```

### Run Examples  
```bash
npm run example examples/SimpleChart.js
# Or with hot-reload:
npm run example:dev examples/SimpleChart.js
```

### Environment Variables
Create `.env` for credentials (not committed):
```
TV_SESSION_ID=your_sessionid_cookie
TV_SIGNATURE=your_sessionid_sign_cookie
TV_USERNAME=username
TV_PASSWORD=password
```

### Test Utilities (`tests/utils.ts`)
- `wait(ms)`: Delay helper
- `calculateTimeGap(periods)`: Verify timeframe (gap in seconds between bars)

## Key Patterns to Follow

### 1. Always Clean Up Resources
```javascript
chart.delete();      // Unsubscribe from WS
client.end();        // Close WS connection
```
Leaving charts/clients open wastes server resources and can cause reconnection storms.

### 2. Event Handlers, Not Polling
Every class exposes `onXxx()` methods. DO NOT poll or repeatedly check state. Register handlers:
```javascript
chart.onUpdate(() => { /* handle update */ });
chart.onError((err) => { /* handle error */ });
chart.onSymbolLoaded(() => { /* symbol ready */ });
```

### 3. Session State is Async
After calling `setMarket()`, the chart is NOT immediately ready. Always wait:
```javascript
// ❌ WRONG
chart.setMarket('BINANCE:BTCEUR', { timeframe: 'D' });
console.log(chart.periods[0]); // undefined!

// ✅ RIGHT
chart.setMarket('BINANCE:BTCEUR', { timeframe: 'D' });
chart.onSymbolLoaded(() => console.log(chart.periods[0])); // ready
```

### 4. Error Handling is Mandatory
All sessions can emit errors (network, invalid symbol, permission denied). Always attach `onError()`:
```javascript
chart.onError((err) => {
  console.error('Chart failed:', err);
  // Decide: retry, fallback, notify user, etc.
});
```

### 5. Timeframe String Format
TradingView uses short strings, NOT human-readable:
- `'1'`, `'5'`, `'15'`, `'60'` = minutes
- `'240'` = 4 hours (60 * 4)
- `'D'`, `'W'`, `'M'` = day, week, month
- NOT `'5m'`, `'1h'` (those are user inputs; normalize them)

### 6. Authentication & Private Script Management

#### Obtaining Credentials

Private scripts and authenticated endpoints require `SESSION` and `SIGNATURE` cookies from TradingView. There are two ways to obtain them:

**Option A: Programmatic Login (Recommended)**
```javascript
const user = await TradingView.loginUser(username, password);
console.log('sessionId:', user.session);      // Store as SESSION
console.log('sessionSig:', user.signature);   // Store as SIGNATURE
```

**Option B: Manual Cookie Extraction**
1. Visit https://www.tradingview.com/ and log in
2. Open DevTools → Storage → Cookies
3. Find `sessionid` (SESSION) and `sessionid_sign` (SIGNATURE)
4. Store in `.env`:
```
TV_SESSION_ID=your_sessionid_value
TV_SIGNATURE=your_sessionid_sign_value
```

#### Loading Private Indicators/Strategies

Private scripts use the `USER;` prefix. They REQUIRE credentials:

```javascript
const session = process.env.TV_SESSION_ID;
const signature = process.env.TV_SIGNATURE;

// Without credentials → study_not_auth error
const indicator = await TradingView.getIndicator(
  'USER;myPrivateId',
  'last',
  session,
  signature
);

// Safe: check if credentials exist
if (!session || !signature) {
  throw new Error('Private script requires SESSION/SIGNATURE credentials');
}
```

#### Pine Script Permission Management

Use `PinePermManager` to manage access to private scripts:

```javascript
const permMgr = new TradingView.PinePermManager(session, signature);

// List users with access
const users = await permMgr.getScriptPermissions('USER;scriptId');

// Grant access to a user
await permMgr.addScriptPermission('USER;scriptId', 'username_or_email');

// Revoke access
await permMgr.removeScriptPermission('USER;scriptId', 'username_or_email');

// Set expiration for invite
await permMgr.updateScriptPermission('USER;scriptId', 'email', {
  expiresAt: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
});
```

#### Authenticated vs Unauthenticated Requests

**Public Requests (No Auth Needed)**
```javascript
// Search public indicators
const results = await TradingView.searchIndicator('RSI');

// Get technical analysis
const ta = await TradingView.getTA('BINANCE:BTCEUR');

// Stream public chart data
const chart = new client.Session.Chart();
chart.setMarket('BINANCE:BTCEUR', { timeframe: 'D' });
```

**Authenticated Requests (Requires SESSION/SIGNATURE)**
```javascript
const session = process.env.TV_SESSION_ID;
const sig = process.env.TV_SIGNATURE;

// Get user's private indicators
const privateInds = await TradingView.getPrivateIndicators(session, sig);

// Load private strategy
const indicator = await TradingView.getIndicator('USER;strategyId', 'last', session, sig);

// Manage private script versions
const versions = await TradingView.listScriptVersions('USER;scriptId', { session, signature: sig });

// Get user info
const user = await TradingView.getUser(session, sig);
```

#### Common Authentication Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `study_not_auth` | Missing credentials for private script | Pass SESSION/SIGNATURE to `getIndicator()` |
| 401 Unauthorized | Invalid or expired SESSION/SIGNATURE | Re-login: `TradingView.loginUser()` |
| 403 Forbidden | User not granted access to script | Use PinePermManager to grant access |
| Network 403 on private symbol | Symbol/layout not accessible | Verify permissions with script owner |

#### Session Management Best Practices

```javascript
// ✅ GOOD: Check credentials before making authenticated calls
const session = process.env.TV_SESSION_ID;
const signature = process.env.TV_SIGNATURE;

if (!session || !signature) {
  console.error('Authenticated feature requires TV_SESSION_ID and TV_SIGNATURE');
  process.exit(1);
}

// ✅ GOOD: Reuse credentials across multiple requests
const client = new TradingView.Client();
const chart = new client.Session.Chart();
// Can stream public data without auth
chart.setMarket('BINANCE:BTCEUR', { timeframe: 'D' });

// But then also use auth for private features in same session
const private = await TradingView.getPrivateIndicators(session, signature);

// ✅ GOOD: Handle credential refresh on 401
async function withCredentialRefresh(fn) {
  try {
    return await fn(process.env.TV_SESSION_ID, process.env.TV_SIGNATURE);
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('Session expired, re-logging in...');
      const user = await TradingView.loginUser(process.env.TV_USERNAME, process.env.TV_PASSWORD);
      process.env.TV_SESSION_ID = user.session;
      process.env.TV_SIGNATURE = user.signature;
      return await fn(user.session, user.signature);
    }
    throw err;
  }
}

// ❌ BAD: Hardcoding credentials in code
const indicator = await TradingView.getIndicator(
  'USER;scriptId',
  'last',
  'hardcoded_session_id',  // NEVER DO THIS
  'hardcoded_signature'     // NEVER DO THIS
);

// ❌ BAD: Ignoring 401 responses
try {
  const ind = await TradingView.getIndicator(id, 'last', session, sig);
} catch (e) {
  // Silently failing on 401 hides real issues
}
```

#### Script Version Management

Private scripts support versioning. Common operations:

```javascript
const session = process.env.TV_SESSION_ID;
const sig = process.env.TV_SIGNATURE;
const credentials = { session, signature: sig };

// List all versions of a script
const versions = await TradingView.listScriptVersions('USER;scriptId', credentials);
// Returns: [{ id: 'v1', name: 'Version 1', date: ... }, ...]

// Get specific version
const v1Source = await TradingView.getScriptVersion('USER;scriptId', 'v1', credentials);

// Rename a version
await TradingView.renameScriptVersion('USER;scriptId', 'v1', 'New Name', credentials);

// Delete a version (or entire script if version omitted)
await TradingView.deleteScriptVersion('USER;scriptId', 'v1', credentials);
```

#### Troubleshooting Private Script Access

```javascript
// Debug: Verify credentials are valid
try {
  const user = await TradingView.getUser(session, sig);
  console.log('✓ Credentials valid for user:', user.username);
} catch (err) {
  console.error('✗ Invalid credentials:', err.message);
}

// Debug: Check if you have access to a script
try {
  const indicator = await TradingView.getIndicator('USER;scriptId', 'last', session, sig);
  console.log('✓ Script is accessible');
} catch (err) {
  if (err.message.includes('not_found') || err.message.includes('not_auth')) {
    console.error('✗ No access to this script. Reasons:');
    console.error('  - Script does not exist (check ID format)');
    console.error('  - Script is private and you lack permissions');
    console.error('  - Credentials are expired');
  }
}

// Debug: List your private scripts
const myScripts = await TradingView.getPrivateIndicators(session, sig);
console.log('Your scripts:', myScripts.map(s => s.id));
```

## File Structure Overview

```
src/
  client.js                 # WebSocket hub, session registry
  protocol.js               # Packet framing (~m~ format)
  http.js                   # REST client for static requests
  miscRequests.js           # Exported API methods (search, login, etc.)
  chart/
    session.js              # Market data streaming, timeframe management
    study.js                # Indicator/strategy wrapping
    graphicParser.js        # Chart drawing objects
  quote/
    session.js              # Real-time quote updates
    market.js               # Single symbol quote state
  classes/
    PineIndicator.js        # Pine script indicator object
    BuiltInIndicator.js     # TradingView built-in indicator
    PinePermManager.js      # Permission management for private scripts
examples/
  SimpleChart.js            # Basic streaming example (canonical)
  FullWorkflow.js           # Complex multi-feature example
  ReplayMode.js             # Historical replay pattern
  [others]                  # Task-specific patterns
tests/
  simpleChart.test.ts       # Integration test baseline
  [others]                  # Coverage of major features
```

## Common Gotchas

| Gotcha | Symptom | Fix |
|--------|---------|-----|
| Forgetting `chart.delete()` | Memory leak, orphaned sessions | Always call in cleanup or error handlers |
| Accessing `periods[0]` before load | undefined crash | Wait for `onSymbolLoaded()` or check `.length > 0` |
| Wrong timeframe string | Symbol loads but bars don't appear | Use `'5'` not `'5m'`; see chart.ts in LPB repo for normalization helper |
| Setting options after `new Study()` | Options don't apply | Move `setOption()` calls BEFORE study creation |
| No auth for private script | `study_not_auth` error | Pass `SESSION`/`SIGNATURE` to `getIndicator()` |
| Not handling `onError()` | Silent failures, orphaned state | Always attach error handler to sessions |
| Assuming `strategyReport` is immediate | Undefined report | Wait with timeout; report arrives in later protocol messages |

## When to Reference Other Files

- **Event patterns**: See `src/chart/session.js` lines ~250–300 (how onUpdate is wired)
- **Packet routing**: See `src/client.js` lines ~200–250 (protocol message → session dispatch)
- **Indicator loading**: See `examples/FullWorkflow.js` or `examples/GraphicIndicator.js`
- **Error recovery**: See `TROUBLESHOOTING.md` and `examples/Errors.js`

---

**Last Updated**: 2026-02-03  
**Node.js**: ≥14.0.0 | **ws**: ^8.18.0 | **axios**: ^1.7.9
