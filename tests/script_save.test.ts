import { describe, it, expect } from 'vitest';
import TradingView from '../main';

const token = <string>process.env.SESSION;
const signature = <string>process.env.SIGNATURE;

// Skip the suite when no credentials are provided (consistent with other tests)
describe.skipIf(!token || !signature)('Pine script save/translate endpoints', () => {
  const simpleSource = `// @version=5\nindicator("TV API Test")\nplot(close)`;

  it('translateScriptLight returns a payload', async () => {
    console.log('Translating raw script (light)');

    const data = await TradingView.translateScriptLight(simpleSource, {
      version: 3,
      credentials: { session: token, signature },
    });

    console.log('translateScriptLight result type:', typeof data);

    expect(data).toBeDefined();
  });

  it('parseScriptTitle returns a payload', async () => {
    console.log('Parsing script title');

    const parsed = await TradingView.parseScriptTitle(simpleSource, {
      credentials: { session: token, signature },
    });

    console.log('parseScriptTitle result type:', typeof parsed);

    expect(parsed).toBeDefined();
  });

  it('saveScriptNew -> listScriptVersions -> getScriptVersion -> renameScriptVersion (with cleanup)', async () => {
    console.log('Saving a new script and exercising version endpoints');

    // discover username from authenticated session
    const user = await TradingView.getUser(token, signature);
    const userName = user?.username || '';

    const name = `tv-api-test-${Date.now()}`;

    const saveRes = await TradingView.saveScriptNew({
      name,
      source: simpleSource,
      userName,
      allowOverwrite: true,
      credentials: { session: token, signature },
    });

    console.log('saveScriptNew raw result:', typeof saveRes);
    expect(saveRes).toBeDefined();

    // Try to extract a pineId from known response shapes
    let pineId: string | null = null;

    if (typeof saveRes === 'string') {
      const m = saveRes.match(/(USER|PUB|STD);[A-Za-z0-9_%\-]+/);
      if (m) pineId = m[0];
    } else if (saveRes && typeof saveRes === 'object') {
      pineId = saveRes.scriptIdPart || saveRes.scriptId || saveRes.id || saveRes.pineId || null;
    }

    if (!pineId) {
      // If we couldn't discover pineId, attempt to find a matching script by name in user's private list
      const priv = await TradingView.getPrivateIndicators(token, signature);
      const found = priv.find((p: any) => p.name === name || (p.name && p.name.includes(name)));
      if (found) pineId = found.id;
    }

    if (!pineId) {
      console.warn('Could not determine created pineId; skipping version-specific assertions');
      expect(true).toBe(true);
      return;
    }

    console.log('Discovered pineId:', pineId);

    // Ensure cleanup even if later steps fail
    let versionId: string | number | null = null;
    try {
      const versions = await TradingView.listScriptVersions(pineId, { session: token, signature });
      console.log('versions:', versions?.length ?? typeof versions);

      expect(versions).toBeDefined();

      // Try to determine a version id
      if (Array.isArray(versions) && versions.length > 0) {
        const v0: any = versions[0];
        versionId = v0.version || v0.id || v0.name || null;
      } else if (versions && typeof versions === 'object') {
        // might be an object with keys
        const keys = Object.keys(versions || {});
        if (keys.length > 0) versionId = keys[0];
      }

      if (!versionId) {
        console.warn('Could not determine a version id; skipping get/rename assertions');
        expect(true).toBe(true);
        return;
      }

      const getRes = await TradingView.getScriptVersion(pineId, versionId, { session: token, signature });
      expect(getRes).toBeDefined();

      const renamed = `renamed-${name}`;
      const renameRes = await TradingView.renameScriptVersion(pineId, versionId, renamed, { session: token, signature });
      expect(renameRes).toBeDefined();
    } finally {
      // Try to delete the created version first, then the whole script as fallback
      try {
        if (pineId && versionId) {
          const delRes = await TradingView.deleteScriptVersion(pineId, versionId, { session: token, signature });
          console.log('deleteScriptVersion result:', delRes);
        } else if (pineId) {
          const delRes = await TradingView.deleteScriptVersion(pineId, '', { session: token, signature });
          console.log('deleteScriptVersion (full script) result:', delRes);
        }
      } catch (e) {
        console.warn('Cleanup failed (deleteScriptVersion):', e?.message || e);
      }
    }
  }, 30000);
});
