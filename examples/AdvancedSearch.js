const TradingView = require('../main');

/**
 * This example demonstrates the advanced search functionality
 * allowing filtering by exchange, type, and pagination.
 */

async function main() {
  console.log('--- Searching for "AAPL" (Stock) ---');
  const stockResult = await TradingView.search('AAPL', {
    type: 'stock',
    exchange: 'NASDAQ',
    limit: 10 // limit is not directly supported by API but we can implement client side or just take first N
  });
  
  console.log(`Found ${stockResult.symbols.length} symbols.`);
  console.log(`Remaining: ${stockResult.remaining}`);
  if (stockResult.symbols.length > 0) {
    console.log('First match:', {
      symbol: stockResult.symbols[0].symbol,
      description: stockResult.symbols[0].description,
      exchange: stockResult.symbols[0].exchange,
      type: stockResult.symbols[0].type,
    });
  }

  console.log('\n--- Searching for "BTC" (Crypto) on Binance ---');
  const cryptoResult = await TradingView.search('BTC', {
    type: 'crypto',
    exchange: 'BINANCE',
  });
  
  console.log(`Found ${cryptoResult.symbols.length} symbols.`);
  if (cryptoResult.symbols.length > 0) {
    const btc = cryptoResult.symbols[0];
    console.log('First match:', `${btc.exchange}:${btc.symbol}`);
    
    // Demonstrate getting TA
    console.log('Fetching TA for first result...');
    const ta = await btc.getTA();
    if (ta) {
      console.log('TA (1D):', ta['1D']);
    } else {
      console.log('TA not available.');
    }
  }

  console.log('\n--- Pagination Example (Searching "A") ---');
  const page1 = await TradingView.search('A', { type: 'stock', start: 0 });
  console.log(`Page 1: ${page1.symbols.length} symbols. First: ${page1.symbols[0].symbol}`);

  if (page1.remaining > 0) {
    const page2 = await TradingView.search('A', { type: 'stock', start: 50 });
    console.log(`Page 2: ${page2.symbols.length} symbols. First: ${page2.symbols[0].symbol}`);
  }
}

main().catch(console.error);
