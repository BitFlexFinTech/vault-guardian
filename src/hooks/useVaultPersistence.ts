import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Trade } from '@/lib/constants';

interface VaultSettings {
  vault_balance: number;
  protected_floor: number;
  daily_loss_limit: number;
  min_probability: number;
}

interface UseVaultPersistenceReturn {
  loadSettings: () => Promise<VaultSettings | null>;
  saveSettings: (settings: Partial<VaultSettings>) => Promise<void>;
  saveTrade: (trade: Trade) => Promise<void>;
  loadTrades: (filters?: { symbol?: string; result?: string; startDate?: Date; endDate?: Date }) => Promise<Trade[]>;
}

export function useVaultPersistence(
  onLog?: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void
): UseVaultPersistenceReturn {
  const log = useCallback((type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    onLog?.(type, message);
  }, [onLog]);

  const loadSettings = useCallback(async (): Promise<VaultSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('vault_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        log('error', `Failed to load settings: ${error.message}`);
        return null;
      }

      if (data) {
        log('success', 'Vault settings loaded from database');
        return {
          vault_balance: Number(data.vault_balance),
          protected_floor: Number(data.protected_floor),
          daily_loss_limit: Number(data.daily_loss_limit),
          min_probability: Number(data.min_probability),
        };
      }

      return null;
    } catch (err) {
      log('error', 'Database connection error');
      return null;
    }
  }, [log]);

  const saveSettings = useCallback(async (settings: Partial<VaultSettings>): Promise<void> => {
    try {
      // Get existing settings ID
      const { data: existing } = await supabase
        .from('vault_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('vault_settings')
          .update(settings)
          .eq('id', existing.id);

        if (error) {
          log('error', `Failed to save settings: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase
          .from('vault_settings')
          .insert(settings);

        if (error) {
          log('error', `Failed to create settings: ${error.message}`);
          return;
        }
      }

      log('info', 'Settings saved to database');
    } catch (err) {
      log('error', 'Failed to persist settings');
    }
  }, [log]);

  const saveTrade = useCallback(async (trade: Trade): Promise<void> => {
    try {
      const { error } = await supabase
        .from('trade_history')
        .insert({
          timestamp: trade.timestamp.toISOString(),
          symbol: trade.symbol,
          direction: trade.direction,
          stake: trade.stake,
          payout: trade.payout,
          probability: trade.probability,
          result: trade.result,
          profit: trade.profit,
          is_training: trade.isTraining,
        });

      if (error) {
        log('error', `Failed to save trade: ${error.message}`);
        return;
      }

      log('info', 'Trade saved to database');
    } catch (err) {
      log('error', 'Failed to persist trade');
    }
  }, [log]);

  const loadTrades = useCallback(async (filters?: { 
    symbol?: string; 
    result?: string; 
    startDate?: Date; 
    endDate?: Date 
  }): Promise<Trade[]> => {
    try {
      let query = supabase
        .from('trade_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filters?.symbol && filters.symbol !== 'ALL') {
        query = query.eq('symbol', filters.symbol);
      }

      if (filters?.result && filters.result !== 'ALL') {
        query = query.eq('result', filters.result);
      }

      if (filters?.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        log('error', `Failed to load trades: ${error.message}`);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        symbol: row.symbol as Trade['symbol'],
        direction: row.direction as 'CALL' | 'PUT',
        stake: Number(row.stake),
        payout: Number(row.payout),
        probability: Number(row.probability),
        result: row.result as 'WIN' | 'LOSS' | 'PENDING',
        profit: Number(row.profit),
        isTraining: row.is_training,
      }));
    } catch (err) {
      log('error', 'Failed to load trades from database');
      return [];
    }
  }, [log]);

  return {
    loadSettings,
    saveSettings,
    saveTrade,
    loadTrades,
  };
}
