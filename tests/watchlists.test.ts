import { describe, it, expect } from 'vitest';
import TradingView from '../main';

const token = process.env.SESSION as string;
const signature = process.env.SIGNATURE as string;

describe.skipIf(!token || !signature)('Watchlists API', () => {
  let createdWatchlistId: number | null = null;
  let isExistingWatchlist = false;

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
        active: watchlists[0].active,
        shared: watchlists[0].shared,
      });
      
      expect(watchlists[0].id).toBeDefined();
      expect(watchlists[0].name).toBeDefined();
      
      // Use existing watchlist for tests if needed
      if (!createdWatchlistId) {
        createdWatchlistId = watchlists[0].id;
        isExistingWatchlist = true;
      }
    }
  });

  it('creates a new watchlist (or skips if no premium)', async () => {
    console.log('Testing createWatchlist method');

    try {
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
      isExistingWatchlist = false;
    } catch (error: any) {
      if (error.message.includes('permission_denied') || error.message.includes('Essential, Plus and Premium')) {
        console.log('Skipping create test - requires premium plan');
        // Try to use an existing watchlist instead
        const watchlists = await TradingView.listWatchlists({ session: token, signature });
        if (watchlists.length > 0 && !createdWatchlistId) {
          createdWatchlistId = watchlists[0].id;
          isExistingWatchlist = true;
          console.log('Using existing watchlist:', createdWatchlistId);
        }
      } else {
        throw error;
      }
    }
  });

  it('gets a specific watchlist', async () => {
    console.log('Testing getWatchlist method');
    
    // First create a watchlist if we don't have one
    if (!createdWatchlistId) {
      const watchlists = await TradingView.listWatchlists({ session: token, signature });
      if (watchlists.length > 0) {
        createdWatchlistId = watchlists[0].id;
        isExistingWatchlist = true;
      } else {
        console.log('No watchlists available, skipping test');
        return;
      }
    }

    const watchlist = await TradingView.getWatchlist(createdWatchlistId, {
      session: token,
      signature,
    });

    console.log('Retrieved watchlist:', {
      id: watchlist.id,
      name: watchlist.name,
      symbols: watchlist.symbols?.length,
      active: watchlist.active,
      shared: watchlist.shared,
    });

    expect(watchlist.id).toBe(createdWatchlistId);
    expect(watchlist.name).toBeDefined();
    expect(watchlist.symbols).toBeDefined();
    expect(typeof watchlist.active).toBe('boolean');
    expect(typeof watchlist.shared).toBe('boolean');
  });

  it('renames a watchlist', async () => {
    console.log('Testing renameWatchlist method');
    
    if (!createdWatchlistId) {
      console.log('Skipping - no watchlist to rename');
      return;
    }

    try {
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
    } catch (error: any) {
      if (error.message.includes('permission_denied')) {
        console.log('Skipping - requires premium plan');
      } else {
        throw error;
      }
    }
  });

  it('adds symbols to a watchlist', async () => {
    console.log('Testing addSymbols method');
    
    if (!createdWatchlistId) {
      console.log('Skipping - no watchlist to modify');
      return;
    }

    try {
      const symbols = await TradingView.addSymbols(
        createdWatchlistId,
        ['OANDA:XAUUSD', 'OANDA:EURUSD'],
        {
          session: token,
          signature,
        }
      );

      console.log('Updated symbols count:', symbols.length);

      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThanOrEqual(2);
    } catch (error: any) {
      if (error.message.includes('permission_denied')) {
        console.log('Skipping - requires premium plan');
      } else {
        throw error;
      }
    }
  });

  it('replaces all symbols in a watchlist', async () => {
    console.log('Testing replaceWatchlistSymbols method');
    
    if (!createdWatchlistId) {
      console.log('Skipping - no watchlist to modify');
      return;
    }

    try {
      // Use unsafe mode to allow adding new symbols
      const symbols = await TradingView.replaceWatchlistSymbols(
        createdWatchlistId,
        ['###Crypto', 'COINBASE:BTCUSD', '###Stocks', 'NASDAQ:AAPL'],
        {
          session: token,
          signature,
          unsafe: true,
        }
      );

      console.log('Replaced symbols:', symbols.slice(0, 5));

      expect(Array.isArray(symbols)).toBe(true);
    } catch (error: any) {
      if (error.message.includes('permission_denied')) {
        console.log('Skipping - requires premium plan');
      } else {
        throw error;
      }
    }
  });

  it('replaces a single symbol in a watchlist', async () => {
    console.log('Testing replaceSymbol method');
    
    if (!createdWatchlistId) {
      console.log('Skipping - no watchlist to modify');
      return;
    }

    try {
      const symbols = await TradingView.replaceSymbol(
        createdWatchlistId,
        '###Crypto',
        '###Cryptocurrencies',
        {
          session: token,
          signature,
        }
      );

      console.log('Symbols after replace:', symbols.slice(0, 5));

      expect(Array.isArray(symbols)).toBe(true);
    } catch (error: any) {
      if (error.message.includes('permission_denied')) {
        console.log('Skipping - requires premium plan');
      } else {
        throw error;
      }
    }
  });

  it('removes symbols from a watchlist', async () => {
    console.log('Testing removeSymbols method');
    
    if (!createdWatchlistId) {
      console.log('Skipping - no watchlist to modify');
      return;
    }

    try {
      const result = await TradingView.removeSymbols(
        createdWatchlistId,
        ['OANDA:EURUSD'],
        {
          session: token,
          signature,
        }
      );

      console.log('Remove result:', result.status || 'OK');

      expect(result).toBeDefined();
    } catch (error: any) {
      if (error.message.includes('permission_denied')) {
        console.log('Skipping - requires premium plan');
      } else {
        throw error;
      }
    }
  });

  it('shares and unshares a watchlist', async () => {
    console.log('Testing shareWatchlist method');
    
    if (!createdWatchlistId) {
      console.log('Skipping - no watchlist to share');
      return;
    }

    try {
      // Share
      const shared = await TradingView.shareWatchlist(createdWatchlistId, true, {
        session: token,
        signature,
      });
      
      console.log('Shared status:', shared.shared);
      expect(shared.shared).toBe(true);

      // Unshare
      const unshared = await TradingView.shareWatchlist(createdWatchlistId, false, {
        session: token,
        signature,
      });
      
      console.log('Unshared status:', unshared.shared);
      expect(unshared.shared).toBe(false);
    } catch (error: any) {
      if (error.message.includes('permission_denied')) {
        console.log('Skipping - requires premium plan');
      } else {
        throw error;
      }
    }
  });

  it('uses colored lists', async () => {
    console.log('Testing colored lists methods');
    
    expect(TradingView.COLORED_LIST_COLORS).toContain('red');
    expect(TradingView.COLORED_LIST_COLORS).toContain('green');

    try {
      // Add to red list
      const redList = await TradingView.addToColoredList('red', ['OANDA:XAUUSD'], {
        session: token,
        signature,
      });
      
      console.log('Red list:', redList);
      expect(Array.isArray(redList)).toBe(true);

      // Remove from colored lists
      const result = await TradingView.removeFromColoredLists(['OANDA:XAUUSD'], {
        session: token,
        signature,
      });
      
      console.log('Remove result:', result.status || 'OK');
    } catch (error: any) {
      if (error.message.includes('permission_denied')) {
        console.log('Skipping - requires premium plan');
      } else {
        throw error;
      }
    }
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

    // Test that client has all methods
    expect(typeof client.replaceSymbols).toBe('function');
    expect(typeof client.replaceSymbol).toBe('function');
    expect(typeof client.share).toBe('function');
    expect(typeof client.addToColoredList).toBe('function');
    expect(typeof client.removeFromColoredLists).toBe('function');
    expect(client.COLORED_LIST_COLORS).toBeDefined();
  });

  it('cleans up test watchlist (if created)', async () => {
    console.log('Cleaning up test watchlist');
    
    if (!createdWatchlistId || isExistingWatchlist) {
      console.log('No watchlist to clean up (using existing)');
      return;
    }

    try {
      await TradingView.deleteWatchlist(createdWatchlistId, {
        session: token,
        signature,
      });
      console.log('Test watchlist deleted');
    } catch (error: any) {
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

describe('Watchlists API structure', () => {
  it('exports all required functions', () => {
    expect(typeof TradingView.listWatchlists).toBe('function');
    expect(typeof TradingView.getWatchlist).toBe('function');
    expect(typeof TradingView.createWatchlist).toBe('function');
    expect(typeof TradingView.renameWatchlist).toBe('function');
    expect(typeof TradingView.deleteWatchlist).toBe('function');
    expect(typeof TradingView.setActiveWatchlist).toBe('function');
    expect(typeof TradingView.addSymbols).toBe('function');
    expect(typeof TradingView.removeSymbols).toBe('function');
    expect(typeof TradingView.replaceWatchlistSymbols).toBe('function');
    expect(typeof TradingView.replaceSymbol).toBe('function');
    expect(typeof TradingView.shareWatchlist).toBe('function');
    expect(typeof TradingView.addToColoredList).toBe('function');
    expect(typeof TradingView.removeFromColoredLists).toBe('function');
    expect(typeof TradingView.createWatchlistsClient).toBe('function');
  });

  it('exports COLORED_LIST_COLORS constant', () => {
    expect(TradingView.COLORED_LIST_COLORS).toBeDefined();
    expect(Array.isArray(TradingView.COLORED_LIST_COLORS)).toBe(true);
    expect(TradingView.COLORED_LIST_COLORS).toContain('red');
    expect(TradingView.COLORED_LIST_COLORS).toContain('green');
    expect(TradingView.COLORED_LIST_COLORS).toContain('blue');
  });
});
