const JSZip = require('jszip');

/**
 * @typedef {Object} TWPacket
 * @prop {string} [m] Packet type
 * @prop {[session: string, {}]} [p] Packet data
 */

const cleanerRgx = /~h~/g;
const splitterRgx = /~m~[0-9]{1,}~m~/g;

module.exports = {
  /**
   * Parse websocket packet
   * @function parseWSPacket
   * @param {string} str Websocket raw data
   * @returns {TWPacket[]} TradingView packets
   */
  parseWSPacket(str, options = {}) {
    const { onError, strict = false } = options || {};
    const s = (typeof str === 'string') ? str : (str && typeof str.toString === 'function' ? str.toString('utf8') : String(str));

    return s.replace(cleanerRgx, '').split(splitterRgx)
      .map((p) => {
        if (!p) return false;
        try {
          return JSON.parse(p);
        } catch (error) {
          const err = new Error(`TradingView packet JSON parse failed: ${error?.message || error}`);
          err.cause = error;
          err.packet = p;

          if (typeof onError === 'function') onError(err);
          else console.warn('Cant parse', p);

          if (strict) throw err;
          return false;
        }
      })
      .filter((p) => p);
  },

  /**
   * Format websocket packet
   * @function formatWSPacket
   * @param {TWPacket} packet TradingView packet
   * @returns {string} Websocket raw data
   */
  formatWSPacket(packet) {
    const msg = typeof packet === 'object'
      ? JSON.stringify(packet)
      : String(packet);

    // TradingView framing uses a byte length. JS `string.length` counts UTF-16 code units,
    // which breaks framing when non-ASCII chars appear.
    const byteLen = Buffer.byteLength(msg, 'utf8');
    return `~m~${byteLen}~m~${msg}`;
  },

  /**
   * Parse compressed data
   * @function parseCompressed
   * @param {string} data Compressed data
   * @returns {Promise<{}>} Parsed data
   */
  async parseCompressed(data) {
    const zip = new JSZip();
    return JSON.parse(
      await (
        await zip.loadAsync(data, { base64: true })
      ).file('').async('text'),
    );
  },
};
