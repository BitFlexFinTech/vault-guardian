import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Settings, Zap, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TRAINING_CONFIG } from '@/lib/constants';
import type { EngineState } from '@/lib/constants';

interface ControlPanelProps {
  state: EngineState;
  canStartLive: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleTraining: () => void;
  onUpdateDailyLimit: (limit: number) => void;
}

export function ControlPanel({
  state,
  canStartLive,
  onStart,
  onStop,
  onToggleTraining,
  onUpdateDailyLimit,
}: ControlPanelProps) {
  const [dailyLimit, setDailyLimit] = useState(state.dailyLossLimit.toString());

  const handleLimitSave = () => {
    const value = parseFloat(dailyLimit);
    if (!isNaN(value) && value > 0) {
      onUpdateDailyLimit(value);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-card border border-border rounded-lg">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${state.isTraining ? 'bg-warning animate-pulse' : 'bg-success'}`} />
          <span className={`text-sm font-medium ${state.isTraining ? 'text-warning' : 'text-success'}`}>
            {state.isTraining ? 'Training Mode' : 'Live Mode'}
          </span>
        </div>
        <Switch
          checked={!state.isTraining}
          onCheckedChange={onToggleTraining}
          disabled={state.isRunning || (!state.isTraining && !canStartLive)}
        />
      </div>

      {/* Training Progress */}
      {state.isTraining && (
        <div className="text-xs text-muted-foreground">
          Paper trades: {state.paperTradesCount}/{TRAINING_CONFIG.MIN_PAPER_TRADES}
          {state.paperTradesCount < TRAINING_CONFIG.MIN_PAPER_TRADES && (
            <span className="text-warning ml-2">
              (Complete {TRAINING_CONFIG.MIN_PAPER_TRADES - state.paperTradesCount} more to unlock Live)
            </span>
          )}
        </div>
      )}

      {/* Recovery Mode Indicator */}
      {state.isRecoveryMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/30"
        >
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-xs text-destructive font-medium">Recovery Mode Active</span>
        </motion.div>
      )}

      {/* Main Controls */}
      <div className="flex gap-2">
        {!state.isRunning ? (
          <Button
            onClick={onStart}
            className="flex-1 gap-2"
            variant={state.isTraining ? 'outline' : 'default'}
            disabled={state.dailyLoss >= state.dailyLossLimit}
          >
            <Play className="h-4 w-4" />
            {state.isTraining ? 'Start Training' : 'Start Engine'}
          </Button>
        ) : (
          <Button
            onClick={onStop}
            className="flex-1 gap-2"
            variant="destructive"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" disabled={state.isRunning}>
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Risk Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-foreground">Daily Loss Limit ($)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.50"
                    min="0.50"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="bg-muted border-border text-foreground"
                  />
                  <Button onClick={handleLimitSave}>Save</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Current Settings</Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded bg-muted">
                    <Shield className="h-3 w-3 text-success" />
                    <span className="text-muted-foreground">Protected Floor:</span>
                    <span className="text-foreground font-mono">${state.protectedFloor.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">Min Probability:</span>
                    <span className="text-foreground font-mono">{state.minProbability}%</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>Stake: ${state.currentStake.toFixed(2)}</span>
        <span>Last: {state.lastTradeResult || '—'}</span>
      </div>
    </div>
  );
}
