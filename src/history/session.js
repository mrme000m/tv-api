const { genSessionID } = require('../utils');

/**
 * @typedef {Object} HistoryPeriod
 * @prop {number} time Period timestamp
 * @prop {number} open Period open value
 * @prop {number} close Period close value
 * @prop {number} max Period max value (high)
 * @prop {number} min Period min value (low)
 * @prop {number} volume Period volume value
 */

/**
 * @typedef {Object} StrategyPerformance
 * @prop {number} avgBarsInTrade Average bars in trade
 * @prop {number} avgBarsInWinTrade Average bars in winning trade
 * @prop {number} avgBarsInLossTrade Average bars in losing trade
 * @prop {number|null} avgTrade Average trade gain
 * @prop {number|null} avgTradePercent Average trade performance percent
 * @prop {number|null} avgLosTrade Average losing trade
 * @prop {number|null} avgLosTradePercent Average losing trade percent
 * @prop {number|null} avgWinTrade Average winning trade
 * @prop {number|null} avgWinTradePercent Average winning trade percent
 * @prop {number} commissionPaid Commission paid
 * @prop {number} grossLoss Gross loss
 * @prop {number} grossLossPercent Gross loss percent
 * @prop {number} grossProfit Gross profit
 * @prop {number} grossProfitPercent Gross profit percent
 * @prop {number|null} largestLosTrade Largest losing trade
 * @prop {number|null} largestLosTradePercent Largest losing trade percent
 * @prop {number|null} largestWinTrade Largest winning trade
 * @prop {number|null} largestWinTradePercent Largest winning trade percent
 * @prop {number} marginCalls Margin calls
 * @prop {number} maxContractsHeld Max contracts held
 * @prop {number} netProfit Net profit
 * @prop {number} netProfitPercent Net profit percent
 * @prop {number} numberOfLosingTrades Number of losing trades
 * @prop {number} numberOfWiningTrades Number of winning trades
 * @prop {number|null} percentProfitable Percent profitable
 * @prop {number|null} profitFactor Profit factor
 * @prop {number|null} ratioAvgWinAvgLoss Ratio avg win/avg loss
 * @prop {number} totalOpenTrades Total open trades
 * @prop {number} totalTrades Total trades
 */

/**
 * @typedef {Object} StrategyReport
 * @prop {string} currency Currency code (e.g., 'USD')
 * @prop {Object} settings Strategy settings
 * @prop {Object} settings.dateRange Date range settings
 * @prop {Object} settings.dateRange.backtest Backtest date range
 * @prop {number} settings.dateRange.backtest.from From timestamp (ms)
 * @prop {number} settings.dateRange.backtest.to To timestamp (ms)
 * @prop {Object} settings.dateRange.trade Trade date range
 * @prop {Array} filledOrders Filled orders array
 * @prop {Object} performance Performance metrics
 * @prop {StrategyPerformance} performance.all All trades performance
 * @prop {StrategyPerformance} performance.long Long trades performance
 * @prop {StrategyPerformance} performance.short Short trades performance
 */

/**
 * @typedef {Object} HistoryRequestOptions
 * @prop {string} symbol Market symbol (e.g., 'COINBASE:BTCUSD')
 * @prop {string} timeframe Chart timeframe (e.g., '1', '5', '15', '60', '240', 'D')
 * @prop {number} from Start timestamp (seconds)
 * @prop {number} to End timestamp (seconds)
 * @prop {string} [adjustment='splits'] Adjustment type ('splits', 'dividends', 'none')
 * @prop {string} [currency='USD'] Currency ID
 * @prop {string} [session='regular'] Trading session ('regular', 'extended')
 * @prop {string} [scriptId='StrategyScript@tv-scripting-101!'] Script identifier
 * @prop {string} [scriptText] Encoded script text (if running a strategy)
 */

/**
 * @typedef {'data' | 'error' | 'loaded' | 'complete'} HistoryEvent
 */

/**
 * Deep history/backtesting session for TradingView.
 * Uses the history-data.tradingview.com endpoint for deep backtesting
 * and strategy execution on historical data.
 *
 * @param {import('../client').ClientBridge} client
 */
module.exports = (client) => class HistorySession {
  #historySessionID = genSessionID('hs');

  #requestCounter = 0;

  #pendingRequests = new Map();

  /**
   * Table of periods values indexed by timestamp
   * @type {Object<number, HistoryPeriod>}
   */
  #periods = {};

  /** Cached sorted periods (newest first) */
  #periodsCache = [];

  /** Whether cache must be recomputed */
  #periodsDirty = true;

  /** @type {StrategyReport|null} */
  #strategyReport = null;

  /** Parent client */
  #client = client;

  #callbacks = {
    data: [],
    error: [],
    loaded: [],
    complete: [],
    event: [],
  };

  /**
   * @param {HistoryEvent} ev History event
   * @param {...{}} data Event data
   */
  #handleEvent(ev, ...data) {
    this.#callbacks[ev].forEach((e) => e(...data));
    this.#callbacks.event.forEach((e) => e(ev, ...data));
  }

  #handleError(...msgs) {
    if (this.#callbacks.error.length === 0) console.error(...msgs);
    else this.#handleEvent('error', ...msgs);
  }

  /** @return {HistoryPeriod[]} List of periods (newest first) */
  get periods() {
    if (!this.#periodsDirty) return this.#periodsCache;
    this.#periodsCache = Object.values(this.#periods).sort((a, b) => b.time - a.time);
    this.#periodsDirty = false;
    return this.#periodsCache;
  }

  /** @return {StrategyReport|null} Strategy report if available */
  get strategyReport() {
    return this.#strategyReport;
  }

  constructor() {
    // Register rehydrate hook for automatic session restoration on reconnect
    this.#client.registerRehydrateHook?.(`history:${this.#historySessionID}`, () => {
      // Re-register session handlers
      this.#client.sessions[this.#historySessionID] = this.#client.sessions[this.#historySessionID] || {
        type: 'history',
        onData: () => {},
      };

      // Recreate the history session server-side
      this.#client.send('history_create_session', [this.#historySessionID]);

      // Note: Pending requests are not automatically re-sent after reconnect
      // Users should handle reconnection and re-request data if needed
    });

    // Register session handler for incoming data
    this.#client.sessions[this.#historySessionID] = {
      type: 'history',
      onData: (packet) => {
        this.#client.logDebug?.('§90§30§108 HISTORY SESSION §0 DATA', packet);

        // Handle request_data responses (strategy reports)
        if (packet.type === 'request_data') {
          const [, requestId, data] = packet.data;

          // Resolve pending request if exists
          const pending = this.#pendingRequests.get(requestId);
          if (pending) {
            clearTimeout(pending.timer);
            this.#pendingRequests.delete(requestId);
          }

          // Parse series data (price periods)
          if (data?.series?.data) {
            this.#parseSeriesData(data.series.data);
          }

              // Parse strategy report from ns.d
          if (data?.ns?.d) {
            try {
              const parsed = JSON.parse(data.ns.d);
              if (parsed.data?.report) {
                this.#strategyReport = parsed.data.report;
                this.#handleEvent('data', {
                  type: 'report',
                  report: this.#strategyReport,
                });
              }
            } catch (e) {
              this.#handleError('Failed to parse strategy report:', e?.message || e);
            }
          }

          this.#handleEvent('loaded', { requestId, data });

          // If this was the last pending request, emit complete
          if (this.#pendingRequests.size === 0) {
            this.#handleEvent('complete');
          }

          return;
        }

        // Handle errors
        if (packet.type === 'symbol_error') {
          const [, symbol, error] = packet.data;
          this.#handleError(`Symbol error for ${symbol}:`, error);
          return;
        }

        if (packet.type === 'critical_error') {
          const [, name, description] = packet.data;
          this.#handleError('Critical error:', name, description);
          return;
        }

        if (packet.type === 'protocol_error') {
          const [, message] = packet.data;
          this.#handleError('Protocol error:', message);
          return;
        }
      },
    };

    // Create the history session
    this.#client.send('history_create_session', [this.#historySessionID]);
  }

  /**
   * Parse series data into periods
   * @param {Array} data Series data array
   */
  #parseSeriesData(data) {
    if (!Array.isArray(data)) return;

    data.forEach((item) => {
      if (!item.v || item.v.length < 6) return;

      const [time, open, high, low, close, volume] = item.v;
      this.#periods[time] = {
        time,
        open,
        max: high,
        min: low,
        close,
        volume: Math.round((volume || 0) * 100) / 100,
      };
    });

    this.#periodsDirty = true;
  }

  /**
   * Request historical data with optional strategy execution.
   * This is the core method for deep backtesting.
   *
   * @param {HistoryRequestOptions} options Request options
   * @param {number} [timeoutMs=30000] Timeout in milliseconds
   * @returns {Promise<{periods: HistoryPeriod[], report: StrategyReport|null}>}
   */
  async requestHistoryData(options, timeoutMs = 30000) {
    const {
      symbol,
      timeframe = '1',
      from,
      to,
      adjustment = 'splits',
      currency = 'USD',
      session = 'regular',
      scriptId = 'StrategyScript@tv-scripting-101!',
      scriptText,
    } = options;

    if (!symbol) {
      throw new Error('Symbol is required');
    }
    if (!from || !to) {
      throw new Error('Both from and to timestamps are required');
    }

    this.#requestCounter += 1;
    const requestId = this.#requestCounter;

    // Build symbol configuration
    const symbolConfig = JSON.stringify({
      adjustment,
      'currency-id': currency,
      session,
      symbol: symbol.toUpperCase(),
    });

    // Build parameters array
    const params = [
      this.#historySessionID,
      requestId,
      `=${symbolConfig}`,
      timeframe,
      0, // flags
      { from_to: { from, to } },
      scriptId,
    ];

    // Add script text if provided (for strategy execution)
    if (scriptText) {
      params.push({ text: scriptText });
    }

    return new Promise((resolve, reject) => {
      // Set timeout
      const timer = setTimeout(() => {
        this.#pendingRequests.delete(requestId);
        reject(new Error(`Request ${requestId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Store pending request
      this.#pendingRequests.set(requestId, {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
        timer,
        startTime: Date.now(),
      });

      // Override the resolve to include current periods and report
      const originalResolve = this.#pendingRequests.get(requestId).resolve;
      this.#pendingRequests.get(requestId).resolve = () => {
        originalResolve({
          periods: this.periods,
          report: this.#strategyReport,
        });
      };

      // Send the request
      this.#client.send('request_history_data', params);
    });
  }

  /**
   * Request historical data for a simple price series (no strategy).
   * Convenience method for fetching raw OHLCV data.
   *
   * @param {string} symbol Market symbol (e.g., 'COINBASE:BTCUSD')
   * @param {string} timeframe Timeframe ('1', '5', '15', '60', '240', 'D')
   * @param {number} from Start timestamp (seconds)
   * @param {number} to End timestamp (seconds)
   * @param {number} [timeoutMs=30000] Timeout
   * @returns {Promise<HistoryPeriod[]>}
   */
  async getHistoricalData(symbol, timeframe, from, to, timeoutMs = 30000) {
    await this.requestHistoryData({
      symbol,
      timeframe,
      from,
      to,
    }, timeoutMs);

    return this.periods;
  }

  /**
   * Run a strategy backtest on historical data.
   * Requires a Pine Script strategy (not indicator).
   *
   * @param {Object} options Backtest options
   * @param {string} options.symbol Market symbol
   * @param {string} options.timeframe Timeframe
   * @param {number} options.from Start timestamp
   * @param {number} options.to End timestamp
   * @param {string} options.scriptText Encoded strategy script text
   * @param {string} [options.scriptId] Custom script identifier
   * @param {number} [timeoutMs=60000] Timeout (longer for strategy execution)
   * @returns {Promise<{periods: HistoryPeriod[], report: StrategyReport}>}
   */
  async backtestStrategy(options, timeoutMs = 60000) {
    const {
      symbol,
      timeframe,
      from,
      to,
      scriptText,
      scriptId,
    } = options;

    if (!scriptText) {
      throw new Error('Strategy script text is required for backtesting');
    }

    const result = await this.requestHistoryData({
      symbol,
      timeframe,
      from,
      to,
      scriptId: scriptId || 'StrategyScript@tv-scripting-101!',
      scriptText,
    }, timeoutMs);

    return result;
  }

  /**
   * Clear all stored periods and report
   */
  clearData() {
    this.#periods = {};
    this.#periodsDirty = true;
    this.#periodsCache = [];
    this.#strategyReport = null;
  }

  /**
   * When historical data is loaded
   * @param {(data: {requestId: number, data: any}) => void} cb Callback
   * @event
   */
  onLoaded(cb) {
    this.#callbacks.loaded.push(cb);
  }

  /**
   * When data is received (periods or report)
   * @param {(data: {type: 'periods'|'report', report?: StrategyReport}) => void} cb Callback
   * @event
   */
  onData(cb) {
    this.#callbacks.data.push(cb);
  }

  /**
   * When all pending requests are complete
   * @param {() => void} cb Callback
   * @event
   */
  onComplete(cb) {
    this.#callbacks.complete.push(cb);
  }

  /**
   * When a history session error happens
   * @param {(...any) => void} cb Callback
   * @event
   */
  onError(cb) {
    this.#callbacks.error.push(cb);
  }

  /**
   * When any history event happens
   * @param {(event: HistoryEvent, ...data: any[]) => void} cb Callback
   * @event
   */
  onEvent(cb) {
    this.#callbacks.event.push(cb);
  }

  /** Delete the history session */
  delete() {
    // Clear all pending requests
    for (const [, pending] of this.#pendingRequests) {
      clearTimeout(pending.timer);
      try {
        pending.reject(new Error('History session deleted'));
      } catch (e) { /* ignore */ }
    }
    this.#pendingRequests.clear();

    // Unregister rehydrate hook
    try {
      this.#client.unregisterRehydrateHook?.(`history:${this.#historySessionID}`);
    } catch { /* ignore */ }

    // Delete session server-side
    this.#client.send('history_delete_session', [this.#historySessionID]);

    // Remove from client sessions
    delete this.#client.sessions[this.#historySessionID];
  }

  /** Get the history session ID */
  get sessionId() {
    return this.#historySessionID;
  }
};
