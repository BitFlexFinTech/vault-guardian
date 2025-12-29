import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TerminalIcon, AlertCircle, CheckCircle, AlertTriangle, Info, Zap } from 'lucide-react';
import type { LogEntry, LogType } from '@/lib/constants';

interface TerminalProps {
  logs: LogEntry[];
}

const logIcons: Record<LogType, React.ReactNode> = {
  info: <Info className="h-3 w-3" />,
  success: <CheckCircle className="h-3 w-3" />,
  warning: <AlertTriangle className="h-3 w-3" />,
  error: <AlertCircle className="h-3 w-3" />,
  trade: <Zap className="h-3 w-3" />,
};

const logStyles: Record<LogType, string> = {
  info: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
  trade: 'text-primary',
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

export function Terminal({ logs }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <TerminalIcon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Terminal</span>
        <span className="text-xs text-muted-foreground ml-auto font-mono">{logs.length} logs</span>
      </div>

      {/* Logs - Newest at top with flex-col-reverse */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-terminal flex flex-col-reverse"
      >
        <AnimatePresence mode="popLayout">
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`flex items-start gap-2 text-xs font-mono py-1 px-2 rounded ${logStyles[log.type]} hover:bg-muted/20`}
            >
              <span className="mt-0.5 shrink-0">{logIcons[log.type]}</span>
              <span className="text-muted-foreground shrink-0">[{formatTime(log.timestamp)}]</span>
              <span className="break-all">{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {logs.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No logs yet...
          </div>
        )}
      </div>
    </div>
  );
}
