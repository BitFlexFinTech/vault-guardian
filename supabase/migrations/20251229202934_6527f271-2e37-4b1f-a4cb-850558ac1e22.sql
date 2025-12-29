-- Vault Settings table for persistent configuration
CREATE TABLE public.vault_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  protected_floor DECIMAL(12,2) NOT NULL DEFAULT 30.03,
  daily_loss_limit DECIMAL(12,2) NOT NULL DEFAULT 1.50,
  min_probability INTEGER NOT NULL DEFAULT 75,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trade History table
CREATE TABLE public.trade_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('CALL', 'PUT')),
  stake DECIMAL(12,2) NOT NULL,
  payout DECIMAL(12,2) NOT NULL DEFAULT 0,
  probability DECIMAL(5,2) NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('WIN', 'LOSS', 'PENDING')),
  profit DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_training BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily Session table for tracking daily stats
CREATE TABLE public.daily_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  daily_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_date)
);

-- Enable Row Level Security (public access for this private app)
ALTER TABLE public.vault_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sessions ENABLE ROW LEVEL SECURITY;

-- Public policies (no auth required for this private build)
CREATE POLICY "Public read vault_settings" ON public.vault_settings FOR SELECT USING (true);
CREATE POLICY "Public insert vault_settings" ON public.vault_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update vault_settings" ON public.vault_settings FOR UPDATE USING (true);

CREATE POLICY "Public read trade_history" ON public.trade_history FOR SELECT USING (true);
CREATE POLICY "Public insert trade_history" ON public.trade_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read daily_sessions" ON public.daily_sessions FOR SELECT USING (true);
CREATE POLICY "Public insert daily_sessions" ON public.daily_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update daily_sessions" ON public.daily_sessions FOR UPDATE USING (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_vault_settings_updated_at
  BEFORE UPDATE ON public.vault_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_sessions_updated_at
  BEFORE UPDATE ON public.daily_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for trade_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_history;

-- Insert default vault settings
INSERT INTO public.vault_settings (vault_balance, protected_floor, daily_loss_limit, min_probability)
VALUES (0, 30.03, 1.50, 75);