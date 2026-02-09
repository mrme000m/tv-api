const auth = require('./services/auth');
const ta = require('./services/ta');
const search = require('./services/search');
const pine = require('./services/pine');
const pineEnhanced = require('./services/pine-enhanced');
const indicators = require('./services/indicators');
const charting = require('./services/charting');
const alerts = require('./services/alerts');
const watchlists = require('./services/watchlists');
const news = require('./services/news');
const calendar = require('./services/calendar');
const symbolDetails = require('./services/symbolDetails');

// Re-export everything from the new services
module.exports = {
  ...auth,
  ...ta,
  ...search,
  ...pine,
  ...pineEnhanced,
  ...indicators,
  ...charting,
  ...alerts,
  ...watchlists,
  ...news,
  ...calendar,
  ...symbolDetails,
};
