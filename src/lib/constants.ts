// WebSocket Configuration
export const WS_CONFIG = {
  APP_ID: '1089',
  AUTH_TOKEN: 'bwQm6CfYuKyOduN',
  ENDPOINT: 'wss://ws.binaryws.com/websockets/v3?app_id=1089',
} as const;

// Asset Whitelist - Only these synthetic indices
export const ASSET_WHITELIST = ['R_10', 'R_50', 'R_100', '1HZ10V'] as const;
export type AssetSymbol = typeof ASSET_WHITELIST[number];

export const ASSET_LABELS: Record<AssetSymbol, string> = {
  'R_10': 'Volatility 10',
  'R_50': 'Volatility 50',
  'R_100': 'Volatility 100',
  '1HZ10V': 'Volatility 10 (1s)',
};

// Trading Configuration
export const TRADING_CONFIG: {
  DEFAULT_STAKE: number;
  MIN_STAKE: number;
  MAX_STAKE: number;
  LOSS_MULTIPLIER: number;
  RSI_PERIOD: number;
  EMA_PERIOD: number;
  TARGET_WIN_RATE: number;
  MIN_PROBABILITY: number;
  RECOVERY_THRESHOLD: number;
  RECOVERY_STAKE: number;
  RECOVERY_PROBABILITY: number;
} = {
  DEFAULT_STAKE: 1.00,
  MIN_STAKE: 0.35,
  MAX_STAKE: 3.00,
  LOSS_MULTIPLIER: 1.1,
  RSI_PERIOD: 14,
  EMA_PERIOD: 9,
  TARGET_WIN_RATE: 85,
  MIN_PROBABILITY: 75,
  RECOVERY_THRESHOLD: 0.6,
  RECOVERY_STAKE: 1.00,
  RECOVERY_PROBABILITY: 90,
};

// Risk Management
export const RISK_CONFIG = {
  DEFAULT_DAILY_LOSS_LIMIT: 1.50,
  DEFAULT_PROTECTED_FLOOR: 30.03,
  FLOOR_INCREMENT: 1.00,
} as const;

// Training Mode
export const TRAINING_CONFIG = {
  MIN_PAPER_TRADES: 10,
  PROBABILITY_INCREMENT: 1,
  WIN_RATE_THRESHOLD: 85,
  TRADES_PER_CALIBRATION: 5,
} as const;

// Log Types for Terminal
export type LogType = 'info' | 'success' | 'warning' | 'error' | 'trade';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: LogType;
  message: string;
  data?: Record<string, unknown>;
}

// Trade Types
export interface Trade {
  id: string;
  timestamp: Date;
  symbol: AssetSymbol;
  direction: 'CALL' | 'PUT';
  stake: number;
  payout: number;
  probability: number;
  result: 'WIN' | 'LOSS' | 'PENDING';
  profit: number;
  isTraining: boolean;
}

// Engine State
export interface EngineState {
  isRunning: boolean;
  isTraining: boolean;
  currentSymbol: AssetSymbol | null;
  balance: number;
  currency: string;
  totalProfit: number;
  winRate: number;
  currentStreak: number;
  longestStreak: number;
  vault: number;
  protectedFloor: number;
  dailyLossLimit: number;
  dailyLoss: number;
  tradesCount: number;
  winsCount: number;
  lossesCount: number;
  paperTradesCount: number;
  minProbability: number;
  lastTradeResult: 'WIN' | 'LOSS' | null;
  currentStake: number;
  isRecoveryMode: boolean;
}

// Asset Metrics
export interface AssetMetrics {
  symbol: AssetSymbol;
  winRate: number;
  lastPrice: number;
  priceChange: number;
  signalStrength: number;
  rsi: number;
  ema: number;
  isActive: boolean;
}
