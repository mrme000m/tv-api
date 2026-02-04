const TradingView = require('../main');

/**
 * Example: New indicator search API wrapper.
 *
 * Mirrors examples/Search.js style.
 */

(async () => {
  const client = TradingView.indicators.createIndicatorsClient({ language: 'en' });

  const results = await client.search('Mean', { limit: 5 });
  console.log('Top 5 search results:', results.map((r) => ({ id: r.id, name: r.name, author: r.author.username })));

  if (results[0]) {
    const info = await client.getInfo(results[0].id);
    console.log('First result info keys:', Object.keys(info || {}));

    const canGet = await client.canGet(results[0].id, 1);
    console.log('Can fetch source:', canGet);
  }

  // Browse library
  const library = await client.browseLibrary({ sort: 'trending', count: 5 });
  console.log('Library response keys:', Object.keys(library || {}));
})();
