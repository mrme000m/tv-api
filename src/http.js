const axios = require('axios');

// Centralized axios instance so we can enforce consistent defaults (timeouts, headers)
// and make future enhancements (retries, tracing) simpler.
const http = axios.create({
  timeout: 15000,
  // Some endpoints behave differently depending on origin.
  headers: {
    origin: 'https://www.tradingview.com',
  },
  // By default, axios throws for status >= 300. We want to handle 4xx manually in many cases.
  validateStatus: (status) => status < 500,
});

module.exports = http;
