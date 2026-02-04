const { 
  getExtendedTA, 
  getBatchTA, 
  getAdvancedTA, 
  formatTechnicalRating, 
  getIndicatorInfo,
  getIndicatorDetails
} = require('../src/taExtension');

async function runDemo() {
  console.log('=== TA Extension Demo ===\n');

  // Demo 1: Format Technical Rating
  console.log('1. Format Technical Rating:');
  console.log('Rating 0.7:', formatTechnicalRating(0.7)); // Strong Buy
  console.log('Rating 0.3:', formatTechnicalRating(0.3)); // Buy
  console.log('Rating 0.0:', formatTechnicalRating(0.0)); // Neutral
  console.log('Rating -0.3:', formatTechnicalRating(-0.3)); // Sell
  console.log('Rating -0.7:', formatTechnicalRating(-0.7)); // Strong Sell
  console.log();

  // Demo 2: Get Indicator Information
  console.log('2. Get Indicator Information:');
  console.log('RSI:', getIndicatorInfo('RSI'));
  console.log('MACD.macd:', getIndicatorInfo('MACD.macd'));
  console.log('SMA5:', getIndicatorInfo('SMA5'));
  console.log('EMA5:', getIndicatorInfo('EMA5'));
  console.log('HMA5:', getIndicatorInfo('HMA5'));
  console.log('Stoch.K:', getIndicatorInfo('Stoch.K'));
  console.log('Williams.Percent:', getIndicatorInfo('Williams.Percent'));
  console.log('Ultimate.Osc:', getIndicatorInfo('Ultimate.Osc'));
  console.log('AO:', getIndicatorInfo('AO'));
  console.log('CCI20:', getIndicatorInfo('CCI20'));
  console.log('ADX:', getIndicatorInfo('ADX'));
  console.log('ATR:', getIndicatorInfo('ATR'));
  console.log('PSAR:', getIndicatorInfo('PSAR'));
  console.log('Aroon.Up:', getIndicatorInfo('Aroon.Up'));
  console.log('Aroon.Down:', getIndicatorInfo('Aroon.Down'));
  console.log('Aroon_Osc:', getIndicatorInfo('Aroon_Osc'));
  console.log('ADR:', getIndicatorInfo('ADR'));
  console.log('ADR percentage:', getIndicatorInfo('ADR percentage'));
  console.log('ATR percentage:', getIndicatorInfo('ATR percentage'));
  console.log('Bulls power:', getIndicatorInfo('Bulls power'));
  console.log('Bears power:', getIndicatorInfo('Bears power'));
  console.log();

  // Demo 3: Get Detailed Indicator Information
  console.log('3. Get Detailed Indicator Information:');
  const indicators = [
    'RSI', 'MACD.macd', 'SMA5', 'EMA5', 'Stoch.K', 'Williams.Percent',
    'Ultimate.Osc', 'AO', 'CCI20', 'ADX', 'ATR', 'PSAR'
  ];
  const details = getIndicatorDetails(indicators);
  for (const [indicator, description] of Object.entries(details)) {
    console.log(`${indicator}: ${description}`);
  }
  console.log();

  // Demo 4: Get Extended TA
  console.log('4. Get Extended TA:');
  try {
    const extendedTA = await getExtendedTA('BINANCE:BTCUSDT', {
      timeframes: ['1h', '4h', '1D'],
      indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
      additionalFields: [
        'RSI', 'MACD.macd', 'Stoch.K', 'Williams.Percent', 
        'CCI20', 'ADX', 'ATR', 'PSAR', 'AO', 'Mom'
      ]
    });
    
    if (extendedTA) {
      console.log('Symbol:', extendedTA.symbol);
      console.log('Timestamp:', new Date(extendedTA.timestamp));
      console.log('Timeframes:', Object.keys(extendedTA.timeframes));
      
      // Show details for 1D timeframe
      if (extendedTA.timeframes['1D']) {
        console.log('\n1D Timeframe Summary:', extendedTA.timeframes['1D'].summary);
        console.log('RSI Value:', extendedTA.timeframes['1D'].RSI);
        console.log('MACD Value:', extendedTA.timeframes['1D']['MACD.macd']);
        console.log('Stochastic K Value:', extendedTA.timeframes['1D']['Stoch.K']);
        console.log('Williams %R Value:', extendedTA.timeframes['1D']['Williams.Percent']);
      }
    } else {
      console.log('No data returned for extended TA');
    }
  } catch (error) {
    console.error('Error in getExtendedTA:', error.message);
  }
  console.log();

  // Demo 5: Get Batch TA
  console.log('5. Get Batch TA:');
  try {
    const symbols = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT'];
    const batchTA = await getBatchTA(symbols, {
      timeframes: ['1D'],
      indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
      additionalFields: ['RSI', 'MACD.macd']
    });
    
    console.log('Received data for', Object.keys(batchTA).length, 'symbols');
    for (const [symbol, data] of Object.entries(batchTA)) {
      if (data.timeframes['1D']) {
        console.log(`${symbol}: Rating = ${data.timeframes['1D'].summary.rating}, RSI = ${data.timeframes['1D'].RSI}`);
      }
    }
  } catch (error) {
    console.error('Error in getBatchTA:', error.message);
  }
  console.log();

  // Demo 6: Get Advanced TA
  console.log('6. Get Advanced TA:');
  try {
    const advancedTA = await getAdvancedTA('BINANCE:BTCUSDT', {
      timeframes: ['1D'],
      indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
      advancedIndicators: [
        'RSI', 'MACD.macd', 'Stoch.K', 'Williams.Percent', 
        'CCI20', 'ADX', 'ATR', 'PSAR', 'AO', 'Mom',
        'SMA5', 'SMA20', 'EMA5', 'EMA20', 'HMA5', 'HMA20',
        'BB.lower', 'BB.upper', 'BB.width', 'BB.b',
        'KC.lower', 'KC.upper', 'KC.middle', 'KC.width',
        'DC.lower', 'DC.upper', 'DC.middle', 'DC.width',
        'Aroon.Up', 'Aroon.Down', 'Aroon_Osc',
        'PivotPoints.Classic.S3', 'PivotPoints.Classic.S2', 'PivotPoints.Classic.S1',
        'PivotPoints.Classic.Middle', 'PivotPoints.Classic.R1', 'PivotPoints.Classic.R2', 'PivotPoints.Classic.R3',
        'PivotPoints.Fibonacci.S3', 'PivotPoints.Fibonacci.S2', 'PivotPoints.Fibonacci.S1',
        'PivotPoints.Fibonacci.Middle', 'PivotPoints.Fibonacci.R1', 'PivotPoints.Fibonacci.R2', 'PivotPoints.Fibonacci.R3',
        'PivotPoints.Woodie.S3', 'PivotPoints.Woodie.S2', 'PivotPoints.Woodie.S1',
        'PivotPoints.Woodie.Middle', 'PivotPoints.Woodie.R1', 'PivotPoints.Woodie.R2', 'PivotPoints.Woodie.R3',
        'PivotPoints.Camarilla.S3', 'PivotPoints.Camarilla.S2', 'PivotPoints.Camarilla.S1',
        'PivotPoints.Camarilla.Middle', 'PivotPoints.Camarilla.R1', 'PivotPoints.Camarilla.R2', 'PivotPoints.Camarilla.R3',
        'Bulls power', 'Bears power', 'ADR', 'ADR percentage', 'ATR percentage'
      ]
    });
    
    if (advancedTA) {
      console.log('Symbol:', advancedTA.symbol);
      console.log('Timestamp:', new Date(advancedTA.timestamp));
      console.log('Timeframes:', Object.keys(advancedTA.timeframes));
      
      if (advancedTA.timeframes['1D']) {
        console.log('\n1D Timeframe Summary:', advancedTA.timeframes['1D'].summary);
        console.log('Insights Count:', advancedTA.timeframes['1D'].insights?.length || 0);
        console.log('Available Indicators:', Object.keys(advancedTA.indicators));
        
        // Show some key indicator values
        console.log('\nKey Indicator Values:');
        console.log('RSI:', advancedTA.timeframes['1D'].RSI);
        console.log('MACD:', advancedTA.timeframes['1D']['MACD.macd']);
        console.log('Stochastic K:', advancedTA.timeframes['1D']['Stoch.K']);
        console.log('Williams %R:', advancedTA.timeframes['1D']['Williams.Percent']);
        console.log('CCI20:', advancedTA.timeframes['1D']['CCI20']);
        console.log('ADX:', advancedTA.timeframes['1D']['ADX']);
        console.log('ATR:', advancedTA.timeframes['1D']['ATR']);
        console.log('PSAR:', advancedTA.timeframes['1D']['PSAR']);
        console.log('Awesome Oscillator:', advancedTA.timeframes['1D']['AO']);
        console.log('Momentum:', advancedTA.timeframes['1D']['Mom']);
        console.log('SMA5:', advancedTA.timeframes['1D']['SMA5']);
        console.log('EMA5:', advancedTA.timeframes['1D']['EMA5']);
        console.log('HMA5:', advancedTA.timeframes['1D']['HMA5']);
        console.log('Aroon Up:', advancedTA.timeframes['1D']['Aroon.Up']);
        console.log('Aroon Down:', advancedTA.timeframes['1D']['Aroon.Down']);
        console.log('ADR:', advancedTA.timeframes['1D']['ADR']);
        console.log('ADR %:', advancedTA.timeframes['1D']['ADR percentage']);
        console.log('ATR %:', advancedTA.timeframes['1D']['ATR percentage']);
        console.log('Bulls Power:', advancedTA.timeframes['1D']['Bulls power']);
        console.log('Bears Power:', advancedTA.timeframes['1D']['Bears power']);
      }
    } else {
      console.log('No data returned for advanced TA');
    }
  } catch (error) {
    console.error('Error in getAdvancedTA:', error.message);
  }
  console.log();

  // Demo 7: Detailed Technical Indicators
  console.log('7. Detailed Technical Indicators:');
  console.log('Aroon Indicators:');
  console.log('- Aroon Up:', getIndicatorInfo('Aroon.Up'), '(Measures how recently a new high was made)');
  console.log('- Aroon Down:', getIndicatorInfo('Aroon.Down'), '(Measures how recently a new low was made)');
  console.log('- Aroon Oscillator:', getIndicatorInfo('Aroon_Osc'), '(Difference between Aroon Up and Down)');
  console.log();

  console.log('Average Daily Range:');
  console.log('- ADR:', getIndicatorInfo('ADR'), '(Average daily trading range)');
  console.log('- ADR %:', getIndicatorInfo('ADR percentage'), '(ADR as percentage of price)');
  console.log();

  console.log('Average Directional Index:');
  console.log('- ADX:', getIndicatorInfo('ADX'), '(Measures trend strength)');
  console.log('- ADX+DI:', getIndicatorInfo('ADX+DI'), '(ADX with positive directional indicator)');
  console.log('- ADX-DI:', getIndicatorInfo('ADX-DI'), '(ADX with negative directional indicator)');
  console.log();

  console.log('Average True Range:');
  console.log('- ATR:', getIndicatorInfo('ATR'), '(Measure of volatility)');
  console.log('- ATR %:', getIndicatorInfo('ATR percentage'), '(ATR as percentage of price)');
  console.log();

  console.log('Awesome Oscillator:');
  console.log('- AO:', getIndicatorInfo('AO'), '(Difference between 5-period and 34-period SMA of median prices)');
  console.log('- AO[1]:', getIndicatorInfo('AO[1]'), '(Previous period value)');
  console.log();

  console.log('Bollinger Bands:');
  console.log('- BB.lower:', getIndicatorInfo('BB.lower'), '(Lower band)');
  console.log('- BB.upper:', getIndicatorInfo('BB.upper'), '(Upper band)');
  console.log('- BB.width:', getIndicatorInfo('BB.width'), '(Band width)');
  console.log('- BB.b:', getIndicatorInfo('BB.b'), '(Position of price relative to bands)');
  console.log();

  console.log('Bull Bear Power:');
  console.log('- Bulls power:', getIndicatorInfo('Bulls power'), '(Bull power indicator)');
  console.log('- Bears power:', getIndicatorInfo('Bears power'), '(Bear power indicator)');
  console.log();

  console.log('Commodity Channel Index:');
  console.log('- CCI20:', getIndicatorInfo('CCI20'), '(CCI with 20-period lookback)');
  console.log('- CCI5, CCI10, CCI15, CCI30:', 'Different period lengths for trend identification');
  console.log();

  console.log('Donchian Channels:');
  console.log('- DC.lower:', getIndicatorInfo('DC.lower'), '(Lower channel line)');
  console.log('- DC.upper:', getIndicatorInfo('DC.upper'), '(Upper channel line)');
  console.log('- DC.middle:', getIndicatorInfo('DC.middle'), '(Middle line)');
  console.log('- DC.width:', getIndicatorInfo('DC.width'), '(Channel width)');
  console.log();

  console.log('Moving Averages:');
  console.log('- SMA5, SMA10, SMA20, SMA50, etc.:', 'Simple Moving Averages with different periods');
  console.log('- EMA5, EMA10, EMA20, EMA50, etc.:', 'Exponential Moving Averages with different periods');
  console.log('- HMA5, HMA10, HMA20, HMA50, etc.:', 'Hull Moving Averages with different periods');
  console.log();

  console.log('Ichimoku Cloud:');
  console.log('- Ichimoku.BLine:', getIndicatorInfo('Ichimoku.BLine'), '(Base line)');
  console.log('- Ichimoku.CLine:', getIndicatorInfo('Ichimoku.CLine'), '(Conversion line)');
  console.log('- Ichimoku.Lead1:', getIndicatorInfo('Ichimoku.Lead1'), '(Leading span A)');
  console.log('- Ichimoku.Lead2:', getIndicatorInfo('Ichimoku.Lead2'), '(Leading span B)');
  console.log();

  console.log('Keltner Channels:');
  console.log('- KC.lower:', getIndicatorInfo('KC.lower'), '(Lower channel line)');
  console.log('- KC.upper:', getIndicatorInfo('KC.upper'), '(Upper channel line)');
  console.log('- KC.middle:', getIndicatorInfo('KC.middle'), '(Middle line)');
  console.log('- KC.width:', getIndicatorInfo('KC.width'), '(Channel width)');
  console.log();

  console.log('Momentum:');
  console.log('- Mom:', getIndicatorInfo('Mom'), '(Price change over a specific period)');
  console.log('- Mom[1]:', getIndicatorInfo('Mom[1]'), '(Previous period value)');
  console.log();

  console.log('MACD:');
  console.log('- MACD.macd:', getIndicatorInfo('MACD.macd'), '(MACD line)');
  console.log('- MACD.signal:', getIndicatorInfo('MACD.signal'), '(Signal line)');
  console.log('- MACD.histogram:', getIndicatorInfo('MACD.histogram'), '(Histogram)');
  console.log();

  console.log('Oscillators:');
  console.log('- Recommend.Other:', getIndicatorInfo('Recommend.Other'), '(Oscillator-based rating)');
  console.log('- Recommend.All:', getIndicatorInfo('Recommend.All'), '(Combined oscillator and MA rating)');
  console.log('- Recommend.MA:', getIndicatorInfo('Recommend.MA'), '(MA-based rating)');
  console.log();

  console.log('Parabolic SAR:');
  console.log('- PSAR:', getIndicatorInfo('PSAR'), '(Stop and Reverse indicator)');
  console.log('- PSAR[1]:', getIndicatorInfo('PSAR[1]'), '(Previous period value)');
  console.log();

  console.log('Pivot Points:');
  console.log('- PivotPoints.Classic.*, PivotPoints.Fibonacci.*, PivotPoints.Woodie.*, PivotPoints.Camarilla.*:', 
              'Different pivot point calculation methods (supports S1-S3, R1-R3, and middle/pivot)');
  console.log();

  console.log('Rate of Change:');
  console.log('- ROC:', getIndicatorInfo('ROC'), '(Price change percentage over time)');
  console.log('- ROC[1]:', getIndicatorInfo('ROC[1]'), '(Previous period value)');
  console.log();

  console.log('Stochastic:');
  console.log('- Stoch.K:', getIndicatorInfo('Stoch.K'), '(Stochastic %K line)');
  console.log('- Stoch.D:', getIndicatorInfo('Stoch.D'), '(Stochastic %D line)');
  console.log('- Stoch.K-Stoch.D:', getIndicatorInfo('Stoch.K-Stoch.D'), '(Difference between K and D)');
  console.log();

  console.log('Stochastic RSI:');
  console.log('- Stoch.RSI.K:', getIndicatorInfo('Stoch.RSI.K'), '(Stochastic RSI %K)');
  console.log('- Stoch.RSI.D:', getIndicatorInfo('Stoch.RSI.D'), '(Stochastic RSI %D)');
  console.log();

  console.log('Technical Rating:');
  console.log('- Recommend.Other, Recommend.All, Recommend.MA:', 'Combined technical ratings');
  console.log();

  console.log('Ultimate Oscillator:');
  console.log('- Ultimate.Osc:', getIndicatorInfo('Ultimate.Osc'), '(Multi-timeframe momentum oscillator)');
  console.log();

  console.log('Williams Percent Range:');
  console.log('- Williams.Percent:', getIndicatorInfo('Williams.Percent'), '(Momentum indicator showing overbought/oversold levels)');
  console.log();
}

runDemo().catch(console.error);