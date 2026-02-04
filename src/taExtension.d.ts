export interface TimeframeData {
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

export interface ExtendedTAData {
  symbol: string;
  timestamp: number;
  timeframes: {
    [key: string]: TimeframeData;
  };
}

export interface BatchTAData {
  [symbol: string]: {
    symbol: string;
    timestamp: number;
    timeframes: {
      [key: string]: TimeframeData;
    };
  };
}

export interface AdvancedTAData {
  symbol: string;
  timestamp: number;
  timeframes: {
    [key: string]: TimeframeData;
  };
  indicators: {
    [key: string]: string;
  };
}

export function getExtendedTA(id: string, options?: {
  timeframes?: string[];
  indicators?: string[];
  additionalFields?: string[];
}): Promise<ExtendedTAData | boolean>;

export function getBatchTA(symbols: string[], options?: {
  timeframes?: string[];
  indicators?: string[];
  additionalFields?: string[];
}): Promise<BatchTAData>;

export function getAdvancedTA(id: string, options?: {
  timeframes?: string[];
  indicators?: string[];
  advancedIndicators?: string[];
}): Promise<AdvancedTAData | boolean>;

export function formatTechnicalRating(rating: number): string;

export function getIndicatorInfo(indicatorName: string): string;

export function getIndicatorDetails(indicators: string[]): { [key: string]: string };