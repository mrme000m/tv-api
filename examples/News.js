/**
 * TradingView News API Example
 * 
 * This example demonstrates how to use the TradingView news API to:
 * - Get general market news
 * - Get symbol-specific news
 * - Get news by category (crypto, stocks, forex)
 * - Search news articles
 * - Get news providers
 */

const TradingView = require('../main');

async function runNewsExamples() {
  console.log('=== TradingView News API Examples ===\n');

  try {
    // ==========================================
    // 1. GET GENERAL MARKET NEWS
    // ==========================================
    console.log('1. Getting general market news...');
    const marketNews = await TradingView.getMarketNews({
      limit: 5,
    });
    console.log(`   Found ${marketNews.items.length} news items`);
    console.log('   Has more:', marketNews.hasMore);
    
    if (marketNews.items.length > 0) {
      const item = marketNews.items[0];
      console.log('\n   Latest news:');
      console.log('   Title:', item.title);
      console.log('   Provider:', item.provider?.name);
      console.log('   Published:', new Date(item.published * 1000).toLocaleString());
      console.log('   Urgency:', item.urgency);
      console.log('   Related symbols:', item.relatedSymbols?.map((s) => s.symbol).join(', ') || 'None');
    }
    console.log('   ✓ Get market news successful\n');

    // ==========================================
    // 2. GET SYMBOL-SPECIFIC NEWS (Bitcoin)
    // ==========================================
    console.log('2. Getting news for Bitcoin (BITSTAMP:BTCUSD)...');
    const btcNews = await TradingView.getSymbolNews('BITSTAMP:BTCUSD', {
      limit: 3,
    });
    console.log(`   Found ${btcNews.items.length} BTC-related news items`);
    
    if (btcNews.items.length > 0) {
      console.log('\n   Latest BTC news:');
      console.log('   Title:', btcNews.items[0].title);
      console.log('   Provider:', btcNews.items[0].provider?.name);
      console.log('   Link:', btcNews.items[0].link);
    }
    console.log('   ✓ Get symbol news successful\n');

    // ==========================================
    // 3. GET CRYPTO NEWS
    // ==========================================
    console.log('3. Getting crypto category news...');
    const cryptoNews = await TradingView.getCryptoNews({
      limit: 3,
    });
    console.log(`   Found ${cryptoNews.items.length} crypto news items`);
    
    if (cryptoNews.items.length > 0) {
      console.log('\n   Latest crypto news:');
      console.log('   Title:', cryptoNews.items[0].title);
      console.log('   Provider:', cryptoNews.items[0].provider?.name);
    }
    console.log('   ✓ Get crypto news successful\n');

    // ==========================================
    // 4. GET STOCK NEWS
    // ==========================================
    console.log('4. Getting stock category news...');
    const stockNews = await TradingView.getStockNews({
      limit: 3,
    });
    console.log(`   Found ${stockNews.items.length} stock news items`);
    
    if (stockNews.items.length > 0) {
      console.log('\n   Latest stock news:');
      console.log('   Title:', stockNews.items[0].title);
      console.log('   Provider:', stockNews.items[0].provider?.name);
    }
    console.log('   ✓ Get stock news successful\n');

    // ==========================================
    // 5. SEARCH NEWS
    // ==========================================
    console.log('5. Searching news for "Federal Reserve"...');
    const searchResults = await TradingView.searchNews('Federal Reserve', {
      limit: 3,
    });
    console.log(`   Found ${searchResults.items.length} matching news items`);
    
    if (searchResults.items.length > 0) {
      console.log('\n   Top search result:');
      console.log('   Title:', searchResults.items[0].title);
      console.log('   Provider:', searchResults.items[0].provider?.name);
    }
    console.log('   ✓ Search news successful\n');

    // ==========================================
    // 6. GET NEWS PROVIDERS
    // ==========================================
    console.log('6. Getting news providers...');
    const providers = await TradingView.getNewsProviders();
    console.log(`   Found ${providers.length} news providers`);
    
    if (providers.length > 0) {
      console.log('\n   Top providers:');
      providers.slice(0, 5).forEach((provider) => {
        console.log(`   - ${provider.name} (${provider.id})`);
      });
    }
    console.log('   ✓ Get news providers successful\n');

    // ==========================================
    // 7. USING THE NEWS CLIENT
    // ==========================================
    console.log('7. Using the news client...');
    const newsClient = TradingView.news.createNewsClient();
    
    const clientNews = await newsClient.getMarketNews({ limit: 3 });
    console.log(`   Found ${clientNews.items.length} news items via client`);
    console.log('   ✓ News client successful\n');

    // ==========================================
    // 8. GET FOREX NEWS
    // ==========================================
    console.log('8. Getting forex news...');
    const forexNews = await TradingView.getForexNews({
      limit: 3,
    });
    console.log(`   Found ${forexNews.items.length} forex news items`);
    console.log('   ✓ Get forex news successful\n');

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
runNewsExamples();
