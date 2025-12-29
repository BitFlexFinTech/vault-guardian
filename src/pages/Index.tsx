import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useVaultPersistence } from '@/hooks/useVaultPersistence';
import { Header } from '@/components/Header';
import { StatusBar } from '@/components/StatusBar';
import { MetricsPanel } from '@/components/MetricsPanel';
import { ChartGrid } from '@/components/ChartGrid';
import { Terminal } from '@/components/Terminal';
import { ControlPanel } from '@/components/ControlPanel';
import { TradeHistory } from '@/components/TradeHistory';
import { Button } from '@/components/ui/button';
import { ASSET_WHITELIST, type Trade } from '@/lib/constants';

const Index = () => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [persistedTrades, setPersistedTrades] = useState<Trade[]>([]);

  // Persistence hook
  const { loadSettings, saveSettings, saveTrade, loadTrades } = useVaultPersistence((type, message) => {
    addLog(type, message);
  });

  // Trading engine with persistence callbacks
  const {
    state,
    logs,
    trades,
    assetMetrics,
    priceHistory,
    startEngine,
    stopEngine,
    toggleTrainingMode,
    updateDailyLossLimit,
    updateFromPersistence,
    addLog,
    processTick,
    canStartLive,
  } = useTradingEngine(
    0, 
    'USD', 
    () => {},
    // On trade saved
    async (trade) => {
      await saveTrade(trade);
    },
    // On settings changed
    async (settings) => {
      await saveSettings(settings);
    }
  );

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

  // Load persisted settings on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      const settings = await loadSettings();
      if (settings) {
        updateFromPersistence({
          vault: settings.vault_balance,
          protectedFloor: settings.protected_floor,
          dailyLossLimit: settings.daily_loss_limit,
          minProbability: settings.min_probability,
        });
      }

      const savedTrades = await loadTrades();
      setPersistedTrades(savedTrades);
    };

    loadPersistedData();
  }, [loadSettings, loadTrades, updateFromPersistence]);

  // Subscribe to assets when authorized
  useEffect(() => {
    if (isAuthorized) {
      subscribe([...ASSET_WHITELIST]);
    }
  }, [isAuthorized, subscribe]);

  // Combine current session trades with persisted
  const allTrades = [...trades, ...persistedTrades.filter(pt => 
    !trades.some(t => t.id === pt.id)
  )];

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

          {/* Charts Grid */}
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-h-0"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Live Charts
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setHistoryOpen(true)}
              >
                <History className="h-4 w-4" />
                Trade History
              </Button>
            </div>
            <ChartGrid 
              priceHistory={priceHistory} 
              metrics={assetMetrics}
            />
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

      {/* Trade History Modal */}
      <TradeHistory
        trades={allTrades}
        onLoadTrades={loadTrades}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
};

export default Index;
