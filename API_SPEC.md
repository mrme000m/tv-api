# TradingView API Specification

## Table of Contents
- [Client API](#client-api)
- [Chart Session API](#chart-session-api)
- [Quote Session API](#quote-session-api)
- [Study/Indicator API](#studyindicator-api)
- [Utility Functions API](#utility-functions-api)
- [Data Types](#data-types)

## Client API

### `TradingView.Client`

#### Constructor
```javascript
new TradingView.Client(options)
```

**Parameters:**
- `options` (Object) - Client configuration options
  - `token` (string, optional) - User auth token (in 'sessionid' cookie)
  - `signature` (string, optional) - User auth token signature (in 'sessionid_sign' cookie)
  - `DEBUG` (boolean, optional) - Enable debug mode
  - `server` ('data' | 'prodata' | 'widgetdata', optional) - Server type (default: 'data')
  - `location` (string, optional) - Auth page location (default: 'https://tradingview.com')

#### Properties
- `isOpen` (boolean) - True if client is connected
- `isLogged` (boolean) - True if client is authenticated

#### Methods

##### `onConnected(callback)`
Register a callback for when the client connects.

**Parameters:**
- `callback` (Function) - Function to call when connected

##### `onDisconnected(callback)`
Register a callback for when the client disconnects.

**Parameters:**
- `callback` (Function) - Function to call when disconnected

##### `onLogged(callback)`
Register a callback for when the client authenticates.

**Parameters:**
- `callback` (Function) - Function to call when logged in
  - Receives `SocketSession` object as parameter

##### `onPing(callback)`
Register a callback for when the server pings the client.

**Parameters:**
- `callback` (Function) - Function to call when pinged
  - Receives `number` as parameter (ping counter)

##### `onData(callback)`
Register a callback for when unparsed data is received.

**Parameters:**
- `callback` (Function) - Function to call when data received
  - Receives packet data as parameters

##### `onError(callback)`
Register a callback for when a client error occurs.

**Parameters:**
- `callback` (Function) - Function to call when error occurs
  - Receives error messages as parameters

##### `onEvent(callback)`
Register a callback for when any client event occurs.

**Parameters:**
- `callback` (Function) - Function to call when any event occurs
  - Receives event name and data as parameters

##### `send(type, data)`
Send a custom packet to the server.

**Parameters:**
- `type` (string) - Packet type
- `data` (Array, optional) - Packet data array

##### `end()`
Close the WebSocket connection.

**Returns:** `Promise<void>` - Resolves when the connection is closed

#### Session Types
- `Session.Chart` - Chart session generator
- `Session.Quote` - Quote session generator

## Chart Session API

### `client.Session.Chart()`

#### Methods

##### `setMarket(symbol, options)`
Set the chart market and configuration.

**Parameters:**
- `symbol` (string) - Market symbol (e.g., 'BINANCE:BTCEUR')
- `options` (Object, optional) - Chart options
  - `timeframe` ([`TimeFrame`](#timeframe)) - Chart period timeframe (default: '240')
  - `range` (number) - Number of loaded periods/candles (default: 100)
  - `to` (number) - Last candle timestamp (default is now)
  - `adjustment` ('splits' | 'dividends') - Market adjustment
  - `backadjustment` (boolean) - Market backadjustment of futures contracts
  - `session` ('regular' | 'extended') - Chart session
  - `currency` (string) - Chart currency (e.g., 'EUR', 'USD')
  - `type` ([`ChartType`](#charttype)) - Chart custom type
  - `inputs` ([`ChartInputs`](#chartinputs)) - Chart custom inputs
  - `replay` (number) - Replay mode starting point (timestamp)

##### `setSeries(timeframe, range, reference)`
Set the chart series configuration.

**Parameters:**
- `timeframe` ([`TimeFrame`](#timeframe)) - Chart period timeframe (default: '240')
- `range` (number) - Number of loaded periods/candles (default: 100)
- `reference` (number, optional) - Reference candle timestamp (default is now)

##### `setTimezone(timezone)`
Set the chart timezone.

**Parameters:**
- `timezone` ([`Timezone`](#timezone)) - New timezone

##### `fetchMore(number)`
Fetch additional previous periods/candles values.

**Parameters:**
- `number` (number) - Number of additional periods/candles to fetch (default: 1)

##### `fetchMoreAsync(number, timeoutMs)`
Fetch additional previous periods/candles values with backpressure control.

**Parameters:**
- `number` (number) - Number of additional periods/candles to fetch (default: 1)
- `timeoutMs` (number, optional) - Timeout in milliseconds (default: 15000)

**Returns:** `Promise<{gotMore: boolean, added: number}>` - Whether new bars were added and the count

##### `replayStep(number)`
Step through replay mode by a specified number of periods.

**Parameters:**
- `number` (number) - Number of periods to step (default: 1)

**Returns:** `Promise` - Resolves when the step is completed

##### `replayStart(interval)`
Start fetching a new period/candle at regular intervals.

**Parameters:**
- `interval` (number) - Interval in milliseconds (default: 1000)

**Returns:** `Promise` - Resolves when replay starts

##### `replayStop()`
Stop the replay mode.

**Returns:** `Promise` - Resolves when replay stops

##### `onSymbolLoaded(callback)`
Register a callback for when the symbol is loaded.

**Parameters:**
- `callback` (Function) - Function to call when symbol loads

##### `onUpdate(callback)`
Register a callback for when the chart updates.

**Parameters:**
- `callback` (Function) - Function to call when chart updates
  - Receives `changes` array as parameter

##### `onReplayLoaded(callback)`
Register a callback for when the replay session is ready.

**Parameters:**
- `callback` (Function) - Function to call when replay loads

##### `onReplayResolution(callback)`
Register a callback for when the replay session has new resolution.

**Parameters:**
- `callback` (Function) - Function to call when replay resolution updates
  - Receives `timeframe` and `index` as parameters

##### `onReplayEnd(callback)`
Register a callback for when the replay session ends.

**Parameters:**
- `callback` (Function) - Function to call when replay ends

##### `onReplayPoint(callback)`
Register a callback for when the replay session cursor moves.

**Parameters:**
- `callback` (Function) - Function to call when replay point updates
  - Receives `index` as parameter

##### `onError(callback)`
Register a callback for when chart errors occur.

**Parameters:**
- `callback` (Function) - Function to call when chart error occurs

##### `delete()`
Delete the chart session.

#### Properties

##### `periods`
Get the list of periods values.

**Returns:** [`PricePeriod[]`](#priceperiod) - Sorted list of periods (newest first)

##### `infos`
Get current market information.

**Returns:** [`MarketInfos`](#marketinfos) - Current market information

#### Nested Classes

##### `Study`
Create and manage technical indicators on the chart.

## Quote Session API

### `client.Session.Quote()`

#### Methods

##### `setMarket(symbol)`
Set the quote market.

**Parameters:**
- `symbol` (string) - Market symbol (e.g., 'BINANCE:BTCEUR')

##### `onData(callback)`
Register a callback for when quote data updates.

**Parameters:**
- `callback` (Function) - Function to call when quote data updates

##### `onError(callback)`
Register a callback for when quote errors occur.

**Parameters:**
- `callback` (Function) - Function to call when quote error occurs

##### `delete()`
Delete the quote session.

## Study/Indicator API

### `chart.Study(indicator, options)`

#### Constructor Parameters
- `indicator` ([`PineIndicator`](#pineindicator) | [`BuiltInIndicator`](#builtinindicator) | string) - The indicator to add
- `options` (Object, optional) - Study options
  - `timeframe` (string) - Override the chart's timeframe
  - `onAdd` (Function) - Called when study is added
  - `onUpdate` (Function) - Called when study updates
  - `onError` (Function) - Called when study error occurs

#### Properties

##### `plots`
Get the study plots.

**Returns:** `Object` - Plot values indexed by plot ID

##### `values`
Get the study values.

**Returns:** `Object` - Value series indexed by value name

##### `valuesAt`
Get values at a specific position.

**Returns:** `Function` - Function to get values at position

## Utility Functions API

### `TradingView.getTA(id)`
Get technical analysis for a market symbol.

**Parameters:**
- `id` (string) - Full market ID (e.g., 'COINBASE:BTCEUR')

**Returns:** `Promise<Periods>` - Technical analysis results

### `TradingView.searchMarketV3(search, filter, offset)`
Search for market symbols.

**Parameters:**
- `search` (string) - Keywords to search
- `filter` ('stock' | 'futures' | 'forex' | 'cfd' | 'crypto' | 'index' | 'economic', optional) - Category filter
- `offset` (number, optional) - Pagination offset (default: 0)

**Returns:** `Promise<SearchMarketResult[]>` - Search results

### `TradingView.searchIndicator(search)`
Search for Pine script indicators.

**Parameters:**
- `search` (string, optional) - Keywords to search (default: '')

**Returns:** `Promise<SearchIndicatorResult[]>` - Search results

### `TradingView.loginUser(username, password, remember, userAgent)`
Login with TradingView credentials.

**Parameters:**
- `username` (string) - User username or email
- `password` (string) - User password
- `remember` (boolean, optional) - Remember the session (default: true)
- `userAgent` (string, optional) - Custom User Agent (default: 'TWAPI/3.0')

**Returns:** `Promise<User>` - User information

### `TradingView.getUser(session, signature, location)`
Get user information from session cookie.

**Parameters:**
- `session` (string) - User 'sessionid' cookie
- `signature` (string, optional) - User 'sessionid_sign' cookie (default: '')
- `location` (string, optional) - Auth page location (default: 'https://www.tradingview.com/')

**Returns:** `Promise<User>` - User information

### `TradingView.getPrivateIndicators(session, signature)`
Get user's private indicators from session cookie.

**Parameters:**
- `session` (string) - User 'sessionid' cookie
- `signature` (string, optional) - User 'sessionid_sign' cookie (default: '')

**Returns:** `Promise<SearchIndicatorResult[]>` - Private indicator results

### `TradingView.getIndicator(id, version, session, signature)`
Get a Pine script indicator.

---

## Indicators API (new)

This library exposes an additional indicator/script wrapper at `TradingView.indicators` and also re-exports its functions at the top level.

### `TradingView.indicators.normalizePineId(id)`
Normalize Pine IDs users may paste in URL-encoded form.

**Parameters:**
- `id` (string) - e.g. `PUB%3Babc...` or `PUB;abc...`

**Returns:** `string` - normalized `PREFIX;ID`

### `TradingView.searchPublicScripts(query, options)`
Search public community scripts (suggestions endpoint).

**Parameters:**
- `query` (string)
- `options` (object, optional)
  - `limit` (number, optional)
  - `language` (string, optional, default: `en`)
  - `session` (string, optional)
  - `signature` (string, optional)

**Returns:** `Promise<SearchIndicatorResult[]>`

### `TradingView.browsePublicLibrary(options)`
Browse public scripts library.

**Parameters:**
- `options` (object, optional)
  - `offset` (number, optional, default: 0)
  - `count` (number, optional, default: 20)
  - `type` (number, optional, default: 0)
  - `sort` (`top` | `trending`, optional)
  - `isPaid` (boolean, optional)

**Returns:** `Promise<any>` - raw TradingView response

### `TradingView.getScriptInfo(pineId, options)`
Fetch script metadata using pine-facade.

**Parameters:**
- `pineId` (string) - e.g. `PUB;...`
- `options` (object, optional) - `session`, `signature`, `language`

**Returns:** `Promise<any>`

### `TradingView.isAuthorizedToGet(pineId, version, options)`
Check whether current credentials can fetch the script.

**Parameters:**
- `pineId` (string)
- `version` (number|string, optional, default: 1)
- `options` (object, optional)

**Returns:** `Promise<boolean>` (or TradingView boolean-like payload)

### `TradingView.getScriptSource(pineId, version, options)`
Fetch raw Pine payload (usually `{ source: string }`) via pine-facade `/get`.

**Parameters:**
- `pineId` (string)
- `version` (number|string, optional, default: 1)
- `options` (object, optional)

**Returns:** `Promise<any>`

### `TradingView.indicators.createIndicatorsClient(defaults)`
Create a small helper client that carries defaults.

**Parameters:**
- `defaults` (object, optional)
  - `session` (string, optional)
  - `signature` (string, optional)
  - `language` (string, optional)

**Returns:**
- object with methods: `search`, `browseLibrary`, `getInfo`, `canGet`, `getSource`, `getIndicator`


**Parameters:**
- `id` (string) - Indicator ID (e.g., 'PUB;XXXXXXXXXXXXXXXXXXXXX')
- `version` (string, optional) - Indicator version (default: 'last')
- `session` (string, optional) - User 'sessionid' cookie
- `signature` (string, optional) - User 'sessionid_sign' cookie

**Returns:** `Promise<PineIndicator>` - The indicator

### `TradingView.translateScriptLight(source, options)`
Translate a Pine script before saving.

**Parameters:**
- `source` (string) - Pine source code
- `options` (Object, optional) - Translation options
  - `userName` (string, optional) - Username
  - `version` (number | string, optional) - Pine version (default: 3)
  - `credentials` (Object, optional) - User credentials
    - `session` (string, optional) - User session
    - `signature` (string, optional) - User signature

**Returns:** `Promise<any>` - Raw translation payload

### `TradingView.parseScriptTitle(source, options)`
Parse a Pine script title.

**Parameters:**
- `source` (string) - Pine source code
- `options` (Object, optional) - Parsing options
  - `userName` (string, optional) - Username
  - `credentials` (Object, optional) - User credentials
    - `session` (string, optional) - User session
    - `signature` (string, optional) - User signature

**Returns:** `Promise<any>` - Parser response payload

### `TradingView.saveScriptNew(options)`
Save a new Pine script.

**Parameters:**
- `options` (Object) - Save options
  - `name` (string) - Script name
  - `source` (string) - Script source code
  - `userName` (string, optional) - Username
  - `allowOverwrite` (boolean, optional) - Allow overwriting (default: true)
  - `credentials` (Object, optional) - User credentials
    - `session` (string, optional) - User session
    - `signature` (string, optional) - User signature

**Returns:** `Promise<any>` - Save endpoint response

### `TradingView.renameScriptVersion(pineId, version, name, credentials)`
Rename an existing script version.

**Parameters:**
- `pineId` (string) - Indicator ID (USER;..., PUB;...)
- `version` (string | number) - Version identifier
- `name` (string) - New name to apply
- `credentials` (Object, optional) - User credentials
  - `session` (string, optional) - User session
  - `signature` (string, optional) - User signature

**Returns:** `Promise<void>`

### `TradingView.listScriptVersions(pineId, credentials)`
List versions of a saved script.

**Parameters:**
- `pineId` (string) - Indicator ID
- `credentials` (Object, optional) - User credentials
  - `session` (string, optional) - User session
  - `signature` (string, optional) - User signature

**Returns:** `Promise<any>` - Versions payload

### `TradingView.getScriptVersion(pineId, version, credentials)`
Get a specific version of a script.

**Parameters:**
- `pineId` (string) - Indicator ID
- `version` (string | number) - Version identifier
- `credentials` (Object, optional) - User credentials
  - `session` (string, optional) - User session
  - `signature` (string, optional) - User signature

**Returns:** `Promise<any>` - Script payload (text/plain)

### `TradingView.deleteScriptVersion(pineId, version, credentials)`
Delete a script version.

**Parameters:**
- `pineId` (string) - Indicator ID (USER;..., PUB;...)
- `version` (string | number, optional) - Version to delete; if omitted, deletes whole script
- `credentials` (Object, optional) - User credentials
  - `session` (string, optional) - User session
  - `signature` (string, optional) - User signature

**Returns:** `Promise<any>` - Response of the first successful call, or null

### `TradingView.getChartToken(layout, credentials)`
Get a chart token from a layout ID.

**Parameters:**
- `layout` (string) - Layout ID from the layout URL
- `credentials` (Object, optional) - User credentials
  - `id` (number) - User ID
  - `session` (string) - User session ('sessionid' cookie)
  - `signature` (string, optional) - User session signature ('sessionid_sign' cookie)

**Returns:** `Promise<string>` - Chart token

### `TradingView.getDrawings(layout, symbol, credentials, chartID)`
Get drawings from a layout.

**Parameters:**
- `layout` (string) - Layout ID from the layout URL
- `symbol` (string, optional) - Market filter (e.g., 'BINANCE:BTCEUR') (default: '')
- `credentials` (Object, optional) - User credentials
  - `id` (number) - User ID
  - `session` (string) - User session ('sessionid' cookie)
  - `signature` (string, optional) - User session signature ('sessionid_sign' cookie)
- `chartID` (string, optional) - Chart ID (default: '_shared')

**Returns:** `Promise<Drawing[]>` - Array of drawings

## Data Types

### `TimeFrame`
```javascript
type TimeFrame = '1' | '3' | '5' | '15' | '30' | '45' | '60' | '120' | '180' | '240' | '1D' | '1W' | '1M' | 'D' | 'W' | 'M';
```

### `Timezone`
```javascript
type Timezone = 'Etc/UTC' | 'exchange' | 'Pacific/Honolulu' | 'America/Juneau' | 'America/Los_Angeles' | 'America/Phoenix' | 'America/Vancouver' | 'US/Mountain' | 'America/El_Salvador' | 'America/Bogota' | 'America/Chicago' | 'America/Lima' | 'America/Mexico_City' | 'America/Caracas' | 'America/New_York' | 'America/Toronto' | 'America/Argentina/Buenos_Aires' | 'America/Santiago' | 'America/Sao_Paulo' | 'Atlantic/Reykjavik' | 'Europe/Dublin' | 'Africa/Lagos' | 'Europe/Lisbon' | 'Europe/London' | 'Europe/Amsterdam' | 'Europe/Belgrade' | 'Europe/Berlin' | 'Europe/Brussels' | 'Europe/Copenhagen' | 'Africa/Johannesburg' | 'Africa/Cairo' | 'Europe/Luxembourg' | 'Europe/Madrid' | 'Europe/Malta' | 'Europe/Oslo' | 'Europe/Paris' | 'Europe/Rome' | 'Europe/Stockholm' | 'Europe/Warsaw' | 'Europe/Zurich' | 'Europe/Athens' | 'Asia/Bahrain' | 'Europe/Helsinki' | 'Europe/Istanbul' | 'Asia/Jerusalem' | 'Asia/Kuwait' | 'Europe/Moscow' | 'Asia/Qatar' | 'Europe/Riga' | 'Asia/Riyadh' | 'Europe/Tallinn' | 'Europe/Vilnius' | 'Asia/Tehran' | 'Asia/Dubai' | 'Asia/Muscat' | 'Asia/Ashkhabad' | 'Asia/Kolkata' | 'Asia/Almaty' | 'Asia/Bangkok' | 'Asia/Jakarta' | 'Asia/Ho_Chi_Minh' | 'Asia/Chongqing' | 'Asia/Hong_Kong' | 'Australia/Perth' | 'Asia/Shanghai' | 'Asia/Singapore' | 'Asia/Taipei' | 'Asia/Seoul' | 'Asia/Tokyo' | 'Australia/Brisbane' | 'Australia/Adelaide' | 'Australia/Sydney' | 'Pacific/Norfolk' | 'Pacific/Auckland' | 'Pacific/Fakaofo' | 'Pacific/Chatham';
```

### `ChartType`
```javascript
type ChartType = 'HeikinAshi' | 'Renko' | 'LineBreak' | 'Kagi' | 'PointAndFigure' | 'Range';
```

### `ChartInputs`
```javascript
type ChartInputs = {
  atrLength?: number; // Renko/Kagi/PointAndFigure ATR length
  source?: 'open' | 'high' | 'low' | 'close' | 'hl2' | 'hlc3' | 'ohlc4'; // Renko/LineBreak/Kagi source
  style?: 'ATR' | string; // Renko/Kagi/PointAndFigure style
  boxSize?: number; // Renko/PointAndFigure box size
  reversalAmount?: number; // Kagi/PointAndFigure reversal amount
  sources?: 'Close'; // Renko/PointAndFigure sources
  wicks?: boolean; // Renko wicks
  lb?: number; // LineBreak Line break
  oneStepBackBuilding?: boolean; // PointAndFigure oneStepBackBuilding
  phantomBars?: boolean; // Range phantom bars
  range?: number; // Range range
};
```

### `PricePeriod`
```javascript
type PricePeriod = {
  time: number; // Period timestamp
  open: number; // Period open value
  close: number; // Period close value
  max: number; // Period max value
  min: number; // Period min value
  volume: number; // Period volume value
};
```

### `MarketInfos`
```javascript
type MarketInfos = {
  series_id: string; // Used series (e.g., 'ser_1')
  base_currency: string; // Base currency (e.g., 'BTC')
  base_currency_id: string; // Base currency ID (e.g., 'XTVCBTC')
  name: string; // Market short name (e.g., 'BTCEUR')
  full_name: string; // Market full name (e.g., 'COINBASE:BTCEUR')
  pro_name: string; // Market pro name (e.g., 'COINBASE:BTCEUR')
  description: string; // Market symbol description (e.g., 'BTC/EUR')
  short_description: string; // Market symbol short description (e.g., 'BTC/EUR')
  exchange: string; // Market exchange (e.g., 'COINBASE')
  listed_exchange: string; // Market exchange (e.g., 'COINBASE')
  provider_id: string; // Values provider ID (e.g., 'coinbase')
  currency_id: string; // Used currency ID (e.g., 'EUR')
  currency_code: string; // Used currency code (e.g., 'EUR')
  variable_tick_size: string; // Variable tick size
  pricescale: number; // Price scale
  pointvalue: number; // Point value
  session: string; // Session (e.g., '24x7')
  session_display: string; // Session display (e.g., '24x7')
  type: string; // Market type (e.g., 'crypto')
  has_intraday: boolean; // If intraday values are available
  fractional: boolean; // If market is fractional
  is_tradable: boolean; // If the market is currently tradable
  minmov: number; // Minimum move value
  minmove2: number; // Minimum move value 2
  timezone: string; // Used timezone
  is_replayable: boolean; // If the replay mode is available
  has_adjustment: boolean; // If the adjustment mode is enabled
  has_extended_hours: boolean; // Has extended hours
  bar_source: string; // Bar source
  bar_transform: string; // Bar transform
  bar_fillgaps: boolean; // Bar fill gaps
  allowed_adjustment: string; // Allowed adjustment (e.g., 'none')
  subsession_id: string; // Subsession ID (e.g., 'regular')
  pro_perm: string; // Pro permission (e.g., '')
  base_name: []; // Base name (e.g., ['COINBASE:BTCEUR'])
  legs: []; // Legs (e.g., ['COINBASE:BTCEUR'])
  subsessions: Subsession[]; // Sub sessions
  typespecs: []; // Typespecs (e.g., [])
  resolutions: []; // Resolutions (e.g., [])
  aliases: []; // Aliases (e.g., [])
  alternatives: []; // Alternatives (e.g., [])
};
```

### `Subsession`
```javascript
type Subsession = {
  id: string; // Subsession ID (e.g., 'regular')
  description: string; // Subsession description (e.g., 'Regular')
  private: boolean; // If private
  session: string; // Session (e.g., '24x7')
  'session-correction': string; // Session correction
  'session-display': string; // Session display (e.g., '24x7')
};
```

### `User`
```javascript
type User = {
  id: number; // User ID
  username: string; // User username
  firstName: string; // User first name
  lastName: string; // User last name
  reputation: number; // User reputation
  following: number; // Number of following accounts
  followers: number; // Number of followers
  notifications: {
    user: number; // User notifications
    following: number; // Notification from following accounts
  }; // User's notifications
  session: string; // User session
  sessionHash: string; // User session hash
  signature: string; // User session signature
  privateChannel: string; // User private channel
  authToken: string; // User auth token
  joinDate: Date; // Account creation date
};
```

### `SearchMarketResult`
```javascript
type SearchMarketResult = {
  id: string; // Market full symbol
  exchange: string; // Market exchange name
  fullExchange: string; // Market exchange full name
  symbol: string; // Market symbol
  description: string; // Market name
  type: string; // Market type
  getTA: () => Promise<Periods>; // Get market technical analysis
};
```

### `SearchIndicatorResult`
```javascript
type SearchIndicatorResult = {
  id: string; // Script ID
  version: string; // Script version
  name: string; // Script complete name
  author: {
    id: number;
    username: string;
  }; // Author user ID
  image: string; // Image ID https://tradingview.com/i/${image}
  source: string | ''; // Script source (if available)
  type: 'study' | 'strategy'; // Script type (study / strategy)
  access: 'open_source' | 'closed_source' | 'invite_only' | 'private' | 'other'; // Script access type
  get: () => Promise<PineIndicator>; // Get the full indicator information
};
```

### `PineIndicator`
```javascript
type PineIndicator = {
  pineId: string; // Pine script ID
  pineVersion: string; // Pine script version
  description: string; // Description of the indicator
  shortDescription: string; // Short description of the indicator
  inputs: Object; // Input parameters
  plots: Object; // Plot definitions
  script: string; // Pine script source code
};
```

### `Periods`
```javascript
type Periods = {
  '1': Period;
  '5': Period;
  '15': Period;
  '60': Period;
  '240': Period;
  '1D': Period;
  '1W': Period;
  '1M': Period;
};
```

### `Period`
```javascript
type Period = {
  Other: advice;
  All: advice;
  MA: advice;
};
```

### `advice`
```javascript
type advice = number;
```

### `Drawing`
```javascript
type Drawing = {
  id: string; // Drawing ID (e.g., 'XXXXXX')
  symbol: string; // Layout market symbol (e.g., 'BINANCE:BUCEUR')
  ownerSource: string; // Owner user ID (e.g., 'XXXXXX')
  serverUpdateTime: string; // Drawing last update timestamp
  currencyId: string; // Currency ID (e.g., 'EUR')
  unitId: any; // Unit ID
  type: string; // Drawing type
  points: DrawingPoint[]; // List of drawing points
  zorder: number; // Drawing Z order
  linkKey: string; // Drawing link key
  state: Object; // Drawing state
};
```

### `DrawingPoint`
```javascript
type DrawingPoint = {
  time_t: number; // Point X time position
  price: number; // Point Y price position
  offset: number; // Point offset
};