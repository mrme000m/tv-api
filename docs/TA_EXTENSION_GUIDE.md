# TA Extension Guide

This document provides comprehensive information about the TA (Technical Analysis) Extension functions that extend the basic TradingView API functionality.

## Table of Contents

1. [Overview](#overview)
2. [Functions](#functions)
3. [Technical Indicators](#technical-indicators)
4. [Examples](#examples)
5. [Error Handling](#error-handling)

## Overview

The TA Extension provides enhanced technical analysis capabilities beyond the basic TradingView API. It includes functions for getting extended technical analysis, batch analysis for multiple symbols, and advanced analysis with additional indicators and insights.

## Functions

### getExtendedTA(id, options)

Fetches extended technical analysis data for a specific symbol.

#### Parameters

- `id` (string): Full market ID (e.g., 'BINANCE:BTCUSDT')
- `options` (object): Additional options
  - `timeframes` (array): Timeframes to fetch (default: ['1', '5', '15', '60', '240', '1D', '1W', '1M'])
  - `indicators` (array): Technical indicators to fetch (default: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'])
  - `additionalFields` (array): Additional technical analysis fields to fetch

#### Return Value

Returns a promise resolving to an object with the following structure:
- `symbol`: The requested symbol
- `timestamp`: Timestamp of the request
- `timeframes`: Object containing data for each timeframe
  - `[timeframe]`: Data for each timeframe
    - `[indicator]`: Values for each indicator
    - `summary`: Summary of the analysis
      - `signal`: Combined signal value
      - `rating`: Formatted rating string
      - `strength`: Signal strength
      - `breakdown`: Breakdown of different signals

### getBatchTA(symbols, options)

Fetches technical analysis data for multiple symbols at once.

#### Parameters

- `symbols` (array): Array of market IDs
- `options` (object): Additional options (same as getExtendedTA)

#### Return Value

Returns a promise resolving to an object with symbols as keys and their TA data as values.

### getAdvancedTA(id, options)

Fetches technical analysis with additional indicators like MACD, RSI, EMA, etc.

#### Parameters

- `id` (string): Full market ID
- `options` (object): Additional options
  - `timeframes` (array): Timeframes to fetch (default: ['1D'])
  - `indicators` (array): Base indicators (default: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'])
  - `advancedIndicators` (array): Advanced technical indicators to fetch

#### Return Value

Returns a promise resolving to an object with the same structure as getExtendedTA plus:
- `indicators`: Object containing detailed information about each indicator
- `insights`: Array of insights based on the indicator values

### formatTechnicalRating(rating)

Formats a technical rating number into a human-readable string.

#### Parameters

- `rating` (number): Signal rating value

#### Return Value

Returns a string representing the rating:
- 'Strong Buy': >= 0.5
- 'Buy': >= 0.1 and < 0.5
- 'Neutral': >= -0.1 and < 0.1
- 'Sell': >= -0.5 and < -0.1
- 'Strong Sell': < -0.5

### getIndicatorInfo(indicatorName)

Gets detailed information about a specific technical indicator.

#### Parameters

- `indicatorName` (string): Name of the indicator

#### Return Value

Returns a string describing the indicator.

### getIndicatorDetails(indicators)

Gets detailed information about multiple technical indicators.

#### Parameters

- `indicators` (array): Array of indicator names

#### Return Value

Returns an object with indicator names as keys and their descriptions as values.

## Technical Indicators

The TA Extension provides access to a comprehensive set of technical indicators, organized by category:

### Aroon Indicators

- `Aroon.Up`: Measures how recently a new high was made (range 0-100)
- `Aroon.Down`: Measures how recently a new low was made (range 0-100)
- `Aroon_Osc`: Aroon Oscillator, difference between Aroon Up and Down

### Average Daily Range

- `ADR`: Average Daily Range, average of the daily high-low range
- `ADR percentage`: ADR expressed as a percentage of the closing price

### Average Directional Index (ADX)

- `ADX`: Average Directional Index, measures trend strength (range 0-100)
- `ADX+DI`: ADX combined with Positive Directional Indicator
- `ADX-DI`: ADX combined with Negative Directional Indicator

### Average True Range (ATR)

- `ATR`: Average True Range, measure of volatility
- `ATR percentage`: ATR expressed as a percentage of the closing price

### Awesome Oscillator (AO)

- `AO`: Awesome Oscillator, difference between 5-period and 34-period SMA of median prices
- `AO[1]`: Previous period value of Awesome Oscillator

### Bollinger Bands

- `BB.lower`: Lower Bollinger Band
- `BB.upper`: Upper Bollinger Band
- `BB.width`: Width of the Bollinger Bands
- `BB.b`: Position of price relative to the bands (B %)
- `BB.power`: Bollinger Bands Power indicator

### Bull/Bear Power

- `Bulls power`: Bull Power indicator measuring buying pressure
- `Bears power`: Bear Power indicator measuring selling pressure

### Commodity Channel Index (CCI)

- `CCI5`, `CCI10`, `CCI15`, `CCI20`, `CCI30`, `CCI40`, `CCI50`, `CCI100`, `CCI200`: CCI with different lookback periods
- `CCI[1]`: Previous period value of CCI

### Directional Movement Index (DMI)

- `ADX`: Average Directional Index
- `ADX+DI`: ADX with Positive Directional Indicator
- `ADX-DI`: ADX with Negative Directional Indicator

### Donchian Channels

- `DC.lower`: Lower Donchian Channel line
- `DC.upper`: Upper Donchian Channel line
- `DC.middle`: Middle Donchian Channel line
- `DC.width`: Width of the Donchian Channels

### Exponential Moving Average (EMA)

- `EMA5`, `EMA10`, `EMA20`, `EMA30`, `EMA50`, `EMA100`, `EMA200`: EMA with different periods

### Hull Moving Average (HMA)

- `HMA5`, `HMA10`, `HMA20`, `HMA30`, `HMA50`, `HMA100`, `HMA200`: HMA with different periods

### Ichimoku Cloud

- `Ichimoku.BLine`: Ichimoku Cloud Base Line (Kijun-sen)
- `Ichimoku.CLine`: Ichimoku Cloud Conversion Line (Tenkan-sen)
- `Ichimoku.Lead1`: Ichimoku Cloud Leading Span A (Senkou Span A)
- `Ichimoku.Lead2`: Ichimoku Cloud Leading Span B (Senkou Span B)
- `Ichimoku.LaggingSpan`: Ichimoku Cloud Lagging Span

### Keltner Channels

- `KC.lower`: Lower Keltner Channel line
- `KC.upper`: Upper Keltner Channel line
- `KC.middle`: Middle Keltner Channel line
- `KC.width`: Width of the Keltner Channels

### Momentum

- `Mom`: Momentum indicator showing price change over a specific period
- `Mom[1]`: Previous period value of Momentum

### Moving Average Convergence Divergence (MACD)

- `MACD.macd`: MACD line
- `MACD.signal`: Signal line (9-period EMA of MACD line)
- `MACD.histogram`: Histogram (difference between MACD and signal lines)

### Moving Averages Rating

- `Recommend.MA`: Overall technical rating based on moving averages

### Oscillators Rating

- `Recommend.Other`: Overall technical rating based on oscillators
- `Recommend.All`: Overall technical rating combining oscillators and moving averages

### Parabolic SAR

- `PSAR`: Parabolic Stop and Reverse indicator
- `PSAR[1]`: Previous period value of PSAR

### Pivot Points

Multiple pivot point calculation methods with support for multiple resistance and support levels:

- **Classic**: `PivotPoints.Classic.S1-S3`, `PivotPoints.Classic.R1-R3`, `PivotPoints.Classic.Middle`
- **Fibonacci**: `PivotPoints.Fibonacci.S1-S3`, `PivotPoints.Fibonacci.R1-R3`, `PivotPoints.Fibonacci.Middle`
- **Woodie**: `PivotPoints.Woodie.S1-S3`, `PivotPoints.Woodie.R1-R3`, `PivotPoints.Woodie.Middle`
- **Camarilla**: `PivotPoints.Camarilla.S1-S3`, `PivotPoints.Camarilla.R1-R3`, `PivotPoints.Camarilla.Middle`
- **DeMark**: `PivotPoints.Demark.S1`, `PivotPoints.Demark.R1`, `PivotPoints.Demark.Middle`

### Rate of Change (ROC)

- `ROC`: Rate of Change indicator showing price change percentage over time
- `ROC[1]`: Previous period value of ROC

### Relative Strength Index (RSI)

- `RSI`: Relative Strength Index (range 0-100)
- `RSI[1]`: Previous period value of RSI

### Simple Moving Average (SMA)

- `SMA5`, `SMA10`, `SMA20`, `SMA30`, `SMA50`, `SMA100`, `SMA200`: SMA with different periods

### Stochastic

- `Stoch.K`: Stochastic %K line
- `Stoch.D`: Stochastic %D line
- `Stoch.K-Stoch.D`: Difference between %K and %D lines

### Stochastic RSI

- `Stoch.RSI.K`: Stochastic RSI %K line
- `Stoch.RSI.D`: Stochastic RSI %D line

### Technical Rating

- `Recommend.Other`: Oscillator-based rating
- `Recommend.All`: Combined oscillator and moving average rating
- `Recommend.MA`: Moving average-based rating

### Ultimate Oscillator

- `Ultimate.Osc`: Multi-timeframe momentum oscillator combining short, medium, and long-term cycles

### Williams Percent Range

- `Williams.Percent`: Momentum indicator showing overbought/oversold levels (range -100 to 0)

### Candlestick Patterns

- `CDL_DOJI`: Doji pattern detection
- `CDL_BULLISHENGULFING`: Bullish engulfing pattern
- `CDL_BEARISHENGULFING`: Bearish engulfing pattern
- And many more candlestick pattern indicators

## Examples

### Basic Usage

```javascript
const { getExtendedTA } = require('./src/taExtension');

// Get extended TA for Bitcoin
const result = await getExtendedTA('BINANCE:BTCUSDT', {
  timeframes: ['1h', '4h', '1D'],
  indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
  additionalFields: ['RSI', 'MACD.macd']
});

console.log(result);
```

### Batch Analysis

```javascript
const { getBatchTA } = require('./src/taExtension');

// Get TA for multiple symbols
const symbols = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT'];
const results = await getBatchTA(symbols, {
  timeframes: ['1D'],
  indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
  additionalFields: ['RSI', 'MACD.macd']
});

for (const [symbol, data] of Object.entries(results)) {
  console.log(`${symbol}: ${data.timeframes['1D'].summary.rating}`);
}
```

### Advanced Analysis

```javascript
const { getAdvancedTA } = require('./src/taExtension');

// Get advanced TA with insights
const result = await getAdvancedTA('BINANCE:BTCUSDT', {
  timeframes: ['1D'],
  indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
  advancedIndicators: [
    'RSI', 'MACD.macd', 'Stoch.K', 'Williams.Percent', 
    'CCI20', 'ADX', 'ATR', 'PSAR', 'AO', 'Mom',
    'SMA5', 'SMA20', 'EMA5', 'EMA20'
  ]
});

if (result) {
  console.log('Rating:', result.timeframes['1D'].summary.rating);
  console.log('Insights:', result.timeframes['1D'].insights);
}
```

## Error Handling

All functions handle errors gracefully and return appropriate values:

- `getExtendedTA` and `getAdvancedTA` return `false` if no data is available for the requested symbol
- `getBatchTA` returns an empty object `{}` if no data is available
- Invalid inputs are handled with appropriate error messages

Always check the return values before accessing properties to prevent runtime errors.