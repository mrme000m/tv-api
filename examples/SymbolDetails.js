/**
 * TradingView Symbol Details API Example
 * 
 * This example demonstrates how to use the TradingView symbol details API to:
 * - Get detailed symbol information and metrics
 * - Get symbol performance data
 * - Get technical indicator recommendations
 * - Get volatility and volume metrics
 * - Compare multiple symbols
 */

const TradingView = require('../main');

async function runSymbolDetailsExamples() {
  console.log('=== TradingView Symbol Details API Examples ===\n');

  try {
    // ==========================================
    // 1. GET SYMBOL DETAILS (Bitcoin)
    // ==========================================
    console.log('1. Getting detailed information for Bitcoin (COINBASE:BTCUSD)...');
    const btcDetails = await TradingView.getSymbolDetails('COINBASE:BTCUSD');
    
    console.log('\n   Performance Metrics:');
    console.log('   Weekly:', btcDetails['Perf.W']?.toFixed(2) + '%');
    console.log('   Monthly:', btcDetails['Perf.1M']?.toFixed(2) + '%');
    console.log('   3-Month:', btcDetails['Perf.3M']?.toFixed(2) + '%');
    console.log('   Yearly:', btcDetails['Perf.Y']?.toFixed(2) + '%');
    console.log('   YTD:', btcDetails['Perf.YTD']?.toFixed(2) + '%');
    
    console.log('\n   Price Levels:');
    console.log('   1-Month High:', btcDetails['High.1M']);
    console.log('   1-Month Low:', btcDetails['Low.1M']);
    console.log('   52-Week High:', btcDetails['price_52_week_high']);
    console.log('   52-Week Low:', btcDetails['price_52_week_low']);
    
    console.log('\n   Recommendations:');
    console.log('   Overall:', btcDetails['Recommend.All']?.toFixed(3));
    console.log('   MA:', btcDetails['Recommend.MA']?.toFixed(3));
    console.log('   Other:', btcDetails['Recommend.Other']?.toFixed(3));
    
    console.log('\n   Technical Indicators:');
    console.log('   RSI:', btcDetails['RSI']?.toFixed(2));
    console.log('   Momentum:', btcDetails['Mom']?.toFixed(2));
    console.log('   Awesome Oscillator:', btcDetails['AO']?.toFixed(2));
    console.log('   CCI(20):', btcDetails['CCI20']?.toFixed(2));
    console.log('   ✓ Get symbol details successful\n');

    // ==========================================
    // 2. GET SYMBOL INFO
    // ==========================================
    console.log('2. Getting basic symbol info for BTC...');
    const btcInfo = await TradingView.getSymbolInfo('COINBASE:BTCUSD');
    
    console.log('\n   Symbol Info:');
    console.log('   Symbol:', btcInfo.symbol);
    console.log('   Name:', btcInfo.name);
    console.log('   Description:', btcInfo.description);
    console.log('   Type:', btcInfo.type);
    console.log('   Exchange:', btcInfo.exchange);
    console.log('   Currency:', btcInfo.currency);
    console.log('   ✓ Get symbol info successful\n');

    // ==========================================
    // 3. GET SYMBOL PERFORMANCE
    // ==========================================
    console.log('3. Getting performance metrics for Ethereum...');
    const ethPerformance = await TradingView.getSymbolPerformance('COINBASE:ETHUSD');
    
    console.log('\n   ETH Performance:');
    console.log('   Weekly:', ethPerformance.weekly?.toFixed(2) + '%');
    console.log('   Monthly:', ethPerformance.monthly?.toFixed(2) + '%');
    console.log('   Quarterly:', ethPerformance.quarterly?.toFixed(2) + '%');
    console.log('   Half-Year:', ethPerformance.halfYearly?.toFixed(2) + '%');
    console.log('   Yearly:', ethPerformance.yearly?.toFixed(2) + '%');
    console.log('   YTD:', ethPerformance.ytd?.toFixed(2) + '%');
    console.log('   ✓ Get symbol performance successful\n');

    // ==========================================
    // 4. GET SYMBOL RECOMMENDATIONS
    // ==========================================
    console.log('4. Getting recommendations for Gold (OANDA:XAUUSD)...');
    const goldRec = await TradingView.getSymbolRecommendation('OANDA:XAUUSD');
    
    console.log('\n   Gold Recommendations:');
    console.log('   Overall:', goldRec.overall?.toFixed(3));
    console.log('   Moving Averages:', goldRec.movingAverages?.toFixed(3));
    console.log('   Other Indicators:', goldRec.other?.toFixed(3));
    console.log('   RSI:', goldRec.rsi?.toFixed(2));
    console.log('   Momentum:', goldRec.momentum?.toFixed(2));
    console.log('   ✓ Get symbol recommendation successful\n');

    // ==========================================
    // 5. GET VOLATILITY METRICS
    // ==========================================
    console.log('5. Getting volatility for BTC...');
    const btcVolatility = await TradingView.getSymbolVolatility('COINBASE:BTCUSD');
    
    console.log('\n   BTC Volatility:');
    console.log('   Daily:', btcVolatility.daily?.toFixed(2) + '%');
    console.log('   Weekly:', btcVolatility.weekly?.toFixed(2) + '%');
    console.log('   Monthly:', btcVolatility.monthly?.toFixed(2) + '%');
    console.log('   ✓ Get symbol volatility successful\n');

    // ==========================================
    // 6. GET VOLUME METRICS
    // ==========================================
    console.log('6. Getting volume metrics for BTC...');
    const btcVolume = await TradingView.getSymbolVolume('COINBASE:BTCUSD');
    
    console.log('\n   BTC Volume:');
    console.log('   10-Day Avg:', btcVolume.average10d?.toLocaleString());
    console.log('   30-Day Avg:', btcVolume.average30d?.toLocaleString());
    console.log('   ✓ Get symbol volume successful\n');

    // ==========================================
    // 7. GET MULTIPLE SYMBOL DETAILS
    // ==========================================
    console.log('7. Comparing multiple symbols (BTC, ETH, AAPL)...');
    const symbols = ['COINBASE:BTCUSD', 'COINBASE:ETHUSD', 'NASDAQ:AAPL'];
    const multiDetails = await TradingView.getMultipleSymbolDetails(symbols);
    
    console.log('\n   Comparison:');
    console.log('   Symbol        | Weekly   | Monthly  | Yearly   | RSI');
    console.log('   --------------------------------------------------------');
    for (const symbol of symbols) {
      const d = multiDetails[symbol];
      if (!d.error) {
        const weekly = d['Perf.W']?.toFixed(2).padStart(7) + '%' || 'N/A';
        const monthly = d['Perf.1M']?.toFixed(2).padStart(7) + '%' || 'N/A';
        const yearly = d['Perf.Y']?.toFixed(2).padStart(7) + '%' || 'N/A';
        const rsi = d['RSI']?.toFixed(2).padStart(6) || 'N/A';
        console.log(`   ${symbol.padEnd(13)} | ${weekly} | ${monthly} | ${yearly} | ${rsi}`);
      } else {
        console.log(`   ${symbol.padEnd(13)} | Error: ${d.error}`);
      }
    }
    console.log('   ✓ Get multiple symbol details successful\n');

    // ==========================================
    // 8. STOCK SYMBOL DETAILS (Apple)
    // ==========================================
    console.log('8. Getting details for Apple (AAPL)...');
    const aaplDetails = await TradingView.getSymbolDetails('NASDAQ:AAPL');
    
    console.log('\n   AAPL Performance:');
    console.log('   Weekly:', aaplDetails['Perf.W']?.toFixed(2) + '%');
    console.log('   Monthly:', aaplDetails['Perf.1M']?.toFixed(2) + '%');
    console.log('   Yearly:', aaplDetails['Perf.Y']?.toFixed(2) + '%');
    console.log('   ✓ Get stock symbol details successful\n');

    // ==========================================
    // 9. FOREX SYMBOL DETAILS (EURUSD)
    // ==========================================
    console.log('9. Getting details for EUR/USD...');
    const eurusdDetails = await TradingView.getSymbolDetails('OANDA:EURUSD');
    
    console.log('\n   EUR/USD Performance:');
    console.log('   Weekly:', eurusdDetails['Perf.W']?.toFixed(2) + '%');
    console.log('   Monthly:', eurusdDetails['Perf.1M']?.toFixed(2) + '%');
    console.log('   ✓ Get forex symbol details successful\n');

    // ==========================================
    // 10. USING THE SYMBOL DETAILS CLIENT
    // ==========================================
    console.log('10. Using the symbol details client...');
    const detailsClient = TradingView.symbolDetails.createSymbolDetailsClient();
    
    const clientDetails = await detailsClient.getDetails('COINBASE:BTCUSD');
    console.log(`   Got BTC details via client - Weekly: ${clientDetails['Perf.W']?.toFixed(2)}%`);
    console.log('   ✓ Symbol details client successful\n');

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
runSymbolDetailsExamples();
