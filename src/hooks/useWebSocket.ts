import { useRef, useCallback, useEffect, useState } from 'react';
import { WS_CONFIG, ASSET_WHITELIST } from '@/lib/constants';

interface WebSocketMessage {
  msg_type?: string;
  authorize?: {
    currency: string;
    balance: number;
    loginid: string;
  };
  tick?: {
    symbol: string;
    quote: number;
    epoch: number;
  };
  proposal?: {
    id: string;
    payout: number;
    ask_price: number;
  };
  buy?: {
    contract_id: number;
    balance_after: number;
    buy_price: number;
    payout: number;
  };
  error?: {
    code: string;
    message: string;
  };
  [key: string]: unknown;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isAuthorized: boolean;
  balance: number;
  currency: string;
  ticks: Record<string, number>;
  sendMessage: (msg: object) => void;
  subscribe: (symbols: string[]) => void;
  unsubscribeAll: () => void;
  lastError: string | null;
  reconnect: () => void;
}

export function useWebSocket(
  onMessage?: (msg: WebSocketMessage) => void,
  onLog?: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void
): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [ticks, setTicks] = useState<Record<string, number>>({});
  const [lastError, setLastError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const log = useCallback((type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    onLog?.(type, message);
  }, [onLog]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    log('info', 'Connecting to Binary.com WebSocket...');
    
    const ws = new WebSocket(WS_CONFIG.ENDPOINT);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setLastError(null);
      reconnectAttempts.current = 0;
      log('success', 'WebSocket connected');
      
      // Authorize immediately
      ws.send(JSON.stringify({ authorize: WS_CONFIG.AUTH_TOKEN }));
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        // Handle authorization
        if (data.msg_type === 'authorize' && data.authorize) {
          setIsAuthorized(true);
          setBalance(data.authorize.balance);
          setCurrency(data.authorize.currency);
          log('success', `Authorized: ${data.authorize.currency} ${data.authorize.balance.toFixed(2)}`);
        }

        // Handle ticks
        if (data.msg_type === 'tick' && data.tick) {
          setTicks(prev => ({
            ...prev,
            [data.tick!.symbol]: data.tick!.quote
          }));
        }

        // Handle errors
        if (data.error) {
          setLastError(data.error.message);
          log('error', `API Error: ${data.error.message}`);
        }

        // Handle balance updates
        if (data.msg_type === 'balance' && data.balance) {
          setBalance(data.balance as number);
        }

        // Forward message to handler
        onMessage?.(data);
      } catch (err) {
        log('error', 'Failed to parse WebSocket message');
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsAuthorized(false);
      log('warning', 'WebSocket disconnected');
      
      // Auto-reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        log('info', `Reconnecting in ${delay / 1000}s...`);
        setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      setLastError('WebSocket connection error');
      log('error', 'WebSocket error occurred');
    };
  }, [log, onMessage]);

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      log('warning', 'Cannot send: WebSocket not connected');
    }
  }, [log]);

  const subscribe = useCallback((symbols: string[]) => {
    if (!isAuthorized) {
      log('warning', 'Cannot subscribe: Not authorized');
      return;
    }
    
    // Forget all existing ticks first
    sendMessage({ forget_all: 'ticks' });
    
    // Subscribe to new symbols
    const validSymbols = symbols.filter(s => 
      ASSET_WHITELIST.includes(s as typeof ASSET_WHITELIST[number])
    );
    
    if (validSymbols.length > 0) {
      sendMessage({ ticks: validSymbols });
      log('info', `Subscribed to: ${validSymbols.join(', ')}`);
    }
  }, [isAuthorized, sendMessage, log]);

  const unsubscribeAll = useCallback(() => {
    sendMessage({ forget_all: 'ticks' });
    setTicks({});
    log('info', 'Unsubscribed from all ticks');
  }, [sendMessage, log]);

  const reconnect = useCallback(() => {
    wsRef.current?.close();
    reconnectAttempts.current = 0;
    setTimeout(connect, 500);
  }, [connect]);

  useEffect(() => {
    connect();
    
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    isConnected,
    isAuthorized,
    balance,
    currency,
    ticks,
    sendMessage,
    subscribe,
    unsubscribeAll,
    lastError,
    reconnect,
  };
}
