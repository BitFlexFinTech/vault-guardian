import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ASSET_LABELS, type AssetSymbol } from '@/lib/constants';

interface PriceChartProps {
  symbol: AssetSymbol;
  prices: number[];
  rsi: number;
  ema: number;
  signalStrength: number;
}

export function PriceChart({ symbol, prices, rsi, ema, signalStrength }: PriceChartProps) {
  const chartData = useMemo(() => {
    if (prices.length < 2) return [];
    
    // Take last 50 prices for chart
    const recentPrices = prices.slice(-50);
    
    return recentPrices.map((price, index) => ({
      index,
      price,
      ema: index >= 8 ? calculateEMAForIndex(recentPrices, index, 9) : null,
    }));
  }, [prices]);

  const priceChange = useMemo(() => {
    if (prices.length < 2) return 0;
    const first = prices[prices.length - 20] || prices[0];
    const last = prices[prices.length - 1];
    return ((last - first) / first) * 100;
  }, [prices]);

  const minPrice = useMemo(() => Math.min(...(chartData.map(d => d.price) || [0])), [chartData]);
  const maxPrice = useMemo(() => Math.max(...(chartData.map(d => d.price) || [0])), [chartData]);
  const priceRange = maxPrice - minPrice;

  if (chartData.length < 5) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Waiting for data...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">{symbol}</span>
          <span className="text-xs text-muted-foreground">{ASSET_LABELS[symbol]}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-mono ${priceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
          {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {priceChange.toFixed(3)}%
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(174, 72%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(174, 72%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <XAxis dataKey="index" hide />
            <YAxis 
              domain={[minPrice - priceRange * 0.1, maxPrice + priceRange * 0.1]} 
              hide 
            />
            
            {/* EMA Reference Line */}
            {ema > 0 && (
              <ReferenceLine 
                y={ema} 
                stroke="hsl(38, 92%, 50%)" 
                strokeDasharray="3 3" 
                strokeOpacity={0.5}
              />
            )}
            
            {/* Area under price line */}
            <Area
              type="monotone"
              dataKey="price"
              stroke="none"
              fill={`url(#gradient-${symbol})`}
            />
            
            {/* Price line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(174, 72%, 50%)"
              strokeWidth={2}
              dot={false}
              animationDuration={300}
            />
            
            {/* EMA line */}
            <Line
              type="monotone"
              dataKey="ema"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={1}
              dot={false}
              strokeDasharray="5 5"
              animationDuration={300}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Indicators */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">RSI:</span>
            <span className={`font-mono ${rsi < 30 ? 'text-success' : rsi > 70 ? 'text-destructive' : 'text-foreground'}`}>
              {rsi.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Signal:</span>
            <span className={`font-mono ${signalStrength >= 70 ? 'text-success' : signalStrength >= 40 ? 'text-warning' : 'text-muted-foreground'}`}>
              {signalStrength.toFixed(0)}%
            </span>
          </div>
        </div>
        
        {/* RSI Bar */}
        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              rsi < 30 ? 'bg-success' : rsi > 70 ? 'bg-destructive' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(100, rsi)}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Helper function to calculate EMA at a specific index
function calculateEMAForIndex(prices: number[], endIndex: number, period: number): number {
  if (endIndex < period - 1) return prices[endIndex];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i <= endIndex; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}
