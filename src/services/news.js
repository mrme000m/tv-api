const http = require('../http');

const NEWS_BASE = 'https://news-flow.tradingview.com';
const PUBLIC_NEWS_BASE = 'https://www.tradingview.com';

/**
 * @typedef {Object} NewsProvider
 * @prop {string} id Provider ID (e.g., 'cointelegraph')
 * @prop {string} name Provider name (e.g., 'Cointelegraph')
 * @prop {string} [logo_id] Logo identifier
 * @prop {string} [url] Provider website URL
 */

/**
 * @typedef {Object} RelatedSymbol
 * @prop {string} symbol Symbol (e.g., 'BITSTAMP:BTCUSD')
 * @prop {string} [logoid] Logo ID
 * @prop {string} [currency-logoid] Currency logo ID
 * @prop {string} [base-currency-logoid] Base currency logo ID
 */

/**
 * @typedef {Object} NewsItem
 * @prop {string} id News item ID
 * @prop {string} title News headline
 * @prop {number} published Unix timestamp
 * @prop {number} urgency Urgency level (1-3, where 3 is highest)
 * @prop {string} link URL to full article
 * @prop {string} storyPath Path to TradingView story page
 * @prop {RelatedSymbol[]} relatedSymbols Associated trading symbols
 * @prop {NewsProvider} provider News source provider
 * @prop {string} [permission] Permission level for the content
 * @prop {string} [description] Article summary/description
 * @prop {string} [image] Image URL
 * @prop {string[]} [tags] Associated tags
 */

/**
 * @typedef {Object} NewsFlowResponse
 * @prop {NewsItem[]} items List of news items
 * @prop {boolean} hasMore Whether more items are available
 * @prop {string} [cursor] Pagination cursor
 * @prop {number} [total] Total number of items
 */

/**
 * Handle API error responses
 * @param {Object} data - Response data
 * @param {string} context - Context for error message
 */
function handleApiError(data, context) {
  if (data && (data.detail || data.error || data.code || data.s === 'error')) {
    const message = data.detail || data.error || data.message || data.errmsg || JSON.stringify(data);
    throw new Error(`${context}: ${message}`);
  }
}

/**
 * Get news for a specific symbol
 * @param {string} symbol - Symbol (e.g., 'COINBASE:BTCUSD', 'NASDAQ:AAPL')
 * @param {Object} [options] - Options
 * @param {number} [options.limit=20] - Maximum number of items to return
 * @param {number} [options.offset=0] - Offset for pagination
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<NewsFlowResponse>}
 */
async function getSymbolNews(symbol, options = {}) {
  const {
    limit = 20,
    offset = 0,
    lang = 'en',
  } = options;

  const { data } = await http.get(`${PUBLIC_NEWS_BASE}/public/news-flow/v2/news`, {
    params: {
      symbol,
      limit,
      offset,
      lang,
    },
    headers: {
      accept: 'application/json',
      origin: 'https://www.tradingview.com',
      referer: `https://www.tradingview.com/symbols/${symbol.replace(':', '-')}/`,
    },
  });

  handleApiError(data, 'Failed to get symbol news');

  return {
    items: data.items || [],
    hasMore: data.hasMore || false,
    cursor: data.cursor,
    total: data.total,
  };
}

/**
 * Get general market news
 * @param {Object} [options] - Options
 * @param {number} [options.limit=20] - Maximum number of items to return
 * @param {number} [options.offset=0] - Offset for pagination
 * @param {string} [options.category] - News category ('crypto', 'stocks', 'forex', 'commodities')
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<NewsFlowResponse>}
 */
async function getMarketNews(options = {}) {
  const {
    limit = 20,
    offset = 0,
    category,
    lang = 'en',
  } = options;

  const params = {
    limit,
    offset,
    lang,
  };

  if (category) {
    params.category = category;
  }

  const { data } = await http.get(`${PUBLIC_NEWS_BASE}/public/news-flow/v2/news`, {
    params,
    headers: {
      accept: 'application/json',
      origin: 'https://www.tradingview.com',
      referer: 'https://www.tradingview.com/',
    },
  });

  handleApiError(data, 'Failed to get market news');

  return {
    items: data.items || [],
    hasMore: data.hasMore || false,
    cursor: data.cursor,
    total: data.total,
  };
}

/**
 * Get news by category
 * @param {string} category - Category name ('crypto', 'stocks', 'forex', 'commodities', 'economy')
 * @param {Object} [options] - Options
 * @param {number} [options.limit=20] - Maximum number of items to return
 * @param {number} [options.offset=0] - Offset for pagination
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<NewsFlowResponse>}
 */
async function getNewsByCategory(category, options = {}) {
  return getMarketNews({ ...options, category });
}

/**
 * Get latest crypto news
 * @param {Object} [options] - Options
 * @param {number} [options.limit=20] - Maximum number of items to return
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<NewsFlowResponse>}
 */
async function getCryptoNews(options = {}) {
  return getNewsByCategory('crypto', options);
}

/**
 * Get latest stock market news
 * @param {Object} [options] - Options
 * @param {number} [options.limit=20] - Maximum number of items to return
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<NewsFlowResponse>}
 */
async function getStockNews(options = {}) {
  return getNewsByCategory('stocks', options);
}

/**
 * Get latest forex news
 * @param {Object} [options] - Options
 * @param {number} [options.limit=20] - Maximum number of items to return
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<NewsFlowResponse>}
 */
async function getForexNews(options = {}) {
  return getNewsByCategory('forex', options);
}

/**
 * Search news articles
 * @param {string} query - Search query
 * @param {Object} [options] - Options
 * @param {number} [options.limit=20] - Maximum number of items to return
 * @param {number} [options.offset=0] - Offset for pagination
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<NewsFlowResponse>}
 */
async function searchNews(query, options = {}) {
  const {
    limit = 20,
    offset = 0,
    lang = 'en',
  } = options;

  const { data } = await http.get(`${PUBLIC_NEWS_BASE}/public/news-flow/v2/search`, {
    params: {
      q: query,
      limit,
      offset,
      lang,
    },
    headers: {
      accept: 'application/json',
      origin: 'https://www.tradingview.com',
      referer: 'https://www.tradingview.com/',
    },
  });

  handleApiError(data, 'Failed to search news');

  return {
    items: data.items || [],
    hasMore: data.hasMore || false,
    cursor: data.cursor,
    total: data.total,
  };
}

/**
 * Get news providers/sources
 * @param {Object} [options] - Options
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<NewsProvider[]>}
 */
async function getNewsProviders(options = {}) {
  const { lang = 'en' } = options;

  const { data } = await http.get(`${PUBLIC_NEWS_BASE}/public/news-flow/v2/providers`, {
    params: { lang },
    headers: {
      accept: 'application/json',
      origin: 'https://www.tradingview.com',
      referer: 'https://www.tradingview.com/',
    },
  });

  handleApiError(data, 'Failed to get news providers');

  return data.providers || [];
}

/**
 * High-level wrapper for news operations
 * @returns {Object} News client
 */
function createNewsClient() {
  return {
    getSymbolNews,
    getMarketNews,
    getNewsByCategory,
    getCryptoNews,
    getStockNews,
    getForexNews,
    searchNews,
    getNewsProviders,
  };
}

module.exports = {
  getSymbolNews,
  getMarketNews,
  getNewsByCategory,
  getCryptoNews,
  getStockNews,
  getForexNews,
  searchNews,
  getNewsProviders,
  createNewsClient,
};
