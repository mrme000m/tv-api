const http = require('../http');
const { genAuthCookies } = require('../utils');

const ALERTS_BASE = 'https://pricealerts.tradingview.com';

/**
 * @typedef {Object} AlertCondition
 * @prop {string} type - Condition type ('price', 'study', 'strategy', 'crossing', 'crossing_up', 'crossing_down', 'greater', 'less', 'entering_channel', 'exiting_channel', 'inside_channel', 'outside_channel', 'moving_up', 'moving_down')
 * @prop {string} [resolution] - Chart resolution/timeframe (e.g., '1', '5', '15', '60', '240', 'D')
 * @prop {Array} [series] - Series data for complex conditions
 */

/**
 * @typedef {Object} Alert
 * @prop {number} id - Alert ID
 * @prop {string} name - Alert name
 * @prop {string} symbol - Symbol in serialized format
 * @prop {string} resolution - Timeframe/resolution
 * @prop {string} message - Alert message
 * @prop {boolean} active - Whether the alert is active
 * @prop {string} [expiration] - Expiration date ISO string
 * @prop {boolean} popup - Show popup notification
 * @prop {boolean} email - Send email notification
 * @prop {boolean} mobile_push - Send mobile push notification
 * @prop {boolean} sms_over_email - Send SMS over email
 * @prop {string} [web_hook] - Webhook URL
 * @prop {string} [sound_file] - Sound file name
 * @prop {number} [sound_duration] - Sound duration
 * @prop {boolean} auto_deactivate - Auto deactivate after trigger
 * @prop {Array<AlertCondition>} conditions - Alert conditions
 * @prop {string} created_at - Creation timestamp
 * @prop {string} fired_at - Last fired timestamp
 * @prop {number} fires_count - Number of times fired
 * @prop {number} user_id - User ID
 */

/**
 * @typedef {Object} CreateAlertOptions
 * @prop {string} symbol - Symbol with prefix (e.g., 'COINBASE:BTCUSD')
 * @prop {string} resolution - Timeframe ('1', '5', '15', '60', '240', 'D', 'W', 'M')
 * @prop {string} [name] - Alert name (auto-generated if not provided)
 * @prop {string} [message] - Alert message
 * @prop {Array<AlertCondition>} [conditions] - Alert conditions
 * @prop {boolean} [popup=true] - Show popup notification
 * @prop {boolean} [email=false] - Send email notification
 * @prop {boolean} [mobile_push=true] - Send mobile push notification
 * @prop {boolean} [sms_over_email=false] - Send SMS over email
 * @prop {string} [web_hook] - Webhook URL
 * @prop {string} [expiration] - Expiration date (ISO string, defaults to 1 month)
 * @prop {boolean} [auto_deactivate=false] - Auto deactivate after trigger
 * @prop {string} [sound_file] - Sound file name
 * @prop {number} [sound_duration=0] - Sound duration in seconds
 */

/**
 * @typedef {Object} UpdateAlertOptions
 * @prop {number} alert_id - Alert ID to update
 * @prop {string} [name] - Alert name
 * @prop {string} [message] - Alert message
 * @prop {string} [resolution] - Timeframe
 * @prop {boolean} [active] - Active state
 * @prop {boolean} [popup] - Show popup notification
 * @prop {boolean} [email] - Send email notification
 * @prop {boolean} [mobile_push] - Send mobile push notification
 * @prop {boolean} [sms_over_email] - Send SMS over email
 * @prop {string} [web_hook] - Webhook URL
 * @prop {string} [expiration] - Expiration date
 * @prop {boolean} [auto_deactivate] - Auto deactivate after trigger
 * @prop {Array<AlertCondition>} [conditions] - Alert conditions
 * @prop {boolean} [ignore_warnings=true] - Ignore warnings
 * @prop {string} [client_id] - Client-generated ID for the update operation
 */

/**
 * Build query parameters for alerts API requests
 * @param {Object} [options]
 * @param {string} [options.logUsername]
 * @param {string} [options.maintenanceUnsetReason]
 * @param {string} [options.buildTime]
 * @returns {Object}
 */
function buildQueryParams(options = {}) {
  const now = new Date();
  return {
    log_username: options.logUsername || '',
    maintenance_unset_reason: options.maintenanceUnsetReason || 'initial_operated',
    build_time: options.buildTime || now.toISOString().replace(/:\d{2}\.\d{3}Z$/, ''),
  };
}

/**
 * Build headers for alerts API requests
 * @param {Object} [options]
 * @param {string} [options.session] - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Object}
 */
function buildHeaders(options = {}) {
  const headers = {
    'accept': '*/*',
    'content-type': 'text/plain;charset=UTF-8',
    'origin': 'https://www.tradingview.com',
    'referer': 'https://www.tradingview.com/',
  };

  if (options.session) {
    headers.cookie = genAuthCookies(options.session, options.signature);
  }

  return headers;
}

/**
 * Serialize symbol object to string format expected by TradingView
 * @param {Object|string} symbol - Symbol string or object
 * @returns {string} Serialized symbol
 */
function serializeSymbol(symbol) {
  if (typeof symbol === 'string') {
    // Parse symbol string like "COINBASE:BTCUSD" or "BTCUSD"
    const parts = symbol.split(':');
    if (parts.length === 2) {
      return JSON.stringify({
        adjustment: 'splits',
        'currency-id': 'USD',
        session: 'regular',
        symbol: symbol.toUpperCase(),
      });
    }
    // Assume it's just the symbol part
    return JSON.stringify({
      adjustment: 'splits',
      'currency-id': 'USD',
      session: 'regular',
      symbol: symbol.toUpperCase(),
    });
  }

  // If already an object, stringify it
  return JSON.stringify({
    adjustment: symbol.adjustment || 'splits',
    'currency-id': symbol.currencyId || 'USD',
    session: symbol.session || 'regular',
    symbol: symbol.symbol.toUpperCase(),
  });
}

/**
 * Get default expiration date (1 month from now)
 * @returns {string} ISO date string
 */
function getDefaultExpiration() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

/**
 * List all alerts for the authenticated user
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @param {number} [options.userId] - User ID (optional, will be derived from session if not provided)
 * @returns {Promise<Alert[]>}
 */
async function listAlerts(options) {
  if (!options?.session) {
    throw new Error('Session is required to list alerts');
  }

  const params = buildQueryParams(options);
  if (options.userId) {
    params.user_id = options.userId;
  }

  const { data } = await http.get(`${ALERTS_BASE}/list_alerts`, {
    params,
    headers: buildHeaders(options),
  });

  return data;
}

/**
 * Create a new price/study alert
 * @param {CreateAlertOptions} alertData - Alert configuration
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Alert>}
 */
async function createAlert(alertData, options) {
  if (!options?.session) {
    throw new Error('Session is required to create alerts');
  }

  if (!alertData?.symbol) {
    throw new Error('Symbol is required to create alert');
  }

  if (!alertData?.resolution) {
    throw new Error('Resolution/timeframe is required to create alert');
  }

  const payload = {
    symbol: serializeSymbol(alertData.symbol),
    resolution: alertData.resolution,
    name: alertData.name || null,
    message: alertData.message || '',
    popup: alertData.popup !== false,
    email: alertData.email === true,
    mobile_push: alertData.mobile_push !== false,
    sms_over_email: alertData.sms_over_email === true,
    web_hook: alertData.web_hook || null,
    sound_file: alertData.sound_file || null,
    sound_duration: alertData.sound_duration || 0,
    auto_deactivate: alertData.auto_deactivate === true,
    expiration: alertData.expiration || getDefaultExpiration(),
    conditions: alertData.conditions || [],
  };

  const params = buildQueryParams(options);

  const { data } = await http.post(
    `${ALERTS_BASE}/create_alert`,
    JSON.stringify({ payload }),
    {
      params,
      headers: buildHeaders(options),
    }
  );

  return data;
}

/**
 * Update/modify and restart an existing alert
 * @param {UpdateAlertOptions} updateData - Alert update configuration
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Alert>}
 */
async function updateAlert(updateData, options) {
  if (!options?.session) {
    throw new Error('Session is required to update alerts');
  }

  if (!updateData?.alert_id) {
    throw new Error('Alert ID is required to update alert');
  }

  const payload = {
    alert_id: updateData.alert_id,
    client_id: updateData.client_id || `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ignore_warnings: updateData.ignore_warnings !== false,
  };

  // Add optional fields if provided
  if (updateData.symbol !== undefined) payload.symbol = serializeSymbol(updateData.symbol);
  if (updateData.resolution !== undefined) payload.resolution = updateData.resolution;
  if (updateData.name !== undefined) payload.name = updateData.name;
  if (updateData.message !== undefined) payload.message = updateData.message;
  if (updateData.active !== undefined) payload.active = updateData.active;
  if (updateData.popup !== undefined) payload.popup = updateData.popup;
  if (updateData.email !== undefined) payload.email = updateData.email;
  if (updateData.mobile_push !== undefined) payload.mobile_push = updateData.mobile_push;
  if (updateData.sms_over_email !== undefined) payload.sms_over_email = updateData.sms_over_email;
  if (updateData.web_hook !== undefined) payload.web_hook = updateData.web_hook;
  if (updateData.expiration !== undefined) payload.expiration = updateData.expiration;
  if (updateData.auto_deactivate !== undefined) payload.auto_deactivate = updateData.auto_deactivate;
  if (updateData.sound_file !== undefined) payload.sound_file = updateData.sound_file;
  if (updateData.sound_duration !== undefined) payload.sound_duration = updateData.sound_duration;
  if (updateData.conditions !== undefined) payload.conditions = updateData.conditions;

  const params = buildQueryParams(options);

  const { data } = await http.post(
    `${ALERTS_BASE}/modify_restart_alert`,
    JSON.stringify({ payload }),
    {
      params,
      headers: buildHeaders(options),
    }
  );

  return data;
}

/**
 * Delete one or more alerts
 * @param {number|number[]} alertIds - Single alert ID or array of alert IDs
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Object>}
 */
async function deleteAlerts(alertIds, options) {
  if (!options?.session) {
    throw new Error('Session is required to delete alerts');
  }

  const ids = Array.isArray(alertIds) ? alertIds : [alertIds];

  if (ids.length === 0) {
    throw new Error('At least one alert ID is required');
  }

  const payload = {
    alert_ids: ids,
  };

  const params = buildQueryParams(options);

  const { data } = await http.post(
    `${ALERTS_BASE}/delete_alerts`,
    JSON.stringify({ payload }),
    {
      params,
      headers: buildHeaders(options),
    }
  );

  return data;
}

/**
 * Get offline alert fires (history of triggered alerts)
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @param {number} [options.limit=2000] - Maximum number of results
 * @returns {Promise<Object>}
 */
async function getOfflineFires(options) {
  if (!options?.session) {
    throw new Error('Session is required to get offline fires');
  }

  const payload = {
    limit: options.limit || 2000,
  };

  const params = buildQueryParams(options);

  const { data } = await http.post(
    `${ALERTS_BASE}/get_offline_fires`,
    JSON.stringify({ payload }),
    {
      params,
      headers: buildHeaders(options),
    }
  );

  return data;
}

/**
 * Get offline fire controls
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Object>}
 */
async function getOfflineFireControls(options) {
  if (!options?.session) {
    throw new Error('Session is required to get offline fire controls');
  }

  const params = buildQueryParams(options);

  const { data } = await http.post(
    `${ALERTS_BASE}/get_offline_fire_controls`,
    JSON.stringify({ payload: {} }),
    {
      params,
      headers: buildHeaders(options),
    }
  );

  return data;
}

/**
 * Create a simple price alert (convenience function)
 * @param {Object} params
 * @param {string} params.symbol - Symbol (e.g., 'COINBASE:BTCUSD')
 * @param {string} params.resolution - Timeframe ('1', '5', '15', '60', '240', 'D')
 * @param {number} params.price - Target price
 * @param {string} params.condition - Condition type ('crossing', 'crossing_up', 'crossing_down', 'greater', 'less')
 * @param {string} [params.name] - Alert name
 * @param {string} [params.message] - Alert message
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Alert>}
 */
async function createPriceAlert(params, options) {
  const condition = {
    type: params.condition || 'crossing',
    series: [{
      type: 'price',
      source: 'close',
    }, {
      type: 'const',
      value: params.price,
    }],
  };

  return createAlert({
    symbol: params.symbol,
    resolution: params.resolution,
    name: params.name || `${params.symbol} ${params.condition} ${params.price}`,
    message: params.message || `Price alert: ${params.symbol} ${params.condition} ${params.price}`,
    conditions: [condition],
  }, options);
}

/**
 * Toggle alert active state (activate/deactivate)
 * @param {number} alertId - Alert ID
 * @param {boolean} active - Desired active state
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Alert>}
 */
async function toggleAlert(alertId, active, options) {
  return updateAlert({
    alert_id: alertId,
    active,
  }, options);
}

/**
 * Activate an alert
 * @param {number} alertId - Alert ID
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Alert>}
 */
async function activateAlert(alertId, options) {
  return toggleAlert(alertId, true, options);
}

/**
 * Deactivate an alert
 * @param {number} alertId - Alert ID
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Alert>}
 */
async function deactivateAlert(alertId, options) {
  return toggleAlert(alertId, false, options);
}

/**
 * List alert fires (triggered alerts history)
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @param {number} [options.limit=50] - Maximum number of results
 * @returns {Promise<Object>}
 */
async function listFires(options) {
  if (!options?.session) {
    throw new Error('Session is required to list fires');
  }

  const payload = {
    limit: options.limit || 50,
  };

  const params = buildQueryParams(options);

  const { data } = await http.post(
    `${ALERTS_BASE}/list_fires`,
    JSON.stringify({ payload }),
    {
      params,
      headers: buildHeaders(options),
    }
  );

  return data;
}

/**
 * Delete/clear all alert fires
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Object>}
 */
async function deleteAllFires(options) {
  if (!options?.session) {
    throw new Error('Session is required to delete fires');
  }

  const params = buildQueryParams(options);

  const { data } = await http.post(
    `${ALERTS_BASE}/delete_all_fires`,
    JSON.stringify({ payload: {} }),
    {
      params,
      headers: buildHeaders(options),
    }
  );

  return data;
}

/**
 * Clear offline fires for specific alerts
 * @param {number|number[]} alertIds - Alert ID or array of alert IDs
 * @param {Object} options
 * @param {string} options.session - Session ID
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Object>}
 */
async function clearOfflineFires(alertIds, options) {
  if (!options?.session) {
    throw new Error('Session is required to clear offline fires');
  }

  const ids = Array.isArray(alertIds) ? alertIds : [alertIds];

  if (ids.length === 0) {
    throw new Error('At least one alert ID is required');
  }

  const payload = {
    alert_ids: ids,
  };

  const params = buildQueryParams(options);

  const { data } = await http.post(
    `${ALERTS_BASE}/clear_offline_fires`,
    JSON.stringify({ payload }),
    {
      params,
      headers: buildHeaders(options),
    }
  );

  return data;
}

/**
 * High-level wrapper for alert operations
 * @param {Object} defaults - Default options (session, signature)
 * @returns {Object} Alerts client
 */
function createAlertsClient(defaults = {}) {
  return {
    list: (opts = {}) => listAlerts({ ...defaults, ...opts }),
    create: (data, opts = {}) => createAlert(data, { ...defaults, ...opts }),
    update: (data, opts = {}) => updateAlert(data, { ...defaults, ...opts }),
    delete: (ids, opts = {}) => deleteAlerts(ids, { ...defaults, ...opts }),
    toggle: (id, active, opts = {}) => toggleAlert(id, active, { ...defaults, ...opts }),
    activate: (id, opts = {}) => activateAlert(id, { ...defaults, ...opts }),
    deactivate: (id, opts = {}) => deactivateAlert(id, { ...defaults, ...opts }),
    listFires: (opts = {}) => listFires({ ...defaults, ...opts }),
    deleteAllFires: (opts = {}) => deleteAllFires({ ...defaults, ...opts }),
    clearOfflineFires: (ids, opts = {}) => clearOfflineFires(ids, { ...defaults, ...opts }),
    getOfflineFires: (opts = {}) => getOfflineFires({ ...defaults, ...opts }),
    getOfflineFireControls: (opts = {}) => getOfflineFireControls({ ...defaults, ...opts }),
    createPriceAlert: (params, opts = {}) => createPriceAlert(params, { ...defaults, ...opts }),
  };
}

module.exports = {
  listAlerts,
  createAlert,
  updateAlert,
  deleteAlerts,
  listFires,
  deleteAllFires,
  clearOfflineFires,
  getOfflineFires,
  getOfflineFireControls,
  createPriceAlert,
  toggleAlert,
  activateAlert,
  deactivateAlert,
  createAlertsClient,
  serializeSymbol,
};
