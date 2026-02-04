const http = require('../http');
const { genAuthCookies } = require('../utils');
const { getIndicator } = require('./pine');

const TV_BASE = 'https://www.tradingview.com';
const PINE_FACADE_BASE = 'https://pine-facade.tradingview.com/pine-facade';

// Very small in-memory cache to reduce rate-limit pressure on incremental search.
// Keyed by `${language}:${query}`.
const SEARCH_CACHE_MAX = 100;
const SEARCH_CACHE_TTL_MS = 60_000;
const searchCache = new Map();

const LIB_CACHE_MAX = 50;
const LIB_CACHE_TTL_MS = 60_000;
const libCache = new Map();

function getCachedLib(key) {
  const entry = libCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.t > LIB_CACHE_TTL_MS) {
    libCache.delete(key);
    return null;
  }
  return entry.v;
}

function setCachedLib(key, value) {
  libCache.set(key, { t: Date.now(), v: value });
  if (libCache.size > LIB_CACHE_MAX) {
    for (const k of libCache.keys()) {
      libCache.delete(k);
      if (libCache.size <= LIB_CACHE_MAX) break;
    }
  }
}

function getCachedSearch(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.t > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.v;
}

function setCachedSearch(key, value) {
  searchCache.set(key, { t: Date.now(), v: value });
  // Simple eviction: remove oldest entries when above cap.
  if (searchCache.size > SEARCH_CACHE_MAX) {
    const extra = searchCache.size - SEARCH_CACHE_MAX;
    for (const k of searchCache.keys()) {
      searchCache.delete(k);
      if (searchCache.size <= SEARCH_CACHE_MAX) break;
    }
  }
}

function normalizePineId(id = '') {
  if (!id) return '';
  // Users sometimes paste URL-encoded IDs (e.g. PUB%3Babc). Normalize.
  try {
    id = decodeURIComponent(id);
  } catch {
    // ignore
  }
  return id.replace(/%3B/gi, ';');
}

function getHttp(options = {}) {
  return options.http || http;
}

function buildHeaders(options = {}) {
  const headers = {
    accept: 'application/json, text/javascript, */*; q=0.01',
    referer: `${TV_BASE}/chart/`,
    'x-requested-with': 'XMLHttpRequest',
    'x-language': options.language || 'en',
  };

  if (options.session) {
    headers.cookie = genAuthCookies(options.session, options.signature);
  }

  if (options.userAgent) {
    headers['user-agent'] = options.userAgent;
  }

  return headers;
}

/**
 * Search Pine scripts (public suggestions endpoint).
 * This endpoint returns community scripts suggestions (PUB;...) and metadata.
 *
 * @param {string} query
 * @param {{ limit?: number, session?: string, signature?: string, language?: string, userAgent?: string }} [options]
 * @returns {Promise<Array<{ id: string, name: string, version: string, author: { id: number, username: string }, image: string, access: string, source: string, type: string, get: () => Promise<any> }>>}
 */
async function searchPublicScripts(query = '', options = {}) {
  const lang = options.language || 'en';
  const cacheKey = `${lang}:${query}`;
  const cached = getCachedSearch(cacheKey);
  if (cached) {
    // Preserve `limit` semantics
    return options.limit ? cached.slice(0, options.limit) : cached;
  }

  const { data } = await getHttp(options).get(
    `${TV_BASE}/pubscripts-suggest-json`,
    {
      params: { search: query },
      headers: buildHeaders(options),
    },
  );

  const results = Array.isArray(data?.results) ? data.results : [];
  const mapped = results.map((ind) => ({
    id: normalizePineId(ind.scriptIdPart),
    version: ind.version,
    name: ind.scriptName,
    author: {
      id: ind.author?.id ?? -1,
      username: ind.author?.username ?? '',
    },
    image: ind.imageUrl,
    access: ['open_source', 'closed_source', 'invite_only'][ind.access - 1] || 'other',
    source: ind.scriptSource,
    type: (ind.extra && ind.extra.kind) ? ind.extra.kind : 'study',
    get() {
      return getIndicator(normalizePineId(ind.scriptIdPart), ind.version);
    },
  }));

  setCachedSearch(cacheKey, mapped);

  if (options.limit) return mapped.slice(0, options.limit);
  return mapped;
}

/**
 * Browse the public scripts library (top/trending/paid) endpoint.
 *
 * @param {{ offset?: number, count?: number, type?: number, sort?: 'top'|'trending', isPaid?: boolean, session?: string, signature?: string, language?: string, userAgent?: string }} [options]
 * @returns {Promise<any>} Raw library response (TradingView changes this shape often)
 */
async function browsePublicLibrary(options = {}) {
  if (options.cache !== false) {
    const cacheKey = JSON.stringify({
      language: options.language || 'en',
      offset: options.offset ?? 0,
      count: options.count ?? 20,
      type: options.type ?? 0,
      sort: options.sort,
      isPaid: typeof options.isPaid === 'boolean' ? options.isPaid : undefined,
    });
    const cached = getCachedLib(cacheKey);
    if (cached) return cached;

    const params = {
      offset: options.offset ?? 0,
      count: options.count ?? 20,
      type: options.type ?? 0,
    };
    if (options.sort) params.sort = options.sort;
    if (typeof options.isPaid === 'boolean') params.is_paid = options.isPaid;

    const { data } = await getHttp(options).get(
      `${TV_BASE}/pubscripts-library/`,
      { params, headers: buildHeaders(options) },
    );

    setCachedLib(cacheKey, data);
    return data;
  }

  const params = {
    offset: options.offset ?? 0,
    count: options.count ?? 20,
    type: options.type ?? 0,
  };
  if (options.sort) params.sort = options.sort;
  if (typeof options.isPaid === 'boolean') params.is_paid = options.isPaid;

  const { data } = await getHttp(options).get(
    `${TV_BASE}/pubscripts-library/`,
    { params, headers: buildHeaders(options) },
  );

  return data;
}

/**
 * Get script info metadata.
 *
 * @param {string} pineId
 * @param {{ session?: string, signature?: string, language?: string, userAgent?: string }} [options]
 */
async function getScriptInfo(pineId, options = {}) {
  const id = normalizePineId(pineId);
  const { data } = await getHttp(options).get(
    `${PINE_FACADE_BASE}/get_script_info/`,
    {
      params: { pine_id: id },
      headers: buildHeaders(options),
    },
  );
  return data;
}

/**
 * Check whether current credentials can fetch a script version.
 *
 * @param {string} pineId
 * @param {string|number} [version]
 * @param {{ session?: string, signature?: string, language?: string, userAgent?: string }} [options]
 */
async function isAuthorizedToGet(pineId, version = 1, options = {}) {
  const id = normalizePineId(pineId);
  const { data } = await getHttp(options).get(
    `${PINE_FACADE_BASE}/is_auth_to_get/${encodeURIComponent(id)}/${encodeURIComponent(version)}`,
    { headers: buildHeaders(options) },
  );
  return data;
}

/**
 * Fetch raw Pine source payload using the pine-facade /get endpoint.
 * Note: this is different from getIndicator() (translate endpoint).
 *
 * @param {string} pineId
 * @param {string|number} [version]
 * @param {{ session?: string, signature?: string, language?: string, userAgent?: string }} [options]
 */
async function getScriptSource(pineId, version = 1, options = {}) {
  const id = normalizePineId(pineId);
  const { data } = await getHttp(options).get(
    `${PINE_FACADE_BASE}/get/${encodeURIComponent(id)}/${encodeURIComponent(version)}`,
    { headers: buildHeaders(options) },
  );
  return data;
}

/**
 * High-level wrapper grouping indicator/script capabilities.
 *
 * @param {{ session?: string, signature?: string, language?: string, userAgent?: string }} [defaults]
 */
function createIndicatorsClient(defaults = {}) {
  return {
    normalizePineId,
    search: (query, opts = {}) => searchPublicScripts(query, { ...defaults, ...opts }),
    browseLibrary: (opts = {}) => browsePublicLibrary({ ...defaults, ...opts }),
    getInfo: (id, opts = {}) => getScriptInfo(id, { ...defaults, ...opts }),
    canGet: (id, version = 1, opts = {}) => isAuthorizedToGet(id, version, { ...defaults, ...opts }),
    getSource: (id, version = 1, opts = {}) => getScriptSource(id, version, { ...defaults, ...opts }),
    // keep existing behavior: translate endpoint -> PineIndicator
    getIndicator: (id, version = 'last', opts = {}) => getIndicator(normalizePineId(id), version, opts.session ?? defaults.session ?? '', opts.signature ?? defaults.signature ?? ''),
  };
}

module.exports = {
  normalizePineId,
  searchPublicScripts,
  browsePublicLibrary,
  getScriptInfo,
  isAuthorizedToGet,
  getScriptSource,
  createIndicatorsClient,
};
