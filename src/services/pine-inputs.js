/**
 * Pine Script Input Management - Human-Readable API
 * 
 * Provides intuitive input handling with bidirectional mapping between:
 * - Human-readable names (e.g., "rsiLength", "Fast MA")
 * - Source variable names (e.g., "fastLength")
 * - TradingView runtime IDs (e.g., "in_0", "in_1")
 * - Internal IDs (e.g., "RSI_Length", "Fast_MA")
 */

/**
 * @typedef {Object} InputMapping
 * @prop {string} runtimeId - TradingView runtime ID (in_0, in_1, etc.)
 * @prop {string} variableName - Source variable name (rsiLength, fastMA, etc.)
 * @prop {string} displayName - Human-readable display name ("RSI Length", "Fast MA")
 * @prop {string} [internalId] - Internal/inline ID (RSI_Length, Fast_MA)
 * @prop {string} type - Input type
 * @prop {*} defaultValue - Default value
 * @prop {string} [group] - Input group
 * @prop {number} index - Input order index
 */

/**
 * @typedef {Object} FriendlyInputConfig
 * @prop {string} name - Human-readable name
 * @prop {string} [variable] - Source variable name
 * @prop {*} value - Input value
 * @prop {string} type - Input type
 * @prop {string} [group] - Input group
 */

/**
 * Build a comprehensive input mapping from metadata
 * @param {Object} metadata - PineScriptMetadata object
 * @returns {Map<string, InputMapping>} Bidirectional mapping
 */
function buildInputMapping(metadata) {
  const mapping = new Map();
  
  if (!metadata?.inputsList) return mapping;

  metadata.inputsList.forEach((input, index) => {
    // Skip fake/internal inputs
    if (input.isFake) return;

    const entry = {
      runtimeId: input.id,                    // in_0, in_1
      variableName: input.inline,             // rsiLength, fastMA
      displayName: input.name,                // "RSI Length", "Fast MA"
      internalId: input.internalID,           // RSI_Length, Fast_MA
      type: input.type,
      defaultValue: input.defval,
      tooltip: input.tooltip,
      group: input.group || 'General',
      index,
      constraints: {
        min: input.min,
        max: input.max,
        step: input.step,
        options: input.options,
      },
    };

    // Register all lookup keys pointing to the same entry
    mapping.set(input.id, entry);                    // by runtime ID
    mapping.set(input.inline, entry);                // by variable name
    mapping.set(input.name, entry);                  // by display name
    if (input.internalID) mapping.set(input.internalID, entry);  // by internal ID
    
    // Also register normalized (lowercase, no spaces) versions
    mapping.set(normalizeKey(input.inline), entry);
    mapping.set(normalizeKey(input.name), entry);
    if (input.internalID) mapping.set(normalizeKey(input.internalID), entry);
  });

  return mapping;
}

/**
 * Normalize a key for case-insensitive lookup
 * @param {string} key - Input key
 * @returns {string} Normalized key
 */
function normalizeKey(key) {
  return String(key || '').toLowerCase()
    .replace(/[^a-z0-9]/g, '')  // Remove non-alphanumeric
    .replace(/_+/g, '');         // Remove underscores for fuzzy matching
}

/**
 * Find an input mapping by any identifier
 * @param {Map<string, InputMapping>} mapping - Input mapping
 * @param {string} identifier - Any form of input identifier
 * @returns {InputMapping|null}
 */
function findInputMapping(mapping, identifier) {
  if (!identifier) return null;
  
  // Try direct lookup first
  if (mapping.has(identifier)) return mapping.get(identifier);
  
  // Try normalized lookup
  const normalized = normalizeKey(identifier);
  if (mapping.has(normalized)) return mapping.get(normalized);
  
  // Try fuzzy matching (partial matches)
  for (const [key, entry] of mapping) {
    if (key.includes(identifier.toLowerCase()) || 
        identifier.toLowerCase().includes(key)) {
      return entry;
    }
  }
  
  return null;
}

/**
 * Convert human-friendly input configuration to TradingView runtime format
 * @param {Object} friendlyConfig - { rsiLength: 14, overbought: 70 } or { "RSI Length": 14 }
 * @param {Object} metadata - PineScriptMetadata
 * @returns {Object} { in_0: 14, in_1: 70 }
 */
function toRuntimeFormat(friendlyConfig, metadata) {
  const mapping = buildInputMapping(metadata);
  const result = {};
  const unresolved = [];

  for (const [key, value] of Object.entries(friendlyConfig)) {
    const entry = findInputMapping(mapping, key);
    
    if (entry) {
      result[entry.runtimeId] = value;
    } else {
      unresolved.push(key);
      // If key looks like a runtime ID (in_\d+), keep it as-is
      if (/^in_\d+$/.test(key)) {
        result[key] = value;
      }
    }
  }

  if (unresolved.length > 0) {
    console.warn(`Warning: Could not resolve inputs: ${unresolved.join(', ')}`);
  }

  return result;
}

/**
 * Convert TradingView runtime format to human-friendly format
 * @param {Object} runtimeConfig - { in_0: 14, in_1: 70 }
 * @param {Object} metadata - PineScriptMetadata
 * @param {string} [nameFormat='variable'] - 'variable' | 'display' | 'internal'
 * @returns {Object} { rsiLength: 14 } or { "RSI Length": 14 }
 */
function fromRuntimeFormat(runtimeConfig, metadata, nameFormat = 'variable') {
  const mapping = buildInputMapping(metadata);
  const result = {};

  for (const [runtimeId, value] of Object.entries(runtimeConfig)) {
    const entry = mapping.get(runtimeId);
    
    if (entry) {
      let key;
      switch (nameFormat) {
        case 'display':
          key = entry.displayName;
          break;
        case 'internal':
          key = entry.internalId || entry.variableName;
          break;
        case 'variable':
        default:
          key = entry.variableName;
          break;
      }
      result[key] = {
        value,
        type: entry.type,
        group: entry.group,
        runtimeId: entry.runtimeId,
      };
    } else {
      // Keep as-is if no mapping found
      result[runtimeId] = value;
    }
  }

  return result;
}

/**
 * Get default values with human-readable keys
 * @param {Object} metadata - PineScriptMetadata
 * @param {string} [nameFormat='variable'] - Key format preference
 * @returns {Object} Defaults with friendly keys
 */
function getFriendlyDefaults(metadata, nameFormat = 'variable') {
  const mapping = buildInputMapping(metadata);
  const result = {};

  for (const entry of mapping.values()) {
    // Skip duplicates (mapping has multiple keys per entry)
    if (result[entry.variableName]) continue;

    let key;
    switch (nameFormat) {
      case 'display':
        key = entry.displayName;
        break;
      case 'internal':
        key = entry.internalId || entry.variableName;
        break;
      case 'variable':
      default:
        key = entry.variableName;
        break;
    }

    result[key] = entry.defaultValue;
  }

  return result;
}

/**
 * Build a configuration object ready for TradingView API
 * @param {Object} userConfig - User's config with friendly names
 * @param {Object} metadata - PineScriptMetadata
 * @returns {Object} Complete runtime configuration
 */
function buildTradingViewConfig(userConfig, metadata) {
  const defaults = metadata.meta?.defaults || {};
  const runtimeDefaults = {};
  
  // Convert defaults to runtime format if needed
  const mapping = buildInputMapping(metadata);
  for (const [key, value] of Object.entries(defaults)) {
    runtimeDefaults[key] = value;
  }

  // Convert user config to runtime format
  const runtimeConfig = toRuntimeFormat(userConfig, metadata);

  // Merge with defaults
  return {
    ...runtimeDefaults,
    ...runtimeConfig,
  };
}

/**
 * Create a rich input descriptor with all name formats
 * @param {Object} metadata - PineScriptMetadata
 * @returns {Array<FriendlyInputConfig>} Rich input descriptors
 */
function describeInputs(metadata) {
  const mapping = buildInputMapping(metadata);
  const seen = new Set();
  const result = [];

  for (const entry of mapping.values()) {
    // Skip duplicates
    if (seen.has(entry.runtimeId)) continue;
    seen.add(entry.runtimeId);

    result.push({
      runtimeId: entry.runtimeId,
      variableName: entry.variableName,
      displayName: entry.displayName,
      internalId: entry.internalId,
      type: entry.type,
      defaultValue: entry.defaultValue,
      currentValue: entry.defaultValue,
      group: entry.group,
      tooltip: entry.tooltip,
      constraints: entry.constraints,
      index: entry.index,
      // Helper to set value
      setValue: function(val) { this.currentValue = val; return this; },
      // Helper to get runtime key/value pair
      toRuntime: function() { return { [this.runtimeId]: this.currentValue }; },
    });
  }

  // Sort by original index
  return result.sort((a, b) => a.index - b.index);
}

/**
 * Group inputs by their group property
 * @param {Object} metadata - PineScriptMetadata
 * @returns {Object} { groupName: [inputs] }
 */
function groupInputsByCategory(metadata) {
  const descriptions = describeInputs(metadata);
  const groups = {};

  for (const input of descriptions) {
    const groupName = input.group || 'General';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(input);
  }

  return groups;
}

/**
 * Find input by partial name match (fuzzy search)
 * @param {Object} metadata - PineScriptMetadata
 * @param {string} searchTerm - Search term
 * @returns {Array<FriendlyInputConfig>} Matching inputs
 */
function searchInputs(metadata, searchTerm) {
  const descriptions = describeInputs(metadata);
  const term = searchTerm.toLowerCase();

  return descriptions.filter(input => 
    input.displayName.toLowerCase().includes(term) ||
    input.variableName.toLowerCase().includes(term) ||
    (input.internalId && input.internalId.toLowerCase().includes(term)) ||
    input.runtimeId.toLowerCase().includes(term)
  );
}

/**
 * Validate and normalize input configuration
 * @param {Object} config - User configuration
 * @param {Object} metadata - PineScriptMetadata
 * @returns {Object} Validation result with normalized config
 */
function validateAndNormalizeConfig(config, metadata) {
  const mapping = buildInputMapping(metadata);
  const normalized = {};
  const errors = [];
  const warnings = [];

  for (const [key, value] of Object.entries(config)) {
    const entry = findInputMapping(mapping, key);

    if (!entry) {
      // Check if it's already a runtime ID
      if (/^in_\d+$/.test(key)) {
        normalized[key] = value;
      } else {
        errors.push({
          key,
          value,
          message: `Unknown input: "${key}"`,
          suggestion: findSimilarInputs(key, metadata),
        });
      }
      continue;
    }

    // Type validation
    const typeError = validateType(value, entry.type, entry.displayName);
    if (typeError) {
      errors.push({ key, value, message: typeError });
      continue;
    }

    // Range validation
    if (entry.constraints) {
      const rangeError = validateRange(value, entry.constraints, entry.displayName);
      if (rangeError) {
        errors.push({ key, value, message: rangeError });
        continue;
      }
    }

    // Options validation
    if (entry.constraints?.options && !entry.constraints.options.includes(value)) {
      errors.push({
        key,
        value,
        message: `"${entry.displayName}" must be one of: ${entry.constraints.options.join(', ')}`,
      });
      continue;
    }

    normalized[entry.runtimeId] = value;
  }

  return {
    valid: errors.length === 0,
    normalized,
    errors,
    warnings,
    // Include defaults for missing inputs
    complete: { ...metadata.meta?.defaults, ...normalized },
  };
}

/**
 * Find similar input names for typo suggestions
 * @param {string} key - Input key that wasn't found
 * @param {Object} metadata - PineScriptMetadata
 * @returns {string[]} Suggested similar names
 */
function findSimilarInputs(key, metadata) {
  const descriptions = describeInputs(metadata);
  const target = key.toLowerCase();
  
  return descriptions
    .map(d => ({
      name: d.variableName,
      score: similarityScore(target, d.variableName.toLowerCase()),
    }))
    .filter(s => s.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.name);
}

/**
 * Calculate simple similarity score
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score (0-1)
 */
function similarityScore(a, b) {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  
  // Count common characters
  const aChars = new Set(a);
  const common = [...b].filter(c => aChars.has(c)).length;
  return common / Math.max(a.length, b.length);
}

/**
 * Validate value type
 * @param {*} value - Value to validate
 * @param {string} type - Expected type
 * @param {string} name - Input name for error message
 * @returns {string|null} Error message or null if valid
 */
function validateType(value, type, name) {
  const typeMap = {
    integer: 'number',
    float: 'number',
    bool: 'boolean',
    text: 'string',
    string: 'string',
    color: 'string',
    source: 'string',
    resolution: 'string',
    symbol: 'string',
    time: 'number',
  };

  const expectedType = typeMap[type] || 'string';
  const actualType = typeof value;

  if (expectedType === 'number') {
    if (typeof value !== 'number' || isNaN(value)) {
      return `"${name}" must be a number, got ${actualType}`;
    }
  } else if (expectedType !== actualType) {
    return `"${name}" must be a ${expectedType}, got ${actualType}`;
  }

  return null;
}

/**
 * Validate value range
 * @param {number} value - Value to validate
 * @param {Object} constraints - Constraints object
 * @param {string} name - Input name for error message
 * @returns {string|null} Error message or null if valid
 */
function validateRange(value, constraints, name) {
  if (typeof value !== 'number') return null;

  if (constraints.min !== undefined && constraints.min !== null) {
    if (value < constraints.min) {
      return `"${name}" value ${value} is below minimum ${constraints.min}`;
    }
  }

  if (constraints.max !== undefined && constraints.max !== null) {
    if (value > constraints.max) {
      return `"${name}" value ${value} is above maximum ${constraints.max}`;
    }
  }

  return null;
}

/**
 * Create an interactive configuration builder
 * @param {Object} metadata - PineScriptMetadata
 * @returns {Object} Configuration builder API
 */
function createConfigBuilder(metadata) {
  const mapping = buildInputMapping(metadata);
  const config = {};

  const builder = {
    /**
     * Set an input value by any identifier
     * @param {string} name - Input name (variable, display, or runtime)
     * @param {*} value - Input value
     * @returns {Object} Builder for chaining
     */
    set(name, value) {
      const entry = findInputMapping(mapping, name);
      if (!entry) {
        throw new Error(`Unknown input: "${name}". Did you mean: ${findSimilarInputs(name, metadata).join(', ')}?`);
      }
      config[entry.runtimeId] = value;
      return builder;
    },

    /**
     * Set multiple values at once
     * @param {Object} values - { name: value }
     * @returns {Object} Builder for chaining
     */
    setMany(values) {
      for (const [name, value] of Object.entries(values)) {
        this.set(name, value);
      }
      return builder;
    },

    /**
     * Get current configuration
     * @returns {Object} Runtime format config
     */
    build() {
      return { ...metadata.meta?.defaults, ...config };
    },

    /**
     * Get configuration with friendly names
     * @param {string} [format='variable'] - Name format
     * @returns {Object} Friendly format config
     */
    buildFriendly(format = 'variable') {
      return fromRuntimeFormat(this.build(), metadata, format);
    },

    /**
     * Reset to defaults
     * @returns {Object} Builder for chaining
     */
    reset() {
      Object.keys(config).forEach(key => delete config[key]);
      return builder;
    },

    /**
     * Get available inputs
     * @returns {Array} Input descriptors
     */
    getInputs() {
      return describeInputs(metadata);
    },

    /**
     * Get input groups
     * @returns {Object} Grouped inputs
     */
    getGroups() {
      return groupInputsByCategory(metadata);
    },

    /**
     * Show current config as string
     * @returns {string} Formatted config
     */
    toString() {
      const friendly = this.buildFriendly('display');
      return Object.entries(friendly)
        .map(([k, v]) => `  ${k}: ${JSON.stringify(v.value !== undefined ? v.value : v)}`)
        .join('\n');
    },
  };

  return builder;
}

module.exports = {
  // Core mapping functions
  buildInputMapping,
  findInputMapping,
  normalizeKey,
  
  // Format conversion
  toRuntimeFormat,
  fromRuntimeFormat,
  getFriendlyDefaults,
  buildTradingViewConfig,
  
  // Input discovery
  describeInputs,
  groupInputsByCategory,
  searchInputs,
  
  // Validation
  validateAndNormalizeConfig,
  findSimilarInputs,
  
  // Builder pattern
  createConfigBuilder,
  
  // Utility
  validateType,
  validateRange,
  similarityScore,
};
