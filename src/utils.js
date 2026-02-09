module.exports = {
  /**
   * Generates a session id
   * @function genSessionID
   * @param {String} type Session type
   * @returns {string}
   */
  genSessionID(type = 'xs') {
    let r = '';
    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 12; i += 1) r += c.charAt(Math.floor(Math.random() * c.length));
    return `${type}_${r}`;
  },

  genAuthCookies(sessionId = '', signature = '') {
    if (!sessionId) return '';
    if (!signature) return `sessionid=${sessionId}`;
    return `sessionid=${sessionId};sessionid_sign=${signature}`;
  },

  /**
   * Convert timeframe string to TradingView format
   * @function normalizeTimeframe
   * @param {string} tf Timeframe (e.g., '5m', '1h', '1D')
   * @returns {string} Normalized timeframe (e.g., '5', '60', 'D')
   */
  normalizeTimeframe(tf) {
    if (!tf) return 'D';
    
    const lower = String(tf).toLowerCase().trim();
    
    // Already in correct format
    if (/^[1-9]\d*$/.test(lower)) return lower;
    if (/^[dwm]$/i.test(lower)) return lower.toUpperCase();
    
    // Parse with suffix
    const match = lower.match(/^(\d+)\s*([mhdwM]?)$/);
    if (!match) return 'D';
    
    const [, num, suffix] = match;
    const n = parseInt(num, 10);
    
    switch (suffix) {
      case 'm': return String(n);
      case 'h': return String(n * 60);
      case 'd': return 'D';
      case 'w': return 'W';
      case 'M': return 'M';
      default: return String(n);
    }
  },

  /**
   * Convert timestamp to seconds (TradingView format)
   * @function toTVTimestamp
   * @param {Date|string|number} date Date to convert
   * @returns {number} Unix timestamp in seconds
   */
  toTVTimestamp(date) {
    if (date instanceof Date) return Math.floor(date.getTime() / 1000);
    if (typeof date === 'string') return Math.floor(new Date(date).getTime() / 1000);
    if (typeof date === 'number') return Math.floor(date / 1000);
    return Math.floor(Date.now() / 1000);
  },

  /**
   * Calculate date range for backtesting
   * @function getBacktestRange
   * @param {Object} options Range options
   * @param {number} [options.days=30] Number of days back
   * @param {Date|string|number} [options.from] Start date (overrides days)
   * @param {Date|string|number} [options.to] End date (defaults to now)
   * @returns {{from: number, to: number}} Timestamp range in seconds
   */
  getBacktestRange(options = {}) {
    const { days = 30, from: fromDate, to: toDate } = options;
    
    let to;
    if (toDate) {
      to = this.toTVTimestamp(toDate);
    } else {
      to = Math.floor(Date.now() / 1000);
    }
    
    let from;
    if (fromDate) {
      from = this.toTVTimestamp(fromDate);
    } else {
      from = to - (days * 24 * 60 * 60);
    }
    
    return { from, to };
  },

  /**
   * Encode script text for strategy backtesting
   * @function encodeScriptText
   * @param {string} source Pine Script source code
   * @returns {string} Encoded script text
   */
  encodeScriptText(source) {
    // The actual encoding used by TradingView appears to be a combination
    // of base64 and some custom obfuscation. For now, we return as-is
    // and rely on the server to handle encoding, or implement basic base64
    // if required by the specific endpoint.
    
    // Basic base64 encoding as fallback
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(source).toString('base64');
    }
    
    // Browser fallback
    if (typeof btoa === 'function') {
      return btoa(source);
    }
    
    return source;
  },

  /**
   * Sleep/delay helper
   * @function sleep
   * @param {number} ms Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Retry a function with exponential backoff
   * @function retry
   * @param {Function} fn Function to retry
   * @param {Object} options Retry options
   * @param {number} [options.maxRetries=3] Maximum retry attempts
   * @param {number} [options.baseDelay=1000] Base delay in ms
   * @param {Function} [options.onRetry] Callback on retry (error, attempt)
   * @returns {Promise<any>} Function result
   */
  async retry(fn, options = {}) {
    const { maxRetries = 3, baseDelay = 1000, onRetry } = options;
    
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) break;
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        if (onRetry) {
          try { onRetry(error, attempt); } catch (e) { /* ignore */ }
        }
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  },

  /**
   * Validate a TradingView symbol format
   * @function isValidSymbol
   * @param {string} symbol Symbol to validate
   * @returns {boolean} True if valid format
   */
  isValidSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') return false;
    // Basic validation: must have at least one character
    // and optionally contain a colon for exchange prefix
    return /^[A-Z0-9]+(:[A-Z0-9]+)?$/i.test(symbol.trim());
  },

  /**
   * Parse a symbol into exchange and ticker components
   * @function parseSymbol
   * @param {string} symbol Symbol (e.g., 'COINBASE:BTCUSD')
   * @returns {{exchange: string|null, ticker: string}} Parsed symbol
   */
  parseSymbol(symbol) {
    if (!symbol) return { exchange: null, ticker: '' };
    
    const parts = symbol.trim().split(':');
    if (parts.length === 2) {
      return { exchange: parts[0], ticker: parts[1] };
    }
    
    return { exchange: null, ticker: parts[0] };
  },

  /**
   * Format price with appropriate decimal places
   * @function formatPrice
   * @param {number} price Price to format
   * @param {number} [decimals=2] Number of decimal places
   * @returns {string} Formatted price
   */
  formatPrice(price, decimals = 2) {
    if (typeof price !== 'number' || Number.isNaN(price)) return '0';
    return price.toFixed(decimals);
  },

  /**
   * Calculate percentage change
   * @function percentChange
   * @param {number} current Current value
   * @param {number} previous Previous value
   * @returns {number} Percentage change
   */
  percentChange(current, previous) {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  },

  /**
   * Deep clone an object
   * @function deepClone
   * @param {any} obj Object to clone
   * @returns {any} Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(this.deepClone.bind(this));
    
    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  },

  /**
   * Throttle a function
   * @function throttle
   * @param {Function} fn Function to throttle
   * @param {number} limit Time limit in ms
   * @returns {Function} Throttled function
   */
  throttle(fn, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => { inThrottle = false; }, limit);
      }
    };
  },

  /**
   * Debounce a function
   * @function debounce
   * @param {Function} fn Function to debounce
   * @param {number} wait Wait time in ms
   * @returns {Function} Debounced function
   */
  debounce(fn, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  },
};
