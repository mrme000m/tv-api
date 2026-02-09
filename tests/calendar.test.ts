import { describe, it, expect } from 'vitest';
import TradingView from '../main';

const token = process.env.SESSION as string;
const signature = process.env.SIGNATURE as string;

describe.skipIf(!token || !signature)('Economic Calendar API (authenticated)', () => {
  it('gets economic events', async () => {
    console.log('Testing getEconomicEvents method');

    const result = await TradingView.getEconomicEvents(
      {},
      { limit: 10 }
    );

    console.log('Economic events count:', result.events.length);
    console.log('Has more:', result.hasMore);

    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);

    if (result.events.length > 0) {
      const event = result.events[0];
      console.log('First event:', {
        id: event.id,
        title: event.title,
        country: event.country,
        indicator: event.indicator,
        importance: event.importance,
        date: event.date,
      });

      expect(event.id).toBeDefined();
      expect(event.title).toBeDefined();
      expect(event.country).toBeDefined();
      expect(event.importance).toBeDefined();
    }
  });

  it('gets high-impact events', async () => {
    console.log('Testing getHighImpactEvents method');

    const result = await TradingView.getHighImpactEvents({
      limit: 10,
    });

    console.log('High-impact events count:', result.events.length);

    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);

    if (result.events.length > 0) {
      // All events should have importance of 3
      const allHighImpact = result.events.every((e: any) => e.importance === 3);
      console.log('All high impact:', allHighImpact);
      expect(allHighImpact).toBe(true);
    }
  });

  it('gets events for a specific country', async () => {
    console.log('Testing getCountryEvents method');

    const result = await TradingView.getCountryEvents('US', {
      limit: 10,
    });

    console.log('US events count:', result.events.length);

    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);

    if (result.events.length > 0) {
      const allUS = result.events.every((e: any) => e.country === 'US');
      console.log('All US events:', allUS);
      expect(allUS).toBe(true);
    }
  });

  it('gets today\'s events', async () => {
    console.log('Testing getTodaysEvents method');

    const result = await TradingView.getTodaysEvents({
      limit: 20,
    });

    console.log('Today\'s events count:', result.events.length);

    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);
  });

  it('gets week events', async () => {
    console.log('Testing getWeekEvents method');

    const result = await TradingView.getWeekEvents({
      limit: 50,
    });

    console.log('Week events count:', result.events.length);

    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);
  });

  it('gets central bank events', async () => {
    console.log('Testing getCentralBankEvents method');

    const result = await TradingView.getCentralBankEvents({
      limit: 10,
    });

    console.log('Central bank events count:', result.events.length);

    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);
  });

  it('filters events by date range', async () => {
    console.log('Testing getEconomicEvents with date filter');

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const result = await TradingView.getEconomicEvents(
      {
        from: today,
        to: tomorrow,
        countries: ['US', 'EU'],
        importance: 2,
      },
      { limit: 20 }
    );

    console.log('Filtered events count:', result.events.length);

    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);
  });

  it('uses the calendar client', async () => {
    console.log('Testing createCalendarClient');

    const client = TradingView.calendar.createCalendarClient();

    const result = await client.getTodaysEvents({ limit: 10 });
    console.log(`Found ${result.events.length} events via client`);

    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);
  });
});

describe('Economic Calendar API structure', () => {
  it('exports all required functions', () => {
    expect(typeof TradingView.getEconomicEvents).toBe('function');
    expect(typeof TradingView.getTodaysEvents).toBe('function');
    expect(typeof TradingView.getWeekEvents).toBe('function');
    expect(typeof TradingView.getCountryEvents).toBe('function');
    expect(typeof TradingView.getHighImpactEvents).toBe('function');
    expect(typeof TradingView.getCentralBankEvents).toBe('function');
    expect(typeof TradingView.getEventsByCategory).toBe('function');
    expect(typeof TradingView.getUpcomingSignificantEvents).toBe('function');
    expect(typeof TradingView.calendar.createCalendarClient).toBe('function');
  });

  it('exports CATEGORIES constant', () => {
    expect(TradingView.calendar.CATEGORIES).toBeDefined();
    expect(TradingView.calendar.CATEGORIES.LABOR).toBe('lbr');
    expect(TradingView.calendar.CATEGORIES.INFLATION).toBe('inf');
    expect(TradingView.calendar.CATEGORIES.GDP).toBe('gdp');
    expect(TradingView.calendar.CATEGORIES.CENTRAL_BANK).toBe('cbnk');
  });

  it('exports COUNTRY_CODES constant', () => {
    expect(TradingView.calendar.COUNTRY_CODES).toBeDefined();
    expect(TradingView.calendar.COUNTRY_CODES).toContain('US');
    expect(TradingView.calendar.COUNTRY_CODES).toContain('EU');
    expect(TradingView.calendar.COUNTRY_CODES).toContain('JP');
    expect(TradingView.calendar.COUNTRY_CODES.length).toBeGreaterThan(50);
  });

  it('calendar client has all methods', () => {
    const client = TradingView.calendar.createCalendarClient();
    expect(typeof client.getEvents).toBe('function');
    expect(typeof client.getTodaysEvents).toBe('function');
    expect(typeof client.getWeekEvents).toBe('function');
    expect(typeof client.getCountryEvents).toBe('function');
    expect(typeof client.getHighImpactEvents).toBe('function');
    expect(typeof client.getCentralBankEvents).toBe('function');
    expect(typeof client.getEventsByCategory).toBe('function');
    expect(typeof client.getUpcomingSignificantEvents).toBe('function');
    expect(client.CATEGORIES).toBeDefined();
    expect(client.COUNTRY_CODES).toBeDefined();
  });
});
