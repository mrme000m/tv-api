const http = require('../http');
const { getTA } = require('./ta');

/**
 * @typedef {import('./ta').Periods} Periods
 */

/**
 * @typedef {Object} SearchSymbolResult
 * @prop {string} symbol Symbol name with potential html tags
 * @prop {string} description Description
 * @prop {string} type Type
 * @prop {string} exchange Exchange
 * @prop {string} currency_code Currency code
 * @prop {string} [provider_id] Provider ID
 * @prop {string} [country] Country
 * @prop {string[]} [typespecs] Type specs
 * @prop {string} [prefix] Prefix
 * @prop {string} [isin] ISIN
 * @prop {string} [cusip] CUSIP
 * @prop {string} [cik_code] CIK code
 * @prop {() => Promise<Periods>} getTA Get market technical analysis
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
 * Advanced symbol search (V3)
 * @function search
 * @param {string} text Search query
 * @param {Object} [options] Search options
 * @param {string} [options.exchange] Exchange filter
 * @param {'stock'|'futures'|'forex'|'cfd'|'crypto'|'index'|'economic'|'fund'|undefined} [options.type] Instrument type
 * @param {number} [options.start=0] Pagination start offset
 * @param {boolean} [options.hl=true] Highlight matches
 * @param {string} [options.lang='en'] Language code
 * @param {string} [options.domain='production'] Environment
 * @param {string} [options.sortByCountry='US'] Sort by country
 * @param {boolean} [options.promo=true] Include promotional results
 * @returns {Promise<{symbols: SearchSymbolResult[], remaining: number}>}
 */
async function search(text, options = {}) {
  const {
    exchange,
    type,
    start = 0,
    hl = true,
    lang = 'en',
    domain = 'production',
    sortByCountry = 'US',
    promo = true,
  } = options;

  const { data } = await http.get(
    'https://symbol-search.tradingview.com/symbol_search/v3',
    {
      params: {
        text,
        exchange,
        search_type: type,
        start,
        hl: hl ? '1' : '0',
        lang,
        domain,
        sort_by_country: sortByCountry,
        promo: promo ? 'true' : 'false',
      },
      headers: {
        origin: 'https://www.tradingview.com',
      },
    }
  );

  return {
    symbols: data.symbols.map((s) => {
      const exch = s.exchange.split(' ')[0];
      const safeSymbol = s.symbol.replace(/<[^>]+>/g, '');
      // Some symbols/types might not have prefix, fallback to exchange
      const id = s.prefix
        ? `${s.prefix}:${safeSymbol}`
        : `${exch.toUpperCase()}:${safeSymbol}`;
      
      return {
        ...s,
        id,
        safeSymbol,
        // Helper to get TA easily
        getTA: () => getTA(id),
      };
    }),
    remaining: data.symbols_remaining || 0,
  };
}

/**
 * Find a symbol
 * @function searchMarketV3
 * @param {string} query Keywords
 * @param {'stock'
 *  | 'futures' | 'forex' | 'cfd'
 *  | 'crypto' | 'index' | 'economic'
 * } [filter] Caterogy filter
 * @param {number} offset Pagination offset
 * @returns {Promise<SearchMarketResult[]>} Search results
 */
async function searchMarketV3(query, filter = '', offset = 0) {
  // We keep the splitting logic as it parses the user input
  const splittedSearch = query.toUpperCase().replace(/ /g, '+').split(':');
  
  const exchange = splittedSearch.length === 2 ? splittedSearch[0] : undefined;
  const text = splittedSearch.pop();

  const { symbols } = await search(text, {
    exchange,
    type: filter,
    start: offset,
    // defaults for backward compatibility
    hl: true,
    lang: 'en',
    domain: 'production',
    sortByCountry: undefined, // Let API decide or use default if we want
    promo: true,
  });

  // Map to the old expected format
  return symbols.map((s) => {
    const exch = s.exchange.split(' ')[0];

    return {
      id: s.id,
      exchange: exch,
      fullExchange: s.exchange,
      symbol: s.safeSymbol,
      description: s.description,
      type: s.type,
      getTA: s.getTA,
    };
  });
}

module.exports = { searchMarket, searchMarketV3, search };
