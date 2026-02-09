/**
 * TradingView My Charts API Example
 * 
 * This example demonstrates how to use the TradingView charts API to:
 * - List all saved chart layouts
 * - Get favorite charts
 * - Search charts by symbol or name
 * - Get recent charts
 * - Get chart by ID
 * - Use the charts client with defaults
 */

const TradingView = require('../main');
require('dotenv').config();

// Configuration - Get these from environment variables or .env file
const SESSION = process.env.SESSION || 'your_session_id';
const SIGNATURE = process.env.SIGNATURE || 'your_session_signature';

async function runMyChartsExamples() {
  console.log('=== TradingView My Charts API Examples ===\n');

  // Check if credentials are provided
  if (SESSION === 'your_session_id' || SIGNATURE === 'your_session_signature') {
    console.log('⚠️  Please set your SESSION and SIGNATURE environment variables');
    console.log('You can get these from your browser cookies after logging into TradingView');
    console.log('Cookies needed: sessionid and sessionid_sign\n');
    return;
  }

  try {
    // ==========================================
    // 1. LIST ALL CHART LAYOUTS
    // ==========================================
    console.log('1. Listing all saved chart layouts...');
    const charts = await TradingView.getMyCharts({
      session: SESSION,
      signature: SIGNATURE,
      limit: 10,
    });
    console.log(`   Found ${charts.results.length} chart layouts`);
    
    if (charts.results.length > 0) {
      const chart = charts.results[0];
      console.log('\n   First chart layout:');
      console.log('   ID:', chart.id);
      console.log('   Name:', chart.name);
      console.log('   Symbol:', chart.symbol);
      console.log('   Resolution:', chart.resolution);
      console.log('   Created:', chart.created);
      console.log('   Modified:', chart.modified);
      console.log('   Favorite:', chart.favorite);
      console.log('   URL:', `https://www.tradingview.com/chart/${chart.url}/`);
    }
    console.log('   ✓ List chart layouts successful\n');

    // ==========================================
    // 2. GET FAVORITE CHARTS
    // ==========================================
    console.log('2. Getting favorite chart layouts...');
    const favorites = await TradingView.getFavoriteCharts({
      session: SESSION,
      signature: SIGNATURE,
    });
    console.log(`   Found ${favorites.length} favorite charts`);
    
    if (favorites.length > 0) {
      console.log('\n   Favorite charts:');
      favorites.slice(0, 5).forEach((chart) => {
        console.log(`   - ${chart.name} (${chart.symbol})`);
      });
    } else {
      console.log('   No favorite charts found. Star some charts in TradingView to see them here.');
    }
    console.log('   ✓ Get favorite charts successful\n');

    // ==========================================
    // 3. GET RECENT CHARTS
    // ==========================================
    console.log('3. Getting most recently modified charts...');
    const recentCharts = await TradingView.getRecentCharts({
      session: SESSION,
      signature: SIGNATURE,
      limit: 5,
    });
    console.log(`   Found ${recentCharts.length} recent charts`);
    
    if (recentCharts.length > 0) {
      console.log('\n   Recent charts:');
      recentCharts.forEach((chart) => {
        const modified = new Date(chart.modified).toLocaleDateString();
        console.log(`   - ${chart.name} (${chart.symbol}) - Modified: ${modified}`);
      });
    }
    console.log('   ✓ Get recent charts successful\n');

    // ==========================================
    // 4. SEARCH CHARTS BY SYMBOL
    // ==========================================
    if (charts.results.length > 0) {
      const searchSymbol = charts.results[0].symbol?.split(':')[1] || 'BTC';
      console.log(`4. Searching charts containing "${searchSymbol}"...`);
      const searchResults = await TradingView.searchMyCharts({
        session: SESSION,
        signature: SIGNATURE,
        query: searchSymbol,
      });
      console.log(`   Found ${searchResults.length} charts matching "${searchSymbol}"`);
      
      if (searchResults.length > 0) {
        console.log('\n   Matching charts:');
        searchResults.slice(0, 5).forEach((chart) => {
          console.log(`   - ${chart.name} (${chart.symbol})`);
        });
      }
      console.log('   ✓ Search charts successful\n');
    }

    // ==========================================
    // 5. GET CHART BY ID
    // ==========================================
    if (charts.results.length > 0) {
      const firstChartId = charts.results[0].id;
      console.log(`5. Getting chart by ID (${firstChartId})...`);
      const chartById = await TradingView.getChartById(firstChartId, {
        session: SESSION,
        signature: SIGNATURE,
      });
      
      if (chartById) {
        console.log('\n   Chart details:');
        console.log('   ID:', chartById.id);
        console.log('   Name:', chartById.name);
        console.log('   Symbol:', chartById.symbol);
        console.log('   Resolution:', chartById.resolution);
        console.log('   URL:', `https://www.tradingview.com/chart/${chartById.url}/`);
      } else {
        console.log('   Chart not found');
      }
      console.log('   ✓ Get chart by ID successful\n');
    }

    // ==========================================
    // 6. USING THE CHARTS CLIENT
    // ==========================================
    console.log('6. Using the charts client with defaults...');
    const chartsClient = TradingView.charts.createChartsClient({
      session: SESSION,
      signature: SIGNATURE,
    });

    // List charts via client
    const clientCharts = await chartsClient.list({ limit: 5 });
    console.log(`   Found ${clientCharts.results.length} charts via client`);

    // Get favorites via client
    const clientFavorites = await chartsClient.getFavorites();
    console.log(`   Found ${clientFavorites.length} favorites via client`);

    // Get recent via client
    const clientRecent = await chartsClient.getRecent({ limit: 3 });
    console.log(`   Found ${clientRecent.length} recent charts via client`);

    // Search via client
    const clientSearch = await chartsClient.search('BTC');
    console.log(`   Found ${clientSearch.length} charts matching "BTC" via client`);
    console.log('   ✓ Charts client successful\n');

    // ==========================================
    // 7. DISPLAY CHART STATISTICS
    // ==========================================
    console.log('7. Chart layout statistics...');
    const allCharts = await TradingView.getMyCharts({
      session: SESSION,
      signature: SIGNATURE,
      limit: 100,
    });

    // Count by resolution/timeframe
    const resolutionCounts = {};
    const symbolCounts = {};
    let favoriteCount = 0;

    allCharts.results.forEach((chart) => {
      // Count resolutions
      resolutionCounts[chart.resolution] = (resolutionCounts[chart.resolution] || 0) + 1;
      
      // Count symbols
      const symbol = chart.symbol?.split(':')[0] || 'Unknown';
      symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
      
      // Count favorites
      if (chart.favorite) favoriteCount++;
    });

    console.log('\n   Resolution distribution:');
    Object.entries(resolutionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([res, count]) => {
        const timeframe = { '1': '1m', '5': '5m', '15': '15m', '60': '1h', '240': '4h', 'D': '1D', 'W': '1W', 'M': '1M' }[res] || res;
        console.log(`   - ${timeframe}: ${count} charts`);
      });

    console.log('\n   Top exchanges/sources:');
    Object.entries(symbolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([symbol, count]) => {
        console.log(`   - ${symbol}: ${count} charts`);
      });

    console.log(`\n   Total favorites: ${favoriteCount}`);
    console.log('   ✓ Statistics generated\n');

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
runMyChartsExamples();
