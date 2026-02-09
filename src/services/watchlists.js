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
 * @prop {string} [type] List type (e.g., 'custom')
 * @prop {WatchlistSymbol[]} symbols List of symbols
 * @prop {number} [user_id] User ID
 * @prop {string} [created_at] Creation timestamp
 * @prop {string} [updated_at] Last update timestamp
 * @prop {boolean} [is_active] Whether this is the active watchlist
 * @prop {Object} [meta] Additional metadata
 */

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

  return data;
}

/**
 * Create a new watchlist
 * @param {Object} watchlistData
 * @param {string} watchlistData.name - Watchlist name
 * @param {Array<string|WatchlistSymbol>} [watchlistData.symbols] - Symbols to add
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
    symbols: (watchlistData.symbols || []).map((sym) => {
      if (typeof sym === 'string') {
        return { id: sym, type: 'full' };
      }
      return { type: 'full', ...sym };
    }),
  };

  const { data } = await http.post(`${BASE_URL}/custom/`, payload, {
    headers: buildHeaders(options),
  });

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

  return data;
}

/**
 * Set a watchlist as the active one
 * @param {number} id - Watchlist ID
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Object>}
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

  return data;
}

/**
 * Add symbols to a watchlist
 * @param {number} id - Watchlist ID
 * @param {Array<string|WatchlistSymbol>} symbols - Symbols to add
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Watchlist>}
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

  const payload = {
    symbols: symbols.map((sym) => {
      if (typeof sym === 'string') {
        return { id: sym, type: 'full' };
      }
      return { type: 'full', ...sym };
    }),
  };

  const { data } = await http.post(
    `${BASE_URL}/custom/${id}/append/`,
    payload,
    { headers: buildHeaders(options) }
  );

  return data;
}

/**
 * Remove symbols from a watchlist
 * @param {number} id - Watchlist ID
 * @param {Array<string>} symbolIds - Symbol IDs to remove
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Watchlist>}
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

  const payload = {
    symbols: symbolIds.map((id) => ({ id, type: 'full' })),
  };

  const { data } = await http.post(
    `${BASE_URL}/custom/${id}/remove/`,
    payload,
    { headers: buildHeaders(options) }
  );

  return data;
}

/**
 * Update watchlist metadata
 * @param {number} id - Watchlist ID
 * @param {Object} meta - Metadata to update
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

  return data;
}

/**
 * Share a watchlist with other users
 * @param {number} id - Watchlist ID
 * @param {Object} shareOptions - Sharing options
 * @param {string} [shareOptions.permission] - Permission level ('view', 'edit')
 * @param {string[]} [shareOptions.emails] - Email addresses to share with
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Object>}
 */
async function shareWatchlist(id, shareOptions, options) {
  if (!options?.session) {
    throw new Error('Session is required to share watchlist');
  }

  if (!id) {
    throw new Error('Watchlist ID is required');
  }

  const { data } = await http.post(
    `${BASE_URL}/custom/${id}/share/`,
    shareOptions || {},
    { headers: buildHeaders(options) }
  );

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
    updateMeta: (id, meta, opts = {}) => updateWatchlistMeta(id, meta, { ...defaults, ...opts }),
    share: (id, shareOpts, opts = {}) => shareWatchlist(id, shareOpts, { ...defaults, ...opts }),
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
  updateWatchlistMeta,
  shareWatchlist,
  createWatchlistsClient,
};
