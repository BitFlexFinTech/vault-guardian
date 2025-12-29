import { Shield, Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Shield className="h-8 w-8 text-primary" />
          <Zap className="h-4 w-4 text-warning absolute -bottom-1 -right-1" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            Vault-Guardian-Pro
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            D29 HFT Engine • v1.0.0
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
          <span className="text-xs font-mono text-primary">tUSDT</span>
        </div>
      </div>
    </header>
  );
}
