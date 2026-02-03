const axios = require('axios');

// Centralized axios instance so we can enforce consistent defaults (timeouts, headers)
// and make future enhancements (retries, tracing) simpler.
const http = axios.create({
  timeout: 15000,
  // Some endpoints behave differently depending on origin.
  headers: {
    origin: 'https://www.tradingview.com',
  },
});

module.exports = http;
