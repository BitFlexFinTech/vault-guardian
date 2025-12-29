import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { ASSET_LABELS, type AssetMetrics } from '@/lib/constants';

interface AssetHeatmapProps {
  metrics: AssetMetrics[];
}

function getHeatColor(winRate: number, signalStrength: number): string {
  if (signalStrength < 30) return 'from-muted to-muted';
  if (winRate >= 85) return 'from-success/20 to-success/10';
  if (winRate >= 70) return 'from-warning/20 to-warning/10';
  return 'from-destructive/20 to-destructive/10';
}

function getSignalBorderColor(signalStrength: number): string {
  if (signalStrength >= 70) return 'border-success';
  if (signalStrength >= 40) return 'border-warning';
  return 'border-border';
}

export function AssetHeatmap({ metrics }: AssetHeatmapProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((asset, index) => (
        <motion.div
          key={asset.symbol}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`relative overflow-hidden rounded-lg border-2 p-4 bg-gradient-to-br ${getHeatColor(asset.winRate, asset.signalStrength)} ${getSignalBorderColor(asset.signalStrength)}`}
        >
          {/* Pulse indicator for active signals */}
          {asset.signalStrength >= 50 && (
            <div className="absolute top-2 right-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
              </span>
            </div>
          )}

          {/* Symbol & Name */}
          <div className="flex items-center gap-2 mb-2">
            <Activity className={`h-4 w-4 ${asset.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="font-mono text-sm font-semibold text-foreground">{asset.symbol}</span>
          </div>
          
          <div className="text-xs text-muted-foreground mb-3">
            {ASSET_LABELS[asset.symbol]}
          </div>

          {/* Price & Change */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-lg font-bold text-foreground">
              {asset.lastPrice > 0 ? asset.lastPrice.toFixed(4) : '—'}
            </span>
            {asset.priceChange !== 0 && (
              <span className={`flex items-center gap-1 text-xs font-mono ${asset.priceChange > 0 ? 'text-success' : 'text-destructive'}`}>
                {asset.priceChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(asset.priceChange).toFixed(3)}%
              </span>
            )}
          </div>

          {/* Indicators */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col">
              <span className="text-muted-foreground">RSI(14)</span>
              <span className={`font-mono font-medium ${asset.rsi < 30 ? 'text-success' : asset.rsi > 70 ? 'text-destructive' : 'text-foreground'}`}>
                {asset.rsi.toFixed(1)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Signal</span>
              <span className={`font-mono font-medium ${asset.signalStrength >= 70 ? 'text-success' : asset.signalStrength >= 40 ? 'text-warning' : 'text-muted-foreground'}`}>
                {asset.signalStrength.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Win Rate Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Win Rate</span>
              <span className={`font-mono ${asset.winRate >= 85 ? 'text-success' : asset.winRate >= 70 ? 'text-warning' : 'text-muted-foreground'}`}>
                {asset.winRate.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, asset.winRate)}%` }}
                className={`h-full rounded-full ${asset.winRate >= 85 ? 'bg-success' : asset.winRate >= 70 ? 'bg-warning' : 'bg-destructive'}`}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
