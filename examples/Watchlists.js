/**
 * TradingView Watchlists API Example
 * 
 * This example demonstrates how to use the TradingView watchlists API to:
 * - List all watchlists
 * - Create a new watchlist
 * - Get a specific watchlist
 * - Rename a watchlist
 * - Add/remove symbols
 * - Replace all symbols in a watchlist
 * - Replace a single symbol
 * - Set active watchlist
 * - Share/unshare watchlist
 * - Use colored lists
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

  // Check pro plan status
  let hasPremiumFeatures = false;
  try {
    const planInfo = await TradingView.getProPlanInfo({ session: SESSION, signature: SIGNATURE });
    console.log('Pro plan:', planInfo.pro_plan);
    hasPremiumFeatures = TradingView.hasPremiumFeatures(planInfo);
    console.log('Has premium features:', hasPremiumFeatures);
    console.log();
  } catch (e) {
    console.log('Could not determine pro plan, assuming free plan\n');
  }

  let createdWatchlistId = null;
  let isExistingWatchlist = false;

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
        active: watchlists[0].active,
        shared: watchlists[0].shared,
      });
      
      // Use the first existing watchlist for testing if we can't create new ones
      if (!createdWatchlistId) {
        createdWatchlistId = watchlists[0].id;
        isExistingWatchlist = true;
      }
    }
    console.log('   ✓ List watchlists successful\n');

    // ==========================================
    // 2. CREATE A NEW WATCHLIST
    // ==========================================
    console.log('2. Creating a new watchlist...');
    
    if (!hasPremiumFeatures) {
      console.log('   (Note: Creating multiple watchlists requires Pro, Pro+, or Premium plan)');
    }
    
    try {
      const newWatchlist = await TradingView.createWatchlist({
        name: `API Test Watchlist ${Date.now()}`,
        symbols: ['COINBASE:BTCUSD', 'COINBASE:ETHUSD', 'OANDA:XAUUSD'],
      }, {
        session: SESSION,
        signature: SIGNATURE,
      });
      createdWatchlistId = newWatchlist.id;
      isExistingWatchlist = false;
      console.log('   Created watchlist ID:', newWatchlist.id);
      console.log('   Name:', newWatchlist.name);
      console.log('   ✓ Create watchlist successful\n');
    } catch (createError) {
      if (createError.message.includes('permission_denied') || createError.message.includes('Essential, Plus and Premium')) {
        console.log('   ⚠️  Skipping: Requires Essential, Plus, or Premium plan');
        console.log('   Will use existing watchlist for remaining tests\n');
      } else {
        throw createError;
      }
    }

    // ==========================================
    // 3. GET A SPECIFIC WATCHLIST
    // ==========================================
    if (createdWatchlistId) {
      console.log('3. Getting watchlist details...');
      const watchlist = await TradingView.getWatchlist(createdWatchlistId, {
        session: SESSION,
        signature: SIGNATURE,
      });
      console.log('   Watchlist:', {
        id: watchlist.id,
        name: watchlist.name,
        symbols: watchlist.symbols?.slice(0, 5).map((s) => s),
        symbolCount: watchlist.symbols?.length,
        active: watchlist.active,
        shared: watchlist.shared,
      });
      console.log('   ✓ Get watchlist successful\n');

      // ==========================================
      // 4. RENAME THE WATCHLIST
      // ==========================================
      console.log('4. Renaming the watchlist...');
      try {
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
      } catch (renameError) {
        console.log('   ⚠️  Rename failed:', renameError.message);
        console.log('   (May require premium plan)\n');
      }

      // ==========================================
      // 5. ADD SYMBOLS TO WATCHLIST
      // ==========================================
      console.log('5. Adding symbols to watchlist...');
      try {
        const addedSymbols = await TradingView.addSymbols(
          createdWatchlistId,
          ['NASDAQ:AAPL', 'NASDAQ:MSFT'],
          {
            session: SESSION,
            signature: SIGNATURE,
          }
        );
        console.log('   Total symbols after add:', addedSymbols.length);
        console.log('   ✓ Add symbols successful\n');
      } catch (addError) {
        console.log('   ⚠️  Add symbols failed:', addError.message);
        console.log('   (May require premium plan)\n');
      }

      // ==========================================
      // 6. REPLACE ALL SYMBOLS IN WATCHLIST
      // ==========================================
      console.log('6. Replacing all symbols in watchlist...');
      try {
        const replacedSymbols = await TradingView.replaceWatchlistSymbols(
          createdWatchlistId,
          ['###Crypto', 'COINBASE:BTCUSD', 'COINBASE:ETHUSD', '###Stocks', 'NASDAQ:AAPL'],
          {
            session: SESSION,
            signature: SIGNATURE,
            unsafe: true,  // Required when adding new symbols
          }
        );
        console.log('   New symbols:', replacedSymbols.slice(0, 5));
        console.log('   ✓ Replace symbols successful\n');
      } catch (replaceError) {
        console.log('   ⚠️  Replace symbols failed:', replaceError.message);
        console.log('   (May require premium plan)\n');
      }

      // ==========================================
      // 7. REPLACE A SINGLE SYMBOL
      // ==========================================
      console.log('7. Replacing a single symbol...');
      try {
        const replacedSymbols = await TradingView.replaceSymbol(
          createdWatchlistId,
          '###Crypto',
          '###Cryptocurrencies',
          {
            session: SESSION,
            signature: SIGNATURE,
          }
        );
        console.log('   Symbols after replace:', replacedSymbols.slice(0, 5));
        console.log('   ✓ Replace symbol successful\n');
      } catch (replaceError) {
        console.log('   ⚠️  Replace symbol failed:', replaceError.message);
        console.log('   (May require premium plan)\n');
      }

      // ==========================================
      // 8. REMOVE SYMBOLS FROM WATCHLIST
      // ==========================================
      console.log('8. Removing a symbol from watchlist...');
      try {
        const removeResult = await TradingView.removeSymbols(
          createdWatchlistId,
          ['NASDAQ:AAPL'],
          {
            session: SESSION,
            signature: SIGNATURE,
          }
        );
        console.log('   Remove result:', removeResult.status || 'OK');
        console.log('   ✓ Remove symbols successful\n');
      } catch (removeError) {
        console.log('   ⚠️  Remove symbols failed:', removeError.message);
        console.log('   (May require premium plan)\n');
      }

      // ==========================================
      // 9. SET WATCHLIST AS ACTIVE
      // ==========================================
      console.log('9. Setting watchlist as active...');
      try {
        const activeWatchlist = await TradingView.setActiveWatchlist(createdWatchlistId, {
          session: SESSION,
          signature: SIGNATURE,
        });
        console.log('   Active status:', activeWatchlist.active);
        console.log('   ✓ Set active successful\n');
      } catch (activeError) {
        console.log('   ⚠️  Set active failed:', activeError.message);
        console.log('   (May require premium plan)\n');
      }

      // ==========================================
      // 10. SHARE/UNSHARE WATCHLIST
      // ==========================================
      console.log('10. Sharing watchlist...');
      try {
        const sharedWatchlist = await TradingView.shareWatchlist(createdWatchlistId, true, {
          session: SESSION,
          signature: SIGNATURE,
        });
        console.log('   Shared status:', sharedWatchlist.shared);
        console.log('   ✓ Share watchlist successful\n');
        
        // Unshare it back
        console.log('10b. Unsharing watchlist...');
        const unsharedWatchlist = await TradingView.shareWatchlist(createdWatchlistId, false, {
          session: SESSION,
          signature: SIGNATURE,
        });
        console.log('    Shared status:', unsharedWatchlist.shared);
        console.log('    ✓ Unshare watchlist successful\n');
      } catch (shareError) {
        console.log('   ⚠️  Share/unshare failed:', shareError.message);
        console.log('   (May require premium plan)\n');
      }
    } else {
      console.log('3-10. Skipping watchlist operations - no watchlist ID available\n');
    }

    // ==========================================
    // 11. COLORED LISTS
    // ==========================================
    console.log('11. Using colored lists...');
    console.log('   Available colors:', TradingView.COLORED_LIST_COLORS.join(', '));
    
    try {
      // Add symbol to red list
      console.log('   Adding XAUUSD to red list...');
      const redList = await TradingView.addToColoredList('red', ['OANDA:XAUUSD'], {
        session: SESSION,
        signature: SIGNATURE,
      });
      console.log('   Red list symbols:', redList);
      
      // Remove from colored lists
      console.log('   Removing XAUUSD from colored lists...');
      const removeResult = await TradingView.removeFromColoredLists(['OANDA:XAUUSD'], {
        session: SESSION,
        signature: SIGNATURE,
      });
      console.log('   Remove result:', removeResult.status || 'OK');
      console.log('   ✓ Colored lists operations successful\n');
    } catch (coloredError) {
      console.log('   ⚠️  Colored lists failed:', coloredError.message);
      console.log('   (May require premium plan)\n');
    }

    // ==========================================
    // 12. USING THE WATCHLISTS CLIENT
    // ==========================================
    console.log('12. Using the watchlists client with defaults...');
    const watchlistsClient = TradingView.watchlists.createWatchlistsClient({
      session: SESSION,
      signature: SIGNATURE,
    });

    const clientWatchlists = await watchlistsClient.list();
    console.log(`   Found ${clientWatchlists.length} watchlists via client`);
    
    // Test client with new methods
    if (createdWatchlistId && !isExistingWatchlist) {
      try {
        await watchlistsClient.share(createdWatchlistId, true);
        console.log('   ✓ Share via client successful');
      } catch (e) {
        console.log('   ⚠️  Share via client failed:', e.message);
      }
    }
    console.log('   ✓ Watchlists client successful\n');

    // ==========================================
    // 13. CLEAN UP - DELETE THE WATCHLIST (only if we created it)
    // ==========================================
    if (createdWatchlistId && !isExistingWatchlist) {
      console.log('13. Cleaning up - deleting test watchlist...');
      try {
        await TradingView.deleteWatchlist(createdWatchlistId, {
          session: SESSION,
          signature: SIGNATURE,
        });
        console.log('   ✓ Delete watchlist successful\n');
      } catch (deleteError) {
        console.log('   ⚠️  Delete failed:', deleteError.message);
        console.log('   (May require premium plan or watchlist not found)\n');
      }
    } else {
      console.log('13. Skipping cleanup - using existing watchlist\n');
    }

    console.log('=== All examples completed successfully! ===');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the examples
runWatchlistExamples();
