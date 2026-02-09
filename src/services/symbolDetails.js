const http = require('../http');

const BASE_URL = 'https://www.tradingview.com';

/**
 * @typedef {Object} SymbolDetails
 * @prop {number} [High.1M] 1-month high
 * @prop {number} [Low.1M] 1-month low
 * @prop {number} [Perf.W] Weekly performance (%)
 * @prop {number} [Perf.1M] 1-month performance (%)
 * @prop {number} [Perf.3M] 3-month performance (%)
 * @prop {number} [Perf.6M] 6-month performance (%)
 * @prop {number} [Perf.Y] 1-year performance (%)
 * @prop {number} [Perf.YTD] Year-to-date performance (%)
 * @prop {number} [Perf.All] All-time performance (%)
 * @prop {number} [Recommend.All] Overall recommendation score (-1 to 1)
 * @prop {number} [Recommend.MA] Moving average recommendation score
 * @prop {number} [Recommend.Other] Other indicators recommendation score
 * @prop {number} [RSI] RSI value
 * @prop {number} [Mom] Momentum indicator
 * @prop {number} [AO] Awesome Oscillator
 * @prop {number} [CCI20] CCI 20-period
 * @prop {number} [Volatility.D] Daily volatility (%)
 * @prop {number} [Volatility.W] Weekly volatility (%)
 * @prop {number} [Volatility.M] Monthly volatility (%)
 * @prop {number} [average_volume_10d_calc] 10-day average volume
 * @prop {number} [average_volume_30d_calc] 30-day average volume
 * @prop {number} [price_52_week_high] 52-week high
 * @prop {number} [price_52_week_low] 52-week low
 * @prop {string} [market] Market type (e.g., 'crypto', 'stock')
 * @prop {string} [country] Country code
 * @prop {string} [sector] Sector name
 * @prop {string} [industry] Industry name
 * @prop {number} [beta_1_year] 1-year beta
 * @prop {number} [beta_3_year] 3-year beta
 * @prop {number} [beta_5_year] 5-year beta
 */

/**
 * @typedef {Object} SymbolInfo
 * @prop {string} symbol Symbol name (e.g., 'COINBASE:BTCUSD')
 * @prop {string} name Display name
 * @prop {string} description Full description
 * @prop {string} type Instrument type (e.g., 'crypto', 'stock', 'forex')
 * @prop {string} exchange Exchange name
 * @prop {string} currency Currency code
 * @prop {string} [currency_code] Currency code (alternative)
 * @prop {string} [listed_exchange] Listed exchange
 * @prop {string} [timezone] Trading timezone
 * @prop {number} [pricescale] Price scale factor
 * @prop {number} [minmov] Minimum price movement
 * @prop {boolean} [has_intraday] Whether intraday data is available
 * @prop {boolean} [has_daily] Whether daily data is available
 * @prop {boolean} [has_weekly_and_monthly] Whether weekly/monthly data is available
 * @prop {string[]} [session_regular] Regular trading sessions
 * @prop {string} [session_pre] Pre-market session
 * @prop {string} [session_post] Post-market session
 */

/**
 * Get detailed symbol information and metrics
 * @param {string} symbol - Symbol (e.g., 'COINBASE:BTCUSD', 'NASDAQ:AAPL')
 * @param {Object} [options] - Options
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<SymbolDetails>}
 */
async function getSymbolDetails(symbol, options = {}) {
  const { lang = 'en' } = options;

  const { data } = await http.get(`${BASE_URL}/symbol`, {
    params: {
      symbol,
      lang,
    },
    headers: {
      accept: 'application/json',
      origin: 'https://www.tradingview.com',
      referer: `https://www.tradingview.com/symbols/${symbol.replace(':', '-')}/`,
    },
  });

  return data;
}

/**
 * Get symbol information (basic metadata)
 * @param {string} symbol - Symbol (e.g., 'COINBASE:BTCUSD')
 * @param {Object} [options] - Options
 * @returns {Promise<SymbolInfo>}
 */
async function getSymbolInfo(symbol, options = {}) {
  // Use the search endpoint to get symbol info
  const { data } = await http.get(`${BASE_URL}/symbol_search/v3/`, {
    params: {
      text: symbol,
      exact_match: true,
      limit: 1,
    },
    headers: {
      accept: 'application/json',
      origin: 'https://www.tradingview.com',
      referer: 'https://www.tradingview.com/',
    },
  });

  if (!data.symbols || data.symbols.length === 0) {
    throw new Error(`Symbol not found: ${symbol}`);
  }

  const sym = data.symbols[0];
  const exchange = sym.exchange.split(' ')[0];
  
  return {
    symbol: sym.prefix ? `${sym.prefix}:${sym.symbol}` : symbol,
    name: sym.symbol,
    description: sym.description,
    type: sym.type,
    exchange: exchange,
    currency: sym.currency_code,
    currency_code: sym.currency_code,
    provider_id: sym.provider_id,
    country: sym.country,
    typespecs: sym.typespecs,
    logo: sym.logo,
    source_id: sym.source_id,
  };
}

/**
 * Get multiple symbols' details in one request
 * @param {string[]} symbols - Array of symbols
 * @param {Object} [options] - Options
 * @returns {Promise<Record<string, SymbolDetails>>}
 */
async function getMultipleSymbolDetails(symbols, options = {}) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('At least one symbol is required');
  }

  const results = {};
  
  // Fetch details in parallel
  const promises = symbols.map(async (symbol) => {
    try {
      const details = await getSymbolDetails(symbol, options);
      results[symbol] = details;
    } catch (error) {
      results[symbol] = { error: error.message };
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * Get performance metrics for a symbol
 * @param {string} symbol - Symbol (e.g., 'COINBASE:BTCUSD')
 * @returns {Promise<Object>}
 */
async function getSymbolPerformance(symbol) {
  const details = await getSymbolDetails(symbol);

  return {
    weekly: details['Perf.W'],
    monthly: details['Perf.1M'],
    quarterly: details['Perf.3M'],
    halfYearly: details['Perf.6M'],
    yearly: details['Perf.Y'],
    ytd: details['Perf.YTD'],
    allTime: details['Perf.All'],
    oneMonthHigh: details['High.1M'],
    oneMonthLow: details['Low.1M'],
    fiftyTwoWeekHigh: details['price_52_week_high'],
    fiftyTwoWeekLow: details['price_52_week_low'],
  };
}

/**
 * Get recommendation/technical analysis summary for a symbol
 * @param {string} symbol - Symbol (e.g., 'COINBASE:BTCUSD')
 * @returns {Promise<Object>}
 */
async function getSymbolRecommendation(symbol) {
  const details = await getSymbolDetails(symbol);

  return {
    overall: details['Recommend.All'],
    movingAverages: details['Recommend.MA'],
    other: details['Recommend.Other'],
    rsi: details['RSI'],
    momentum: details['Mom'],
    awesomeOscillator: details['AO'],
    cci20: details['CCI20'],
  };
}

/**
 * Get volatility metrics for a symbol
 * @param {string} symbol - Symbol (e.g., 'COINBASE:BTCUSD')
 * @returns {Promise<Object>}
 */
async function getSymbolVolatility(symbol) {
  const details = await getSymbolDetails(symbol);

  return {
    daily: details['Volatility.D'],
    weekly: details['Volatility.W'],
    monthly: details['Volatility.M'],
  };
}

/**
 * Get volume metrics for a symbol
 * @param {string} symbol - Symbol (e.g., 'COINBASE:BTCUSD')
 * @returns {Promise<Object>}
 */
async function getSymbolVolume(symbol) {
  const details = await getSymbolDetails(symbol);

  return {
    average10d: details['average_volume_10d_calc'],
    average30d: details['average_volume_30d_calc'],
  };
}

/**
 * High-level wrapper for symbol details operations
 * @returns {Object} Symbol details client
 */
function createSymbolDetailsClient() {
  return {
    getDetails: getSymbolDetails,
    getInfo: getSymbolInfo,
    getMultiple: getMultipleSymbolDetails,
    getPerformance: getSymbolPerformance,
    getRecommendation: getSymbolRecommendation,
    getVolatility: getSymbolVolatility,
    getVolume: getSymbolVolume,
  };
}

module.exports = {
  getSymbolDetails,
  getSymbolInfo,
  getMultipleSymbolDetails,
  getSymbolPerformance,
  getSymbolRecommendation,
  getSymbolVolatility,
  getSymbolVolume,
  createSymbolDetailsClient,
};
