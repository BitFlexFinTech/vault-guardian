import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  TRADING_CONFIG, 
  RISK_CONFIG, 
  TRAINING_CONFIG,
  ASSET_WHITELIST,
  type AssetSymbol, 
  type EngineState, 
  type Trade,
  type AssetMetrics,
  type LogEntry,
  type LogType
} from '@/lib/constants';

// Technical indicators calculation
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number = 9): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

interface UseTradingEngineReturn {
  state: EngineState;
  logs: LogEntry[];
  trades: Trade[];
  assetMetrics: AssetMetrics[];
  startEngine: () => void;
  stopEngine: () => void;
  toggleTrainingMode: () => void;
  updateDailyLossLimit: (limit: number) => void;
  addLog: (type: LogType, message: string, data?: Record<string, unknown>) => void;
  processTick: (symbol: string, price: number) => void;
  processTradeResult: (result: 'WIN' | 'LOSS', profit: number) => void;
  canStartLive: boolean;
}

export function useTradingEngine(
  balance: number,
  currency: string,
  sendMessage: (msg: object) => void
): UseTradingEngineReturn {
  const [state, setState] = useState<EngineState>({
    isRunning: false,
    isTraining: true,
    currentSymbol: null,
    balance: 0,
    currency: 'USD',
    totalProfit: 0,
    winRate: 0,
    currentStreak: 0,
    longestStreak: 0,
    vault: 0,
    protectedFloor: RISK_CONFIG.DEFAULT_PROTECTED_FLOOR,
    dailyLossLimit: RISK_CONFIG.DEFAULT_DAILY_LOSS_LIMIT,
    dailyLoss: 0,
    tradesCount: 0,
    winsCount: 0,
    lossesCount: 0,
    paperTradesCount: 0,
    minProbability: TRADING_CONFIG.MIN_PROBABILITY,
    lastTradeResult: null,
    currentStake: TRADING_CONFIG.DEFAULT_STAKE,
    isRecoveryMode: false,
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [assetMetrics, setAssetMetrics] = useState<AssetMetrics[]>(
    ASSET_WHITELIST.map(symbol => ({
      symbol,
      winRate: 0,
      lastPrice: 0,
      priceChange: 0,
      signalStrength: 0,
      rsi: 50,
      ema: 0,
      isActive: false,
    }))
  );

  const priceHistory = useRef<Record<string, number[]>>({});
  const tradeTimeout = useRef<NodeJS.Timeout | null>(null);

  // Update balance from WebSocket
  useEffect(() => {
    setState(prev => ({ ...prev, balance, currency }));
  }, [balance, currency]);

  const addLog = useCallback((type: LogType, message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message,
      data,
    };
    setLogs(prev => [entry, ...prev.slice(0, 199)]); // Keep last 200 logs
  }, []);

  const processTick = useCallback((symbol: string, price: number) => {
    if (!ASSET_WHITELIST.includes(symbol as AssetSymbol)) return;

    // Update price history
    if (!priceHistory.current[symbol]) {
      priceHistory.current[symbol] = [];
    }
    priceHistory.current[symbol].push(price);
    
    // Keep last 100 prices
    if (priceHistory.current[symbol].length > 100) {
      priceHistory.current[symbol] = priceHistory.current[symbol].slice(-100);
    }

    const prices = priceHistory.current[symbol];
    const rsi = calculateRSI(prices, TRADING_CONFIG.RSI_PERIOD);
    const ema = calculateEMA(prices, TRADING_CONFIG.EMA_PERIOD);
    const priceChange = prices.length > 1 
      ? ((price - prices[prices.length - 2]) / prices[prices.length - 2]) * 100 
      : 0;

    // Calculate signal strength based on RSI extremes
    let signalStrength = 0;
    if (rsi < 30) signalStrength = Math.min(100, (30 - rsi) * 3);
    else if (rsi > 70) signalStrength = Math.min(100, (rsi - 70) * 3);

    setAssetMetrics(prev => prev.map(m => 
      m.symbol === symbol 
        ? { ...m, lastPrice: price, priceChange, rsi, ema, signalStrength, isActive: true }
        : m
    ));
  }, []);

  const analyzeSignal = useCallback((symbol: AssetSymbol): { direction: 'CALL' | 'PUT'; probability: number } | null => {
    const prices = priceHistory.current[symbol];
    if (!prices || prices.length < 20) return null;

    const rsi = calculateRSI(prices, TRADING_CONFIG.RSI_PERIOD);
    const ema = calculateEMA(prices, TRADING_CONFIG.EMA_PERIOD);
    const currentPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];

    // Mean reversion with momentum confirmation
    let direction: 'CALL' | 'PUT' | null = null;
    let probability = 0;

    // Oversold bounce (RSI < 30, price reversal)
    if (rsi < 30 && currentPrice > prevPrice) {
      direction = 'CALL';
      probability = Math.min(95, 70 + (30 - rsi) * 0.8);
    }
    // Overbought drop (RSI > 70, price reversal)
    else if (rsi > 70 && currentPrice < prevPrice) {
      direction = 'PUT';
      probability = Math.min(95, 70 + (rsi - 70) * 0.8);
    }

    // EMA confirmation
    if (direction === 'CALL' && currentPrice > ema) {
      probability += 5;
    } else if (direction === 'PUT' && currentPrice < ema) {
      probability += 5;
    }

    const minProb = state.isRecoveryMode 
      ? TRADING_CONFIG.RECOVERY_PROBABILITY 
      : state.minProbability;

    if (direction && probability >= minProb) {
      return { direction, probability: Math.min(95, probability) };
    }

    return null;
  }, [state.minProbability, state.isRecoveryMode]);

  const executeTrade = useCallback((symbol: AssetSymbol, direction: 'CALL' | 'PUT', probability: number) => {
    const stake = state.isRecoveryMode 
      ? TRADING_CONFIG.RECOVERY_STAKE 
      : state.currentStake;

    // Safety check: Don't trade if it would breach protected floor
    if (state.balance - stake < state.protectedFloor) {
      addLog('warning', 'Trade blocked: Would breach protected floor');
      return;
    }

    if (state.isTraining) {
      // Paper trade
      const mockResult = Math.random() < (probability / 100) ? 'WIN' : 'LOSS';
      const mockPayout = stake * 0.85;
      
      const trade: Trade = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        symbol,
        direction,
        stake,
        payout: mockPayout,
        probability,
        result: mockResult,
        profit: mockResult === 'WIN' ? mockPayout : -stake,
        isTraining: true,
      };

      setTrades(prev => [trade, ...prev]);
      processTradeResult(mockResult, trade.profit);
      addLog('trade', `[PAPER] ${direction} ${symbol} @ ${probability.toFixed(1)}% → ${mockResult}`, { trade });
    } else {
      // Real trade
      const contractType = direction === 'CALL' ? 'CALL' : 'PUT';
      
      sendMessage({
        proposal: 1 as const,
        amount: stake.toFixed(2),
        basis: 'stake' as const,
        contract_type: contractType,
        currency: state.currency,
        duration: 1,
        duration_unit: 't' as const,
        symbol,
      });

      addLog('info', `Proposal sent: ${direction} ${symbol} @ $${stake.toFixed(2)}`);
      setState(prev => ({ ...prev, currentSymbol: symbol }));
    }
  }, [state, addLog, sendMessage]);

  const processTradeResult = useCallback((result: 'WIN' | 'LOSS', profit: number) => {
    setState(prev => {
      const newWins = result === 'WIN' ? prev.winsCount + 1 : prev.winsCount;
      const newLosses = result === 'LOSS' ? prev.lossesCount + 1 : prev.lossesCount;
      const newTrades = prev.tradesCount + 1;
      const newWinRate = newTrades > 0 ? (newWins / newTrades) * 100 : 0;
      const newStreak = result === 'WIN' ? prev.currentStreak + 1 : 0;
      const newLongestStreak = Math.max(prev.longestStreak, newStreak);
      const newTotalProfit = prev.totalProfit + profit;
      const newDailyLoss = result === 'LOSS' ? prev.dailyLoss + Math.abs(profit) : prev.dailyLoss;
      
      // Vault and floor increment on profit
      let newVault = prev.vault;
      let newFloor = prev.protectedFloor;
      if (profit >= 1.00) {
        newVault += 1.00;
        newFloor += 1.00;
      }

      // Stake adjustment (Martingale-lite)
      let newStake = TRADING_CONFIG.DEFAULT_STAKE;
      if (result === 'LOSS') {
        newStake = Math.min(prev.currentStake * TRADING_CONFIG.LOSS_MULTIPLIER, TRADING_CONFIG.MAX_STAKE);
      }

      // Recovery mode check
      const isRecoveryMode = newDailyLoss >= prev.dailyLossLimit * TRADING_CONFIG.RECOVERY_THRESHOLD;

      // Training mode probability calibration
      let newMinProb = prev.minProbability;
      let newPaperTrades = prev.paperTradesCount;
      if (prev.isTraining) {
        newPaperTrades++;
        if (newPaperTrades % TRAINING_CONFIG.TRADES_PER_CALIBRATION === 0 && newWinRate < TRAINING_CONFIG.WIN_RATE_THRESHOLD) {
          newMinProb = Math.min(95, newMinProb + TRAINING_CONFIG.PROBABILITY_INCREMENT);
        }
      }

      return {
        ...prev,
        winsCount: newWins,
        lossesCount: newLosses,
        tradesCount: newTrades,
        winRate: newWinRate,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        totalProfit: newTotalProfit,
        dailyLoss: newDailyLoss,
        vault: newVault,
        protectedFloor: newFloor,
        lastTradeResult: result,
        currentStake: newStake,
        isRecoveryMode,
        minProbability: newMinProb,
        paperTradesCount: newPaperTrades,
      };
    });
  }, []);

  const startEngine = useCallback(() => {
    if (state.isTraining && state.paperTradesCount < TRAINING_CONFIG.MIN_PAPER_TRADES) {
      addLog('warning', `Complete ${TRAINING_CONFIG.MIN_PAPER_TRADES} paper trades first (${state.paperTradesCount}/${TRAINING_CONFIG.MIN_PAPER_TRADES})`);
      return;
    }

    if (state.dailyLoss >= state.dailyLossLimit) {
      addLog('error', 'Daily loss limit reached. Engine locked.');
      return;
    }

    setState(prev => ({ ...prev, isRunning: true }));
    addLog('success', `Engine started in ${state.isTraining ? 'TRAINING' : 'LIVE'} mode`);
  }, [state.isTraining, state.paperTradesCount, state.dailyLoss, state.dailyLossLimit, addLog]);

  const stopEngine = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false, currentSymbol: null }));
    if (tradeTimeout.current) {
      clearTimeout(tradeTimeout.current);
    }
    addLog('warning', 'Engine stopped');
  }, [addLog]);

  const toggleTrainingMode = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isTraining: !prev.isTraining,
      isRunning: false 
    }));
    addLog('info', `Switched to ${state.isTraining ? 'LIVE' : 'TRAINING'} mode`);
  }, [state.isTraining, addLog]);

  const updateDailyLossLimit = useCallback((limit: number) => {
    setState(prev => ({ ...prev, dailyLossLimit: limit }));
    addLog('info', `Daily loss limit set to $${limit.toFixed(2)}`);
  }, [addLog]);

  // Auto-trading loop
  useEffect(() => {
    if (!state.isRunning) return;

    const interval = setInterval(() => {
      if (state.dailyLoss >= state.dailyLossLimit) {
        stopEngine();
        addLog('error', 'Daily loss limit reached. Stopping engine.');
        return;
      }

      // Find best signal across all assets
      let bestSignal: { symbol: AssetSymbol; direction: 'CALL' | 'PUT'; probability: number } | null = null;

      for (const symbol of ASSET_WHITELIST) {
        const signal = analyzeSignal(symbol);
        if (signal && (!bestSignal || signal.probability > bestSignal.probability)) {
          bestSignal = { symbol, ...signal };
        }
      }

      if (bestSignal) {
        executeTrade(bestSignal.symbol, bestSignal.direction, bestSignal.probability);
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [state.isRunning, state.dailyLoss, state.dailyLossLimit, analyzeSignal, executeTrade, stopEngine, addLog]);

  const canStartLive = !state.isTraining || state.paperTradesCount >= TRAINING_CONFIG.MIN_PAPER_TRADES;

  return {
    state,
    logs,
    trades,
    assetMetrics,
    startEngine,
    stopEngine,
    toggleTrainingMode,
    updateDailyLossLimit,
    addLog,
    processTick,
    processTradeResult,
    canStartLive,
  };
}
