import React from 'react';
import { Crown } from 'lucide-react';

export const Planos: React.FC<{ onBack?: () => void }> = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Planos</p>
        <h1 className="text-2xl font-bold mt-1">Planos e Assinatura</h1>
      </div>
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Gestão de planos em breve.</p>
        <p className="text-xs text-muted-foreground mt-2">Escolha o plano ideal e desbloqueie funcionalidades premium.</p>
      </div>
    </div>
  );
};
