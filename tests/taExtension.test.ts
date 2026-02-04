import { describe, it, expect } from 'vitest';
import * as taExtension from '../src/taExtension';

// Define types locally since we can't import from the JS file directly
interface TimeframeData {
  [key: string]: any;
  summary?: {
    signal: number;
    rating: string;
    strength: number;
    breakdown: {
      other: number;
      all: number;
      ma: number;
    };
  };
  insights?: string[];
}

interface ExtendedTAData {
  symbol: string;
  timestamp: number;
  timeframes: {
    [key: string]: TimeframeData;
  };
}

interface BatchTAData {
  [symbol: string]: {
    symbol: string;
    timestamp: number;
    timeframes: {
      [key: string]: TimeframeData;
    };
  };
}

interface AdvancedTAData {
  symbol: string;
  timestamp: number;
  timeframes: {
    [key: string]: TimeframeData;
  };
  indicators: {
    [key: string]: string;
  };
}

describe('TA Extension Functions', () => {
  const { 
    getExtendedTA, 
    getBatchTA, 
    getAdvancedTA, 
    formatTechnicalRating, 
    getIndicatorInfo, 
    getIndicatorDetails 
  } = taExtension;

  // Test formatTechnicalRating function
  describe('formatTechnicalRating', () => {
    it('should return "Strong Buy" for ratings >= 0.5', () => {
      expect(formatTechnicalRating(0.5)).toBe('Strong Buy');
      expect(formatTechnicalRating(0.7)).toBe('Strong Buy');
      expect(formatTechnicalRating(1.0)).toBe('Strong Buy');
    });

    it('should return "Buy" for ratings >= 0.1 and < 0.5', () => {
      expect(formatTechnicalRating(0.1)).toBe('Buy');
      expect(formatTechnicalRating(0.3)).toBe('Buy');
      expect(formatTechnicalRating(0.49)).toBe('Buy');
    });

    it('should return "Neutral" for ratings >= -0.1 and < 0.1', () => {
      expect(formatTechnicalRating(-0.1)).toBe('Neutral');
      expect(formatTechnicalRating(0.0)).toBe('Neutral');
      expect(formatTechnicalRating(0.09)).toBe('Neutral');
    });

    it('should return "Sell" for ratings >= -0.5 and < -0.1', () => {
      expect(formatTechnicalRating(-0.2)).toBe('Sell');
      expect(formatTechnicalRating(-0.4)).toBe('Sell');
      expect(formatTechnicalRating(-0.49)).toBe('Sell');
    });

    it('should return "Strong Sell" for ratings < -0.5', () => {
      expect(formatTechnicalRating(-0.5)).toBe('Strong Sell');
      expect(formatTechnicalRating(-0.7)).toBe('Strong Sell');
      expect(formatTechnicalRating(-1.0)).toBe('Strong Sell');
    });
  });

  // Test getIndicatorInfo function
  describe('getIndicatorInfo', () => {
    it('should return description for known indicators', () => {
      expect(getIndicatorInfo('RSI')).toBe('Relative Strength Index');
      expect(getIndicatorInfo('MACD.macd')).toBe('Moving Average Convergence Divergence');
      expect(getIndicatorInfo('SMA5')).toBe('Simple Moving Average (5 periods)');
      expect(getIndicatorInfo('EMA5')).toBe('Exponential Moving Average (5 periods)');
      expect(getIndicatorInfo('HMA5')).toBe('Hull Moving Average (5 periods)');
      expect(getIndicatorInfo('Stoch.K')).toBe('Stochastic Oscillator %K');
      expect(getIndicatorInfo('Williams.Percent')).toBe('Williams Percent Range');
      expect(getIndicatorInfo('Ultimate.Osc')).toBe('Ultimate Oscillator');
      expect(getIndicatorInfo('AO')).toBe('Awesome Oscillator');
      expect(getIndicatorInfo('CCI20')).toBe('Commodity Channel Index (20 periods)');
      expect(getIndicatorInfo('ADX')).toBe('Average Directional Index');
      expect(getIndicatorInfo('ATR')).toBe('Average True Range');
      expect(getIndicatorInfo('ATR percentage')).toBe('Average True Range Percentage');
      expect(getIndicatorInfo('PSAR')).toBe('Parabolic SAR');
      expect(getIndicatorInfo('Aroon.Up')).toBe('Aroon Up');
      expect(getIndicatorInfo('Aroon.Down')).toBe('Aroon Down');
      expect(getIndicatorInfo('Aroon_Osc')).toBe('Aroon Oscillator');
      expect(getIndicatorInfo('ADR')).toBe('Average Daily Range');
      expect(getIndicatorInfo('ADR percentage')).toBe('Average Daily Range Percentage');
      expect(getIndicatorInfo('Bulls power')).toBe('Bull Bear Power - Bulls Power');
      expect(getIndicatorInfo('Bears power')).toBe('Bull Bear Power - Bears Power');
    });

    it('should return "Unknown indicator" for unknown indicators', () => {
      expect(getIndicatorInfo('UNKNOWN')).toContain('Unknown indicator');
    });
  });

  // Test getIndicatorDetails function
  describe('getIndicatorDetails', () => {
    it('should return descriptions for multiple indicators', () => {
      const indicators = ['RSI', 'MACD.macd', 'SMA5'];
      const details: { [key: string]: string } = getIndicatorDetails(indicators);
      
      expect(details).toHaveProperty('RSI');
      expect(details).toHaveProperty('MACD.macd');
      expect(details).toHaveProperty('SMA5');
      expect(details.RSI).toBe('Relative Strength Index');
      expect(details['MACD.macd']).toBe('Moving Average Convergence Divergence');
      expect(details.SMA5).toBe('Simple Moving Average (5 periods)');
    });
  });

  // Test getExtendedTA function
  describe('getExtendedTA', () => {
    it('should return extended TA data for a valid symbol', async () => {
      const result: ExtendedTAData | boolean = await getExtendedTA('BINANCE:BTCUSDT', {
        timeframes: ['1D'],
        indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
        additionalFields: ['RSI', 'MACD.macd']
      });
      
      if (result && typeof result !== 'boolean') {
        expect(result).toHaveProperty('symbol');
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('timeframes');
        expect(result.symbol).toBe('BINANCE:BTCUSDT');
        expect(typeof result.timestamp).toBe('number');
        expect(result.timeframes).toHaveProperty('1D');
      }
    }, 10000); // Increase timeout to 10 seconds

    it('should handle custom timeframes correctly', async () => {
      const result: ExtendedTAData | boolean = await getExtendedTA('BINANCE:BTCUSDT', {
        timeframes: ['1h', '4h'],
        indicators: ['Recommend.All']
      });
      
      if (result && typeof result !== 'boolean') {
        expect(result.timeframes).toHaveProperty('1h');
        expect(result.timeframes).toHaveProperty('4h');
      }
    }, 10000);

    it('should return false for invalid symbol', async () => {
      const result: ExtendedTAData | boolean = await getExtendedTA('INVALID:SYMBOL');
      expect(result).toBe(false);
    }, 10000);
  });

  // Test getBatchTA function
  describe('getBatchTA', () => {
    it('should return TA data for multiple symbols', async () => {
      const symbols = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT'];
      const result: BatchTAData = await getBatchTA(symbols, {
        timeframes: ['1D'],
        indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA']
      });
      
      if (Object.keys(result).length > 0) {
        expect(result).toHaveProperty('BINANCE:BTCUSDT');
        expect(result).toHaveProperty('BINANCE:ETHUSDT');
        expect(result['BINANCE:BTCUSDT']).toHaveProperty('timeframes');
        expect(result['BINANCE:ETHUSDT']).toHaveProperty('timeframes');
      }
    }, 15000); // Increase timeout for batch request

    it('should handle empty symbols array', async () => {
      const result: BatchTAData = await getBatchTA([]);
      expect(result).toEqual({});
    }, 10000);
  });

  // Test getAdvancedTA function
  describe('getAdvancedTA', () => {
    it('should return advanced TA data with additional indicators', async () => {
      const result: AdvancedTAData | boolean = await getAdvancedTA('BINANCE:BTCUSDT', {
        timeframes: ['1D'],
        indicators: ['Recommend.Other', 'Recommend.All', 'Recommend.MA'],
        advancedIndicators: ['RSI', 'MACD.macd', 'Stoch.K', 'Williams.Percent']
      });
      
      if (result && typeof result !== 'boolean') {
        expect(result).toHaveProperty('symbol');
        expect(result).toHaveProperty('timeframes');
        expect(result).toHaveProperty('indicators');
        expect(result.timeframes).toHaveProperty('1D');
        expect(result.indicators).toHaveProperty('RSI');
        expect(result.indicators).toHaveProperty('MACD.macd');
        expect(result.indicators).toHaveProperty('Stoch.K');
        expect(result.indicators).toHaveProperty('Williams.Percent');
      }
    }, 10000);

    it('should include insights in the response', async () => {
      const result: AdvancedTAData | boolean = await getAdvancedTA('BINANCE:BTCUSDT', {
        timeframes: ['1D'],
        advancedIndicators: ['RSI', 'MACD.macd', 'EMA5', 'EMA20']
      });
      
      if (result && typeof result !== 'boolean' && result.timeframes['1D']) {
        expect(result.timeframes['1D']).toHaveProperty('insights');
        expect(Array.isArray(result.timeframes['1D'].insights)).toBe(true);
      }
    }, 10000);

    it('should return false for invalid symbol', async () => {
      const result: AdvancedTAData | boolean = await getAdvancedTA('INVALID:SYMBOL');
      expect(result).toBe(false);
    }, 10000);
  });

  // Test detailed technical indicators
  describe('Detailed Technical Indicators', () => {
    it('should provide information about Aroon indicators', () => {
      expect(getIndicatorInfo('Aroon.Up')).toBe('Aroon Up');
      expect(getIndicatorInfo('Aroon.Down')).toBe('Aroon Down');
      expect(getIndicatorInfo('Aroon_Osc')).toBe('Aroon Oscillator');
    });

    it('should provide information about Average Daily Range indicators', () => {
      expect(getIndicatorInfo('ADR')).toBe('Average Daily Range');
      expect(getIndicatorInfo('ADR percentage')).toBe('Average Daily Range Percentage');
    });

    it('should provide information about Average Directional Index', () => {
      expect(getIndicatorInfo('ADX')).toBe('Average Directional Index');
      expect(getIndicatorInfo('ADX+DI')).toBe('ADX + Positive Directional Indicator');
      expect(getIndicatorInfo('ADX-DI')).toBe('ADX - Negative Directional Indicator');
    });

    it('should provide information about Average True Range', () => {
      expect(getIndicatorInfo('ATR')).toBe('Average True Range');
      expect(getIndicatorInfo('ATR percentage')).toBe('Average True Range Percentage');
    });

    it('should provide information about Awesome Oscillator', () => {
      expect(getIndicatorInfo('AO')).toBe('Awesome Oscillator');
      expect(getIndicatorInfo('AO[1]')).toBe('Awesome Oscillator (previous period)');
    });

    it('should provide information about Bollinger Bands', () => {
      expect(getIndicatorInfo('BB.lower')).toBe('Bollinger Bands Lower Band');
      expect(getIndicatorInfo('BB.upper')).toBe('Bollinger Bands Upper Band');
      expect(getIndicatorInfo('BB.width')).toBe('Bollinger Bands Width');
      expect(getIndicatorInfo('BB.b')).toBe('Bollinger Bands Position (B %)');
      expect(getIndicatorInfo('BB.power')).toBe('Bollinger Bands Power');
    });

    it('should provide information about Bull Bear Power', () => {
      expect(getIndicatorInfo('Bulls power')).toBe('Bull Bear Power - Bulls Power');
      expect(getIndicatorInfo('Bears power')).toBe('Bull Bear Power - Bears Power');
    });

    it('should provide information about Commodity Channel Index', () => {
      expect(getIndicatorInfo('CCI20')).toBe('Commodity Channel Index (20 periods)');
      expect(getIndicatorInfo('CCI5')).toBe('Commodity Channel Index (5 periods)');
      expect(getIndicatorInfo('CCI10')).toBe('Commodity Channel Index (10 periods)');
      expect(getIndicatorInfo('CCI15')).toBe('Commodity Channel Index (15 periods)');
      expect(getIndicatorInfo('CCI30')).toBe('Commodity Channel Index (30 periods)');
    });

    it('should provide information about Directional Movement Index', () => {
      expect(getIndicatorInfo('ADX')).toBe('Average Directional Index');
      expect(getIndicatorInfo('ADX+DI')).toBe('ADX + Positive Directional Indicator');
      expect(getIndicatorInfo('ADX-DI')).toBe('ADX - Negative Directional Indicator');
    });

    it('should provide information about Donchian Channels', () => {
      expect(getIndicatorInfo('DC.lower')).toBe('Donchian Channels Lower Band');
      expect(getIndicatorInfo('DC.upper')).toBe('Donchian Channels Upper Band');
      expect(getIndicatorInfo('DC.middle')).toBe('Donchian Channels Middle Line');
      expect(getIndicatorInfo('DC.width')).toBe('Donchian Channels Width');
    });

    it('should provide information about Exponential Moving Average', () => {
      expect(getIndicatorInfo('EMA5')).toBe('Exponential Moving Average (5 periods)');
      expect(getIndicatorInfo('EMA10')).toBe('Exponential Moving Average (10 periods)');
      expect(getIndicatorInfo('EMA20')).toBe('Exponential Moving Average (20 periods)');
      expect(getIndicatorInfo('EMA50')).toBe('Exponential Moving Average (50 periods)');
    });

    it('should provide information about Hull Moving Average', () => {
      expect(getIndicatorInfo('HMA5')).toBe('Hull Moving Average (5 periods)');
      expect(getIndicatorInfo('HMA10')).toBe('Hull Moving Average (10 periods)');
      expect(getIndicatorInfo('HMA20')).toBe('Hull Moving Average (20 periods)');
    });

    it('should provide information about Ichimoku Cloud', () => {
      expect(getIndicatorInfo('Ichimoku.BLine')).toBe('Ichimoku Cloud Base Line');
      expect(getIndicatorInfo('Ichimoku.CLine')).toBe('Ichimoku Cloud Conversion Line');
      expect(getIndicatorInfo('Ichimoku.Lead1')).toBe('Ichimoku Cloud Leading Span A');
      expect(getIndicatorInfo('Ichimoku.Lead2')).toBe('Ichimoku Cloud Leading Span B');
    });

    it('should provide information about Keltner Channels', () => {
      expect(getIndicatorInfo('KC.lower')).toBe('Keltner Channels Lower Band');
      expect(getIndicatorInfo('KC.upper')).toBe('Keltner Channels Upper Band');
      expect(getIndicatorInfo('KC.middle')).toBe('Keltner Channels Middle Line');
      expect(getIndicatorInfo('KC.width')).toBe('Keltner Channels Width');
    });

    it('should provide information about Momentum', () => {
      expect(getIndicatorInfo('Mom')).toBe('Momentum');
      expect(getIndicatorInfo('Mom[1]')).toBe('Momentum (previous period)');
    });

    it('should provide information about Moving Average Convergence Divergence', () => {
      expect(getIndicatorInfo('MACD.macd')).toBe('Moving Average Convergence Divergence');
      expect(getIndicatorInfo('MACD.signal')).toBe('MACD Signal Line');
      expect(getIndicatorInfo('MACD.histogram')).toBe('MACD Histogram');
    });

    it('should provide information about Moving Averages Rating', () => {
      expect(getIndicatorInfo('Recommend.MA')).toBe('Overall technical rating based on moving averages');
    });

    it('should provide information about Oscillators Rating', () => {
      expect(getIndicatorInfo('Recommend.Other')).toBe('Overall technical rating based on oscillators');
      expect(getIndicatorInfo('Recommend.All')).toBe('Overall technical rating combining oscillators and moving averages');
    });

    it('should provide information about Parabolic SAR', () => {
      expect(getIndicatorInfo('PSAR')).toBe('Parabolic SAR');
      expect(getIndicatorInfo('PSAR[1]')).toBe('Parabolic SAR (previous period)');
    });

    it('should provide information about Pivot Points', () => {
      expect(getIndicatorInfo('PivotPoints.Classic.S3')).toBe('Pivot Points Classic S3');
      expect(getIndicatorInfo('PivotPoints.Classic.S2')).toBe('Pivot Points Classic S2');
      expect(getIndicatorInfo('PivotPoints.Classic.S1')).toBe('Pivot Points Classic S1');
      expect(getIndicatorInfo('PivotPoints.Classic.Middle')).toBe('Pivot Points Classic Middle (Pivot)');
      expect(getIndicatorInfo('PivotPoints.Classic.R1')).toBe('Pivot Points Classic R1');
      expect(getIndicatorInfo('PivotPoints.Classic.R2')).toBe('Pivot Points Classic R2');
      expect(getIndicatorInfo('PivotPoints.Classic.R3')).toBe('Pivot Points Classic R3');
      expect(getIndicatorInfo('PivotPoints.Fibonacci.S3')).toBe('Pivot Points Fibonacci S3');
      expect(getIndicatorInfo('PivotPoints.Fibonacci.S2')).toBe('Pivot Points Fibonacci S2');
      expect(getIndicatorInfo('PivotPoints.Fibonacci.S1')).toBe('Pivot Points Fibonacci S1');
      expect(getIndicatorInfo('PivotPoints.Fibonacci.Middle')).toBe('Pivot Points Fibonacci Middle (Pivot)');
      expect(getIndicatorInfo('PivotPoints.Fibonacci.R1')).toBe('Pivot Points Fibonacci R1');
      expect(getIndicatorInfo('PivotPoints.Fibonacci.R2')).toBe('Pivot Points Fibonacci R2');
      expect(getIndicatorInfo('PivotPoints.Fibonacci.R3')).toBe('Pivot Points Fibonacci R3');
      expect(getIndicatorInfo('PivotPoints.Woodie.S3')).toBe('Pivot Points Woodie S3');
      expect(getIndicatorInfo('PivotPoints.Woodie.S2')).toBe('Pivot Points Woodie S2');
      expect(getIndicatorInfo('PivotPoints.Woodie.S1')).toBe('Pivot Points Woodie S1');
      expect(getIndicatorInfo('PivotPoints.Woodie.Middle')).toBe('Pivot Points Woodie Middle (Pivot)');
      expect(getIndicatorInfo('PivotPoints.Woodie.R1')).toBe('Pivot Points Woodie R1');
      expect(getIndicatorInfo('PivotPoints.Woodie.R2')).toBe('Pivot Points Woodie R2');
      expect(getIndicatorInfo('PivotPoints.Woodie.R3')).toBe('Pivot Points Woodie R3');
      expect(getIndicatorInfo('PivotPoints.Camarilla.S3')).toBe('Pivot Points Camarilla S3');
      expect(getIndicatorInfo('PivotPoints.Camarilla.S2')).toBe('Pivot Points Camarilla S2');
      expect(getIndicatorInfo('PivotPoints.Camarilla.S1')).toBe('Pivot Points Camarilla S1');
      expect(getIndicatorInfo('PivotPoints.Camarilla.Middle')).toBe('Pivot Points Camarilla Middle (Pivot)');
      expect(getIndicatorInfo('PivotPoints.Camarilla.R1')).toBe('Pivot Points Camarilla R1');
      expect(getIndicatorInfo('PivotPoints.Camarilla.R2')).toBe('Pivot Points Camarilla R2');
      expect(getIndicatorInfo('PivotPoints.Camarilla.R3')).toBe('Pivot Points Camarilla R3');
    });

    it('should provide information about Rate of Change', () => {
      expect(getIndicatorInfo('ROC')).toBe('Rate of Change');
      expect(getIndicatorInfo('ROC[1]')).toBe('Rate of Change (previous period)');
    });

    it('should provide information about Relative Strength Index', () => {
      expect(getIndicatorInfo('RSI')).toBe('Relative Strength Index');
      expect(getIndicatorInfo('RSI[1]')).toBe('Relative Strength Index (previous period)');
    });

    it('should provide information about Simple Moving Average', () => {
      expect(getIndicatorInfo('SMA5')).toBe('Simple Moving Average (5 periods)');
      expect(getIndicatorInfo('SMA10')).toBe('Simple Moving Average (10 periods)');
      expect(getIndicatorInfo('SMA20')).toBe('Simple Moving Average (20 periods)');
      expect(getIndicatorInfo('SMA50')).toBe('Simple Moving Average (50 periods)');
    });

    it('should provide information about Stochastic', () => {
      expect(getIndicatorInfo('Stoch.K')).toBe('Stochastic Oscillator %K');
      expect(getIndicatorInfo('Stoch.D')).toBe('Stochastic Oscillator %D');
      expect(getIndicatorInfo('Stoch.K-Stoch.D')).toBe('Stochastic K-D Difference');
    });

    it('should provide information about Stochastic RSI', () => {
      expect(getIndicatorInfo('Stoch.RSI.K')).toBe('Stochastic RSI %K');
      expect(getIndicatorInfo('Stoch.RSI.D')).toBe('Stochastic RSI %D');
    });

    it('should provide information about Technical Rating', () => {
      expect(getIndicatorInfo('Recommend.Other')).toBe('Overall technical rating based on oscillators');
      expect(getIndicatorInfo('Recommend.All')).toBe('Overall technical rating combining oscillators and moving averages');
      expect(getIndicatorInfo('Recommend.MA')).toBe('Overall technical rating based on moving averages');
    });

    it('should provide information about Ultimate Oscillator', () => {
      expect(getIndicatorInfo('Ultimate.Osc')).toBe('Ultimate Oscillator');
    });

    it('should provide information about Williams Percent Range', () => {
      expect(getIndicatorInfo('Williams.Percent')).toBe('Williams Percent Range');
    });
  });
});