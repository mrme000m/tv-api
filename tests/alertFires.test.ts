import { describe, it, expect } from 'vitest';
import TradingView from '../main';

const token = process.env.SESSION as string;
const signature = process.env.SIGNATURE as string;

describe.skipIf(!token || !signature)('Alert Fires API', () => {
  it('lists alert fires', async () => {
    console.log('Testing listFires method');

    const fires = await TradingView.listFires({
      session: token,
      signature,
      limit: 10,
    });

    console.log('Fires response:', {
      status: fires.s,
      id: fires.id,
      count: fires.r?.length,
    });

    expect(fires).toBeDefined();
    expect(fires.s).toBeDefined();

    if (fires.r && fires.r.length > 0) {
      const fire = fires.r[0];
      console.log('First fire:', {
        fire_id: fire.fire_id,
        alert_id: fire.alert_id,
        name: fire.name,
        symbol: fire.symbol,
        fire_time: fire.fire_time,
      });

      expect(fire.fire_id).toBeDefined();
      expect(fire.alert_id).toBeDefined();
      expect(fire.name).toBeDefined();
    }
  });

  it('gets offline fires', async () => {
    console.log('Testing getOfflineFires method');

    const fires = await TradingView.getOfflineFires({
      session: token,
      signature,
      limit: 10,
    });

    console.log('Offline fires response status:', fires.s);

    expect(fires).toBeDefined();
    expect(fires.s).toBeDefined();
  });

  it('clears offline fires for specific alerts', async () => {
    console.log('Testing clearOfflineFires method');

    // First get some fires to find an alert ID
    const fires = await TradingView.listFires({
      session: token,
      signature,
      limit: 5,
    });

    if (!fires.r || fires.r.length === 0) {
      console.log('No fires to clear, skipping test');
      return;
    }

    const alertId = fires.r[0].alert_id;
    console.log('Clearing fires for alert ID:', alertId);

    const result = await TradingView.clearOfflineFires(alertId, {
      session: token,
      signature,
    });

    console.log('Clear result:', {
      status: result.s,
      id: result.id,
    });

    expect(result).toBeDefined();
    expect(result.s).toBeDefined();
  });

  it('uses the alerts client for fire management', async () => {
    console.log('Testing alerts client fire methods');

    const client = TradingView.alerts.createAlertsClient({
      session: token,
      signature,
    });

    const fires = await client.listFires({ limit: 5 });
    console.log(`Found ${fires.r?.length || 0} fires via client`);

    expect(fires).toBeDefined();
  });
});

describe('Alert Fires API (unauthenticated)', () => {
  it('throws error when session is missing for listFires', async () => {
    await expect(TradingView.listFires({ session: '' }))
      .rejects
      .toThrow('Session is required');
  });

  it('throws error when session is missing for deleteAllFires', async () => {
    await expect(TradingView.deleteAllFires({ session: '' }))
      .rejects
      .toThrow('Session is required');
  });

  it('throws error when session is missing for clearOfflineFires', async () => {
    await expect(TradingView.clearOfflineFires(123, { session: '' }))
      .rejects
      .toThrow('Session is required');
  });
});
