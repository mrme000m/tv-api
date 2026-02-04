const JSZip = require('jszip');

/**
 * @typedef {Object} TWPacket
 * @prop {string} [m] Packet type
 * @prop {[session: string, {}]} [p] Packet data
 */

// TradingView websocket frames are encoded as:
//   ~m~<len>~m~<payload>
// and may include heartbeat markers:
//   ~h~<number>
// Payload is often a JSON string, but can also be heartbeat strings.
//
// The previous implementation used regex split which is allocation-heavy.
// This parser walks the string iteratively and is resilient to partial/extra data.

function parseJsonPayload(p, { onError, strict }) {
  try {
    return JSON.parse(p);
  } catch (error) {
    const err = new Error(`TradingView packet JSON parse failed: ${error?.message || error}`);
    err.cause = error;
    err.packet = p;

    if (typeof onError === 'function') onError(err);
    else console.warn('Cant parse', p);

    if (strict) throw err;
    return null;
  }
}

/**
 * Iteratively parse a raw websocket data chunk into packet payloads.
 * @param {string} s
 * @param {{ onError?: (err: Error) => void, strict?: boolean }} options
 * @returns {Array<any>} Parsed packets
 */
function parseFrames(s, options = {}) {
  const { onError, strict = false } = options || {};
  const out = [];

  let i = 0;
  const n = s.length;

  while (i < n) {
    // Heartbeat marker can appear; the old implementation removed '~h~' tokens.
    if (s.startsWith('~h~', i)) {
      i += 3;
      // consume digits
      let start = i;
      while (i < n && s.charCodeAt(i) >= 48 && s.charCodeAt(i) <= 57) i += 1;
      const numStr = s.slice(start, i);
      const hb = Number(numStr);
      if (Number.isFinite(hb)) out.push(hb);
      continue;
    }

    // Frame marker
    if (!s.startsWith('~m~', i)) {
      // skip unexpected char
      i += 1;
      continue;
    }

    i += 3; // skip '~m~'

    // Parse length
    let lenStart = i;
    while (i < n && s.charCodeAt(i) >= 48 && s.charCodeAt(i) <= 57) i += 1;
    if (i === lenStart) {
      // invalid framing; stop to avoid infinite loop
      break;
    }

    const len = Number(s.slice(lenStart, i));
    if (!Number.isFinite(len) || len < 0) break;

    // Expect '~m~'
    if (!s.startsWith('~m~', i)) break;
    i += 3;

    // Extract payload
    const payloadEnd = i + len;
    if (payloadEnd > n) {
      // partial frame (should not usually happen with ws 'message', but be safe)
      break;
    }

    const payload = s.slice(i, payloadEnd);
    i = payloadEnd;

    // Payload may be a heartbeat string like '~h~123'.
    if (payload.startsWith('~h~')) {
      const hb = Number(payload.slice(3));
      if (Number.isFinite(hb)) out.push(hb);
      continue;
    }

    // JSON payload
    const parsed = parseJsonPayload(payload, { onError, strict });
    if (parsed !== null) out.push(parsed);
  }

  return out;
}

module.exports = {
  /**
   * Parse websocket packet
   * @function parseWSPacket
   * @param {string|Buffer} str Websocket raw data
   * @param {{ onError?: (err: Error) => void, strict?: boolean }} [options]
   * @returns {TWPacket[]} TradingView packets
   */
  parseWSPacket(str, options = {}) {
    const s = (typeof str === 'string')
      ? str
      : (str && typeof str.toString === 'function' ? str.toString('utf8') : String(str));

    return parseFrames(s, options);
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
