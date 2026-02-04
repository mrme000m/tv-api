const auth = require('./services/auth');
const ta = require('./services/ta');
const search = require('./services/search');
const pine = require('./services/pine');
const charting = require('./services/charting');

// Re-export everything from the new services
module.exports = {
  ...auth,
  ...ta,
  ...search,
  ...pine,
  ...charting,
};
