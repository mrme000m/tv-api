const WebSocket = require('ws');

const misc = require('./miscRequests');
const protocol = require('./protocol');

const quoteSessionGenerator = require('./quote/session');
const chartSessionGenerator = require('./chart/session');

// Reconnection configuration defaults (override via ClientOptions.reconnect*)
const DEFAULT_RECONNECTION_CONFIG = {
  maxRetries: 10,
  baseDelay: 500, // 0.5 second (helps mitigate transient hiccups where 2nd attempt succeeds)
  fastFirstDelay: 250, // first retry delay
  maxDelay: 30000, // 30 seconds
  jitter: true,
  multiplier: 2,
};

/**
 * @typedef {Object} Session
 * @prop {'quote' | 'chart' | 'replay'} type Session type
 * @prop {(data: {}) => null} onData When there is a data
 */

/** @typedef {Object<string, Session>} SessionList Session list */

/**
 * @callback SendPacket Send a custom packet
 * @param {string} t Packet type
 * @param {string[]} p Packet data
 * @returns {void}
*/

/**
 * @typedef {Object} ClientBridge
 * @prop {SessionList} sessions
 * @prop {SendPacket} send
 * @prop {(key: string, fn: () => void|Promise<void>) => void} registerRehydrateHook
 * @prop {(key: string) => void} unregisterRehydrateHook
 */

/**
 * @typedef { 'connected' | 'disconnected'
 *  | 'reconnecting' | 'reconnected' | 'connect_timeout'
 *  | 'logged' | 'ping' | 'data'
 *  | 'error' | 'event'
 * } ClientEvent
 */

/** @class */
module.exports = class Client {
  #ws;

  #logged = false;

  #strictProtocol = false;
  
  // Connection management properties
  #reconnectionAttempts = 0;
  #isReconnecting = false;
  #connectionClosedManually = false;
  #reconnectionTimeoutId = null;

  #reconnectionConfig = { ...DEFAULT_RECONNECTION_CONFIG };
  #heartbeatIntervalId = null;
  #connectTimeoutId = null;
  #lastHeartbeatReceived = Date.now();

  #connectTimeoutMs = 15000;

  #authRetryDelayMs = 500;
  #authMaxAttempts = 2;

  #authTokenPromise = null;

  #autoRehydrate = true;

  /** If the client is logged in */
  get isLogged() {
    return this.#logged;
  }

  /** If the client is connected */
  get isOpen() {
    return this.#ws && this.#ws.readyState === this.#ws.OPEN;
  }

  /** @type {SessionList} */
  #sessions = {};

  #callbacks = {
    connected: [],
    disconnected: [],
    reconnecting: [],
    reconnected: [],
    connect_timeout: [],

    logged: [],
    ping: [],
    data: [],

    error: [],
    event: [],
  };

  /** @type {Map<string, () => void|Promise<void>>} */
  #rehydrateHooks = new Map();

  /**
   * @param {ClientEvent} ev Client event
   * @param {...{}} data Packet data
   */
  #handleEvent(ev, ...data) {
    this.#callbacks[ev].forEach((e) => e(...data));
    this.#callbacks.event.forEach((e) => e(ev, ...data));
  }

  #handleError(...msgs) {
    if (this.#callbacks.error.length === 0) console.error(...msgs);
    else this.#handleEvent('error', ...msgs);
  }

  /**
   * Register a callback to re-send session/subscription setup on reconnect.
   * @param {string} key Unique key for the hook
   * @param {() => (void|Promise<void>)} fn Hook function
   */
  registerRehydrateHook(key, fn) {
    if (!key || typeof fn !== 'function') return;
    this.#rehydrateHooks.set(key, fn);
  }

  /**
   * Remove a previously registered rehydrate hook.
   * @param {string} key
   */
  unregisterRehydrateHook(key) {
    this.#rehydrateHooks.delete(key);
  }

  async #runRehydrateHooks() {
    // Run sequentially to preserve ordering and avoid flooding.
    for (const [key, fn] of this.#rehydrateHooks.entries()) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await fn();
      } catch (e) {
        this.#handleError(`Rehydrate hook failed (${key}):`, e?.message || e);
      }
    }
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  #calculateReconnectionDelay(attempt) {
    // If the first attempt fails, a quick retry often succeeds (transient network hiccup).
    if (attempt === 0 && Number.isFinite(this.#reconnectionConfig.fastFirstDelay)) {
      return this.#reconnectionConfig.fastFirstDelay;
    }

    let delay = this.#reconnectionConfig.baseDelay * Math.pow(this.#reconnectionConfig.multiplier, attempt);

    // Apply maximum delay cap
    delay = Math.min(delay, this.#reconnectionConfig.maxDelay);

    // Add jitter to prevent thundering herd
    if (this.#reconnectionConfig.jitter) {
      const jitter = Math.random() * 0.3; // 30% jitter
      delay = delay * (1 + jitter);
    }
    
    return Math.round(delay);
  }

  /**
   * Handle reconnection attempts
   */
  #scheduleReconnection() {
    if (this.#connectionClosedManually || this.#reconnectionAttempts >= this.#reconnectionConfig.maxRetries) {
      return;
    }

    // Emit only on transition into reconnecting.
    if (!this.#isReconnecting) {
      this.#isReconnecting = true;
      this.#handleEvent('reconnecting', {
        attempt: this.#reconnectionAttempts,
        maxRetries: this.#reconnectionConfig.maxRetries,
      });
    }

    this.#reconnectionAttempts++;

    const delay = this.#calculateReconnectionDelay(this.#reconnectionAttempts - 1);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.#reconnectionAttempts}/${this.#reconnectionConfig.maxRetries})`);

    this.#reconnectionTimeoutId = setTimeout(() => {
      this.#attemptReconnection();
    }, delay);
  }

  /**
   * Attempt to reconnect the WebSocket
   */
  async #attemptReconnection() {
    try {
      // Clear the old WebSocket if it still exists
      if (this.#ws) {
        this.#ws.removeAllListeners();
      }

      // Reinitialize the WebSocket connection
      const server = this.clientOptions?.server || 'data';

      // Refresh auth token fetch attempt for this connection cycle.
      this.#prepareAuthTokenFetch();

      this.#ws = new WebSocket(`wss://${server}.tradingview.com/socket.io/websocket?type=chart`, {
        origin: 'https://www.tradingview.com',
      });

      // Setup event listeners for the new connection
      this.#setupWebSocketEventHandlers();

      // Auth is handled by the shared 'open' handler (#setupWebSocketEventHandlers)
      // so reconnection behavior stays consistent with initial connect.
    } catch (error) {
      console.error('Reconnection attempt failed:', error);
      this.#scheduleReconnection(); // Try again
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  #prepareAuthTokenFetch() {
    if (this.clientOptions?.token) {
      this.#authTokenPromise = this.#fetchAuthToken();
    } else {
      this.#authTokenPromise = Promise.resolve(null);
    }
  }

  async #fetchAuthToken() {
    const { token, signature, location } = this.clientOptions || {};
    if (!token) return null;

    let lastErr;
    for (let attempt = 1; attempt <= this.#authMaxAttempts; attempt += 1) {
      try {
        const user = await misc.getUser(
          token,
          signature ? signature : '',
          location ? location : 'https://tradingview.com',
        );
        return user?.authToken || null;
      } catch (e) {
        lastErr = e;
        if (attempt < this.#authMaxAttempts) {
          await new Promise((r) => setTimeout(r, this.#authRetryDelayMs));
        }
      }
    }

    this.#handleError('Credentials error:', lastErr?.message || lastErr);
    return null;
  }

  #startConnectTimeout() {
    this.#stopConnectTimeout();

    // If the socket never reaches 'open', force a reconnect. This addresses the common
    // "first attempt stuck / second attempt works" symptom.
    this.#connectTimeoutId = setTimeout(() => {
      if (!this.#ws) return;
      if (this.#ws.readyState === WebSocket.CONNECTING) {
        const info = { timeoutMs: this.#connectTimeoutMs };
        this.#handleEvent('connect_timeout', info);
        this.#handleError(`WebSocket connect timeout after ${this.#connectTimeoutMs}ms; retrying...`);
        try { this.#ws.terminate?.(); } catch { /* ignore */ }
        try { this.#ws.close(); } catch { /* ignore */ }
        this.#scheduleReconnection();
      }
    }, this.#connectTimeoutMs).unref?.();
  }

  #stopConnectTimeout() {
    if (this.#connectTimeoutId) {
      clearTimeout(this.#connectTimeoutId);
      this.#connectTimeoutId = null;
    }
  }

  #setupWebSocketEventHandlers() {
    this.#startConnectTimeout();

    this.#ws.on('open', async () => {
      this.#stopConnectTimeout();
      const wasReconnecting = this.#isReconnecting;
      this.#reconnectionAttempts = 0; // Reset on successful connection
      this.#isReconnecting = false;

      // (Re-)authenticate on open.
      if (this.clientOptions?.token) {
        // Use the early-started promise when possible.
        if (!this.#authTokenPromise) this.#prepareAuthTokenFetch();

        const authToken = await this.#authTokenPromise;
        if (authToken) {
          this.#sendQueue.unshift(protocol.formatWSPacket({
            m: 'set_auth_token',
            p: [authToken],
          }));
        } else {
          // Fallback: proceed unauthenticated if token retrieval failed.
          this.#sendQueue.unshift(protocol.formatWSPacket({
            m: 'set_auth_token',
            p: ['unauthorized_user_token'],
          }));
        }
      }

      this.#logged = true;

      if (wasReconnecting) {
        // Re-create sessions/subscriptions after reconnect.
        if (this.#autoRehydrate) {
          await this.#runRehydrateHooks();
        }
        this.#handleEvent('reconnected');
      }

      this.#handleEvent('connected');
      this.sendQueue();

      // Start heartbeat mechanism
      this.#startHeartbeat();
    });

    this.#ws.on('close', (code, reason) => {
      this.#stopConnectTimeout();
      this.#stopHeartbeat();

      if (this.#connectionClosedManually) {
        this.#logged = false;
        this.#handleEvent('disconnected');
        return;
      }

      // If we closed before becoming OPEN, this is usually a transient hiccup.
      // Force a fast first retry.
      if (this.#ws && this.#ws.readyState !== WebSocket.OPEN) {
        this.#reconnectionAttempts = Math.max(this.#reconnectionAttempts, 0);
      }

      console.log(`Connection closed (code: ${code}, reason: ${reason || 'unknown'}). Attempting to reconnect...`);
      this.#scheduleReconnection();
    });

    this.#ws.on('error', (err) => {
      // Do not rely solely on 'close' being emitted quickly.
      this.#handleError('WebSocket error:', err.message);
    });

    this.#ws.on('message', (data) => {
      // Normalize incoming payload to string (ws may provide Buffer)
      const payload = (typeof data === 'string') ? data : (data && typeof data.toString === 'function' ? data.toString('utf8') : String(data));
      this.#parsePacket(payload);
      // Update last heartbeat received time
      this.#lastHeartbeatReceived = Date.now();
    });
  }

  /**
   * Start heartbeat mechanism to detect connection issues
   */
  #startHeartbeat() {
    // Clear any existing heartbeat
    this.#stopHeartbeat();

    this.#heartbeatIntervalId = setInterval(() => {
      if (!this.isOpen) {
        this.#stopHeartbeat();
        return;
      }

      // Check if we've received a heartbeat recently
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.#lastHeartbeatReceived;

      // If no activity for too long, consider connection dead
      if (timeSinceLastHeartbeat > 35000) { // 35 seconds without response
        console.log('Heartbeat timeout detected, closing connection for reconnection...');
        this.#ws.close(4000, 'Heartbeat timeout');
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop heartbeat mechanism
   */
  #stopHeartbeat() {
    if (this.#heartbeatIntervalId) {
      clearInterval(this.#heartbeatIntervalId);
      this.#heartbeatIntervalId = null;
    }
  }

  /**
   * When client is connected
   * @param {() => void} cb Callback
   * @event onConnected
   */
  onConnected(cb) {
    this.#callbacks.connected.push(cb);
  }

  /**
   * When client is disconnected
   * @param {() => void} cb Callback
   * @event onDisconnected
   */
  onDisconnected(cb) {
    this.#callbacks.disconnected.push(cb);
  }

  /**
   * When client starts reconnecting (first reconnection scheduling)
   * @param {(info: { attempt: number, maxRetries: number }) => void} cb Callback
   * @event onReconnecting
   */
  onReconnecting(cb) {
    this.#callbacks.reconnecting.push(cb);
  }

  /**
   * When client reconnects successfully after a disconnect
   * @param {() => void} cb Callback
   * @event onReconnected
   */
  onReconnected(cb) {
    this.#callbacks.reconnected.push(cb);
  }

  /**
   * When websocket connect timeout happens
   * @param {(info: { timeoutMs: number }) => void} cb Callback
   * @event onConnectTimeout
   */
  onConnectTimeout(cb) {
    this.#callbacks.connect_timeout.push(cb);
  }

  /**
   * @typedef {Object} SocketSession
   * @prop {string} session_id Socket session ID
   * @prop {number} timestamp Session start timestamp
   * @prop {number} timestampMs Session start milliseconds timestamp
   * @prop {string} release Release
   * @prop {string} studies_metadata_hash Studies metadata hash
   * @prop {'json' | string} protocol Used protocol
   * @prop {string} javastudies Javastudies
   * @prop {number} auth_scheme_vsn Auth scheme type
   * @prop {string} via Socket IP
   */

  /**
   * When client is logged
   * @param {(SocketSession: SocketSession) => void} cb Callback
   * @event onLogged
   */
  onLogged(cb) {
    this.#callbacks.logged.push(cb);
  }

  /**
   * When server is pinging the client
   * @param {(i: number) => void} cb Callback
   * @event onPing
   */
  onPing(cb) {
    this.#callbacks.ping.push(cb);
  }

  /**
   * When unparsed data is received
   * @param {(...{}) => void} cb Callback
   * @event onData
   */
  onData(cb) {
    this.#callbacks.data.push(cb);
  }

  /**
   * When a client error happens
   * @param {(...{}) => void} cb Callback
   * @event onError
   */
  onError(cb) {
    this.#callbacks.error.push(cb);
  }

  /**
   * When a client event happens
   * @param {(...{}) => void} cb Callback
   * @event onEvent
   */
  onEvent(cb) {
    this.#callbacks.event.push(cb);
  }

  #parsePacket(str) {
    if (!this.isOpen) return;

    protocol.parseWSPacket(str, {
      strict: this.#strictProtocol,
      onError: (err) => this.#handleError(err),
    }).forEach((packet) => {
      if (global.TW_DEBUG) console.log('§90§30§107 CLIENT §0 PACKET', packet);
      if (typeof packet === 'number') { // Ping
        this.#ws.send(protocol.formatWSPacket(`~h~${packet}`));
        this.#handleEvent('ping', packet);
        return;
      }

      if (packet.m === 'protocol_error') { // Error
        this.#handleError('Client critical error:', packet.p);
        this.#ws.close();
        return;
      }

      if (packet.m && packet.p) { // Normal packet
        const parsed = {
          type: packet.m,
          data: packet.p,
        };

        const session = packet.p[0];

        if (session && this.#sessions[session]) {
          this.#sessions[session].onData(parsed);
          return;
        }
      }

      if (!this.#logged) {
        this.#handleEvent('logged', packet);
        return;
      }

      this.#handleEvent('data', packet);
    });
  }

  #sendQueue = [];

  /** @type {SendPacket} Send a custom packet */
  send(t, p = []) {
    this.#sendQueue.push(protocol.formatWSPacket({ m: t, p }));
    this.sendQueue();
  }

  /** Send all waiting packets */
  sendQueue() {
    while (this.isOpen && this.#logged && this.#sendQueue.length > 0) {
      const packet = this.#sendQueue.shift();
      this.#ws.send(packet);
      if (global.TW_DEBUG) console.log('§90§30§107 > §0', packet);
    }
  }

  /**
   * @typedef {Object} ClientOptions
   * @prop {string} [token] User auth token (in 'sessionid' cookie)
   * @prop {string} [signature] User auth token signature (in 'sessionid_sign' cookie)
   * @prop {boolean} [DEBUG] Enable debug mode
   * @prop {boolean} [strictProtocol] Throw on websocket protocol parse errors (default: false)
   * @prop {boolean} [autoRehydrate] Automatically re-create sessions/subscriptions on reconnect (default: true)
   * @prop {number} [connectTimeoutMs] WebSocket connect timeout before retry (default: 15000)
   * @prop {number} [authRetryDelayMs] Delay between auth fetch retries (default: 500)
   * @prop {number} [authMaxAttempts] Max attempts to fetch auth token (default: 2)
   * @prop {number} [reconnectMaxRetries] Max reconnect retries (default: 10)
   * @prop {number} [reconnectBaseDelayMs] Base reconnect delay in ms (default: 500)
   * @prop {number} [reconnectFastFirstDelayMs] First retry delay in ms (default: 250)
   * @prop {number} [reconnectMaxDelayMs] Max reconnect delay in ms (default: 30000)
   * @prop {number} [reconnectMultiplier] Exponential backoff multiplier (default: 2)
   * @prop {boolean} [reconnectJitter] Add jitter (default: true)
   * @prop {'data' | 'prodata' | 'widgetdata'} [server] Server type
   * @prop {string} [location] Auth page location (For france: https://fr.tradingview.com/)
   */

  /**
   * Client object
   * @param {ClientOptions} clientOptions TradingView client options
   */
  constructor(clientOptions = {}) {
    if (clientOptions.DEBUG) global.TW_DEBUG = clientOptions.DEBUG;

    // Strict mode flags (used for protocol parsing and other runtime hardening)
    this.#strictProtocol = !!clientOptions.strictProtocol;

    // Rehydration behavior
    if (typeof clientOptions.autoRehydrate === 'boolean') {
      this.#autoRehydrate = clientOptions.autoRehydrate;
    }

    // Connection tuning
    if (Number.isFinite(Number(clientOptions.connectTimeoutMs))) {
      this.#connectTimeoutMs = Math.max(1000, Number(clientOptions.connectTimeoutMs));
    }
    if (Number.isFinite(Number(clientOptions.authRetryDelayMs))) {
      this.#authRetryDelayMs = Math.max(0, Number(clientOptions.authRetryDelayMs));
    }
    if (Number.isFinite(Number(clientOptions.authMaxAttempts))) {
      this.#authMaxAttempts = Math.max(1, Math.floor(Number(clientOptions.authMaxAttempts)));
    }

    // Store client options for reconnection purposes
    this.clientOptions = clientOptions;

    // Reconnection/backoff configuration overrides
    const cfg = { ...DEFAULT_RECONNECTION_CONFIG };
    if (Number.isFinite(Number(clientOptions.reconnectMaxRetries))) cfg.maxRetries = Math.max(0, Math.floor(Number(clientOptions.reconnectMaxRetries)));
    if (Number.isFinite(Number(clientOptions.reconnectBaseDelayMs))) cfg.baseDelay = Math.max(0, Math.floor(Number(clientOptions.reconnectBaseDelayMs)));
    if (Number.isFinite(Number(clientOptions.reconnectFastFirstDelayMs))) cfg.fastFirstDelay = Math.max(0, Math.floor(Number(clientOptions.reconnectFastFirstDelayMs)));
    if (Number.isFinite(Number(clientOptions.reconnectMaxDelayMs))) cfg.maxDelay = Math.max(0, Math.floor(Number(clientOptions.reconnectMaxDelayMs)));
    if (Number.isFinite(Number(clientOptions.reconnectMultiplier))) cfg.multiplier = Math.max(1, Number(clientOptions.reconnectMultiplier));
    if (typeof clientOptions.reconnectJitter === 'boolean') cfg.jitter = clientOptions.reconnectJitter;
    this.#reconnectionConfig = cfg;

    // Start fetching auth token early so it's ready when the socket opens.
    this.#prepareAuthTokenFetch();

    const server = clientOptions.server || 'data';
    this.#ws = new WebSocket(`wss://${server}.tradingview.com/socket.io/websocket?type=chart`, {
      origin: 'https://www.tradingview.com',
    });

    // For authenticated clients, we delay flushing queued packets until after auth is sent.
    // For unauthenticated clients, we can mark logged immediately.
    this.#logged = !clientOptions.token;

    if (!clientOptions.token) {
      this.#sendQueue.unshift(protocol.formatWSPacket({
        m: 'set_auth_token',
        p: ['unauthorized_user_token'],
      }));
    }

    // Use the new event handler setup
    this.#setupWebSocketEventHandlers();
    this.sendQueue();
  }

  /** @type {ClientBridge} */
  #clientBridge = {
    sessions: this.#sessions,
    send: (t, p) => this.send(t, p),
    registerRehydrateHook: (key, fn) => this.registerRehydrateHook(key, fn),
    unregisterRehydrateHook: (key) => this.unregisterRehydrateHook(key),
  };

  /** @namespace Session */
  Session = {
    Quote: quoteSessionGenerator(this.#clientBridge),
    Chart: chartSessionGenerator(this.#clientBridge),
  };

  /**
   * Close the websocket connection
   * @return {Promise<void>} When websocket is closed
   */
  end() {
    // Mark connection as manually closed to prevent reconnection attempts
    this.#connectionClosedManually = true;
    
    // Clear reconnection timer if active
    if (this.#reconnectionTimeoutId) {
      clearTimeout(this.#reconnectionTimeoutId);
      this.#reconnectionTimeoutId = null;
    }
    
    // Stop connect timeout + heartbeat
    this.#stopConnectTimeout();
    this.#stopHeartbeat();

    return new Promise((resolve) => {
      // If already closed/closing, resolve when close event fires.
      if (this.#ws.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }

      const done = () => {
        this.#ws.off('close', done);
        resolve();
      };

      this.#ws.on('close', done);

      // Trigger close if needed
      if (this.#ws.readyState === WebSocket.OPEN || this.#ws.readyState === WebSocket.CONNECTING) {
        this.#ws.close();
      }

      // Safety: don't hang forever if the underlying ws implementation never emits 'close'
      setTimeout(done, 5000).unref?.();
    });
  }
};
