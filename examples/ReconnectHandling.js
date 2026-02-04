/*
  Example: robust reconnect handling with auto session rehydration.

  This example demonstrates:
  - Client lifecycle events: reconnecting/reconnected/connect_timeout
  - Custom backoff configuration
  - Auto-rehydration: chart/quote sessions re-create and resubscribe on reconnect

  Usage:
    node --env-file=.env examples/ReconnectHandling.js

  Required env:
    - SESSION (sessionid cookie)
    - SIGNATURE (sessionid_sign cookie)

  Optional env:
    - TV_SERVER (data|prodata|widgetdata)
*/

const TradingView = require('../main');

const token = process.env.SESSION;
const signature = process.env.SIGNATURE;

async function main() {
  const client = new TradingView.Client({
    token,
    signature,
    server: process.env.TV_SERVER || 'data',

    // Connection robustness tuning
    connectTimeoutMs: 10_000,

    // Reconnect/backoff tuning
    reconnectMaxRetries: 20,
    reconnectFastFirstDelayMs: 250,
    reconnectBaseDelayMs: 500,
    reconnectMultiplier: 2,
    reconnectMaxDelayMs: 30_000,
    reconnectJitter: true,
  });

  client.onConnected(() => console.log('[client] connected'));
  client.onDisconnected(() => console.log('[client] disconnected'));
  client.onReconnecting(({ attempt, maxRetries }) => {
    console.log(`[client] reconnecting attempt ${attempt + 1}/${maxRetries}`);
  });
  client.onReconnected(() => console.log('[client] reconnected (rehydration done)'));
  client.onConnectTimeout(({ timeoutMs }) => console.log(`[client] connect timeout after ${timeoutMs}ms`));
  client.onError((...args) => console.error('[client] error:', ...args));

  // Quote session + market subscription.
  const quote = new client.Session.Quote({ fields: 'price' });
  const btc = new quote.Market('BINANCE:BTCEUR');
  btc.onLoaded(() => console.log('[quote] market loaded'));
  btc.onData((d) => console.log('[quote] lp:', d.lp));
  btc.onError((...args) => console.error('[quote] error:', ...args));

  // Chart session + symbol subscription.
  const chart = new client.Session.Chart();
  chart.onSymbolLoaded(() => {
    console.log('[chart] symbol loaded:', chart.infos?.pro_name);
  });
  chart.onUpdate(() => {
    const last = chart.periods[0];
    if (last) console.log('[chart] candle close:', last.close);
  });
  chart.onError((...args) => console.error('[chart] error:', ...args));

  chart.setMarket('BINANCE:BTCEUR', { timeframe: '1', range: 100 });

  // Keep process alive.
  process.on('SIGINT', async () => {
    console.log('Closing...');
    try { btc.close(); } catch {}
    try { quote.delete(); } catch {}
    try { chart.delete(); } catch {}
    await client.end();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
