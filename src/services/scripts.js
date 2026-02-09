/**
 * @file TradingView Scripts/Indicators/Ideas Service
 * @description Browse, search, and filter scripts and ideas from TradingView community
 * 
 * ## Content Types
 * 
 * The TradingView Scripts API returns different types of content:
 * 
 * - **Scripts** (`is_script: true`): 
 *   - `indicator`: Technical analysis indicators
 *   - `strategy`: Trading strategies with backtesting
 *   - `library`: Pine Script libraries for code reuse
 * 
 * - **Ideas** (`is_script: false`):
 *   - Chart analysis posts from community
 *   - Can include video content (`is_video: true`)
 *   - Can be educational (`is_education: true`)
 * 
 * ## Access Levels
 * 
 * - `1`: Open Source - Full source code visible
 * - `2`: Closed Source - Binary/compiled only
 * - `3`: Invite Only - Require permission from author
 * 
 * @module services/scripts
 */

const http = require('../http');

const BASE_URL = 'https://www.tradingview.com';

/**
 * Sort options for scripts browsing
 * @readonly
 * @enum {string}
 */
const ScriptSort = {
  /** Most popular today */
  TODAY_POPULAR: 'today_popular',
  /** Most popular this week */
  WEEK_POPULAR: 'week_popular',
  /** Most popular this month */
  MONTH_POPULAR: 'month_popular',
  /** Most popular all time */
  POPULAR: 'popular',
  /** Latest published */
  NEWEST: 'newest',
  /** Recently updated */
  UPDATED: 'updated',
};

/**
 * Content type filter for scripts
 * @readonly
 * @enum {string}
 */
const ContentTypeFilter = {
  /** All types */
  ALL: 'all',
  /** Only indicators */
  INDICATOR: 'indicator',
  /** Only strategies */
  STRATEGY: 'strategy',
  /** Only libraries */
  LIBRARY: 'library',
};

/**
 * Access level filter for scripts
 * @readonly
 * @enum {string}
 */
const AccessLevelFilter = {
  /** All access levels */
  ALL: 'all',
  /** Open source scripts */
  OPEN_SOURCE: 'open_source',
  /** Closed source scripts */
  CLOSED_SOURCE: 'closed_source',
  /** Invite only scripts */
  INVITE_ONLY: 'invite_only',
};

/**
 * Script language filter
 * @readonly
 * @enum {string}
 */
const LanguageFilter = {
  /** All languages */
  ALL: 'all',
  /** Pine Script v5 */
  PINE_V5: 'pine_v5',
  /** Pine Script v4 */
  PINE_V4: 'pine_v4',
  /** Pine Script v3 */
  PINE_V3: 'pine_v3',
  /** Pine Script v2 */
  PINE_V2: 'pine_v2',
  /** Pine Script v1 */
  PINE_V1: 'pine_v1',
};

/**
 * Normalize content type based on API response
 * @private
 * @param {Object} item - API response item
 * @returns {{is_idea: boolean, content_type: string}} Content type classification
 */
function normalizeContentType(item) {
  // Ideas have is_script=false and script_type=null/undefined
  const isScript = item.is_script === true;
  const scriptType = item.script_type;

  if (!isScript) {
    // This is an idea/chart post, not a script
    if (item.is_video) {
      return { is_idea: true, content_type: 'video' };
    }
    if (item.is_education) {
      return { is_idea: true, content_type: 'education' };
    }
    return { is_idea: true, content_type: 'idea' };
  }

  // This is a script - determine the type
  const type = (scriptType || 'unknown').toLowerCase();
  return { is_idea: false, content_type: type };
}

/**
 * Normalize access level from API value
 * @private
 * @param {number|null} access - API access level value
 * @returns {string} Human-readable access level
 */
function normalizeAccessLevel(access) {
  switch (access) {
    case 1:
      return 'open_source';
    case 2:
      return 'closed_source';
    case 3:
      return 'invite_only';
    default:
      return 'unknown';
  }
}

/**
 * Map API script/idea item to clean object
 * @private
 * @param {Object} item - Raw API item
 * @returns {Object} Clean mapped item
 */
function mapScriptItem(item) {
  const { is_idea, content_type } = normalizeContentType(item);

  // Extract author info
  const author = item.user
    ? {
        id: item.user.id,
        username: item.user.username,
        name: item.user.username, // API uses username as display name
        is_pro: item.user.is_pro || false,
        pro_plan: item.user.pro_plan || null,
        is_broker: item.user.is_broker || false,
        badges:
          item.user.badges?.map((b) => ({
            name: b.name,
            label: b.verbose_name || b.name,
          })) || [],
        avatar: {
          small: item.user.picture_url || null,
          medium: item.user.mid_picture_url || null,
        },
      }
    : null;

  // Extract symbol info
  const symbol = item.symbol
    ? {
        name: item.symbol.name,
        full_name: item.symbol.full_name,
        short_name: item.symbol.short_name,
        exchange: item.symbol.exchange,
        type: item.symbol.type,
        logo_urls: item.symbol.logo_urls || [],
      }
    : null;

  // Extract image URLs
  const images = item.image
    ? {
        big: item.image.big || null,
        medium: item.image.middle || null,
        medium_webp: item.image.middle_webp || null,
        bg_color: item.image.bg_color || null,
      }
    : null;

  return {
    // Identification
    id: item.id,

    // Content type classification
    type: content_type, // 'indicator' | 'strategy' | 'library' | 'idea' | 'video' | 'education'
    is_idea: is_idea,
    is_script: item.is_script || false,

    // Basic info
    name: item.name,
    description: item.description || null,

    // Script-specific fields
    script_type: item.script_type || null, // 'indicator' | 'strategy' | 'library'
    access_level: normalizeAccessLevel(item.script_access),
    access_code: item.script_access || null, // 1=open, 2=closed, 3=invite

    // Content flags
    is_public: item.is_public || false,
    is_visible: item.is_visible || false,
    is_video: item.is_video || false,
    is_education: item.is_education || false,
    is_picked: item.is_picked || false,
    is_hot: item.is_hot || false,

    // Engagement
    likes: item.likes_count || 0,
    comments: item.comments_count || 0,
    views: item.views_count || 0,
    is_liked: item.is_liked || false,

    // Timestamps
    created_at: item.created_at,
    updated_at: item.updated_at,
    created_timestamp: item.date_timestamp,
    updated_timestamp: item.updated_date_timestamp,

    // Related data
    author,
    symbol,
    images,

    // URLs
    chart_url: item.chart_url || null,
  };
}

/**
 * Build query parameters for scripts API
 * @private
 * @param {Object} options - Filter options
 * @returns {Object} Query parameters
 */
function buildScriptsParams(options = {}) {
  const params = {
    // Support both 'type' (user-friendly) and 'script_type' (API-direct)
    script_type: options.script_type || options.type || ContentTypeFilter.ALL,
    script_access: options.script_access || options.access || AccessLevelFilter.ALL,
    language: options.language || LanguageFilter.ALL,
    sort_by: options.sort || ScriptSort.POPULAR,
    page: options.page || 1,
    per_page: options.page_size || 20,
  };

  // Add optional filters
  if (options.symbol) {
    params.symbol = options.symbol;
  }

  if (options.author) {
    params.user = options.author;
  }

  if (options.category) {
    params.category = options.category;
  }

  if (options.exchange) {
    params.exchange = options.exchange;
  }

  return params;
}

/**
 * Browse TradingView scripts/ideas
 * @param {Object} options - Browse options
 * @param {string} [options.sort='popular'] - Sort order (today_popular, week_popular, month_popular, popular, newest, updated)
 * @param {string} [options.type='all'] - Filter by type (all, indicator, strategy, library)
 * @param {string} [options.access='all'] - Filter by access level (all, open_source, closed_source, invite_only)
 * @param {string} [options.language='all'] - Filter by Pine Script version
 * @param {string} [options.symbol] - Filter by symbol (e.g., 'BTCUSDT')
 * @param {string} [options.author] - Filter by author username
 * @param {string} [options.category] - Filter by category
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.page_size=20] - Items per page
 * @returns {Promise<{results: Array, total: number, page: number, has_more: boolean}>} Scripts list
 * @example
 * // Get most popular indicators
 * const scripts = await TradingView.browseScripts({
 *   sort: 'week_popular',
 *   type: 'indicator'
 * });
 * 
 * // Get open-source strategies for BTC
 * const strategies = await TradingView.browseScripts({
 *   sort: 'popular',
 *   type: 'strategy',
 *   access: 'open_source',
 *   symbol: 'BTCUSDT'
 * });
 */
async function browseScripts(options = {}) {
  const api = http;
  const params = buildScriptsParams(options);

  const response = await api.get(`${BASE_URL}/api/v1/scripts/`, { params });

  const results = response.data?.results || [];
  const mapped = results.map(mapScriptItem);

  return {
    results: mapped,
    total: response.data?.__totalItems || mapped.length,
    page: options.page || 1,
    has_more: results.length >= (options.page_size || 20),
  };
}

/**
 * Search for scripts/indicators
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {number} [options.limit=20] - Maximum results to return
 * @param {string} [options.type] - Filter by type (indicator, strategy, library)
 * @param {string} [options.sort='relevance'] - Sort order
 * @returns {Promise<Array>} Search results
 * @example
 * // Search for RSI indicators
 * const results = await TradingView.searchScripts('RSI');
 * 
 * // Search for strategies only
 * const strategies = await TradingView.searchScripts('MACD', {
 *   type: 'strategy',
 *   limit: 10
 * });
 */
async function searchScripts(query, options = {}) {
  const api = http;
  const params = {
    query: query,
    per_page: options.limit || 20,
    sort_by: options.sort || 'relevance',
  };

  if (options.type) {
    params.script_type = options.type;
  }

  const response = await api.get(`${BASE_URL}/api/v1/scripts/search/`, { params });
  const results = response.data?.results || [];

  return results.map(mapScriptItem);
}

/**
 * Get popular scripts
 * @param {Object} options - Options
 * @param {string} [options.period='week'] - Time period (day, week, month, all)
 * @param {string} [options.type='all'] - Filter by type
 * @param {number} [options.limit=20] - Number of results
 * @returns {Promise<Array>} Popular scripts
 * @example
 * // Get this week's most popular indicators
 * const popular = await TradingView.getPopularScripts({
 *   period: 'week',
 *   type: 'indicator',
 *   limit: 10
 * });
 */
async function getPopularScripts(options = {}) {
  const periodMap = {
    day: 'today_popular',
    week: 'week_popular',
    month: 'month_popular',
    all: 'popular',
  };

  const sort = periodMap[options.period] || 'week_popular';

  return browseScripts({
    sort,
    type: options.type || 'all',
    page_size: options.limit || 20,
  });
}

/**
 * Get popular community ideas
 * @param {Object} options - Options
 * @param {number} [options.limit=20] - Number of ideas to return
 * @param {string} [options.symbol] - Filter by symbol
 * @returns {Promise<Array>} Popular ideas
 * @example
 * // Get latest community ideas
 * const ideas = await TradingView.getPopularIdeas({ limit: 10 });
 * 
 * // Get ideas for specific symbol
 * const btcIdeas = await TradingView.getPopularIdeas({
 *   symbol: 'BTCUSDT',
 *   limit: 5
 * });
 */
async function getPopularIdeas(options = {}) {
  const api = http;
  const params = {
    per_page: options.limit || 20,
  };

  if (options.symbol) {
    params.symbol = options.symbol;
  }

  const response = await api.get(`${BASE_URL}/api/v1/ideas/popular`, { params });
  const results = response.data?.results || [];

  return results.map(mapScriptItem);
}

/**
 * Get author's scripts
 * @param {string} username - Author username
 * @param {Object} options - Options
 * @param {number} [options.limit=20] - Number of scripts
 * @returns {Promise<Array>} Author's scripts
 * @example
 * const authorScripts = await TradingView.getAuthorScripts('LuxAlgo');
 */
async function getAuthorScripts(username, options = {}) {
  return browseScripts({
    author: username,
    page_size: options.limit || 20,
  });
}

/**
 * Create scripts client with namespace methods
 * @private
 * @returns {Object} Scripts client
 */
function createScriptsClient() {
  return {
    // Main browse/search
    browse: browseScripts,
    search: searchScripts,

    // Popular content
    getPopular: getPopularScripts,
    getPopularIdeas,

    // Author scripts
    getByAuthor: getAuthorScripts,

    // Utility methods
    filterByType: async (type, options = {}) => browseScripts({ ...options, type }),
    filterByAccess: async (access, options = {}) => browseScripts({ ...options, access }),
  };
}

module.exports = {
  // Client factory
  createScriptsClient,

  // Individual functions for TradingView namespace
  browseScripts,
  searchScripts,
  getPopularScripts,
  getPopularIdeas,
  getAuthorScripts,

  // Constants
  ScriptSort,
  ContentTypeFilter,
  AccessLevelFilter,
  LanguageFilter,
};
