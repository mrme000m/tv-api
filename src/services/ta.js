const { fetchScanData } = require('./scanner');

const indicators = ['Recommend.Other', 'Recommend.All', 'Recommend.MA'];

/** @typedef {number} advice */

/**
 * @typedef {{
 *   Other: advice,
 *   All: advice,
 *   MA: advice
 * }} Period
 */

/**
 * @typedef {{
 *  '1': Period,
 *  '5': Period,
 *  '15': Period,
 *  '60': Period,
 *  '240': Period,
 *  '1D': Period,
 *  '1W': Period,
 *  '1M': Period
 * }} Periods
 */

/**
 * Get technical analysis
 * @function getTA
 * @param {string} id Full market id (Example: COINBASE:BTCEUR)
 * @returns {Promise<Periods>} results
 */
async function getTA(id) {
  const advice = {};

  const cols = ['1', '5', '15', '60', '240', '1D', '1W', '1M']
    .map((t) => indicators.map((i) => (t !== '1D' ? `${i}|${t}` : i)))
    .flat();

  const rs = await fetchScanData([id], cols);
  if (!rs.data || !rs.data[0]) return false;

  rs.data[0].d.forEach((val, i) => {
    const [name, period] = cols[i].split('|');
    const pName = period || '1D';
    if (!advice[pName]) advice[pName] = {};
    advice[pName][name.split('.').pop()] = Math.round(val * 1000) / 500;
  });

  return advice;
}

/**
 * Format technical rating based on signal value
 * @function formatTechnicalRating
 * @param {number} rating Signal rating value
 * @returns {string} Formatted rating string
 */
function formatTechnicalRating(rating) {
  if (rating >= 0.5) return 'Strong Buy';
  if (rating >= 0.1) return 'Buy';
  if (rating >= -0.1) return 'Neutral';
  if (rating >= 0.5) return 'Strong Buy'; // Redundant check in original code
  if (rating >= 0.1) return 'Buy'; // Redundant check in original code
  if (rating >= -0.1) return 'Neutral'; // Redundant check in original code
  if (rating > -0.5) return 'Sell';
  return 'Strong Sell'; // This covers rating <= -0.5
}

// Define all available technical indicators with their descriptions
const TECHNICAL_INDICATORS = {
  'Recommend.Other': 'Overall technical rating based on oscillators',
  'Recommend.All': 'Overall technical rating combining oscillators and moving averages',
  'Recommend.MA': 'Overall technical rating based on moving averages',
  
  // Moving Averages
  'SMA5': 'Simple Moving Average (5 periods)',
  'SMA10': 'Simple Moving Average (10 periods)',
  'SMA20': 'Simple Moving Average (20 periods)',
  'SMA30': 'Simple Moving Average (30 periods)',
  'SMA50': 'Simple Moving Average (50 periods)',
  'SMA100': 'Simple Moving Average (100 periods)',
  'SMA200': 'Simple Moving Average (200 periods)',
  'EMA5': 'Exponential Moving Average (5 periods)',
  'EMA10': 'Exponential Moving Average (10 periods)',
  'EMA20': 'Exponential Moving Average (20 periods)',
  'EMA30': 'Exponential Moving Average (30 periods)',
  'EMA50': 'Exponential Moving Average (50 periods)',
  'EMA100': 'Exponential Moving Average (100 periods)',
  'EMA200': 'Exponential Moving Average (200 periods)',
  'HMA5': 'Hull Moving Average (5 periods)',
  'HMA10': 'Hull Moving Average (10 periods)',
  'HMA20': 'Hull Moving Average (20 periods)',
  'HMA30': 'Hull Moving Average (30 periods)',
  'HMA50': 'Hull Moving Average (50 periods)',
  'HMA100': 'Hull Moving Average (100 periods)',
  'HMA200': 'Hull Moving Average (200 periods)',
  
  // Oscillators
  'RSI': 'Relative Strength Index',
  'RSI[1]': 'Relative Strength Index (previous period)',
  'Stoch.K': 'Stochastic Oscillator %K',
  'Stoch.D': 'Stochastic Oscillator %D',
  'Stoch.K-Stoch.D': 'Stochastic K-D Difference',
  'Stoch.RSI.K': 'Stochastic RSI %K',
  'Stoch.RSI.D': 'Stochastic RSI %D',
  'TSI': 'True Strength Index',
  'TSI[1]': 'True Strength Index (previous period)',
  'Ultimate.Osc': 'Ultimate Oscillator',
  'Williams.Percent': 'Williams Percent Range',
  'Mom': 'Momentum',
  'Mom[1]': 'Momentum (previous period)',
  'MACD.macd': 'Moving Average Convergence Divergence',
  'MACD.signal': 'MACD Signal Line',
  'MACD.histogram': 'MACD Histogram',
  'AO': 'Awesome Oscillator',
  'AO[1]': 'Awesome Oscillator (previous period)',
  'CCI20': 'Commodity Channel Index (20 periods)',
  'CCI[1]': 'Commodity Channel Index (previous period)',
  'CCI5': 'Commodity Channel Index (5 periods)',
  'CCI10': 'Commodity Channel Index (10 periods)',
  'CCI15': 'Commodity Channel Index (15 periods)',
  'CCI30': 'Commodity Channel Index (30 periods)',
  'CCI40': 'Commodity Channel Index (40 periods)',
  'CCI50': 'Commodity Channel Index (50 periods)',
  'CCI100': 'Commodity Channel Index (100 periods)',
  'CCI200': 'Commodity Channel Index (200 periods)',
  'ROC': 'Rate of Change',
  'ROC[1]': 'Rate of Change (previous period)',
  'PPO': 'Percentage Price Oscillator',
  'PPO[1]': 'Percentage Price Oscillator (previous period)',
  'PVO': 'Percentage Volume Oscillator',
  'PVO[1]': 'Percentage Volume Oscillator (previous period)',
  
  // Volatility Indicators
  'ATR': 'Average True Range',
  'ATR[1]': 'Average True Range (previous period)',
  'BB.lower': 'Bollinger Bands Lower Band',
  'BB.upper': 'Bollinger Bands Upper Band',
  'BB.width': 'Bollinger Bands Width',
  'BB.b': 'Bollinger Bands Position (B %)',
  'BB.power': 'Bollinger Bands Power',
  'KC.lower': 'Keltner Channels Lower Band',
  'KC.upper': 'Keltner Channels Upper Band',
  'KC.middle': 'Keltner Channels Middle Line',
  'KC.width': 'Keltner Channels Width',
  'DC.lower': 'Donchian Channels Lower Band',
  'DC.upper': 'Donchian Channels Upper Band',
  'DC.middle': 'Donchian Channels Middle Line',
  'DC.width': 'Donchian Channels Width',
  'BBPower': 'Bollinger Bands Power',
  'BBPower[1]': 'Bollinger Bands Power (previous period)',
  
  // Trend Indicators
  'ADX': 'Average Directional Index',
  'ADX+DI': 'ADX + Positive Directional Indicator',
  'ADX-DI': 'ADX - Negative Directional Indicator',
  'ADX[1]': 'Average Directional Index (previous period)',
  'AO[1]-AO': 'Awesome Oscillator Change',
  'AO[2]-AO[1]': 'Awesome Oscillator Second Change',
  'PSAR': 'Parabolic SAR',
  'PSAR[1]': 'Parabolic SAR (previous period)',
  'Ichimoku.BLine': 'Ichimoku Cloud Base Line',
  'Ichimoku.CLine': 'Ichimoku Cloud Conversion Line',
  'Ichimoku.Lead1': 'Ichimoku Cloud Leading Span A',
  'Ichimoku.Lead2': 'Ichimoku Cloud Leading Span B',
  'Ichimoku.Base': 'Ichimoku Cloud Base',
  'Ichimoku.Conversion': 'Ichimoku Cloud Conversion',
  'Ichimoku.LaggingSpan': 'Ichimoku Cloud Lagging Span',
  'Aroon.Up': 'Aroon Up',
  'Aroon.Down': 'Aroon Down',
  'Aroon_Osc': 'Aroon Oscillator',
  'Demark.Reversal': 'DeMark Reversal',
  'Demark.Counter': 'DeMark Counter',
  
  // Volume Indicators
  'VWAP': 'Volume Weighted Average Price',
  'VWAP[1]': 'Volume Weighted Average Price (previous period)',
  'OBV': 'On Balance Volume',
  'OBV[1]': 'On Balance Volume (previous period)',
  'Chaikin Money Flow': 'Chaikin Money Flow',
  'Chaikin Money Flow[1]': 'Chaikin Money Flow (previous period)',
  'Force Index': 'Force Index',
  'Force Index[1]': 'Force Index (previous period)',
  'Money Flow': 'Money Flow',
  'Money Flow[1]': 'Money Flow (previous period)',
  
  // Pivot Points
  'PivotPoints.Classic.S3': 'Pivot Points Classic S3',
  'PivotPoints.Classic.S2': 'Pivot Points Classic S2',
  'PivotPoints.Classic.S1': 'Pivot Points Classic S1',
  'PivotPoints.Classic.Middle': 'Pivot Points Classic Middle (Pivot)',
  'PivotPoints.Classic.R1': 'Pivot Points Classic R1',
  'PivotPoints.Classic.R2': 'Pivot Points Classic R2',
  'PivotPoints.Classic.R3': 'Pivot Points Classic R3',
  'PivotPoints.Fibonacci.S3': 'Pivot Points Fibonacci S3',
  'PivotPoints.Fibonacci.S2': 'Pivot Points Fibonacci S2',
  'PivotPoints.Fibonacci.S1': 'Pivot Points Fibonacci S1',
  'PivotPoints.Fibonacci.Middle': 'Pivot Points Fibonacci Middle (Pivot)',
  'PivotPoints.Fibonacci.R1': 'Pivot Points Fibonacci R1',
  'PivotPoints.Fibonacci.R2': 'Pivot Points Fibonacci R2',
  'PivotPoints.Fibonacci.R3': 'Pivot Points Fibonacci R3',
  'PivotPoints.Woodie.S3': 'Pivot Points Woodie S3',
  'PivotPoints.Woodie.S2': 'Pivot Points Woodie S2',
  'PivotPoints.Woodie.S1': 'Pivot Points Woodie S1',
  'PivotPoints.Woodie.Middle': 'Pivot Points Woodie Middle (Pivot)',
  'PivotPoints.Woodie.R1': 'Pivot Points Woodie R1',
  'PivotPoints.Woodie.R2': 'Pivot Points Woodie R2',
  'PivotPoints.Woodie.R3': 'Pivot Points Woodie R3',
  'PivotPoints.Camarilla.S3': 'Pivot Points Camarilla S3',
  'PivotPoints.Camarilla.S2': 'Pivot Points Camarilla S2',
  'PivotPoints.Camarilla.S1': 'Pivot Points Camarilla S1',
  'PivotPoints.Camarilla.Middle': 'Pivot Points Camarilla Middle (Pivot)',
  'PivotPoints.Camarilla.R1': 'Pivot Points Camarilla R1',
  'PivotPoints.Camarilla.R2': 'Pivot Points Camarilla R2',
  'PivotPoints.Camarilla.R3': 'Pivot Points Camarilla R3',
  'PivotPoints.Demark.S1': 'Pivot Points DeMark S1',
  'PivotPoints.Demark.Middle': 'Pivot Points DeMark Middle (Pivot)',
  'PivotPoints.Demark.R1': 'Pivot Points DeMark R1',
  
  // Candlestick Patterns
  'CDL_DOJI': 'Doji Pattern',
  'CDL_BULLISHENGULFING': 'Bullish Engulfing Pattern',
  'CDL_BEARISHENGULFING': 'Bearish Engulfing Pattern',
  'CDL_HAMMER': 'Hammer Pattern',
  'CDL_HANGINGMAN': 'Hanging Man Pattern',
  'CDL_SHOOTINGSTAR': 'Shooting Star Pattern',
  'CDL_DRAGONFLYDOJI': 'Dragonfly Doji Pattern',
  'CDL_GRAVESTONEDOJI': 'Gravestone Doji Pattern',
  'CDL_MORNINGSTAR': 'Morning Star Pattern',
  'CDL_EVENINGSTAR': 'Evening Star Pattern',
  'CDL_PIERCING': 'Piercing Pattern',
  'CDL_DARKCLOUDCOVER': 'Dark Cloud Cover Pattern',
  'CDL_TASUKIGAP': 'Tasuki Gap Pattern',
  'CDL_BREAKAWAY': 'Breakaway Pattern',
  'CDL_MARUBOZU': 'Marubozu Pattern',
  'CDL_SPINNINGTOP': 'Spinning Top Pattern',
  'CDL_HARAMI': 'Harami Pattern',
  'CDL_KICKING': 'Kicking Pattern',
  'CDL_RICKSHAWMAN': 'Rickshaw Man Pattern',
  'CDL_LONGLINE': 'Long Line Candle Pattern',
  'CDL_SHORTLINE': 'Short Line Candle Pattern',
  'CDL_STALLEDPATTERN': 'Stalled Pattern',
  'CDL_ADVANCEBLOCK': 'Advance Block Pattern',
  'CDL_COUNTERATTACK': 'Counterattack Pattern',
  'CDL_SEPARATINGLINES': 'Separating Lines Pattern',
  'CDL_STICKSANDWICH': 'Stick Sandwich Pattern',
  'CDL_THRUSTING': 'Thrusting Pattern',
  'CDL_UNIQUE3RIVER': 'Unique Three River Pattern',
  'CDL_UPSIDEGAP2CROWS': 'Upside Gap Two Crows Pattern',
  'CDL_TRISTAR': 'Tristar Pattern',
  'CDL_INVERTEDHAMMER': 'Inverted Hammer Pattern',
  'CDL_HARAMICROSS': 'Harami Cross Pattern',
  'CDL_HIGHWAVE': 'High Wave Candle Pattern',
  'CDL_LONGLEGGEDDOJI': 'Long Legged Doji Pattern',
  'CDL_LADDERBOTTOM': 'Ladder Bottom Pattern',
  'CDL_SIDEWAYS': 'Sideways Pattern',
  
  // Additional indicators
  'Bears power': 'Bull Bear Power - Bears Power',
  'Bulls power': 'Bull Bear Power - Bulls Power',
  'Bears power[1]': 'Bears Power (previous period)',
  'Bulls power[1]': 'Bulls Power (previous period)',
  'Average Value': 'Average Value',
  'Average Value[1]': 'Average Value (previous period)',
  'Open price': 'Opening Price',
  'High price': 'Highest Price',
  'Low price': 'Lowest Price',
  'Close price': 'Closing Price',
  'Volume': 'Trading Volume',
  'Change': 'Price Change',
  'Change percent': 'Price Change Percentage',
  'Previous close': 'Previous Closing Price',
  'Day chart high': 'Daily High',
  'Day chart low': 'Daily Low',
  'Market volatility': 'Market Volatility',
  'Market volatility[1]': 'Market Volatility (previous period)',
  'Volatility 30d MA': 'Volatility 30-day Moving Average',
  'Volatility 30d MA[1]': 'Volatility 30-day Moving Average (previous period)',
  'ADR': 'Average Daily Range',
  'ADR[1]': 'Average Daily Range (previous period)',
  'ADR percentage': 'Average Daily Range Percentage',
  'ADR percentage[1]': 'Average Daily Range Percentage (previous period)',
  'ATR percentage': 'Average True Range Percentage',
  'ATR percentage[1]': 'Average True Range Percentage (previous period)',
  'High-Low range': 'High-Low Range',
  'High-Low range[1]': 'High-Low Range (previous period)',
  'HL2': 'High-Low Average (HL2)',
  'HL2[1]': 'High-Low Average (previous period)',
  'HLC3': 'High-Low-Close Average (HLC3)',
  'HLC3[1]': 'High-Low-Close Average (previous period)',
  'OHLC4': 'Open-High-Low-Close Average (OHLC4)',
  'OHLC4[1]': 'Open-High-Low-Close Average (previous period)',
};

/**
 * Get detailed information about a technical indicator
 * @function getIndicatorInfo
 * @param {string} indicatorName Name of the indicator
 * @returns {string} Description of the indicator
 */
function getIndicatorInfo(indicatorName) {
  return TECHNICAL_INDICATORS[indicatorName] || `Unknown indicator: ${indicatorName}`;
}

/**
 * Get extended technical analysis using the global scanner endpoint
 * @function getExtendedTA
 * @param {string} id Full market id (Example: COINBASE:BTCEUR)
 * @param {Object} options Additional options for the TA request
 * @param {string[]} [options.timeframes=['1', '5', '15', '60', '240', '1D', '1W', '1M']] Timeframes to fetch
 * @param {string[]} [options.indicators=['Recommend.Other', 'Recommend.All', 'Recommend.MA']] Technical indicators to fetch
 * @param {string[]} [options.additionalFields=[]] Additional technical analysis fields to fetch
 * @returns {Promise<Object>} Extended TA results with comprehensive technical analysis
 */
async function getExtendedTA(id, options = {}) {
  const {
    timeframes = ['1', '5', '15', '60', '240', '1D', '1W', '1M'],
    indicators = ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
    additionalFields = [],
  } = options;

  const allCols = [];

  // Add standard recommendation indicators with timeframes
  for (const tf of timeframes) {
    for (const ind of indicators) {
      allCols.push(tf !== '1D' ? `${ind}|${tf}` : ind);
    }
  }

  // Add additional technical analysis fields
  allCols.push(...additionalFields);

  const rs = await fetchScanData([id], allCols);
  if (!rs.data || !rs.data[0]) return false;

  const extendedAdvice = {
    symbol: id,
    timestamp: Date.now(),
    timeframes: {}
  };

  // Process the response data
  rs.data[0].d.forEach((val, i) => {
    const colName = allCols[i];
    const [name, period] = colName.split('|');
    const pName = period || '1D';

    if (!extendedAdvice.timeframes[pName]) {
      extendedAdvice.timeframes[pName] = {};
    }

    // Extract the indicator name (last part after the dot)
    const indicatorName = name.split('.').pop();
    
    // Handle different types of values
    if (typeof val === 'number') {
      extendedAdvice.timeframes[pName][indicatorName] = Math.round(val * 1000) / 500;
    } else {
      extendedAdvice.timeframes[pName][indicatorName] = val;
    }
  });

  // Add calculated summary for each timeframe
  for (const tf in extendedAdvice.timeframes) {
    const ta = extendedAdvice.timeframes[tf];
    
    // Calculate overall recommendation based on multiple signals
    const signals = ['Other', 'All', 'MA'].map(key => ta[key] || 0);
    const avgSignal = signals.reduce((sum, val) => sum + val, 0) / signals.length;
    
    extendedAdvice.timeframes[tf].summary = {
      signal: avgSignal,
      rating: formatTechnicalRating(avgSignal),
      strength: Math.abs(avgSignal),
      breakdown: {
        other: ta.Other || 0,
        all: ta.All || 0,
        ma: ta.MA || 0
      }
    };
  }

  return extendedAdvice;
}

/**
 * Get batch technical analysis for multiple symbols
 * @function getBatchTA
 * @param {string[]} symbols Array of market IDs
 * @param {Object} options Additional options for the TA request
 * @returns {Promise<Object>} Batch TA results
 */
async function getBatchTA(symbols, options = {}) {
  if (!Array.isArray(symbols) || symbols.length === 0) return {};
  const {
    timeframes = ['1D'],
    indicators = ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
    additionalFields = [],
  } = options;

  const allCols = [];

  // Add standard recommendation indicators with timeframes
  for (const tf of timeframes) {
    for (const ind of indicators) {
      allCols.push(tf !== '1D' ? `${ind}|${tf}` : ind);
    }
  }

  // Add additional technical analysis fields
  allCols.push(...additionalFields);

  const rs = await fetchScanData(symbols, allCols);
  if (!rs.data) return {};

  const results = {};

  for (let i = 0; i < rs.data.length; i++) {
    const item = rs.data[i];
    const symbol = item.s;
    
    const advice = {
      symbol: symbol,
      timestamp: Date.now(),
      timeframes: {}
    };

    item.d.forEach((val, idx) => {
      const colName = allCols[idx];
      const [name, period] = colName.split('|');
      const pName = period || '1D';

      if (!advice.timeframes[pName]) {
        advice.timeframes[pName] = {};
      }

      const indicatorName = name.split('.').pop();
      
      if (typeof val === 'number') {
        advice.timeframes[pName][indicatorName] = Math.round(val * 1000) / 500;
      } else {
        advice.timeframes[pName][indicatorName] = val;
      }
    });

    // Add calculated summary for each timeframe
    for (const tf in advice.timeframes) {
      const ta = advice.timeframes[tf];
      
      const signals = ['Other', 'All', 'MA'].map(key => ta[key] || 0);
      const avgSignal = signals.reduce((sum, val) => sum + val, 0) / signals.length;
      
      advice.timeframes[tf].summary = {
        signal: avgSignal,
        rating: formatTechnicalRating(avgSignal),
        strength: Math.abs(avgSignal),
        breakdown: {
          other: ta.Other || 0,
          all: ta.All || 0,
          ma: ta.MA || 0
        }
      };
    }

    results[symbol] = advice;
  }

  return results;
}

/**
 * Get technical analysis with additional indicators like MACD, RSI, EMA, etc.
 * @function getAdvancedTA
 * @param {string} id Full market id (Example: COINBASE:BTCEUR)
 * @param {Object} options Additional options for the TA request
 * @param {string[]} [options.timeframes=['1D']] Timeframes to fetch
 * @param {string[]} [options.indicators=['Recommend.Other', 'Recommend.All', 'Recommend.MA']] Base indicators
 * @param {string[]} [options.advancedIndicators=[]] Advanced technical indicators to fetch
 * @returns {Promise<Object>} Advanced TA results
 */
async function getAdvancedTA(id, options = {}) {
  const {
    timeframes = ['1D'],
    indicators = ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
    advancedIndicators = [],
  } = options;

  // Combine base and advanced indicators
  const allIndicators = [...indicators, ...advancedIndicators];
  
  const allCols = [];

  // Add all indicators with timeframes
  for (const tf of timeframes) {
    for (const ind of allIndicators) {
      allCols.push(tf !== '1D' ? `${ind}|${tf}` : ind);
    }
  }

  const rs = await fetchScanData([id], allCols);
  if (!rs.data || !rs.data[0]) return false;

  const advancedAdvice = {
    symbol: id,
    timestamp: Date.now(),
    timeframes: {},
    indicators: {} // Store detailed indicator information
  };

  // Process the response data
  rs.data[0].d.forEach((val, i) => {
    const colName = allCols[i];
    const [name, period] = colName.split('|');
    const pName = period || '1D';

    if (!advancedAdvice.timeframes[pName]) {
      advancedAdvice.timeframes[pName] = {};
    }

    const indicatorName = name.split('.').pop();
    
    if (typeof val === 'number') {
      advancedAdvice.timeframes[pName][indicatorName] = Math.round(val * 1000) / 500;
    } else {
      advancedAdvice.timeframes[pName][indicatorName] = val;
    }
    
    // Store detailed indicator information
    advancedAdvice.indicators[name] = getIndicatorInfo(name);
  });

  // Add calculated summary and insights
  for (const tf in advancedAdvice.timeframes) {
    const ta = advancedAdvice.timeframes[tf];
    
    // Calculate primary recommendation
    const baseSignals = ['Other', 'All', 'MA'].filter(key => ta[key] !== undefined).map(key => ta[key]);
    const avgSignal = baseSignals.length > 0 
      ? baseSignals.reduce((sum, val) => sum + val, 0) / baseSignals.length 
      : 0;
    
    advancedAdvice.timeframes[tf].summary = {
      signal: avgSignal,
      rating: formatTechnicalRating(avgSignal),
      strength: Math.abs(avgSignal),
      breakdown: {
        other: ta.Other !== undefined ? ta.Other : 0,
        all: ta.All !== undefined ? ta.All : 0,
        ma: ta.MA !== undefined ? ta.MA : 0
      }
    };

    // Add insights based on advanced indicators if available
    const insights = [];
    
    // Check for oversold/overbought conditions if RSI is available
    if (ta.RSI !== undefined) {
      if (ta.RSI < 30) {
        insights.push(`RSI indicates oversold condition (${ta.RSI})`);
      } else if (ta.RSI > 70) {
        insights.push(`RSI indicates overbought condition (${ta.RSI})`);
      }
    }

    // Check for MACD conditions if available
    if (ta['MACD.macd'] !== undefined && ta['MACD.signal'] !== undefined) {
      const macdDiff = ta['MACD.macd'] - ta['MACD.signal'];
      if (macdDiff > 0) {
        insights.push(`MACD bullish (MACD above signal line)`);
      } else {
        insights.push(`MACD bearish (MACD below signal line)`);
      }
    }

    // Check for trend based on moving averages if available
    if (ta['EMA5'] !== undefined && ta['EMA20'] !== undefined) {
      if (ta['EMA5'] > ta['EMA20']) {
        insights.push(`Short-term trend bullish (EMA5 above EMA20)`);
      } else {
        insights.push(`Short-term trend bearish (EMA5 below EMA20)`);
      }
    }

    advancedAdvice.timeframes[tf].insights = insights;
  }

  return advancedAdvice;
}

function getIndicatorDetails(indicators) {
  const details = {};
  for (const indicator of indicators) {
    details[indicator] = getIndicatorInfo(indicator);
  }
  return details;
}

module.exports = {
  getTA,
  getExtendedTA,
  getBatchTA,
  getAdvancedTA,
  formatTechnicalRating,
  getIndicatorInfo,
  getIndicatorDetails
};
