const http = require('../http');
const { genAuthCookies } = require('../utils');

const BASE_URL = 'https://www.tradingview.com/api/v1/symbols_list';

/**
 * @typedef {Object} WatchlistSymbol
 * @prop {string} id Symbol ID (e.g., 'COINBASE:BTCUSD')
 * @prop {string} [type] Symbol type (usually 'full')
 * @prop {string} [name] Symbol display name
 */

/**
 * @typedef {Object} Watchlist
 * @prop {number} id Watchlist ID
 * @prop {string} name Watchlist name
 * @prop {string} [description] Watchlist description
 * @prop {string} type List type (e.g., 'custom')
 * @prop {Array<string|Object>} symbols List of symbols (can be strings like 'COINBASE:BTCUSD' or section headers like '###Section')
 * @prop {boolean} active Whether this is the active watchlist
 * @prop {boolean} shared Whether this watchlist is shared
 * @prop {string} [color] Watchlist color (if colored list)
 * @prop {string} [created] Creation timestamp
 * @prop {string} [modified] Last modification timestamp
 */

/**
 * Available colors for colored watchlists
 * @constant {string[]}
 */
const COLORED_LIST_COLORS = ['red', 'green', 'blue', 'yellow', 'orange', 'purple'];

/**
 * Build headers for watchlists API requests
 * @param {Object} options
 * @param {string} [options.session] - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Object}
 */
function buildHeaders(options = {}) {
  const headers = {
    'accept': 'application/json',
    'content-type': 'application/json',
    'origin': 'https://www.tradingview.com',
    'referer': 'https://www.tradingview.com/',
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
 * List all watchlists for the authenticated user
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Watchlist[]>}
 */
async function listWatchlists(options) {
  if (!options?.session) {
    throw new Error('Session is required to list watchlists');
  }

  const { data } = await http.get(`${BASE_URL}/custom/`, {
    headers: buildHeaders(options),
  });

  handleApiError(data, 'Failed to list watchlists');

  return Array.isArray(data) ? data : [];
}

/**
 * Get a specific watchlist by ID
 * @param {number} id - Watchlist ID
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Watchlist>}
 */
async function getWatchlist(id, options) {
  if (!options?.session) {
    throw new Error('Session is required to get watchlist');
  }

  if (!id) {
    throw new Error('Watchlist ID is required');
  }

  const { data } = await http.get(`${BASE_URL}/custom/${id}`, {
    headers: buildHeaders(options),
  });

  handleApiError(data, 'Failed to get watchlist');

  return data;
}

/**
 * Create a new watchlist
 * @param {Object} watchlistData
 * @param {string} watchlistData.name - Watchlist name
 * @param {Array<string>} [watchlistData.symbols] - Symbols to add (array of strings like 'COINBASE:BTCUSD')
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Watchlist>}
 */
async function createWatchlist(watchlistData, options) {
  if (!options?.session) {
    throw new Error('Session is required to create watchlist');
  }

  if (!watchlistData?.name) {
    throw new Error('Watchlist name is required');
  }

  const payload = {
    name: watchlistData.name,
    symbols: watchlistData.symbols || [],
  };

  const { data } = await http.post(`${BASE_URL}/custom/`, payload, {
    headers: buildHeaders(options),
  });

  handleApiError(data, 'Failed to create watchlist');

  return data;
}

/**
 * Rename a watchlist
 * @param {number} id - Watchlist ID
 * @param {string} newName - New name for the watchlist
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Watchlist>}
 */
async function renameWatchlist(id, newName, options) {
  if (!options?.session) {
    throw new Error('Session is required to rename watchlist');
  }

  if (!id) {
    throw new Error('Watchlist ID is required');
  }

  if (!newName) {
    throw new Error('New name is required');
  }

  const { data } = await http.post(
    `${BASE_URL}/custom/${id}/rename/`,
    { name: newName },
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to rename watchlist');

  return data;
}

/**
 * Set a watchlist as the active one
 * @param {number} id - Watchlist ID
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Watchlist>}
 */
async function setActiveWatchlist(id, options) {
  if (!options?.session) {
    throw new Error('Session is required to set active watchlist');
  }

  if (!id) {
    throw new Error('Watchlist ID is required');
  }

  const { data } = await http.post(
    `${BASE_URL}/active/${id}/`,
    {},
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to set active watchlist');

  return data;
}

/**
 * Add symbols to a watchlist
 * @param {number} id - Watchlist ID
 * @param {Array<string>} symbols - Symbols to add (e.g., ['COINBASE:BTCUSD', 'NASDAQ:AAPL'])
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<string[]>} - Returns array of symbols
 */
async function addSymbols(id, symbols, options) {
  if (!options?.session) {
    throw new Error('Session is required to add symbols');
  }

  if (!id) {
    throw new Error('Watchlist ID is required');
  }

  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('At least one symbol is required');
  }

  const { data } = await http.post(
    `${BASE_URL}/custom/${id}/append/`,
    symbols,
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to add symbols');

  return data;
}

/**
 * Remove symbols from a watchlist
 * @param {number} id - Watchlist ID
 * @param {Array<string>} symbolIds - Symbol IDs to remove (e.g., ['NASDAQ:AAPL'])
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Object>} - Returns status object
 */
async function removeSymbols(id, symbolIds, options) {
  if (!options?.session) {
    throw new Error('Session is required to remove symbols');
  }

  if (!id) {
    throw new Error('Watchlist ID is required');
  }

  if (!Array.isArray(symbolIds) || symbolIds.length === 0) {
    throw new Error('At least one symbol ID is required');
  }

  const { data } = await http.post(
    `${BASE_URL}/custom/${id}/remove/`,
    symbolIds,
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to remove symbols');

  return data;
}

/**
 * Replace all symbols in a watchlist (replaces entire content)
 * @param {number} id - Watchlist ID
 * @param {Array<string>} symbols - New symbols array (can include section headers like '###Section Name')
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @param {boolean} [options.unsafe=false] - Use unsafe mode (for larger lists)
 * @returns {Promise<string[]>} - Returns array of symbols
 */
async function replaceWatchlistSymbols(id, symbols, options) {
  if (!options?.session) {
    throw new Error('Session is required to replace symbols');
  }

  if (!id) {
    throw new Error('Watchlist ID is required');
  }

  if (!Array.isArray(symbols)) {
    throw new Error('Symbols must be an array');
  }

  const params = {};
  if (options.unsafe) {
    params.unsafe = true;
  }

  const { data } = await http.post(
    `${BASE_URL}/custom/${id}/replace/`,
    symbols,
    { 
      headers: buildHeaders(options),
      params,
    }
  );

  handleApiError(data, 'Failed to replace symbols');

  return data;
}

/**
 * Replace a single symbol in a watchlist
 * @param {number} id - Watchlist ID
 * @param {string} oldSymbol - Old symbol to replace (e.g., '###Old Section' or 'COINBASE:BTCUSD')
 * @param {string} newSymbol - New symbol (e.g., '###New Section' or 'BITSTAMP:BTCUSD')
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<string[]>} - Returns array of symbols
 */
async function replaceSymbol(id, oldSymbol, newSymbol, options) {
  if (!options?.session) {
    throw new Error('Session is required to replace symbol');
  }

  if (!id) {
    throw new Error('Watchlist ID is required');
  }

  if (!oldSymbol || !newSymbol) {
    throw new Error('Both old and new symbols are required');
  }

  const payload = {
    old: oldSymbol,
    new: newSymbol,
  };

  const { data } = await http.post(
    `${BASE_URL}/custom/${id}/replace_symbol/`,
    payload,
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to replace symbol');

  return data;
}

/**
 * Update watchlist metadata (description, etc.)
 * @param {number} id - Watchlist ID
 * @param {Object} meta - Metadata to update (e.g., { description: 'My watchlist' })
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Watchlist>}
 */
async function updateWatchlistMeta(id, meta, options) {
  if (!options?.session) {
    throw new Error('Session is required to update watchlist metadata');
  }

  if (!id) {
    throw new Error('Watchlist ID is required');
  }

  const { data } = await http.post(
    `${BASE_URL}/custom/${id}/update_meta/`,
    meta,
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to update watchlist metadata');

  return data;
}

/**
 * Share or unshare a watchlist
 * @param {number} id - Watchlist ID
 * @param {boolean} shared - Whether to share (true) or unshare (false)
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Watchlist>}
 */
async function shareWatchlist(id, shared, options) {
  if (!options?.session) {
    throw new Error('Session is required to share watchlist');
  }

  if (!id) {
    throw new Error('Watchlist ID is required');
  }

  const payload = {
    shared: shared === true,
  };

  const { data } = await http.post(
    `${BASE_URL}/custom/${id}/share/`,
    payload,
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to share watchlist');

  return data;
}

/**
 * Delete a watchlist
 * @param {number} id - Watchlist ID
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Object>}
 */
async function deleteWatchlist(id, options) {
  if (!options?.session) {
    throw new Error('Session is required to delete watchlist');
  }

  if (!id) {
    throw new Error('Watchlist ID is required');
  }

  const { data } = await http.post(
    `${BASE_URL}/custom/${id}/delete/`,
    {},
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to delete watchlist');

  return data;
}

/**
 * Add symbols to a colored list
 * @param {string} color - Color name (red, green, blue, yellow, orange, purple)
 * @param {Array<string>} symbols - Symbols to add (e.g., ['OANDA:XAUUSD'])
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<string[]>} - Returns array of symbols in the colored list
 */
async function addToColoredList(color, symbols, options) {
  if (!options?.session) {
    throw new Error('Session is required to add to colored list');
  }

  if (!color) {
    throw new Error('Color is required');
  }

  if (!COLORED_LIST_COLORS.includes(color)) {
    throw new Error(`Invalid color: ${color}. Must be one of: ${COLORED_LIST_COLORS.join(', ')}`);
  }

  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('At least one symbol is required');
  }

  const { data } = await http.post(
    `${BASE_URL}/colored/${color}/append/`,
    symbols,
    { headers: buildHeaders(options) }
  );

  handleApiError(data, `Failed to add symbols to ${color} list`);

  return data;
}

/**
 * Remove symbols from colored lists
 * @param {Array<string>} symbols - Symbols to remove (e.g., ['OANDA:XAUUSD'])
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Object>} - Returns status object
 */
async function removeFromColoredLists(symbols, options) {
  if (!options?.session) {
    throw new Error('Session is required to remove from colored lists');
  }

  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('At least one symbol is required');
  }

  const { data } = await http.post(
    `${BASE_URL}/colored/bulk_remove/`,
    symbols,
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to remove symbols from colored lists');

  return data;
}

/**
 * High-level wrapper for watchlist operations
 * @param {Object} defaults - Default options (session, signature)
 * @returns {Object} Watchlists client
 */
function createWatchlistsClient(defaults = {}) {
  return {
    list: (opts = {}) => listWatchlists({ ...defaults, ...opts }),
    get: (id, opts = {}) => getWatchlist(id, { ...defaults, ...opts }),
    create: (data, opts = {}) => createWatchlist(data, { ...defaults, ...opts }),
    rename: (id, newName, opts = {}) => renameWatchlist(id, newName, { ...defaults, ...opts }),
    delete: (id, opts = {}) => deleteWatchlist(id, { ...defaults, ...opts }),
    setActive: (id, opts = {}) => setActiveWatchlist(id, { ...defaults, ...opts }),
    addSymbols: (id, symbols, opts = {}) => addSymbols(id, symbols, { ...defaults, ...opts }),
    removeSymbols: (id, symbolIds, opts = {}) => removeSymbols(id, symbolIds, { ...defaults, ...opts }),
    replaceSymbols: (id, symbols, opts = {}) => replaceWatchlistSymbols(id, symbols, { ...defaults, ...opts }),
    replaceSymbol: (id, oldSym, newSym, opts = {}) => replaceSymbol(id, oldSym, newSym, { ...defaults, ...opts }),
    updateMeta: (id, meta, opts = {}) => updateWatchlistMeta(id, meta, { ...defaults, ...opts }),
    share: (id, shared, opts = {}) => shareWatchlist(id, shared, { ...defaults, ...opts }),
    addToColoredList: (color, symbols, opts = {}) => addToColoredList(color, symbols, { ...defaults, ...opts }),
    removeFromColoredLists: (symbols, opts = {}) => removeFromColoredLists(symbols, { ...defaults, ...opts }),
    COLORED_LIST_COLORS,
  };
}

module.exports = {
  listWatchlists,
  getWatchlist,
  createWatchlist,
  renameWatchlist,
  deleteWatchlist,
  setActiveWatchlist,
  addSymbols,
  removeSymbols,
  replaceWatchlistSymbols,
  replaceSymbol,
  updateWatchlistMeta,
  shareWatchlist,
  addToColoredList,
  removeFromColoredLists,
  createWatchlistsClient,
  COLORED_LIST_COLORS,
};
