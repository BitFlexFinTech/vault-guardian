import { motion } from 'framer-motion';
import { Wifi, WifiOff, Lock, Unlock, Activity } from 'lucide-react';

interface StatusBarProps {
  isConnected: boolean;
  isAuthorized: boolean;
  isRunning: boolean;
  isTraining: boolean;
  lastError: string | null;
}

export function StatusBar({ isConnected, isAuthorized, isRunning, isTraining, lastError }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-success" />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
          <span className={`text-xs font-mono ${isConnected ? 'text-success' : 'text-destructive'}`}>
            {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Auth Status */}
        <div className="flex items-center gap-2">
          {isAuthorized ? (
            <Lock className="h-4 w-4 text-success" />
          ) : (
            <Unlock className="h-4 w-4 text-warning" />
          )}
          <span className={`text-xs font-mono ${isAuthorized ? 'text-success' : 'text-warning'}`}>
            {isAuthorized ? 'AUTHORIZED' : 'PENDING'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Error Display */}
        {lastError && (
          <span className="text-xs text-destructive font-mono truncate max-w-[200px]">
            {lastError}
          </span>
        )}

        {/* Engine Status */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={isRunning ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            <Activity className={`h-4 w-4 ${isRunning ? 'text-success' : 'text-muted-foreground'}`} />
          </motion.div>
          <span className={`text-xs font-mono ${
            isRunning 
              ? isTraining 
                ? 'text-warning' 
                : 'text-success' 
              : 'text-muted-foreground'
          }`}>
            {isRunning 
              ? isTraining 
                ? 'TRAINING' 
                : 'LIVE' 
              : 'IDLE'}
          </span>
        </div>
      </div>
    </div>
  );
}
