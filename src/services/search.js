const http = require('../http');
const { getTA } = require('./ta');

/**
 * @typedef {import('./ta').Periods} Periods
 */

/**
 * @typedef {Object} SearchMarketResult
 * @prop {string} id Market full symbol
 * @prop {string} exchange Market exchange name
 * @prop {string} fullExchange Market exchange full name
 * @prop {string} symbol Market symbol
 * @prop {string} description Market name
 * @prop {string} type Market type
 * @prop {() => Promise<Periods>} getTA Get market technical analysis
 */

/**
 * Find a symbol (deprecated)
 * @function searchMarket
 * @param {string} search Keywords
 * @param {'stock'
 *  | 'futures' | 'forex' | 'cfd'
 *  | 'crypto' | 'index' | 'economic'
 * } [filter] Caterogy filter
 * @returns {Promise<SearchMarketResult[]>} Search results
 * @deprecated Use searchMarketV3 instead
 */
async function searchMarket(search, filter = '') {
  const { data } = await http.get(
    'https://symbol-search.tradingview.com/symbol_search',
    {
      params: {
        text: search, // Axios will handle encoding
        type: filter,
      },
      headers: {
        origin: 'https://www.tradingview.com',
      },
    }
  );

  return data.map((s) => {
    const exchange = s.exchange.split(' ')[0];
    const id = `${exchange}:${s.symbol}`;

    return {
      id,
      exchange,
      fullExchange: s.exchange,
      symbol: s.symbol,
      description: s.description,
      type: s.type,
      getTA: () => getTA(id),
    };
  });
}

/**
 * Find a symbol
 * @function searchMarketV3
 * @param {string} search Keywords
 * @param {'stock'
 *  | 'futures' | 'forex' | 'cfd'
 *  | 'crypto' | 'index' | 'economic'
 * } [filter] Caterogy filter
 * @param {number} offset Pagination offset
 * @returns {Promise<SearchMarketResult[]>} Search results
 */
async function searchMarketV3(search, filter = '', offset = 0) {
  // We keep the splitting logic as it parses the user input
  const splittedSearch = search.toUpperCase().replace(/ /g, '+').split(':');

  const request = await http.get(
    'https://symbol-search.tradingview.com/symbol_search/v3',
    {
      params: {
        exchange: (splittedSearch.length === 2
          ? splittedSearch[0]
          : undefined
        ),
        text: splittedSearch.pop(),
        search_type: filter,
        start: offset,
      },
      headers: {
        origin: 'https://www.tradingview.com',
      },
    }
  );

  const { data } = request;

  return data.symbols.map((s) => {
    const exchange = s.exchange.split(' ')[0];
    const id = s.prefix ? `${s.prefix}:${s.symbol}` : `${exchange.toUpperCase()}:${s.symbol}`;

    return {
      id,
      exchange,
      fullExchange: s.exchange,
      symbol: s.symbol,
      description: s.description,
      type: s.type,
      getTA: () => getTA(id),
    };
  });
}

module.exports = { searchMarket, searchMarketV3 };
