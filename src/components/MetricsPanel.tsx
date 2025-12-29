import { motion } from 'framer-motion';
import { TrendingUp, Trophy, Shield, Wallet, AlertTriangle, Target } from 'lucide-react';
import type { EngineState } from '@/lib/constants';

interface MetricsPanelProps {
  state: EngineState;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  subValue?: string;
}

function MetricCard({ label, value, icon, variant = 'default', subValue }: MetricCardProps) {
  const variantStyles = {
    default: 'border-border bg-card',
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    danger: 'border-destructive/30 bg-destructive/5',
  };

  const textStyles = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-3 ${variantStyles[variant]}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={textStyles[variant]}>{icon}</span>
      </div>
      <div className={`font-mono text-xl font-bold ${textStyles[variant]}`}>{value}</div>
      {subValue && (
        <div className="text-xs text-muted-foreground mt-1">{subValue}</div>
      )}
    </motion.div>
  );
}

export function MetricsPanel({ state }: MetricsPanelProps) {
  const profitVariant = state.totalProfit >= 0 ? 'success' : 'danger';
  const winRateVariant = state.winRate >= 85 ? 'success' : state.winRate >= 70 ? 'warning' : 'danger';
  const lossLimitUsage = (state.dailyLoss / state.dailyLossLimit) * 100;
  const lossVariant = lossLimitUsage >= 60 ? 'danger' : lossLimitUsage >= 30 ? 'warning' : 'default';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <MetricCard
        label="Balance"
        value={`${state.currency} ${state.balance.toFixed(2)}`}
        icon={<Wallet className="h-4 w-4" />}
        variant="default"
      />
      
      <MetricCard
        label="Profit"
        value={`${state.totalProfit >= 0 ? '+' : ''}${state.currency} ${state.totalProfit.toFixed(2)}`}
        icon={<TrendingUp className="h-4 w-4" />}
        variant={profitVariant}
        subValue={`${state.tradesCount} trades`}
      />
      
      <MetricCard
        label="Win Rate"
        value={`${state.winRate.toFixed(1)}%`}
        icon={<Target className="h-4 w-4" />}
        variant={winRateVariant}
        subValue={`${state.winsCount}W / ${state.lossesCount}L`}
      />
      
      <MetricCard
        label="Streak"
        value={state.currentStreak.toString()}
        icon={<Trophy className="h-4 w-4" />}
        variant={state.currentStreak >= 5 ? 'success' : 'default'}
        subValue={`Best: ${state.longestStreak}`}
      />
      
      <MetricCard
        label="Vault"
        value={`${state.currency} ${state.vault.toFixed(2)}`}
        icon={<Shield className="h-4 w-4" />}
        variant="success"
        subValue={`Floor: ${state.protectedFloor.toFixed(2)}`}
      />
      
      <MetricCard
        label="Daily Loss"
        value={`${state.currency} ${state.dailyLoss.toFixed(2)}`}
        icon={<AlertTriangle className="h-4 w-4" />}
        variant={lossVariant}
        subValue={`Limit: ${state.dailyLossLimit.toFixed(2)}`}
      />
    </div>
  );
}
