const http = require('../http');
const auth = require('./auth');
const PineIndicator = require('../classes/PineIndicator');
const { genAuthCookies } = require('../utils');

const PINE_FACADE_BASE = 'https://pine-facade.tradingview.com/pine-facade';

/**
 * @typedef {Object} PineScriptInput
 * @prop {string} id - Input ID (e.g., "in_0", "in_1")
 * @prop {string} name - Display name of the input
 * @prop {string} inline - Inline variable name from source
 * @prop {string} [internalID] - Internal identifier
 * @prop {string} type - Input type (integer, float, bool, text, color, source, resolution, etc.)
 * @prop {*} defval - Default value
 * @prop {*} [value] - Current value (if set)
 * @prop {string} [tooltip] - Tooltip/help text
 * @prop {boolean} isHidden - Whether input is hidden
 * @prop {boolean} isFake - Whether input is fake/internal
 * @prop {number} [min] - Minimum value (for numeric inputs)
 * @prop {number} [max] - Maximum value (for numeric inputs)
 * @prop {number} [step] - Step increment (for numeric inputs)
 * @prop {Array} [options] - Available options (for dropdown inputs)
 * @prop {string} [display] - Display format
 * @prop {string} [group] - Input group name
 * @prop {string} [line] - Line identifier for organization
 * @prop {boolean} [confirm] - Whether input requires confirmation
 * @prop {*} [defvalSrc] - Default source value
 */

/**
 * @typedef {Object} PineScriptStyle
 * @prop {string} id - Style ID
 * @prop {string} title - Style title
 * @prop {string} [plotId] - Associated plot ID
 * @prop {string} [color] - Default color
 * @prop {number} [linewidth] - Line width
 * @prop {string} [plottype] - Plot type (line, histogram, cross, etc.)
 * @prop {boolean} [showLabels] - Whether to show labels
 * @prop {string} [location] - Location (top, bottom, etc.)
 */

/**
 * @typedef {Object} PineScriptPlot
 * @prop {string} id - Plot ID
 * @prop {string} type - Plot type
 * @prop {string} [target] - Target plot ID (for composite plots)
 * @prop {string} [title] - Plot title
 */

/**
 * @typedef {Object} PineScriptMeta
 * @prop {string} pineId - Script ID (e.g., USER;xxx, PUB;xxx)
 * @prop {string} scriptIdPart - Short script ID part
 * @prop {string} name - Script name/title
 * @prop {string} description - Full description
 * @prop {string} shortDescription - Short description
 * @prop {string} version - Script version
 * @prop {string} [pineVersion] - Pine Script language version
 * @prop {string} [author] - Author username
 * @prop {string} type - Script type (study, strategy)
 * @prop {string} [access] - Access level (private, invite_only, open_source, etc.)
 * @prop {boolean} [isStrategy] - Whether script is a strategy
 * @prop {boolean} [isIndicator] - Whether script is an indicator
 * @prop {Array<string>} [features] - Enabled features
 * @prop {Object} [defaults] - Default values object
 */

/**
 * @typedef {Object} PineScriptMetadata
 * @prop {PineScriptMeta} meta - Script metadata
 * @prop {Object<string, PineScriptInput>} inputs - Input definitions keyed by ID
 * @prop {Array<PineScriptInput>} inputsList - Inputs as ordered list
 * @prop {Object<string, PineScriptStyle>} styles - Style definitions
 * @prop {Array<PineScriptPlot>} plots - Plot definitions
 * @prop {Object} [strategy] - Strategy-specific info (if applicable)
 * @prop {string} source - Pine Script source code
 * @prop {string} [ilTemplate] - Intermediate language template
 * @prop {Object} raw - Raw API response
 */

/**
 * @typedef {Object} InputSchema
 * @prop {string} id - Input ID
 * @prop {string} name - Display name
 * @prop {string} type - Input type
 * @prop {*} defaultValue - Default value
 * @prop {string} [description] - Description/tooltip
 * @prop {Object} [constraints] - Value constraints
 * @prop {number} [constraints.min] - Minimum value
 * @prop {number} [constraints.max] - Maximum value
 * @prop {number} [constraints.step] - Step size
 * @prop {Array} [constraints.options] - Enum options
 * @prop {string} [group] - Input group
 * @prop {boolean} [isHidden] - Whether hidden
 * @prop {boolean} [isFake] - Whether fake/internal
 */

function buildAuthHeaders(credentials = {}) {
  const cookie = genAuthCookies(credentials.session, credentials.signature);
  if (!cookie) return {};
  return { cookie };
}

function buildFormData(fields) {
  const boundary = `----WebKitFormBoundary${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const body = fields.map(({ name, value = '' }) => (
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
  )).join('') + `--${boundary}--\r\n`;
  return { boundary, body };
}

/**
 * Normalize a pine ID to standard format
 * @param {string} pineId - Raw pine ID
 * @returns {string} Normalized pine ID
 */
function normalizePineId(pineId) {
  if (!pineId) return '';
  let normalized = String(pineId).trim();
  // Decode URL-encoded semicolons
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // ignore decode errors
  }
  normalized = normalized.replace(/%3B/gi, ';');
  // Fix double prefix like USER;USER;
  normalized = normalized.replace(/^(USER;)+/i, 'USER;');
  normalized = normalized.replace(/^(PUB;)+/i, 'PUB;');
  normalized = normalized.replace(/^(STD;)+/i, 'STD;');
  return normalized;
}

/**
 * Extract pine ID from source code comment
 * @param {string} source - Pine Script source
 * @returns {string|null} Extracted pine ID or null
 */
function extractPineIdFromSource(source) {
  const patterns = [
    /(?:^|\n)\s*(?:\/\/\s*)?(?:@?pineId\b\s*(?::|=)?\s*)(?:"|')?\s*((?:USER|PUB|STD|INDIC);[^\s"'<>]+)/i,
    /(?:^|\n)\s*(?:\/\/\s*)?Pine ID:\s*((?:USER|PUB|STD|INDIC);[^\s\n]+)/i,
    /(?:^|\n)\s*(?:\/\*\s*)?Pine ID:\s*((?:USER|PUB|STD|INDIC);[^\s*]+)/i,
  ];
  for (const pattern of patterns) {
    const match = String(source).match(pattern);
    if (match) return normalizePineId(match[1]);
  }
  return null;
}

/**
 * Determine if a script is a strategy based on its metadata
 * @param {Object} metaInfo - Meta info from translate response
 * @returns {boolean}
 */
function isStrategy(metaInfo = {}) {
  if (metaInfo.isStrategy) return true;
  if (metaInfo.scriptKind === 'strategy') return true;
  // Check for strategy-specific properties
  const hasStrategyInputs = metaInfo.inputs?.some(i => 
    i.id?.startsWith('strategy_') || 
    i.internalID?.startsWith('strategy_')
  );
  if (hasStrategyInputs) return true;
  // Check type
  if (metaInfo.type === 'strategy') return true;
  return false;
}

/**
 * Determine if a script is an indicator/study
 * @param {Object} metaInfo - Meta info from translate response
 * @returns {boolean}
 */
function isIndicator(metaInfo = {}) {
  if (metaInfo.isIndicator) return true;
  if (metaInfo.scriptKind === 'study') return true;
  if (metaInfo.type === 'study') return true;
  return !isStrategy(metaInfo);
}

/**
 * Parse input type and extract constraints
 * @param {Object} input - Raw input from metaInfo
 * @returns {PineScriptInput}
 */
function parseInput(input) {
  const result = {
    id: input.id,
    name: input.name || input.id,
    inline: input.inline || input.name?.replace(/[^a-zA-Z0-9_]/g, '_') || input.id,
    internalID: input.internalID,
    type: input.type || 'text',
    defval: input.defval,
    value: input.defval, // Current value starts as default
    tooltip: input.tooltip,
    isHidden: !!input.isHidden,
    isFake: !!input.isFake,
    group: input.group,
    line: input.line,
    confirm: input.confirm,
  };

  // Extract constraints based on type
  if (input.minval !== undefined) result.min = input.minval;
  if (input.maxval !== undefined) result.max = input.maxval;
  if (input.step !== undefined) result.step = input.step;
  if (input.options !== undefined) result.options = input.options;
  if (input.display !== undefined) result.display = input.display;
  if (input.defvalSrc !== undefined) result.defvalSrc = input.defvalSrc;

  return result;
}

/**
 * Build input schema for validation/documentation
 * @param {PineScriptInput} input - Parsed input
 * @returns {InputSchema}
 */
function buildInputSchema(input) {
  const schema = {
    id: input.id,
    name: input.name,
    type: input.type,
    defaultValue: input.defval,
    description: input.tooltip,
    group: input.group,
    isHidden: input.isHidden,
    isFake: input.isFake,
  };

  // Build constraints
  const constraints = {};
  if (input.min !== undefined) constraints.min = input.min;
  if (input.max !== undefined) constraints.max = input.max;
  if (input.step !== undefined) constraints.step = input.step;
  if (input.options !== undefined) constraints.options = input.options;
  
  if (Object.keys(constraints).length > 0) {
    schema.constraints = constraints;
  }

  return schema;
}

/**
 * Extract default values object from inputs
 * @param {Array<PineScriptInput>} inputs - Parsed inputs
 * @returns {Object} Object with input IDs as keys and default values
 */
function extractDefaultValues(inputs) {
  const defaults = {};
  for (const input of inputs) {
    if (!input.isFake && input.defval !== undefined) {
      defaults[input.id] = input.defval;
    }
  }
  return defaults;
}

/**
 * Parse translate endpoint response into structured metadata
 * @param {Object} response - Raw translate response
 * @param {string} [source] - Original source code
 * @returns {PineScriptMetadata|null}
 */
function parseTranslateResponse(response, source = '') {
  if (!response) return null;

  // Handle both direct response and wrapped response
  const data = response.result || response;
  const metaInfo = data.metaInfo || data;

  if (!metaInfo || !metaInfo.inputs) {
    return null;
  }

  // Parse inputs
  const inputsList = [];
  const inputs = {};
  
  for (const rawInput of metaInfo.inputs) {
    // Skip internal inputs
    if (['text', 'pineId', 'pineVersion'].includes(rawInput.id)) continue;
    
    const parsed = parseInput(rawInput);
    inputsList.push(parsed);
    inputs[parsed.id] = parsed;
  }

  // Parse styles
  const styles = {};
  if (metaInfo.styles) {
    for (const [id, style] of Object.entries(metaInfo.styles)) {
      styles[id] = {
        id,
        title: style.title || id,
        ...style,
      };
    }
  }

  // Parse plots
  const plots = [];
  if (metaInfo.plots) {
    for (const plot of metaInfo.plots) {
      plots.push({
        id: plot.id,
        type: plot.type,
        target: plot.target,
        title: plot.title,
      });
    }
  }

  // Build metadata
  const meta = {
    pineId: metaInfo.scriptIdPart || metaInfo.id || '',
    scriptIdPart: metaInfo.scriptIdPart || '',
    name: metaInfo.scriptName || metaInfo.name || metaInfo.description || '',
    description: metaInfo.description || '',
    shortDescription: metaInfo.shortDescription || metaInfo.short_description || '',
    version: metaInfo.version || '1.0',
    pineVersion: metaInfo.pine?.version || metaInfo.pineVersion || '',
    author: metaInfo.author?.username || metaInfo.author || '',
    type: isStrategy(metaInfo) ? 'strategy' : 'study',
    access: metaInfo.access || 'unknown',
    isStrategy: isStrategy(metaInfo),
    isIndicator: isIndicator(metaInfo),
    features: metaInfo.pine?.features || metaInfo.features || [],
    defaults: extractDefaultValues(inputsList),
  };

  // Strategy-specific info
  let strategy = null;
  if (meta.isStrategy) {
    strategy = {
      currency: metaInfo.strategy?.currency,
      defaultQtyValue: metaInfo.strategy?.defaultQtyValue,
      defaultQtyType: metaInfo.strategy?.defaultQtyType,
      pyramiding: metaInfo.strategy?.pyramiding,
      calcOnEveryTick: metaInfo.strategy?.calcOnEveryTick,
      calcOnOrderFills: metaInfo.strategy?.calcOnOrderFills,
      closeEntriesRule: metaInfo.strategy?.closeEntriesRule,
      commissionType: metaInfo.strategy?.commissionType,
      commissionValue: metaInfo.strategy?.commissionValue,
      initialCapital: metaInfo.strategy?.initialCapital,
      maxLinesCount: metaInfo.strategy?.maxLinesCount,
      maxLabelsCount: metaInfo.strategy?.maxLabelsCount,
      maxBoxesCount: metaInfo.strategy?.maxBoxesCount,
      maxTablesCount: metaInfo.strategy?.maxTablesCount,
      maxLinesBack: metaInfo.strategy?.maxLinesBack,
      processOrdersOnClose: metaInfo.strategy?.processOrdersOnClose,
      riskFreeRate: metaInfo.strategy?.riskFreeRate,
      slippage: metaInfo.strategy?.slippage,
      marginLong: metaInfo.strategy?.marginLong,
      marginShort: metaInfo.strategy?.marginShort,
      reverse: metaInfo.strategy?.reverse,
    };
  }

  return {
    meta,
    inputs,
    inputsList,
    styles,
    plots,
    strategy,
    source: source || data.source || '',
    ilTemplate: data.ilTemplate || '',
    raw: response,
  };
}

/**
 * Get comprehensive script metadata using translate endpoint
 * @param {string} pineId - Script ID
 * @param {string} [version] - Version (default: 'last')
 * @param {Object} credentials - Session credentials
 * @param {string} credentials.session - Session ID
 * @param {string} [credentials.signature] - Session signature
 * @returns {Promise<PineScriptMetadata>}
 */
async function getScriptMetadata(pineId, version = 'last', credentials = {}) {
  const normalizedId = normalizePineId(pineId);
  
  const { data } = await http.get(
    `${PINE_FACADE_BASE}/translate/${encodeURIComponent(normalizedId)}/${encodeURIComponent(version)}`,
    {
      headers: buildAuthHeaders(credentials),
    }
  );

  if (!data.success && !data.metaInfo) {
    throw new Error(`Failed to get script metadata: ${data.reason || 'Unknown error'}`);
  }

  const metadata = parseTranslateResponse(data);
  if (!metadata) {
    throw new Error('Failed to parse script metadata');
  }

  return metadata;
}

/**
 * Get script metadata from source code (compile and analyze)
 * @param {string} source - Pine Script source code
 * @param {Object} options
 * @param {string} [options.userName] - TradingView username
 * @param {Object} [options.credentials] - Session credentials
 * @returns {Promise<PineScriptMetadata>}
 */
async function getScriptMetadataFromSource(source, options = {}) {
  const { userName = '', credentials } = options;
  
  const { boundary, body } = buildFormData([{ name: 'source', value: source }]);
  
  const params = { v: 3 };
  if (userName) params.user_name = userName;

  const { data } = await http.post(
    `${PINE_FACADE_BASE}/translate_light`,
    body,
    {
      params,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        ...buildAuthHeaders(credentials),
      },
    }
  );

  // Handle compilation errors
  if (data.success === false) {
    const errors = data.result?.errors || [];
    const errorMessage = errors.map(e => 
      `Line ${e.start?.line || '?'}: ${e.message}`
    ).join('\n');
    throw new Error(`Compilation failed:\n${errorMessage}`);
  }

  const metadata = parseTranslateResponse(data, source);
  if (!metadata) {
    throw new Error('Failed to parse script metadata from source');
  }

  return metadata;
}

/**
 * Get input schema for a script (useful for building forms/validation)
 * @param {string} pineId - Script ID
 * @param {string} [version] - Version
 * @param {Object} credentials - Session credentials
 * @returns {Promise<Object>}
 */
async function getScriptInputSchema(pineId, version = 'last', credentials = {}) {
  const metadata = await getScriptMetadata(pineId, version, credentials);
  
  const schema = {
    scriptId: metadata.meta.pineId,
    scriptName: metadata.meta.name,
    scriptType: metadata.meta.type,
    version: metadata.meta.version,
    inputs: {},
    groups: [],
  };

  // Group inputs
  const groups = new Map();
  for (const input of metadata.inputsList) {
    const groupName = input.group || 'General';
    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }
    groups.get(groupName).push(buildInputSchema(input));
  }

  // Build final schema
  for (const [groupName, inputs] of groups) {
    schema.groups.push({
      name: groupName,
      inputs,
    });
    for (const input of inputs) {
      schema.inputs[input.id] = input;
    }
  }

  // Add strategy config if applicable
  if (metadata.strategy) {
    schema.strategy = metadata.strategy;
  }

  return schema;
}

/**
 * Get all scripts with their metadata for a user
 * @param {Object} credentials - Session credentials
 * @param {string} credentials.session - Session ID
 * @param {string} [credentials.signature] - Session signature
 * @returns {Promise<Array<PineScriptMetadata>>}
 */
async function getAllScriptsMetadata(credentials = {}) {
  const { data } = await http.get(
    `${PINE_FACADE_BASE}/list`,
    {
      headers: buildAuthHeaders(credentials),
      params: { filter: 'saved' },
    }
  );

  const scripts = Array.isArray(data) ? data : [];
  const results = [];

  for (const script of scripts) {
    try {
      const pineId = script.scriptIdPart;
      if (!pineId) continue;

      const metadata = await getScriptMetadata(
        pineId,
        script.version || 'last',
        credentials
      );
      results.push(metadata);
    } catch (err) {
      // Skip scripts that fail to load
      console.warn(`Failed to load metadata for ${script.scriptIdPart}: ${err.message}`);
    }
  }

  return results;
}

/**
 * Create a PineIndicator instance from metadata
 * @param {PineScriptMetadata} metadata - Script metadata
 * @returns {PineIndicator}
 */
function createIndicatorFromMetadata(metadata) {
  const indicatorInputs = {};
  
  for (const input of metadata.inputsList) {
    if (input.isFake) continue;
    
    indicatorInputs[input.id] = {
      name: input.name,
      inline: input.inline,
      internalID: input.internalID,
      tooltip: input.tooltip,
      type: input.type,
      value: input.defval,
      isHidden: input.isHidden,
      isFake: input.isFake,
    };

    if (input.options) {
      indicatorInputs[input.id].options = input.options;
    }
  }

  const plots = {};
  for (const plot of metadata.plots) {
    if (plot.target) {
      plots[plot.id] = `${plots[plot.target] || plot.target}_${plot.type}`;
    }
  }

  return new PineIndicator({
    pineId: metadata.meta.pineId,
    pineVersion: metadata.meta.version,
    description: metadata.meta.description,
    shortDescription: metadata.meta.shortDescription,
    inputs: indicatorInputs,
    plots,
    script: metadata.ilTemplate,
  });
}

/**
 * Extract inputs from source code using regex parsing (fallback method)
 * @param {string} source - Pine Script source
 * @returns {Array<Object>} Extracted inputs
 */
function extractInputsFromSource(source) {
  const inputs = [];
  const assignmentRegex = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(input(?:\.[A-Za-z_][A-Za-z0-9_]*)?)/g;
  let m;

  while ((m = assignmentRegex.exec(source)) !== null) {
    try {
      const varName = m[1];
      const funcName = m[2];
      const startPos = assignmentRegex.lastIndex;

      const parenIndex = source.indexOf('(', startPos);
      if (parenIndex < 0) continue;

      let depth = 1, i = parenIndex + 1;
      for (; i < source.length && depth > 0; i++) {
        if (source[i] === '(') depth++;
        else if (source[i] === ')') depth--;
      }
      if (depth !== 0) continue;

      const inner = source.slice(parenIndex + 1, i - 1);
      const parsed = parseInputArgsFromSource(inner);

      let type = null;
      const fnMatch = funcName.match(/input\.([A-Za-z_][A-Za-z0-9_]*)/);
      if (fnMatch) type = fnMatch[1];

      inputs.push({
        id: varName,
        name: parsed.title || varName,
        type,
        default: parsed.defval,
        min: parsed.minval,
        max: parsed.maxval,
        step: parsed.step,
        options: parsed.options,
      });

      assignmentRegex.lastIndex = i;
    } catch {}
  }

  return inputs;
}

function parseInputArgsFromSource(argsStr) {
  const result = { defval: undefined, title: null, minval: null, maxval: null, step: null, options: null };
  const tokens = tokenizeArgs(argsStr);

  let positionalIndex = 0;
  for (const token of tokens) {
    if (token.includes('=')) {
      const [key, ...rest] = token.split('=');
      const val = rest.join('=').trim();
      const k = key.trim();
      if (k === 'defval') result.defval = parseValue(val);
      else if (k === 'title') result.title = parseValue(val);
      else if (k === 'minval') result.minval = parseValue(val);
      else if (k === 'maxval') result.maxval = parseValue(val);
      else if (k === 'step') result.step = parseValue(val);
      else if (k === 'options') result.options = parseValue(val);
    } else {
      if (positionalIndex === 0) result.defval = parseValue(token);
      else if (positionalIndex === 1 && result.title == null) result.title = parseValue(token);
      positionalIndex++;
    }
  }

  return result;
}

function tokenizeArgs(str) {
  const tokens = [];
  let cur = '', depth = 0, inString = null;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (!inString && (c === '"' || c === "'")) inString = c;
    else if (inString === c) inString = null;
    else if (!inString && (c === '(' || c === '[')) depth++;
    else if (!inString && (c === ')' || c === ']')) depth--;
    else if (!inString && depth === 0 && c === ',') {
      if (cur.trim()) tokens.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim()) tokens.push(cur.trim());
  return tokens;
}

function parseValue(v) {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (/^(true|false)$/i.test(s)) return s.toLowerCase() === 'true';
  if (/^[+-]?\d+$/.test(s)) return Number(s);
  if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) return Number(s);
  if (/^["'].*["']$/.test(s)) return s.slice(1, -1);
  if (/^\[.*\]$/.test(s)) {
    try {
      return JSON.parse(s.replace(/'/g, '"'));
    } catch { return s; }
  }
  return s;
}

/**
 * Generate default inputs configuration object
 * @param {PineScriptMetadata} metadata - Script metadata
 * @returns {Object} Default inputs configuration
 */
function generateDefaultInputs(metadata) {
  const config = {};
  for (const input of metadata.inputsList) {
    if (!input.isFake && input.defval !== undefined) {
      config[input.id] = input.defval;
    }
  }
  return config;
}

/**
 * Validate input values against schema
 * @param {Object} values - Input values to validate
 * @param {PineScriptMetadata} metadata - Script metadata
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
function validateInputValues(values, metadata) {
  const errors = [];
  
  for (const [key, value] of Object.entries(values)) {
    const input = metadata.inputs[key];
    if (!input) {
      errors.push({ input: key, message: 'Unknown input' });
      continue;
    }

    // Type validation
    const typeMap = {
      integer: 'number',
      float: 'number',
      bool: 'boolean',
      text: 'string',
      color: 'string',
      source: 'string',
      resolution: 'string',
    };

    const expectedType = typeMap[input.type] || 'string';
    const actualType = typeof value;
    
    if (expectedType !== actualType && !(expectedType === 'number' && actualType === 'number')) {
      errors.push({ 
        input: key, 
        message: `Expected ${expectedType}, got ${actualType}` 
      });
      continue;
    }

    // Range validation for numbers
    if (input.type === 'integer' || input.type === 'float') {
      if (input.min !== undefined && value < input.min) {
        errors.push({ 
          input: key, 
          message: `Value ${value} is below minimum ${input.min}` 
        });
      }
      if (input.max !== undefined && value > input.max) {
        errors.push({ 
          input: key, 
          message: `Value ${value} is above maximum ${input.max}` 
        });
      }
    }

    // Options validation
    if (input.options && !input.options.includes(value)) {
      errors.push({ 
        input: key, 
        message: `Value must be one of: ${input.options.join(', ')}` 
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * High-level wrapper for pine script operations with enhanced metadata
 * @param {Object} defaults - Default options
 * @returns {Object} Enhanced pine client
 */
function createEnhancedPineClient(defaults = {}) {
  return {
    // Metadata operations
    getMetadata: (pineId, version = 'last', opts = {}) => 
      getScriptMetadata(pineId, version, { ...defaults.credentials, ...opts.credentials }),
    
    getMetadataFromSource: (source, opts = {}) => 
      getScriptMetadataFromSource(source, { 
        userName: defaults.userName,
        credentials: defaults.credentials,
        ...opts 
      }),
    
    getInputSchema: (pineId, version = 'last', opts = {}) => 
      getScriptInputSchema(pineId, version, { ...defaults.credentials, ...opts.credentials }),
    
    getAllMetadata: (opts = {}) => 
      getAllScriptsMetadata({ ...defaults.credentials, ...opts.credentials }),
    
    // Source extraction
    extractInputsFromSource: (source) => extractInputsFromSource(source),
    extractPineIdFromSource: (source) => extractPineIdFromSource(source),
    normalizePineId: (pineId) => normalizePineId(pineId),
    
    // Input utilities (legacy format)
    generateDefaultInputs: (metadata) => generateDefaultInputs(metadata),
    validateInputs: (values, metadata) => validateInputValues(values, metadata),
    createIndicator: (metadata) => createIndicatorFromMetadata(metadata),
    
    // Human-readable input management (NEW)
    describeInputs: (metadata) => inputUtils.describeInputs(metadata),
    groupInputs: (metadata) => inputUtils.groupInputsByCategory(metadata),
    searchInputs: (metadata, term) => inputUtils.searchInputs(metadata, term),
    
    /**
     * Convert friendly config to runtime format
     * @param {Object} config - { rsiLength: 14, "RSI Length": 14, in_0: 14 }
     * @param {Object} metadata - Script metadata
     * @returns {Object} { in_0: 14 }
     */
    toRuntimeConfig: (config, metadata) => inputUtils.toRuntimeFormat(config, metadata),
    
    /**
     * Convert runtime config to friendly format
     * @param {Object} config - { in_0: 14 }
     * @param {Object} metadata - Script metadata
     * @param {string} format - 'variable' | 'display' | 'internal'
     * @returns {Object} { rsiLength: 14 } or { "RSI Length": 14 }
     */
    fromRuntimeConfig: (config, metadata, format = 'variable') => 
      inputUtils.fromRuntimeFormat(config, metadata, format),
    
    /**
     * Get defaults with friendly names
     * @param {Object} metadata - Script metadata
     * @param {string} format - 'variable' | 'display' | 'internal'
     * @returns {Object} Defaults with friendly keys
     */
    getFriendlyDefaults: (metadata, format = 'variable') => 
      inputUtils.getFriendlyDefaults(metadata, format),
    
    /**
     * Create a configuration builder for fluent API
     * @param {Object} metadata - Script metadata
     * @returns {Object} Config builder
     */
    createConfigBuilder: (metadata) => inputUtils.createConfigBuilder(metadata),
    
    /**
     * Validate and normalize configuration
     * @param {Object} config - User configuration
     * @param {Object} metadata - Script metadata
     * @returns {Object} Validation result
     */
    validateConfig: (config, metadata) => inputUtils.validateAndNormalizeConfig(config, metadata),
    
    /**
     * Build complete TradingView-ready config
     * @param {Object} userConfig - User's friendly config
     * @param {Object} metadata - Script metadata
     * @returns {Object} Complete runtime config merged with defaults
     */
    buildConfig: (userConfig, metadata) => inputUtils.buildTradingViewConfig(userConfig, metadata),
    
    // Pass-through to original pine functions
    listVersions: (pineId, opts = {}) => {
      const { listScriptVersions } = require('./pine');
      return listScriptVersions(pineId, { ...defaults.credentials, ...opts.credentials });
    },
    
    getVersion: (pineId, version, opts = {}) => {
      const { getScriptVersion } = require('./pine');
      return getScriptVersion(pineId, version, { ...defaults.credentials, ...opts.credentials });
    },
    
    saveNew: (name, source, opts = {}) => {
      const { saveScriptNew } = require('./pine');
      return saveScriptNew({
        name,
        source,
        userName: defaults.userName,
        credentials: defaults.credentials,
        ...opts,
      });
    },
    
    delete: (pineId, version, opts = {}) => {
      const { deleteScriptVersion } = require('./pine');
      return deleteScriptVersion(pineId, version, { ...defaults.credentials, ...opts.credentials });
    },
  };
}

const inputUtils = require('./pine-inputs');

module.exports = {
  // Core functions
  getScriptMetadata,
  getScriptMetadataFromSource,
  getScriptInputSchema,
  getAllScriptsMetadata,
  
  // Utility functions
  parseTranslateResponse,
  extractInputsFromSource,
  extractPineIdFromSource,
  normalizePineId,
  createIndicatorFromMetadata,
  generateDefaultInputs,
  validateInputValues,
  isStrategy,
  isIndicator,
  
  // Client factory
  createEnhancedPineClient,
  
  // Human-readable input management (new)
  ...inputUtils,
  
  // Types (for documentation)
  // @ts-ignore
  PineScriptMetadata: null,
  // @ts-ignore
  PineScriptInput: null,
  // @ts-ignore
  InputSchema: null,
};
