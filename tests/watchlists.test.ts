import { describe, it, expect } from 'vitest';
import TradingView from '../main';

const token = process.env.SESSION as string;
const signature = process.env.SIGNATURE as string;

describe.skipIf(!token || !signature)('Watchlists API', () => {
  let createdWatchlistId: number | null = null;

  it('lists all watchlists', async () => {
    console.log('Testing listWatchlists method');

    const watchlists = await TradingView.listWatchlists({
      session: token,
      signature,
    });

    console.log('Watchlists count:', watchlists.length);
    
    expect(Array.isArray(watchlists)).toBe(true);
    
    if (watchlists.length > 0) {
      console.log('First watchlist:', {
        id: watchlists[0].id,
        name: watchlists[0].name,
        symbolCount: watchlists[0].symbols?.length,
      });
      
      expect(watchlists[0].id).toBeDefined();
      expect(watchlists[0].name).toBeDefined();
    }
  });

  it('creates a new watchlist', async () => {
    console.log('Testing createWatchlist method');

    const watchlist = await TradingView.createWatchlist({
      name: `Test Watchlist ${Date.now()}`,
      symbols: ['COINBASE:BTCUSD', 'COINBASE:ETHUSD'],
    }, {
      session: token,
      signature,
    });

    console.log('Created watchlist:', {
      id: watchlist.id,
      name: watchlist.name,
    });

    expect(watchlist.id).toBeDefined();
    expect(watchlist.name).toBeDefined();
    
    createdWatchlistId = watchlist.id;
  });

  it('gets a specific watchlist', async () => {
    console.log('Testing getWatchlist method');
    
    // First create a watchlist if we don't have one
    if (!createdWatchlistId) {
      const watchlist = await TradingView.createWatchlist({
        name: `Test Watchlist ${Date.now()}`,
        symbols: ['COINBASE:BTCUSD'],
      }, {
        session: token,
        signature,
      });
      createdWatchlistId = watchlist.id;
    }

    const watchlist = await TradingView.getWatchlist(createdWatchlistId, {
      session: token,
      signature,
    });

    console.log('Retrieved watchlist:', {
      id: watchlist.id,
      name: watchlist.name,
      symbols: watchlist.symbols?.length,
    });

    expect(watchlist.id).toBe(createdWatchlistId);
    expect(watchlist.name).toBeDefined();
    expect(watchlist.symbols).toBeDefined();
  });

  it('renames a watchlist', async () => {
    console.log('Testing renameWatchlist method');
    
    if (!createdWatchlistId) {
      console.log('Skipping - no watchlist to rename');
      return;
    }

    const newName = `Renamed Watchlist ${Date.now()}`;
    const watchlist = await TradingView.renameWatchlist(
      createdWatchlistId,
      newName,
      {
        session: token,
        signature,
      }
    );

    console.log('Renamed watchlist:', {
      id: watchlist.id,
      newName: watchlist.name,
    });

    expect(watchlist.name).toBe(newName);
  });

  it('adds symbols to a watchlist', async () => {
    console.log('Testing addSymbols method');
    
    if (!createdWatchlistId) {
      console.log('Skipping - no watchlist to modify');
      return;
    }

    const watchlist = await TradingView.addSymbols(
      createdWatchlistId,
      ['OANDA:XAUUSD', 'OANDA:EURUSD'],
      {
        session: token,
        signature,
      }
    );

    console.log('Updated watchlist with new symbols:', {
      id: watchlist.id,
      symbolCount: watchlist.symbols?.length,
    });

    expect(watchlist.symbols).toBeDefined();
    expect(watchlist.symbols.length).toBeGreaterThanOrEqual(2);
  });

  it('removes symbols from a watchlist', async () => {
    console.log('Testing removeSymbols method');
    
    if (!createdWatchlistId) {
      console.log('Skipping - no watchlist to modify');
      return;
    }

    const watchlist = await TradingView.removeSymbols(
      createdWatchlistId,
      ['OANDA:EURUSD'],
      {
        session: token,
        signature,
      }
    );

    console.log('Updated watchlist after removal:', {
      id: watchlist.id,
      symbolCount: watchlist.symbols?.length,
    });

    expect(watchlist.symbols).toBeDefined();
  });

  it('uses the watchlists client with defaults', async () => {
    console.log('Testing createWatchlistsClient');

    const client = TradingView.watchlists.createWatchlistsClient({
      session: token,
      signature,
    });

    const watchlists = await client.list();
    console.log(`Found ${watchlists.length} watchlists via client`);

    expect(Array.isArray(watchlists)).toBe(true);
  });

  it('cleans up test watchlist', async () => {
    console.log('Cleaning up test watchlist');
    
    if (!createdWatchlistId) {
      console.log('No watchlist to clean up');
      return;
    }

    try {
      await TradingView.deleteWatchlist(createdWatchlistId, {
        session: token,
        signature,
      });
      console.log('Test watchlist deleted');
    } catch (error) {
      console.log('Cleanup error (may be expected):', error.message);
    }
  });
});

describe('Watchlists API (unauthenticated)', () => {
  it('throws error when session is missing', async () => {
    await expect(TradingView.listWatchlists({ session: '' }))
      .rejects
      .toThrow('Session is required');
  });
});
