const miscRequests = require('./src/miscRequests');
const Client = require('./src/client');
const BuiltInIndicator = require('./src/classes/BuiltInIndicator');
const PineIndicator = require('./src/classes/PineIndicator');
const PinePermManager = require('./src/classes/PinePermManager');
const utils = require('./src/utils');

module.exports = { ...miscRequests };
// Namespaced service helpers (non-breaking addition)
module.exports.indicators = require('./src/services/indicators');
module.exports.alerts = require('./src/services/alerts');
module.exports.pine = {
  ...require('./src/services/pine'),
  ...require('./src/services/pine-enhanced'),
};
module.exports.Client = Client;
module.exports.BuiltInIndicator = BuiltInIndicator;
module.exports.PineIndicator = PineIndicator;
module.exports.PinePermManager = PinePermManager;

// Utility functions for working with TradingView data
module.exports.utils = utils;

// Direct protocol access for advanced use cases
module.exports.protocol = require('./src/protocol');
