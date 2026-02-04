import { describe, it, expect } from 'vitest';
import { search } from '../main';

describe('Advanced Search (search)', () => {
  it('should find stocks with basic query', async () => {
    const res = await search('AAPL', { type: 'stock' });
    expect(res.symbols.length).toBeGreaterThan(0);
    const apple = res.symbols.find(s => s.symbol.includes('AAPL') && s.exchange === 'NASDAQ');
    expect(apple).toBeDefined();
    if (apple) {
      expect(apple.type).toBe('stock');
    }
    expect(res.remaining).toBeDefined();
  });

  it('should filter by exchange', async () => {
    const res = await search('BTC', { type: 'crypto', exchange: 'BINANCE' });
    expect(res.symbols.length).toBeGreaterThan(0);
    res.symbols.forEach(s => {
      // Some providers might be mapped differently, but generally exchange should match or be related
      // The API returns "exchange": "Binance" usually.
      expect(s.exchange.toUpperCase()).toContain('BINANCE');
    });
  });

  it('should paginate results', async () => {
    // Search for "A" which has many results
    const page1 = await search('A', { type: 'stock', start: 0 });
    expect(page1.symbols.length).toBe(50);
    expect(page1.remaining).toBeGreaterThan(0);

    const page2 = await search('A', { type: 'stock', start: 50 });
    expect(page2.symbols.length).toBeGreaterThan(0);
    
    // Ensure different results
    expect(page1.symbols[0].symbol).not.toBe(page2.symbols[0].symbol);
  });

  it('should return raw fields like currency_code', async () => {
    const res = await search('EURUSD', { type: 'forex' });
    const pair = res.symbols[0];
    expect(pair).toBeDefined();
    expect(pair.currency_code).toBeDefined();
  });

  it('should attach getTA method', async () => {
    const res = await search('AAPL', { type: 'stock' });
    const symbol = res.symbols[0];
    expect(typeof symbol.getTA).toBe('function');
    
    // Test invoking it (if network allows)
    const ta = await symbol.getTA();
    expect(ta['1D']).toBeDefined();
  });
});
