import { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { Header } from '@/components/Header';
import { StatusBar } from '@/components/StatusBar';
import { MetricsPanel } from '@/components/MetricsPanel';
import { AssetHeatmap } from '@/components/AssetHeatmap';
import { Terminal } from '@/components/Terminal';
import { ControlPanel } from '@/components/ControlPanel';
import { ASSET_WHITELIST } from '@/lib/constants';

const Index = () => {
  const {
    state,
    logs,
    assetMetrics,
    startEngine,
    stopEngine,
    toggleTrainingMode,
    updateDailyLossLimit,
    addLog,
    processTick,
    canStartLive,
  } = useTradingEngine(0, 'USD', () => {});

  const handleMessage = useCallback((msg: { msg_type?: string; tick?: { symbol: string; quote: number } }) => {
    if (msg.msg_type === 'tick' && msg.tick) {
      processTick(msg.tick.symbol, msg.tick.quote);
    }
  }, [processTick]);

  const handleLog = useCallback((type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    addLog(type, message);
  }, [addLog]);

  const {
    isConnected,
    isAuthorized,
    balance,
    currency,
    subscribe,
    lastError,
  } = useWebSocket(handleMessage, handleLog);

  // Subscribe to assets when authorized
  useEffect(() => {
    if (isAuthorized) {
      subscribe([...ASSET_WHITELIST]);
    }
  }, [isAuthorized, subscribe]);

  // Update engine state with WebSocket data
  useEffect(() => {
    if (balance > 0) {
      // Balance updates handled in useTradingEngine
    }
  }, [balance, currency]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Header />
      <StatusBar
        isConnected={isConnected}
        isAuthorized={isAuthorized}
        isRunning={state.isRunning}
        isTraining={state.isTraining}
        lastError={lastError}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Metrics */}
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <MetricsPanel state={{ ...state, balance, currency }} />
          </motion.section>

          {/* Asset Heatmap */}
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1"
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Asset Heatmap
            </h2>
            <AssetHeatmap metrics={assetMetrics} />
          </motion.section>
        </main>

        {/* Right Sidebar - Terminal & Controls */}
        <aside className="w-80 lg:w-96 flex flex-col p-4 gap-4 border-l border-border bg-muted/10">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ControlPanel
              state={{ ...state, balance, currency }}
              canStartLive={canStartLive}
              onStart={startEngine}
              onStop={stopEngine}
              onToggleTraining={toggleTrainingMode}
              onUpdateDailyLimit={updateDailyLossLimit}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-1 min-h-0"
          >
            <Terminal logs={logs} />
          </motion.div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
