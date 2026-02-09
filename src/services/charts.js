const http = require('../http');
const { genAuthCookies } = require('../utils');

const BASE_URL = 'https://www.tradingview.com';

/**
 * @typedef {Object} ChartLayout
 * @prop {number} id Chart ID
 * @prop {string} image_url Chart image URL identifier
 * @prop {string} symbol Chart symbol (e.g., 'OANDA:XAUUSD')
 * @prop {string} short_name Short symbol name
 * @prop {string} name Chart layout name
 * @prop {string} created Creation date (YYYY-MM-DD)
 * @prop {string} modified Last modification date (YYYY-MM-DD)
 * @prop {string} resolution Chart timeframe/resolution
 * @prop {string} pro_symbol Full symbol for pro users
 * @prop {string} expression Symbol expression
 * @prop {string} created_time Human-readable creation time
 * @prop {number} created_timestamp Unix timestamp of creation
 * @prop {number} modified_iso ISO timestamp of last modification
 * @prop {string} short_symbol Shortened symbol
 * @prop {string} interval Chart interval
 * @prop {string} url Chart URL identifier
 * @prop {boolean} favorite Whether chart is marked as favorite
 */

/**
 * @typedef {Object} ChartLayoutsResponse
 * @prop {ChartLayout[]} results List of chart layouts
 * @prop {number} [count] Total count
 * @prop {string|null} [next] URL for next page
 * @prop {string|null} [previous] URL for previous page
 */

/**
 * Build headers for charts API requests
 * @param {Object} options
 * @param {string} [options.session] - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Object}
 */
function buildHeaders(options = {}) {
  const headers = {
    'accept': 'application/json',
    'origin': 'https://www.tradingview.com',
    'referer': 'https://www.tradingview.com/chart/',
    'x-requested-with': 'XMLHttpRequest',
    'x-language': options.language || 'en',
  };

  if (options.session) {
    headers.cookie = genAuthCookies(options.session, options.signature);
  }

  return headers;
}

/**
 * Handle API error responses
 * @param {Object} data - Response data
 * @param {string} context - Context for error message
 */
function handleApiError(data, context) {
  if (data && (data.detail || data.error || data.code)) {
    const message = data.detail || data.error || data.message || JSON.stringify(data);
    throw new Error(`${context}: ${message}`);
  }
}

/**
 * Get user's saved chart layouts
 * @param {Object} options - Options
 * @param {string} options.session - Session ID (required)
 * @param {string} [options.signature] - Session signature
 * @param {number} [options.limit=20] - Maximum number of charts to return
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<ChartLayoutsResponse>}
 */
async function getMyCharts(options) {
  if (!options?.session) {
    throw new Error('Session is required to get chart layouts');
  }

  const params = {
    limit: options.limit || 20,
  };

  if (options.offset) {
    params.offset = options.offset;
  }

  const { data } = await http.get(`${BASE_URL}/my-charts/`, {
    params,
    headers: buildHeaders(options),
  });

  handleApiError(data, 'Failed to get chart layouts');

  return {
    results: data || [],
    count: data?.length || 0,
  };
}

/**
 * Get favorite chart layouts only
 * @param {Object} options - Options
 * @param {string} options.session - Session ID (required)
 * @param {string} [options.signature] - Session signature
 * @param {number} [options.limit=20] - Maximum number of charts to return
 * @returns {Promise<ChartLayout[]>}
 */
async function getFavoriteCharts(options) {
  const response = await getMyCharts(options);
  return response.results.filter(chart => chart.favorite);
}

/**
 * Search through user's chart layouts by symbol or name
 * @param {Object} options - Options
 * @param {string} options.session - Session ID (required)
 * @param {string} [options.signature] - Session signature
 * @param {string} options.query - Search query (symbol or name)
 * @returns {Promise<ChartLayout[]>}
 */
async function searchMyCharts(options) {
  if (!options?.query) {
    throw new Error('Search query is required');
  }

  const response = await getMyCharts({ ...options, limit: 100 });
  const query = options.query.toLowerCase();

  return response.results.filter(chart =>
    chart.symbol?.toLowerCase().includes(query) ||
    chart.name?.toLowerCase().includes(query) ||
    chart.short_name?.toLowerCase().includes(query)
  );
}

/**
 * Get chart layout by ID
 * @param {number} chartId - Chart layout ID
 * @param {Object} options - Options
 * @param {string} options.session - Session ID (required)
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<ChartLayout|null>}
 */
async function getChartById(chartId, options) {
  if (!chartId) {
    throw new Error('Chart ID is required');
  }

  const response = await getMyCharts({ ...options, limit: 100 });
  return response.results.find(chart => chart.id === chartId) || null;
}

/**
 * Get the most recently modified charts
 * @param {Object} options - Options
 * @param {string} options.session - Session ID (required)
 * @param {string} [options.signature] - Session signature
 * @param {number} [options.limit=5] - Number of recent charts to return
 * @returns {Promise<ChartLayout[]>}
 */
async function getRecentCharts(options) {
  const response = await getMyCharts({ ...options, limit: options.limit || 5 });
  return response.results
    .sort((a, b) => (b.modified_iso || 0) - (a.modified_iso || 0))
    .slice(0, options.limit || 5);
}

/**
 * High-level wrapper for chart layout operations
 * @param {Object} defaults - Default options (session, signature)
 * @returns {Object} Charts client
 */
function createChartsClient(defaults = {}) {
  return {
    list: (opts = {}) => getMyCharts({ ...defaults, ...opts }),
    getFavorites: (opts = {}) => getFavoriteCharts({ ...defaults, ...opts }),
    search: (query, opts = {}) => searchMyCharts({ ...defaults, ...opts, query }),
    getById: (id, opts = {}) => getChartById(id, { ...defaults, ...opts }),
    getRecent: (opts = {}) => getRecentCharts({ ...defaults, ...opts }),
  };
}

module.exports = {
  getMyCharts,
  getFavoriteCharts,
  searchMyCharts,
  getChartById,
  getRecentCharts,
  createChartsClient,
};
