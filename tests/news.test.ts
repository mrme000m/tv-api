import { describe, it, expect } from 'vitest';
import TradingView from '../main';

const token = process.env.SESSION as string;
const signature = process.env.SIGNATURE as string;

describe.skipIf(!token || !signature)('News API (authenticated)', () => {
  it('gets market news', async () => {
    console.log('Testing getMarketNews method');

    const news = await TradingView.getMarketNews({
      limit: 10,
    });

    console.log('Market news items:', news.items.length);
    console.log('Has more:', news.hasMore);

    expect(news.items).toBeDefined();
    expect(Array.isArray(news.items)).toBe(true);

    if (news.items.length > 0) {
      const item = news.items[0];
      console.log('First news item:', {
        id: item.id,
        title: item.title?.substring(0, 50) + '...',
        provider: item.provider?.name,
        published: new Date(item.published * 1000).toISOString(),
        urgency: item.urgency,
      });

      expect(item.id).toBeDefined();
      expect(item.title).toBeDefined();
      expect(item.published).toBeDefined();
      expect(item.provider).toBeDefined();
    }
  });

  it('gets symbol-specific news', async () => {
    console.log('Testing getSymbolNews for BTCUSD');

    const news = await TradingView.getSymbolNews('BITSTAMP:BTCUSD', {
      limit: 5,
    });

    console.log('Symbol news items:', news.items.length);

    expect(news.items).toBeDefined();
    expect(Array.isArray(news.items)).toBe(true);

    if (news.items.length > 0) {
      const item = news.items[0];
      console.log('First news item:', {
        title: item.title?.substring(0, 50) + '...',
        relatedSymbols: item.relatedSymbols?.map((s: any) => s.symbol),
      });

      expect(item.title).toBeDefined();
    }
  });

  it('gets crypto news', async () => {
    console.log('Testing getCryptoNews method');

    const news = await TradingView.getCryptoNews({
      limit: 5,
    });

    console.log('Crypto news items:', news.items.length);

    expect(news.items).toBeDefined();
    expect(Array.isArray(news.items)).toBe(true);

    if (news.items.length > 0) {
      const item = news.items[0];
      console.log('First crypto news item:', {
        title: item.title?.substring(0, 50) + '...',
      });
    }
  });

  it('gets stock news', async () => {
    console.log('Testing getStockNews method');

    const news = await TradingView.getStockNews({
      limit: 5,
    });

    console.log('Stock news items:', news.items.length);

    expect(news.items).toBeDefined();
    expect(Array.isArray(news.items)).toBe(true);
  });

  it('searches news', async () => {
    console.log('Testing searchNews method');

    const news = await TradingView.searchNews('bitcoin', {
      limit: 5,
    });

    console.log('Search results:', news.items.length);

    expect(news.items).toBeDefined();
    expect(Array.isArray(news.items)).toBe(true);
  });

  it('uses the news client', async () => {
    console.log('Testing createNewsClient');

    const client = TradingView.news.createNewsClient();

    const news = await client.getMarketNews({ limit: 5 });
    console.log(`Found ${news.items.length} news items via client`);

    expect(news.items).toBeDefined();
    expect(Array.isArray(news.items)).toBe(true);
  });
});

describe('News API structure', () => {
  it('exports all required functions', () => {
    expect(typeof TradingView.getMarketNews).toBe('function');
    expect(typeof TradingView.getSymbolNews).toBe('function');
    expect(typeof TradingView.getCryptoNews).toBe('function');
    expect(typeof TradingView.getStockNews).toBe('function');
    expect(typeof TradingView.getForexNews).toBe('function');
    expect(typeof TradingView.searchNews).toBe('function');
    expect(typeof TradingView.getNewsProviders).toBe('function');
    expect(typeof TradingView.news.createNewsClient).toBe('function');
  });

  it('news client has all methods', () => {
    const client = TradingView.news.createNewsClient();
    expect(typeof client.getMarketNews).toBe('function');
    expect(typeof client.getSymbolNews).toBe('function');
    expect(typeof client.getCryptoNews).toBe('function');
    expect(typeof client.getStockNews).toBe('function');
    expect(typeof client.getForexNews).toBe('function');
    expect(typeof client.searchNews).toBe('function');
    expect(typeof client.getNewsProviders).toBe('function');
  });
});
