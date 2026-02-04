const TradingView = require('../main');

/**
 * Example: Search for a public script and fetch its raw Pine source payload.
 *
 * This uses the new indicators wrapper and demonstrates the
 * search → info → auth check → source fetch flow described in:
 * - INDICATORS_API_INTEGRATION_GUIDE.md
 * - TRADINGVIEW_INDICATORS_API_DOCS.md
 */

(async () => {
  const client = TradingView.indicators.createIndicatorsClient({ language: 'en' });

  const results = await client.search('Mean', { limit: 1 });
  if (!results.length) {
    console.log('No scripts found.');
    return;
  }

  const script = results[0];
  console.log('Selected:', { id: script.id, name: script.name, author: script.author.username });

  const info = await client.getInfo(script.id);
  console.log('Info (keys):', Object.keys(info || {}));

  const canGet = await client.canGet(script.id, 1);
  console.log('Authorized to get v1:', canGet);

  const payload = await client.getSource(script.id, 1);

  // payload shape can change; typically contains `{ source: '...' }`.
  const source = payload?.source || '';
  console.log('Source length:', source.length);
  console.log('Preview:\n', source.split('\n').slice(0, 10).join('\n'));
})();
