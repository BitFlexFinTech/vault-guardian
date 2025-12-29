import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Filter, TrendingUp, TrendingDown, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ASSET_WHITELIST, type Trade, type AssetSymbol } from '@/lib/constants';

interface TradeHistoryProps {
  trades: Trade[];
  onLoadTrades: (filters?: { symbol?: string; result?: string }) => Promise<Trade[]>;
  isOpen: boolean;
  onClose: () => void;
}

export function TradeHistory({ trades: initialTrades, onLoadTrades, isOpen, onClose }: TradeHistoryProps) {
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [resultFilter, setResultFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const loadTrades = useCallback(async () => {
    setIsLoading(true);
    const loadedTrades = await onLoadTrades({
      symbol: symbolFilter !== 'ALL' ? symbolFilter : undefined,
      result: resultFilter !== 'ALL' ? resultFilter : undefined,
    });
    setTrades(loadedTrades);
    setIsLoading(false);
  }, [onLoadTrades, symbolFilter, resultFilter]);

  useEffect(() => {
    if (isOpen) {
      loadTrades();
    }
  }, [isOpen, loadTrades]);

  useEffect(() => {
    setTrades(initialTrades);
  }, [initialTrades]);

  const stats = {
    total: trades.length,
    wins: trades.filter(t => t.result === 'WIN').length,
    losses: trades.filter(t => t.result === 'LOSS').length,
    profit: trades.reduce((sum, t) => sum + t.profit, 0),
    avgProbability: trades.length > 0 
      ? trades.reduce((sum, t) => sum + t.probability, 0) / trades.length 
      : 0,
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 20 }}
          className="absolute right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Trade History</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={symbolFilter} onValueChange={setSymbolFilter}>
              <SelectTrigger className="w-32 h-8 text-xs bg-muted border-border">
                <SelectValue placeholder="Asset" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="ALL">All Assets</SelectItem>
                {ASSET_WHITELIST.map(symbol => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-24 h-8 text-xs bg-muted border-border">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="WIN">Win</SelectItem>
                <SelectItem value="LOSS">Loss</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 ml-auto"
              onClick={loadTrades}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-2 p-4 bg-muted/30">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Trades</div>
              <div className="font-mono font-semibold text-foreground">{stats.total}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className={`font-mono font-semibold ${stats.wins / stats.total >= 0.85 ? 'text-success' : 'text-warning'}`}>
                {stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Profit</div>
              <div className={`font-mono font-semibold ${stats.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${stats.profit.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Avg Prob</div>
              <div className="font-mono font-semibold text-primary">{stats.avgProbability.toFixed(1)}%</div>
            </div>
          </div>

          {/* Trade List */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-terminal">
            {trades.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No trades found
              </div>
            ) : (
              <div className="space-y-1">
                {trades.map((trade, index) => (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      trade.result === 'WIN' 
                        ? 'border-success/30 bg-success/5' 
                        : 'border-destructive/30 bg-destructive/5'
                    }`}
                  >
                    {/* Result Icon */}
                    <div className={`shrink-0 ${trade.result === 'WIN' ? 'text-success' : 'text-destructive'}`}>
                      {trade.result === 'WIN' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>

                    {/* Trade Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {trade.direction} {trade.symbol}
                        </span>
                        {trade.isTraining && (
                          <span className="px-1.5 py-0.5 text-xs bg-warning/20 text-warning rounded">
                            PAPER
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {trade.timestamp.toLocaleString()}
                      </div>
                    </div>

                    {/* Stake & Profit */}
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm text-foreground">
                        ${trade.stake.toFixed(2)}
                      </div>
                      <div className={`font-mono text-xs ${trade.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                      </div>
                    </div>

                    {/* Probability */}
                    <div className="shrink-0 w-12 text-right">
                      <span className="font-mono text-xs text-primary">
                        {trade.probability.toFixed(0)}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
