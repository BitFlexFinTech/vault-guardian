import { motion } from 'framer-motion';
import { PriceChart } from './PriceChart';
import { ASSET_WHITELIST, type AssetSymbol } from '@/lib/constants';

interface ChartGridProps {
  priceHistory: Record<string, number[]>;
  metrics: Array<{
    symbol: AssetSymbol;
    rsi: number;
    ema: number;
    signalStrength: number;
  }>;
}

export function ChartGrid({ priceHistory, metrics }: ChartGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {ASSET_WHITELIST.map((symbol, index) => {
        const assetMetrics = metrics.find(m => m.symbol === symbol);
        const prices = priceHistory[symbol] || [];

        return (
          <motion.div
            key={symbol}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-border rounded-lg p-3 flex flex-col min-h-0"
          >
            <PriceChart
              symbol={symbol}
              prices={prices}
              rsi={assetMetrics?.rsi || 50}
              ema={assetMetrics?.ema || 0}
              signalStrength={assetMetrics?.signalStrength || 0}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
