const http = require('../http');

const EVENTS_BASE = 'https://economic-calendar.tradingview.com';
const PUBLIC_EVENTS_BASE = 'https://www.tradingview.com';

/**
 * Handle API error responses
 * @param {Object} data - Response data
 * @param {string} context - Context for error message
 */
function handleApiError(data, context) {
  if (data && (data.detail || data.error || data.code || data.status === 'error')) {
    const message = data.detail || data.error || data.message || JSON.stringify(data);
    throw new Error(`${context}: ${message}`);
  }
}

/**
 * @typedef {Object} EconomicEvent
 * @prop {string} id Event ID
 * @prop {string} title Event title/name
 * @prop {string} country Country code (e.g., 'US', 'EU', 'JP')
 * @prop {string} indicator Indicator name
 * @prop {string} ticker Associated ticker symbol (e.g., 'ECONOMICS:USRSMM')
 * @prop {string} [comment] Description of the indicator
 * @prop {string} category Category code (e.g., 'cnsm' for consumer, 'lbr' for labor)
 * @prop {string} period Reporting period (e.g., 'Dec', 'Q4')
 * @prop {string} referenceDate Reference date for the data
 * @prop {string} source Data source name
 * @prop {string} [source_url] URL to the source website
 * @prop {number} [actual] Actual value
 * @prop {number} [previous] Previous period value
 * @prop {number} [forecast] Forecasted value
 * @prop {number} [actualRaw] Raw actual value
 * @prop {number} [previousRaw] Raw previous value
 * @prop {number} [forecastRaw] Raw forecast value
 * @prop {string} currency Currency code (e.g., 'USD')
 * @prop {string} unit Unit of measurement (e.g., '%', 'M', 'K')
 * @prop {number} importance Importance level (1-3, where 3 is highest)
 * @prop {string} date Event date/time in ISO format
 */

/**
 * @typedef {Object} EventsFilter
 * @prop {string[]} [countries] Country codes to filter (e.g., ['US', 'EU', 'DE'])
 * @prop {number} [importance] Minimum importance level (1-3)
 * @prop {string[]} [categories] Category codes to filter
 * @prop {Date|string} [from] Start date
 * @prop {Date|string} [to] End date
 */

/**
 * @typedef {Object} EconomicEventsResponse
 * @prop {EconomicEvent[]} events List of economic events
 * @prop {boolean} hasMore Whether more events are available
 * @prop {number} [total] Total number of events
 */

/**
 * Country codes supported by the economic calendar
 * @constant {string[]}
 */
const COUNTRY_CODES = [
  'US', 'EU', 'DE', 'FR', 'IT', 'ES', 'GB', 'JP', 'CN', 'CA',
  'AU', 'NZ', 'CH', 'SE', 'NO', 'DK', 'AT', 'BE', 'FI', 'GR',
  'IE', 'NL', 'PT', 'TR', 'ZA', 'BR', 'MX', 'AR', 'CL', 'CO',
  'PE', 'IN', 'RU', 'KR', 'ID', 'MY', 'PH', 'SG', 'TH', 'TW',
  'VN', 'SA', 'AE', 'IL', 'EG', 'NG', 'KE', 'PK', 'BD', 'PL',
  'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE',
  'UA', 'BY', 'RS', 'MD', 'AL', 'BA', 'MK', 'ME', 'XK', 'GE',
  'AM', 'AZ', 'KZ', 'UZ', 'TJ', 'TM', 'KG', 'MN', 'MO', 'HK',
];

/**
 * Category codes for economic events
 * @constant {Object}
 */
const CATEGORIES = {
  ALL: 'all',
  LABOR: 'lbr',           // Labor market (Non-Farm Payrolls, Unemployment)
  CONSUMER: 'cnsm',       // Consumer data (Retail Sales)
  INFLATION: 'inf',       // Inflation (CPI, PPI)
  GDP: 'gdp',             // Gross Domestic Product
  BUSINESS: 'buss',       // Business activity (PMI)
  HOUSING: 'hous',        // Housing market
  TRADE: 'trad',          // Trade balance
  CENTRAL_BANK: 'cbnk',   // Central bank events (FOMC, ECB)
  CONFIDENCE: 'conf',     // Confidence indices
  DEBT: 'debt',           // Government debt
  INDUSTRY: 'inds',       // Industrial production
};

/**
 * Format date for API requests (YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Get economic calendar events
 * @param {EventsFilter} [filter] - Filter options
 * @param {Object} [options] - Additional options
 * @param {number} [options.limit=100] - Maximum number of events
 * @param {number} [options.offset=0] - Offset for pagination
 * @param {string} [options.lang='en'] - Language code
 * @returns {Promise<EconomicEventsResponse>}
 */
async function getEconomicEvents(filter = {}, options = {}) {
  const {
    limit = 100,
    offset = 0,
    lang = 'en',
  } = options;

  const params = {
    limit,
    offset,
    lang,
  };

  // Add filter parameters
  if (filter.countries && filter.countries.length > 0) {
    params.countries = filter.countries.join(',');
  }

  if (filter.importance) {
    params.importance = filter.importance;
  }

  if (filter.categories && filter.categories.length > 0) {
    params.categories = filter.categories.join(',');
  }

  if (filter.from) {
    params.from = formatDate(filter.from);
  }

  if (filter.to) {
    params.to = formatDate(filter.to);
  }

  const { data } = await http.get(`${PUBLIC_EVENTS_BASE}/events`, {
    params,
    headers: {
      accept: 'application/json',
      origin: 'https://www.tradingview.com',
      referer: 'https://www.tradingview.com/economic-calendar/',
    },
  });

  handleApiError(data, 'Failed to get economic events');

  return {
    events: data.result || [],
    hasMore: data.result && data.result.length === limit,
  };
}

/**
 * Get events for today
 * @param {Object} [options] - Options
 * @param {string[]} [options.countries] - Filter by countries
 * @param {number} [options.importance] - Minimum importance level
 * @param {number} [options.limit=50] - Maximum events
 * @returns {Promise<EconomicEventsResponse>}
 */
async function getTodaysEvents(options = {}) {
  const today = new Date();
  const { countries, importance, limit = 50 } = options;

  return getEconomicEvents(
    {
      from: today,
      to: today,
      countries,
      importance,
    },
    { limit }
  );
}

/**
 * Get events for this week
 * @param {Object} [options] - Options
 * @param {string[]} [options.countries] - Filter by countries
 * @param {number} [options.importance] - Minimum importance level
 * @param {number} [options.limit=100] - Maximum events
 * @returns {Promise<EconomicEventsResponse>}
 */
async function getWeekEvents(options = {}) {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { countries, importance, limit = 100 } = options;

  return getEconomicEvents(
    {
      from: today,
      to: nextWeek,
      countries,
      importance,
    },
    { limit }
  );
}

/**
 * Get events for a specific country
 * @param {string} countryCode - Country code (e.g., 'US', 'EU', 'DE')
 * @param {Object} [options] - Options
 * @param {number} [options.limit=50] - Maximum events
 * @returns {Promise<EconomicEventsResponse>}
 */
async function getCountryEvents(countryCode, options = {}) {
  const { limit = 50 } = options;

  return getEconomicEvents(
    { countries: [countryCode] },
    { limit }
  );
}

/**
 * Get high-importance events only
 * @param {Object} [options] - Options
 * @param {number} [options.limit=50] - Maximum events
 * @returns {Promise<EconomicEventsResponse>}
 */
async function getHighImpactEvents(options = {}) {
  const { limit = 50 } = options;

  return getEconomicEvents(
    { importance: 3 },
    { limit }
  );
}

/**
 * Get central bank events (FOMC, ECB, etc.)
 * @param {Object} [options] - Options
 * @param {number} [options.limit=50] - Maximum events
 * @returns {Promise<EconomicEventsResponse>}
 */
async function getCentralBankEvents(options = {}) {
  const { limit = 50 } = options;

  return getEconomicEvents(
    { categories: [CATEGORIES.CENTRAL_BANK] },
    { limit }
  );
}

/**
 * Get events by category
 * @param {string} category - Category code
 * @param {Object} [options] - Options
 * @param {number} [options.limit=50] - Maximum events
 * @returns {Promise<EconomicEventsResponse>}
 */
async function getEventsByCategory(category, options = {}) {
  const { limit = 50 } = options;

  return getEconomicEvents(
    { categories: [category] },
    { limit }
  );
}

/**
 * Get upcoming significant events (high importance in next 7 days)
 * @param {Object} [options] - Options
 * @param {number} [options.limit=20] - Maximum events
 * @returns {Promise<EconomicEventsResponse>}
 */
async function getUpcomingSignificantEvents(options = {}) {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { limit = 20 } = options;

  return getEconomicEvents(
    {
      from: today,
      to: nextWeek,
      importance: 3,
    },
    { limit }
  );
}

/**
 * High-level wrapper for calendar operations
 * @returns {Object} Calendar client
 */
function createCalendarClient() {
  return {
    getEvents: getEconomicEvents,
    getTodaysEvents,
    getWeekEvents,
    getCountryEvents,
    getHighImpactEvents,
    getCentralBankEvents,
    getEventsByCategory,
    getUpcomingSignificantEvents,
    CATEGORIES,
    COUNTRY_CODES,
  };
}

module.exports = {
  getEconomicEvents,
  getTodaysEvents,
  getWeekEvents,
  getCountryEvents,
  getHighImpactEvents,
  getCentralBankEvents,
  getEventsByCategory,
  getUpcomingSignificantEvents,
  createCalendarClient,
  CATEGORIES,
  COUNTRY_CODES,
};
