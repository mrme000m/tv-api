const http = require('../http');
const { genAuthCookies } = require('../utils');

const CRUD_STORAGE_BASE = 'https://crud-storage.tradingview.com';

/**
 * @typedef {Object} AlertPreset
 * @prop {number} id Preset ID
 * @prop {string} name Preset name
 * @prop {string} [description] Preset description
 * @prop {Object} condition Alert condition configuration
 * @prop {string} [message] Default message template
 * @prop {string} [sound_file] Sound file name
 * @prop {number} [sound_duration] Sound duration
 * @prop {boolean} [popup] Whether to show popup
 * @prop {boolean} [email] Whether to send email
 * @prop {boolean} [mobile_push] Whether to send mobile push
 * @prop {string} [web_hook] Webhook URL template
 * @prop {string} created_at Creation timestamp
 * @prop {string} updated_at Last update timestamp
 */

/**
 * @typedef {Object} AlertPresetsResponse
 * @prop {AlertPreset[]} results List of alert presets
 * @prop {number} [count] Total count
 * @prop {string|null} [next] URL for next page
 * @prop {string|null} [previous] URL for previous page
 */

/**
 * Build headers for CRUD storage API requests
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
  if (data && (data.detail || data.error || data.code || data.status === 'error')) {
    const message = data.detail || data.error || data.message || JSON.stringify(data);
    throw new Error(`${context}: ${message}`);
  }
}

/**
 * Get all alert presets for the authenticated user
 * @param {Object} options - Options
 * @param {string} options.session - Session ID (required)
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<AlertPreset[]>}
 */
async function getAlertPresets(options) {
  if (!options?.session) {
    throw new Error('Session is required to get alert presets');
  }

  const { data } = await http.get(`${CRUD_STORAGE_BASE}/api/alert_preset/`, {
    headers: buildHeaders(options),
  });

  handleApiError(data, 'Failed to get alert presets');

  return data?.results || [];
}

/**
 * Get a specific alert preset by ID
 * @param {number} presetId - Preset ID
 * @param {Object} options - Options
 * @param {string} options.session - Session ID (required)
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<AlertPreset|null>}
 */
async function getAlertPreset(presetId, options) {
  if (!options?.session) {
    throw new Error('Session is required to get alert preset');
  }

  if (!presetId) {
    throw new Error('Preset ID is required');
  }

  const presets = await getAlertPresets(options);
  return presets.find(p => p.id === presetId) || null;
}

/**
 * Create a new alert preset
 * @param {Object} presetData - Preset data
 * @param {string} presetData.name - Preset name
 * @param {Object} presetData.condition - Alert condition configuration
 * @param {Object} options - Options
 * @param {string} options.session - Session ID (required)
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<AlertPreset>}
 */
async function createAlertPreset(presetData, options) {
  if (!options?.session) {
    throw new Error('Session is required to create alert preset');
  }

  if (!presetData?.name) {
    throw new Error('Preset name is required');
  }

  if (!presetData?.condition) {
    throw new Error('Preset condition is required');
  }

  const { data } = await http.post(
    `${CRUD_STORAGE_BASE}/api/alert_preset/`,
    presetData,
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to create alert preset');

  return data;
}

/**
 * Update an existing alert preset
 * @param {number} presetId - Preset ID
 * @param {Object} updates - Fields to update
 * @param {Object} options - Options
 * @param {string} options.session - Session ID (required)
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<AlertPreset>}
 */
async function updateAlertPreset(presetId, updates, options) {
  if (!options?.session) {
    throw new Error('Session is required to update alert preset');
  }

  if (!presetId) {
    throw new Error('Preset ID is required');
  }

  const { data } = await http.patch(
    `${CRUD_STORAGE_BASE}/api/alert_preset/${presetId}/`,
    updates,
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to update alert preset');

  return data;
}

/**
 * Delete an alert preset
 * @param {number} presetId - Preset ID
 * @param {Object} options - Options
 * @param {string} options.session - Session ID (required)
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<Object>}
 */
async function deleteAlertPreset(presetId, options) {
  if (!options?.session) {
    throw new Error('Session is required to delete alert preset');
  }

  if (!presetId) {
    throw new Error('Preset ID is required');
  }

  const { data } = await http.delete(
    `${CRUD_STORAGE_BASE}/api/alert_preset/${presetId}/`,
    { headers: buildHeaders(options) }
  );

  handleApiError(data, 'Failed to delete alert preset');

  return data || { success: true };
}

/**
 * Search alert presets by name
 * @param {string} query - Search query
 * @param {Object} options - Options
 * @param {string} options.session - Session ID (required)
 * @param {string} [options.signature] - Session signature
 * @returns {Promise<AlertPreset[]>}
 */
async function searchAlertPresets(query, options) {
  if (!query) {
    throw new Error('Search query is required');
  }

  const presets = await getAlertPresets(options);
  const searchTerm = query.toLowerCase();

  return presets.filter(p =>
    p.name?.toLowerCase().includes(searchTerm) ||
    p.description?.toLowerCase().includes(searchTerm)
  );
}

/**
 * High-level wrapper for alert preset operations
 * @param {Object} defaults - Default options (session, signature)
 * @returns {Object} Alert presets client
 */
function createAlertPresetsClient(defaults = {}) {
  return {
    list: (opts = {}) => getAlertPresets({ ...defaults, ...opts }),
    get: (id, opts = {}) => getAlertPreset(id, { ...defaults, ...opts }),
    create: (data, opts = {}) => createAlertPreset(data, { ...defaults, ...opts }),
    update: (id, updates, opts = {}) => updateAlertPreset(id, updates, { ...defaults, ...opts }),
    delete: (id, opts = {}) => deleteAlertPreset(id, { ...defaults, ...opts }),
    search: (query, opts = {}) => searchAlertPresets(query, { ...defaults, ...opts }),
  };
}

module.exports = {
  getAlertPresets,
  getAlertPreset,
  createAlertPreset,
  updateAlertPreset,
  deleteAlertPreset,
  searchAlertPresets,
  createAlertPresetsClient,
};
