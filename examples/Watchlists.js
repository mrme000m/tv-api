/**
 * TradingView Watchlists API Example
 * 
 * This example demonstrates how to use the TradingView watchlists API to:
 * - List all watchlists
 * - Create a new watchlist
 * - Get a specific watchlist
 * - Rename a watchlist
 * - Add/remove symbols
 * - Set active watchlist
 * - Delete watchlists
 */

const TradingView = require('../main');
require('dotenv').config();

// Configuration - Get these from environment variables or .env file
const SESSION = process.env.SESSION || 'your_session_id';
const SIGNATURE = process.env.SIGNATURE || 'your_session_signature';

async function runWatchlistExamples() {
  console.log('=== TradingView Watchlists API Examples ===\n');

  // Check if credentials are provided
  if (SESSION === 'your_session_id' || SIGNATURE === 'your_session_signature') {
    console.log('⚠️  Please set your SESSION and SIGNATURE environment variables');
    console.log('You can get these from your browser cookies after logging into TradingView');
    console.log('Cookies needed: sessionid and sessionid_sign\n');
    return;
  }

  let createdWatchlistId = null;

  try {
    // ==========================================
    // 1. LIST ALL WATCHLISTS
    // ==========================================
    console.log('1. Listing all watchlists...');
    const watchlists = await TradingView.listWatchlists({
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log(`   Found ${watchlists.length} watchlists`);
    if (watchlists.length > 0) {
      console.log('   First watchlist:', {
        id: watchlists[0].id,
        name: watchlists[0].name,
        symbols: watchlists[0].symbols?.length,
      });
    }
    console.log('   ✓ List watchlists successful\n');

    // ==========================================
    // 2. CREATE A NEW WATCHLIST
    // ==========================================
    console.log('2. Creating a new watchlist...');
    const newWatchlist = await TradingView.createWatchlist({
      name: `API Test Watchlist ${Date.now()}`,
      symbols: ['COINBASE:BTCUSD', 'COINBASE:ETHUSD', 'OANDA:XAUUSD'],
    }, {
      session: SESSION,
      signature: SIGNATURE,
    });
    createdWatchlistId = newWatchlist.id;
    console.log('   Created watchlist ID:', newWatchlist.id);
    console.log('   Name:', newWatchlist.name);
    console.log('   ✓ Create watchlist successful\n');

    // ==========================================
    // 3. GET A SPECIFIC WATCHLIST
    // ==========================================
    console.log('3. Getting watchlist details...');
    const watchlist = await TradingView.getWatchlist(createdWatchlistId, {
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log('   Watchlist:', {
      id: watchlist.id,
      name: watchlist.name,
      symbols: watchlist.symbols?.map((s) => s.id),
    });
    console.log('   ✓ Get watchlist successful\n');

    // ==========================================
    // 4. RENAME THE WATCHLIST
    // ==========================================
    console.log('4. Renaming the watchlist...');
    const renamed = await TradingView.renameWatchlist(
      createdWatchlistId,
      `Renamed Watchlist ${Date.now()}`,
      {
        session: SESSION,
        signature: SIGNATURE,
      }
    );
    console.log('   New name:', renamed.name);
    console.log('   ✓ Rename successful\n');

    // ==========================================
    // 5. ADD SYMBOLS TO WATCHLIST
    // ==========================================
    console.log('5. Adding symbols to watchlist...');
    const updated = await TradingView.addSymbols(
      createdWatchlistId,
      ['NASDAQ:AAPL', 'NASDAQ:MSFT'],
      {
        session: SESSION,
        signature: SIGNATURE,
      }
    );
    console.log('   Total symbols:', updated.symbols?.length);
    console.log('   ✓ Add symbols successful\n');

    // ==========================================
    // 6. REMOVE SYMBOLS FROM WATCHLIST
    // ==========================================
    console.log('6. Removing a symbol from watchlist...');
    const afterRemoval = await TradingView.removeSymbols(
      createdWatchlistId,
      ['NASDAQ:MSFT'],
      {
        session: SESSION,
        signature: SIGNATURE,
      }
    );
    console.log('   Total symbols after removal:', afterRemoval.symbols?.length);
    console.log('   ✓ Remove symbols successful\n');

    // ==========================================
    // 7. SET WATCHLIST AS ACTIVE
    // ==========================================
    console.log('7. Setting watchlist as active...');
    await TradingView.setActiveWatchlist(createdWatchlistId, {
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log('   ✓ Set active successful\n');

    // ==========================================
    // 8. USING THE WATCHLISTS CLIENT
    // ==========================================
    console.log('8. Using the watchlists client with defaults...');
    const watchlistsClient = TradingView.watchlists.createWatchlistsClient({
      session: SESSION,
      signature: SIGNATURE,
    });

    const clientWatchlists = await watchlistsClient.list();
    console.log(`   Found ${clientWatchlists.length} watchlists via client`);
    console.log('   ✓ Watchlists client successful\n');

    // ==========================================
    // 9. CLEAN UP - DELETE THE WATCHLIST
    // ==========================================
    console.log('9. Cleaning up - deleting test watchlist...');
    await TradingView.deleteWatchlist(createdWatchlistId, {
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log('   ✓ Delete watchlist successful\n');

    console.log('=== All examples completed successfully! ===');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    // Cleanup on error
    if (createdWatchlistId) {
      try {
        console.log('\nCleaning up test watchlist after error...');
        await TradingView.deleteWatchlist(createdWatchlistId, {
          session: SESSION,
          signature: SIGNATURE,
        });
        console.log('Cleanup successful');
      } catch (cleanupError) {
        console.log('Cleanup failed:', cleanupError.message);
      }
    }
    
    process.exit(1);
  }
}

// Run the examples
runWatchlistExamples();
