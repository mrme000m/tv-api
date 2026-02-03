const WebSocket = require('ws');

const misc = require('./miscRequests');
const protocol = require('./protocol');

const quoteSessionGenerator = require('./quote/session');
const chartSessionGenerator = require('./chart/session');

// Reconnection configuration
const RECONNECTION_CONFIG = {
  maxRetries: 10,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  jitter: true,
  multiplier: 2
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
 */

/**
 * @typedef { 'connected' | 'disconnected'
 *  | 'logged' | 'ping' | 'data'
 *  | 'error' | 'event'
 * } ClientEvent
 */

/** @class */
module.exports = class Client {
  #ws;

  #logged = false;
  
  // Connection management properties
  #reconnectionAttempts = 0;
  #isReconnecting = false;
  #connectionClosedManually = false;
  #reconnectionTimeoutId = null;
  #heartbeatIntervalId = null;
  #lastHeartbeatReceived = Date.now();

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
    logged: [],
    ping: [],
    data: [],

    error: [],
    event: [],
  };

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
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  #calculateReconnectionDelay(attempt) {
    let delay = RECONNECTION_CONFIG.baseDelay * Math.pow(RECONNECTION_CONFIG.multiplier, attempt);
    
    // Apply maximum delay cap
    delay = Math.min(delay, RECONNECTION_CONFIG.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (RECONNECTION_CONFIG.jitter) {
      const jitter = Math.random() * 0.3; // 30% jitter
      delay = delay * (1 + jitter);
    }
    
    return Math.round(delay);
  }

  /**
   * Handle reconnection attempts
   */
  #scheduleReconnection() {
    if (this.#connectionClosedManually || this.#reconnectionAttempts >= RECONNECTION_CONFIG.maxRetries) {
      return;
    }

    this.#isReconnecting = true;
    this.#reconnectionAttempts++;

    const delay = this.#calculateReconnectionDelay(this.#reconnectionAttempts - 1);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.#reconnectionAttempts}/${RECONNECTION_CONFIG.maxRetries})`);

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
      this.#ws = new WebSocket(`wss://${server}.tradingview.com/socket.io/websocket?type=chart`, {
        origin: 'https://www.tradingview.com',
      });

      // Setup event listeners for the new connection
      this.#setupWebSocketEventHandlers();

      // If we were authenticated before, re-authenticate
      if (this.clientOptions?.token) {
        // Wait for connection to be established before sending auth
        this.#ws.once('open', () => {
          misc.getUser(
            this.clientOptions.token,
            this.clientOptions.signature ? this.clientOptions.signature : '',
            this.clientOptions.location ? this.clientOptions.location : 'https://tradingview.com',
          ).then((user) => {
            this.#sendQueue.unshift(protocol.formatWSPacket({
              m: 'set_auth_token',
              p: [user.authToken],
            }));
            this.#logged = true;
            this.sendQueue();
          }).catch((err) => {
            this.#handleError('Credentials error during reconnection:', err.message);
            // If auth fails, schedule another reconnection
            this.#scheduleReconnection();
          });
        });
      }
    } catch (error) {
      console.error('Reconnection attempt failed:', error);
      this.#scheduleReconnection(); // Try again
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  #setupWebSocketEventHandlers() {
    this.#ws.on('open', () => {
      this.#reconnectionAttempts = 0; // Reset on successful connection
      this.#isReconnecting = false;
      this.#handleEvent('connected');
      this.sendQueue();
      
      // Start heartbeat mechanism
      this.#startHeartbeat();
    });

    this.#ws.on('close', (code, reason) => {
      this.#stopHeartbeat();
      
      if (this.#connectionClosedManually) {
        this.#logged = false;
        this.#handleEvent('disconnected');
        return;
      }

      console.log(`Connection closed (code: ${code}, reason: ${reason || 'unknown'}). Attempting to reconnect...`);
      this.#scheduleReconnection();
    });

    this.#ws.on('error', (err) => {
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

    protocol.parseWSPacket(str).forEach((packet) => {
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
   * @prop {'data' | 'prodata' | 'widgetdata'} [server] Server type
   * @prop {string} [location] Auth page location (For france: https://fr.tradingview.com/)
   */

  /**
   * Client object
   * @param {ClientOptions} clientOptions TradingView client options
   */
  constructor(clientOptions = {}) {
    if (clientOptions.DEBUG) global.TW_DEBUG = clientOptions.DEBUG;
    
    // Store client options for reconnection purposes
    this.clientOptions = clientOptions;

    const server = clientOptions.server || 'data';
    this.#ws = new WebSocket(`wss://${server}.tradingview.com/socket.io/websocket?type=chart`, {
      origin: 'https://www.tradingview.com',
    });

    if (clientOptions.token) {
      misc.getUser(
        clientOptions.token,
        clientOptions.signature ? clientOptions.signature : '',
        clientOptions.location ? clientOptions.location : 'https://tradingview.com',
      ).then((user) => {
        this.#sendQueue.unshift(protocol.formatWSPacket({
          m: 'set_auth_token',
          p: [user.authToken],
        }));
        this.#logged = true;
        this.sendQueue();
      }).catch((err) => {
        this.#handleError('Credentials error:', err.message);
      });
    } else {
      this.#sendQueue.unshift(protocol.formatWSPacket({
        m: 'set_auth_token',
        p: ['unauthorized_user_token'],
      }));
      this.#logged = true;
      this.sendQueue();
    }

    // Use the new event handler setup
    this.#setupWebSocketEventHandlers();
  }

  /** @type {ClientBridge} */
  #clientBridge = {
    sessions: this.#sessions,
    send: (t, p) => this.send(t, p),
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
    
    // Stop heartbeat
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
