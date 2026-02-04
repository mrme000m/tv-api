export type MarketSymbol = string;
export type Timezone = string;
export type TimeFrame = '1' | '3' | '5' | '15' | '30' | '45' | '60' | '120' | '180' | '240' | '1D' | '1W' | '1M' | 'D' | 'W' | 'M';

export interface ClientLogger {
  debug?: (...args: any[]) => void;
  info?: (...args: any[]) => void;
  warn?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
  log?: (...args: any[]) => void;
}

export interface ClientOptions {
  token?: string;
  signature?: string;
  debug?: boolean;
  DEBUG?: boolean;
  logger?: ClientLogger;
  strictProtocol?: boolean;
  autoRehydrate?: boolean;
  connectTimeoutMs?: number;
  authRetryDelayMs?: number;
  authMaxAttempts?: number;
  reconnectMaxRetries?: number;
  reconnectBaseDelayMs?: number;
  reconnectFastFirstDelayMs?: number;
  reconnectMaxDelayMs?: number;
  reconnectMultiplier?: number;
  reconnectJitter?: boolean;
  server?: 'data' | 'prodata' | 'widgetdata';
  location?: string;
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  reputation: number;
  following: number;
  followers: number;
  notifications: { user: number; following: number };
  session: string;
  signature: string;
  sessionHash: string;
  privateChannel: string;
  authToken: string;
  joinDate: Date;
}

export class Client {
  constructor(options?: ClientOptions);
  Session: {
    Chart: new () => ChartSession;
    Quote: new () => QuoteSession;
  };
  onConnected(cb: (...args: any[]) => void): void;
  onDisconnected(cb: (...args: any[]) => void): void;
  onReconnecting(cb: (...args: any[]) => void): void;
  onReconnected(cb: (...args: any[]) => void): void;
  onError(cb: (...args: any[]) => void): void;
  onEvent(cb: (...args: any[]) => void): void;
  end(): Promise<void>;
}

export class ChartSession {
  setMarket(symbol: MarketSymbol, options?: Record<string, any>): void;
  setSeries(timeframe: TimeFrame | string, range?: number, reference?: number): void;
  onUpdate(cb: (...args: any[]) => void): void;
  onError(cb: (...args: any[]) => void): void;
  onSymbolLoaded(cb: (...args: any[]) => void): void;
  delete(): void;
}

export class QuoteSession {
  Market: new (symbol: MarketSymbol, session?: string) => QuoteMarket;
  delete(): void;
}

export class QuoteMarket {
  onLoaded(cb: (...args: any[]) => void): void;
  onData(cb: (...args: any[]) => void): void;
  onError(cb: (...args: any[]) => void): void;
  close(): void;
}

export class BuiltInIndicator {
  constructor(type?: string);
  type: string;
  options: Record<string, any>;
  setOption(key: string, value: any, FORCE?: boolean): void;
}

export class PineIndicator {
  constructor(options: Record<string, any>);
  pineId: string;
  pineVersion: string;
  description: string;
  shortDescription: string;
  inputs: Record<string, any>;
  plots: Record<string, any>;
  type: string;
  script: string;
  setType(type: string): void;
  setOption(key: string | number, value: any): void;
}

export class PinePermManager {
  constructor(sessionId: string, signature: string, pineId: string);
  getUsers(limit?: number, order?: string): Promise<any>;
  addUser(username: string): Promise<any>;
  updateUser(username: string, expiration?: number): Promise<any>;
  removeUser(username: string): Promise<any>;
}

export function loginUser(username: string, password: string, remember?: boolean, UA?: string): Promise<User>;
export function getUser(session: string, signature?: string, location?: string): Promise<User>;
export function withCredentialRefresh<T>(
  fn: (session: string, signature?: string) => Promise<T>,
  credentials?: { session?: string; signature?: string; username?: string; password?: string; remember?: boolean; userAgent?: string; onRefresh?: (user: User) => void },
  options?: { refresh?: (username: string, password: string, remember?: boolean, userAgent?: string) => Promise<User> },
): Promise<T>;

export function searchMarket(search: string, filter?: string): Promise<any[]>;
export function searchMarketV3(search: string, filter?: string, offset?: number): Promise<any[]>;
export function getIndicator(id: string, version?: string, session?: string, signature?: string): Promise<PineIndicator>;
export function getPrivateIndicators(session: string, signature?: string): Promise<any[]>;
export function getPrivateIndicatorsWithRefresh(
  credentials?: { session?: string; signature?: string; username?: string; password?: string; remember?: boolean; userAgent?: string; onRefresh?: (user: User) => void },
  options?: { refresh?: (username: string, password: string, remember?: boolean, userAgent?: string) => Promise<User> },
): Promise<any[]>;
export function translateScriptLight(source: string, options?: Record<string, any>): Promise<any>;
export function parseScriptTitle(source: string, options?: Record<string, any>): Promise<any>;
export function saveScriptNew(options: Record<string, any>): Promise<any>;
export function renameScriptVersion(pineId: string, versionId: string, newName: string, credentials?: Record<string, any>): Promise<any>;
export function listScriptVersions(pineId: string, credentials?: Record<string, any>): Promise<any>;
export function getScriptVersion(pineId: string, versionId: string, credentials?: Record<string, any>): Promise<any>;
export function deleteScriptVersion(pineId: string, versionId?: string, credentials?: Record<string, any>): Promise<any>;

export function getTA(id: string, options?: Record<string, any>): Promise<any>;
export function getTechnicalAnalysis(id: string, options?: Record<string, any>): Promise<any>;
export function getExtendedTA(id: string, options?: Record<string, any>): Promise<any>;
export function getBatchTA(symbols: string[], options?: Record<string, any>): Promise<any>;
export function getAdvancedTA(id: string, options?: Record<string, any>): Promise<any>;
export function formatTechnicalRating(rating: number): string;
export function getIndicatorInfo(indicatorName: string): string;
export function getIndicatorDetails(indicators: string[]): Record<string, string>;

export function getChartToken(layout: string, credentials?: { id?: number; session?: string; signature?: string }): Promise<string>;
export function getDrawings(layout: string, symbol?: string, credentials?: { id?: number; session?: string; signature?: string }, chartID?: string): Promise<any[]>;

export interface TradingViewModule {
  Client: typeof Client;
  BuiltInIndicator: typeof BuiltInIndicator;
  PineIndicator: typeof PineIndicator;
  PinePermManager: typeof PinePermManager;
  loginUser: typeof loginUser;
  getUser: typeof getUser;
  withCredentialRefresh: typeof withCredentialRefresh;
  searchMarket: typeof searchMarket;
  searchMarketV3: typeof searchMarketV3;
  getIndicator: typeof getIndicator;
  getPrivateIndicators: typeof getPrivateIndicators;
  getPrivateIndicatorsWithRefresh: typeof getPrivateIndicatorsWithRefresh;
  translateScriptLight: typeof translateScriptLight;
  parseScriptTitle: typeof parseScriptTitle;
  saveScriptNew: typeof saveScriptNew;
  renameScriptVersion: typeof renameScriptVersion;
  listScriptVersions: typeof listScriptVersions;
  getScriptVersion: typeof getScriptVersion;
  deleteScriptVersion: typeof deleteScriptVersion;
  getTA: typeof getTA;
  getTechnicalAnalysis: typeof getTechnicalAnalysis;
  getExtendedTA: typeof getExtendedTA;
  getBatchTA: typeof getBatchTA;
  getAdvancedTA: typeof getAdvancedTA;
  formatTechnicalRating: typeof formatTechnicalRating;
  getIndicatorInfo: typeof getIndicatorInfo;
  getIndicatorDetails: typeof getIndicatorDetails;
  getChartToken: typeof getChartToken;
  getDrawings: typeof getDrawings;
}

declare const TradingView: TradingViewModule;
export = TradingView;
