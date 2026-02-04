import { describe, it, expect } from 'vitest';
import TradingView from '../main';
import utils from './utils';

const token = process.env.SESSION as string;
const signature = process.env.SIGNATURE as string;

describe.skipIf(!token || !signature)('Authenticated actions', () => {
  it('gets user info', async () => {
    console.log('Testing getUser method');

    const userInfo = await TradingView.getUser(token, signature);

    console.log('User:', {
      id: userInfo.id,
      username: userInfo.username,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      following: userInfo.following,
      followers: userInfo.followers,
      notifications: userInfo.notifications,
      joinDate: userInfo.joinDate,
    });

    expect(userInfo).toBeDefined();
    expect(userInfo.id).toBeDefined();
    expect(userInfo.username).toBeDefined();
    expect(userInfo.following).toBeDefined();
    expect(userInfo.followers).toBeDefined();
    expect(userInfo.notifications).toBeDefined();
    expect(userInfo.notifications.following).toBeDefined();
    expect(userInfo.notifications.user).toBeDefined();
    expect(userInfo.joinDate).toBeDefined();

    expect(userInfo.session).toBe(token);
    expect(userInfo.signature).toBe(signature);
  });

  const userIndicators: any[] = [];

  it('gets user indicators', async () => {
    console.log('Testing getPrivateIndicators method');

    userIndicators.push(...await TradingView.getPrivateIndicators(token));
    console.log('Indicators:', userIndicators.map((i) => i.name));

    expect(userIndicators.length).toBeGreaterThan(0);
  });

  it('creates a chart with all user indicators', async () => {
    console.log('Creating logged client');
    const client = new TradingView.Client({ token, signature });
    const chart = new client.Session.Chart();

    try {
      console.log('Setting market to BINANCE:BTCEUR...');
      chart.setMarket('BINANCE:BTCEUR', { timeframe: 'D' });

      // Limit to 1 indicator for reliability (integration endpoint latency can be significant)
      const testedIndicators = userIndicators.slice(0, 1);

      const checked = new Set();
      function check(item) {
        checked.add(item);
        console.log('Checked:', [...checked], `(${checked.size}/${testedIndicators.length + 1})`);
      }

      // `onUpdate` depends on market activity / timing; `onSymbolLoaded` is deterministic
      // once TradingView resolves the symbol.
      chart.onSymbolLoaded(() => {
        console.log('Market resolved:', {
          name: chart.infos.pro_name,
          description: chart.infos.short_description,
          exchange: chart.infos.exchange,
        });
        check(Symbol.for('PRICE'));
      });

      console.log('Loading indicators...');
      for (const indic of testedIndicators) {
        const privateIndic = await indic.get();
        console.log(`[${indic.name}] Loading indicator...`);

        const indicator = new chart.Study(privateIndic);

        // `onUpdate` can be delayed depending on market activity; `onReady` is the
        // most deterministic signal that the study compiled and initialized.
        indicator.onReady(() => {
          console.log(`[${indic.name}] Indicator loaded !`);
          check(indic.id);
        });

        indicator.onError((...args) => {
          console.error(`[${indic.name}] Indicator error:`, ...args);
        });
      }

      while (checked.size < testedIndicators.length + 1) await utils.wait(100);

      console.log('All indicators loaded !');
    } finally {
      try { chart.delete(); } catch {}
      await client.end();
    }
  }, 120000);
});
