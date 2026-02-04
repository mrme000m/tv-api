const http = require('../http');
const { genAuthCookies } = require('../utils');

/**
 * User credentials
 * @typedef {Object} UserCredentials
 * @prop {number} id User ID
 * @prop {string} session User session ('sessionid' cookie)
 * @prop {string} [signature] User session signature ('sessionid_sign' cookie)
 */

/**
 * Get a chart token from a layout ID and the user credentials if the layout is not public
 * @function getChartToken
 * @param {string} layout The layout ID found in the layout URL (Like: 'XXXXXXXX')
 * @param {UserCredentials} [credentials] User credentials (id + session + [signature])
 * @returns {Promise<string>} Token
 */
async function getChartToken(layout, credentials = {}) {
  const { id, session, signature } = (
    credentials.id && credentials.session
      ? credentials
      : { id: -1, session: null, signature: null }
  );

  const { data } = await http.get(
    'https://www.tradingview.com/chart-token',
    {
      headers: {
        cookie: genAuthCookies(session, signature),
      },
      params: {
        image_url: layout,
        user_id: id,
      },
    }
  );

  if (!data.token) throw new Error('Wrong layout or credentials');

  return data.token;
}

/**
 * @typedef {Object} DrawingPoint Drawing poitn
 * @prop {number} time_t Point X time position
 * @prop {number} price Point Y price position
 * @prop {number} offset Point offset
 */

/**
 * @typedef {Object} Drawing
 * @prop {string} id Drawing ID (Like: 'XXXXXX')
 * @prop {string} symbol Layout market symbol (Like: 'BINANCE:BTCEUR')
 * @prop {string} ownerSource Owner user ID (Like: 'XXXXXX')
 * @prop {string} serverUpdateTime Drawing last update timestamp
 * @prop {string} currencyId Currency ID (Like: 'EUR')
 * @prop {any} unitId Unit ID
 * @prop {string} type Drawing type
 * @prop {DrawingPoint[]} points List of drawing points
 * @prop {number} zorder Drawing Z order
 * @prop {string} linkKey Drawing link key
 * @prop {Object} state Drawing state
 */

/**
 * Get a chart token from a layout ID and the user credentials if the layout is not public
 * @function getDrawings
 * @param {string} layout The layout ID found in the layout URL (Like: 'XXXXXXXX')
 * @param {string | ''} [symbol] Market filter (Like: 'BINANCE:BTCEUR')
 * @param {UserCredentials} [credentials] User credentials (id + session + [signature])
 * @param {number} [chartID] Chart ID
 * @returns {Promise<Drawing[]>} Drawings
 */
async function getDrawings(layout, symbol = '', credentials = {}, chartID = '_shared') {
  const chartToken = await getChartToken(layout, credentials);

  const { data } = await http.get(
    `https://charts-storage.tradingview.com/charts-storage/get/layout/${
      layout
    }/sources`,
    {
      params: {
        chart_id: chartID,
        jwt: chartToken,
        symbol,
      },
    }
  );

  if (!data.payload) throw new Error('Wrong layout, user credentials, or chart id.');

  return Object.values(data.payload.sources || {}).map((drawing) => ({
    ...drawing, ...drawing.state,
  }));
}

module.exports = { getChartToken, getDrawings };
