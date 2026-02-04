const http = require('../http');

/**
 * Fetch data from the scanner endpoint
 * @param {string[]} tickers - Array of ticker symbols
 * @param {string[]} columns - Array of column names to fetch
 * @returns {Promise<any>} - Scanner data response
 */
async function fetchScanData(tickers = [], columns = []) {
  const { data } = await http.post(
    'https://scanner.tradingview.com/global/scan',
    {
      symbols: { tickers },
      columns,
    }
  );

  return data;
}

module.exports = { fetchScanData };
