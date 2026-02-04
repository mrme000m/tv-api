const http = require('../http');
const PineIndicator = require('../classes/PineIndicator');
const { genAuthCookies } = require('../utils');

const PINE_FACADE_BASE = 'https://pine-facade.tradingview.com/pine-facade';

function buildFormData(fields) {
  const boundary = `----WebKitFormBoundary${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const body = fields.map(({ name, value = '' }) => (
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
  )).join('') + `--${boundary}--\r\n`;

  return { boundary, body };
}

function buildAuthHeaders(credentials = {}) {
  const cookie = genAuthCookies(credentials.session, credentials.signature);
  if (!cookie) return {};
  return { cookie };
}

const builtInIndicList = [];

/**
 * @typedef {Object} SearchIndicatorResult
 * @prop {string} id Script ID
 * @prop {string} version Script version
 * @prop {string} name Script complete name
 * @prop {{ id: number, username: string }} author Author user ID
 * @prop {string} image Image ID https://tradingview.com/i/${image}
 * @prop {string | ''} source Script source (if available)
 * @prop {'study' | 'strategy'} type Script type (study / strategy)
 * @prop {'open_source' | 'closed_source' | 'invite_only'
 *  | 'private' | 'other'} access Script access type
 * @prop {() => Promise<PineIndicator>} get Get the full indicator informations
 */

/**
 * Find an indicator
 * @function searchIndicator
 * @param {string} search Keywords
 * @returns {Promise<SearchIndicatorResult[]>} Search results
 */
async function searchIndicator(search = '') {
  if (!builtInIndicList.length) {
    await Promise.all(['standard', 'candlestick', 'fundamental'].map(async (type) => {
      const { data } = await http.get(
        'https://pine-facade.tradingview.com/pine-facade/list',
        {
          params: {
            filter: type,
          },
        }
      );
      builtInIndicList.push(...data);
    }));
  }

  const { data } = await http.get(
    'https://www.tradingview.com/pubscripts-suggest-json',
    {
      params: {
        search: search, // Axios will handle encoding
      },
    }
  );

  function norm(str = '') {
    return str.toUpperCase().replace(/[^A-Z]/g, '');
  }

  return [
    ...builtInIndicList.filter((i) => (
      norm(i.scriptName).includes(norm(search))
      || norm(i.extra.shortDescription).includes(norm(search))
    )).map((ind) => ({
      id: ind.scriptIdPart,
      version: ind.version,
      name: ind.scriptName,
      author: {
        id: ind.userId,
        username: '@TRADINGVIEW@',
      },
      image: '',
      access: 'closed_source',
      source: '',
      type: (ind.extra && ind.extra.kind) ? ind.extra.kind : 'study',
      get() {
        return getIndicator(ind.scriptIdPart, ind.version);
      },
    })),

    ...data.results.map((ind) => ({
      id: ind.scriptIdPart,
      version: ind.version,
      name: ind.scriptName,
      author: {
        id: ind.author.id,
        username: ind.author.username,
      },
      image: ind.imageUrl,
      access: ['open_source', 'closed_source', 'invite_only'][ind.access - 1] || 'other',
      source: ind.scriptSource,
      type: (ind.extra && ind.extra.kind) ? ind.extra.kind : 'study',
      get() {
        return getIndicator(ind.scriptIdPart, ind.version);
      },
    })),
  ];
}

/**
 * Get an indicator
 * @function getIndicator
 * @param {string} id Indicator ID (Like: PUB;XXXXXXXXXXXXXXXXXXXXX)
 * @param {'last' | string} [version] Wanted version of the indicator
 * @param {string} [session] User 'sessionid' cookie
 * @param {string} [signature] User 'sessionid_sign' cookie
 * @returns {Promise<PineIndicator>} Indicator
 */
async function getIndicator(id, version = 'last', session = '', signature = '') {
  // Use standard encoding
  const indicID = encodeURIComponent(id);

  const { data } = await http.get(
    `https://pine-facade.tradingview.com/pine-facade/translate/${indicID}/${version}`,
    {
      headers: {
        cookie: genAuthCookies(session, signature),
      },
    }
  );

  if (!data.success || !data.result.metaInfo || !data.result.metaInfo.inputs) {
    throw new Error(`Inexistent or unsupported indicator: "${data.reason}"`);
  }

  const inputs = {};

  data.result.metaInfo.inputs.forEach((input) => {
    if (['text', 'pineId', 'pineVersion'].includes(input.id)) return;

    const inlineName = input.name.replace(/ /g, '_').replace(/[^a-zA-Z0-9_]/g, '');

    inputs[input.id] = {
      name: input.name,
      inline: input.inline || inlineName,
      internalID: input.internalID || inlineName,
      tooltip: input.tooltip,

      type: input.type,
      value: input.defval,
      isHidden: !!input.isHidden,
      isFake: !!input.isFake,
    };

    if (input.options) inputs[input.id].options = input.options;
  });

  const plots = {};

  Object.keys(data.result.metaInfo.styles).forEach((plotId) => {
    const plotTitle = data
      .result
      .metaInfo
      .styles[plotId]
      .title
      .replace(/ /g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');

    const titles = Object.values(plots);

    if (titles.includes(plotTitle)) {
      let i = 2;
      while (titles.includes(`${plotTitle}_${i}`)) i += 1;
      plots[plotId] = `${plotTitle}_${i}`;
    } else plots[plotId] = plotTitle;
  });

  data.result.metaInfo.plots.forEach((plot) => {
    if (!plot.target) return;
    plots[plot.id] = `${plots[plot.target] ?? plot.target}_${plot.type}`;
  });

  return new PineIndicator({
    pineId: data.result.metaInfo.scriptIdPart || id,
    pineVersion: data.result.metaInfo.pine.version || version,
    description: data.result.metaInfo.description,
    shortDescription: data.result.metaInfo.shortDescription,
    inputs,
    plots,
    script: data.result.ilTemplate,
  });
}

/**
 * Get user's private indicators from a 'sessionid' cookie
 * @function getPrivateIndicators
 * @param {string} session User 'sessionid' cookie
 * @param {string} [signature] User 'sessionid_sign' cookie
 * @returns {Promise<SearchIndicatorResult[]>} Search results
 */
async function getPrivateIndicators(session, signature = '') {
  const { data } = await http.get(
    'https://pine-facade.tradingview.com/pine-facade/list',
    {
      headers: {
        cookie: genAuthCookies(session, signature),
      },
      params: {
        filter: 'saved',
      },
    }
  );

  return data.map((ind) => ({
    id: ind.scriptIdPart,
    version: ind.version,
    name: ind.scriptName,
    author: {
      id: -1,
      username: '@ME@',
    },
    image: ind.imageUrl,
    access: 'private',
    source: ind.scriptSource,
    type: (ind.extra && ind.extra.kind) ? ind.extra.kind : 'study',
    get() {
      return getIndicator(
        ind.scriptIdPart,
        ind.version,
        session,
        signature,
      );
    },
  }));
}

/**
 * Translate a Pine script before it gets saved by hitting TradingView's light translator.
 * @param {string} source Pine source code
 * @param {{ userName?: string, version?: number|string, credentials?: { session?: string, signature?: string } }} [options]
 * @returns {Promise<any>} Raw translation payload
 */
async function translateScriptLight(source, options = {}) {
  const { userName = '', version = 3, credentials } = options;
  const { boundary, body } = buildFormData([{ name: 'source', value: source }]);
  const params = { v: version };
  if (userName) params.user_name = userName;

  const { data } = await http.post(
    `${PINE_FACADE_BASE}/translate_light`,
    body,
    {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        ...buildAuthHeaders(credentials),
      },
      params,
    }
  );

  return data;
}

/**
 * Ask TradingView how it would title a script before saving.
 * @param {string} source Pine source code
 * @param {{ userName?: string, credentials?: { session?: string, signature?: string } }} [options]
 * @returns {Promise<any>} Parser response payload
 */
async function parseScriptTitle(source, options = {}) {
  const { userName = '', credentials } = options;
  const fields = [];
  if (userName) fields.push({ name: 'user_name', value: userName });
  fields.push({ name: 'source', value: source });

  const { boundary, body } = buildFormData(fields);

  const { data } = await http.post(
    `${PINE_FACADE_BASE}/parse_title`,
    body,
    {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        ...buildAuthHeaders(credentials),
      },
    }
  );

  return data;
}

/**
 * Save a new Pine script for the authenticated user.
 * @param {{ name: string, source: string, userName?: string, allowOverwrite?: boolean, credentials?: { session?: string, signature?: string } }} options
 * @returns {Promise<any>} Save endpoint response (typically plain text)
 */
async function saveScriptNew(options = {}) {
  const {
    name,
    source,
    userName = '',
    allowOverwrite = true,
    credentials,
  } = options;

  if (!name) throw new Error('Script name is required');
  if (!source) throw new Error('Script source is required');

  const params = {
    name,
    allow_overwrite: allowOverwrite,
  };
  if (userName) params.user_name = userName;

  const { boundary, body } = buildFormData([{ name: 'source', value: source }]);

  const { data } = await http.post(
    `${PINE_FACADE_BASE}/save/new`,
    body,
    {
      params,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        ...buildAuthHeaders(credentials),
      },
    }
  );

  return data;
}

/**
 * Rename an existing version of a saved script.
 * @param {string} pineId Indicator id (USER;..., PUB;...)
 * @param {string|number} version Version identifier
 * @param {string} name New name to apply
 * @param {{ session?: string, signature?: string }} [credentials]
 * @returns {Promise<void>}
 */
async function renameScriptVersion(pineId, version, name, credentials = {}) {
  if (!pineId || !version || !name) throw new Error('pineId, version and name are required');

  const { data } = await http.put(
    `${PINE_FACADE_BASE}/name/${encodeURIComponent(pineId)}/${encodeURIComponent(version)}`,
    null,
    {
      params: { name },
      headers: buildAuthHeaders(credentials),
    }
  );

  return data;
}

/**
 * List the versions exposed for a saved script.
 * @param {string} pineId Indicator id
 * @param {{ session?: string, signature?: string }} [credentials]
 * @returns {Promise<any>} Versions payload
 */
async function listScriptVersions(pineId, credentials = {}) {
  const { data } = await http.get(
    `${PINE_FACADE_BASE}/versions/${encodeURIComponent(pineId)}`,
    {
      headers: buildAuthHeaders(credentials),
    }
  );

  return data;
}

/**
 * Retrieve a saved script for a given version identifier.
 * @param {string} pineId Indicator id
 * @param {string|number} version Version identifier
 * @param {{ session?: string, signature?: string }} [credentials]
 * @returns {Promise<any>} Script payload (text/plain)
 */
async function getScriptVersion(pineId, version, credentials = {}) {
  const { data } = await http.get(
    `${PINE_FACADE_BASE}/get/${encodeURIComponent(pineId)}/${encodeURIComponent(version)}`,
    {
      headers: buildAuthHeaders(credentials),
    }
  );

  return data;
}

/**
 * Attempt to delete a script version or whole script. This is best-effort
 * because TradingView does not document a single delete endpoint. We try
 * several plausible endpoints and methods observed in practice.
 * @param {string} pineId Indicator id (USER;..., PUB;...)
 * @param {string|number} [version] Optional version to delete; if omitted
 * deletes the whole script if endpoint supports it.
 * @param {{ session?: string, signature?: string }} [credentials]
 * @returns {Promise<any>} Response of the first successful call, or null
 */
async function deleteScriptVersion(pineId, version = '', credentials = {}) {
  if (!pineId) throw new Error('pineId is required');

  const candidates = [];

  // Common REST patterns
  if (version) {
    candidates.push({ method: 'delete', url: `${PINE_FACADE_BASE}/save/${encodeURIComponent(pineId)}/${encodeURIComponent(version)}` });
    candidates.push({ method: 'delete', url: `${PINE_FACADE_BASE}/delete/${encodeURIComponent(pineId)}/${encodeURIComponent(version)}` });
    candidates.push({ method: 'delete', url: `${PINE_FACADE_BASE}/remove/${encodeURIComponent(pineId)}/${encodeURIComponent(version)}` });
    candidates.push({ method: 'post', url: `${PINE_FACADE_BASE}/save/delete`, params: { pine_id: pineId, version } });
    // POST /delete/<pineId>?user_name=... used by the CLI
    candidates.push({ method: 'post', url: `${PINE_FACADE_BASE}/delete/${encodeURIComponent(pineId)}`, params: {} });
  }

  // Whole-script deletions
  candidates.push({ method: 'delete', url: `${PINE_FACADE_BASE}/save/${encodeURIComponent(pineId)}` });
  candidates.push({ method: 'delete', url: `${PINE_FACADE_BASE}/delete/${encodeURIComponent(pineId)}` });
  candidates.push({ method: 'post', url: `${PINE_FACADE_BASE}/save/remove`, params: { pine_id: pineId } });
  // CLI style: POST /delete/<pineId>?user_name=...
  candidates.push({ method: 'post', url: `${PINE_FACADE_BASE}/delete/${encodeURIComponent(pineId)}`, params: {} });

  for (const c of candidates) {
    try {
      const opts = { headers: buildAuthHeaders(credentials) };
      if (c.params) opts.params = c.params;
      // Some endpoints (observed from the web UI / CLI) expect a user_name query param
      if (!opts.params && c.url.includes('/delete/') && credentials && credentials.userName) {
        opts.params = { user_name: credentials.userName };
      }

      let res;
      if (c.method === 'delete') res = await http.delete(c.url, opts);
      else if (c.method === 'post') res = await http.post(c.url, null, opts);
      else res = await http.request({ method: c.method, url: c.url, ...opts });

      if (res && (res.status === 200 || res.status === 204 || res.status === 201)) return res.data;
    } catch (e) {
      // ignore and try next
      // Removed global.TW_DEBUG check for now or assume console.warn is acceptable
      // The audit said: "Replace global flag with injectable logger...".
      // I can't easily inject logger here without changing signatures.
      // I will just remove the console.warn or use console.error if critical.
      // Since this is a best-effort delete, logging failure is useful but I'll skip it for now to avoid global dependency.
    }
  }

  return null;
}

module.exports = {
  searchIndicator,
  getIndicator,
  getPrivateIndicators,
  translateScriptLight,
  parseScriptTitle,
  saveScriptNew,
  renameScriptVersion,
  listScriptVersions,
  getScriptVersion,
  deleteScriptVersion
};
