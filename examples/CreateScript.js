/*
 * Example: Create, rename, list versions, fetch, and delete a Pine script
 *
 * Requires: SESSION, SIGNATURE, TV_USER in .env file or environment variables
 * Usage: node examples/CreateScript.js
 */

require('dotenv').config();

const TradingView = require('../main');

async function main() {
  if (!process.env.SESSION || !process.env.SIGNATURE || !process.env.TV_USER) {
    console.error('Please set SESSION, SIGNATURE and TV_USER environment variables');
    process.exit(1);
  }

  const source = `// @version=5\nindicator("Example: tv-api create")\nplot(close)`;
  const user = process.env.TV_USER;
  const creds = { session: process.env.SESSION, signature: process.env.SIGNATURE };

  console.log('Translating script (light)...');
  const trans = await TradingView.translateScriptLight(source, { credentials: creds });
  console.log('translateScriptLight:', typeof trans === 'object' ? 'object' : trans);

  console.log('Parsing script title...');
  const parsed = await TradingView.parseScriptTitle(source, { userName: user, credentials: creds });
  console.log('parseScriptTitle result:', parsed);

  const name = `tv-api-example-${Date.now()}`;
  console.log('Saving new script as', name);
  const saveRes = await TradingView.saveScriptNew({ name, source, userName: user, allowOverwrite: true, credentials: creds });
  console.log('saveScriptNew result:', saveRes);

  const pineId = (typeof saveRes === 'string') ? saveRes.match(/(USER|PUB|STD);[^\s"'<>]+/)?.[0] : (saveRes?.result?.metaInfo?.scriptIdPart || saveRes?.scriptIdPart || saveRes?.scriptId || null);
  console.log('Discovered pineId:', pineId);
  if (!pineId) {
    console.error('Could not determine pineId from save result. Try looking into private indicators list.');
    process.exit(1);
  }

  console.log('Listing versions...');
  const versions = await TradingView.listScriptVersions(pineId, creds);
  console.log('Versions:', versions);

  const firstVersion = Array.isArray(versions) && versions.length ? (versions[0].version || versions[0].id || versions[0].name) : null;
  if (firstVersion) {
    console.log('Fetching version', firstVersion);
    const payload = await TradingView.getScriptVersion(pineId, firstVersion, creds);
    console.log('Fetched payload size/type:', typeof payload);

    const newName = `example-renamed-${Date.now()}`;
    console.log('Renaming version to', newName);
    const renameRes = await TradingView.renameScriptVersion(pineId, firstVersion, newName, creds);
    console.log('renameRes:', renameRes);

    console.log('Deleting version...');
    const delRes = await TradingView.deleteScriptVersion(pineId, firstVersion, creds);
    console.log('deleteScriptVersion result:', delRes);
  }

  console.log('Attempting to delete whole script as final cleanup...');
  const delAll = await TradingView.deleteScriptVersion(pineId, '', creds);
  console.log('deleteScriptVersion (full)', delAll);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
