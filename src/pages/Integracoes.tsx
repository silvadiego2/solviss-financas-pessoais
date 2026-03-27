import React from 'react';
import { Plug } from 'lucide-react';

export const Integracoes: React.FC<{ onBack?: () => void }> = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Integrações</p>
        <h1 className="text-2xl font-bold mt-1">Integrações</h1>
      </div>
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <Plug className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Integrações com bancos e serviços em breve.</p>
        <p className="text-xs text-muted-foreground mt-2">Conecte suas contas bancárias, cartões e serviços financeiros automaticamente.</p>
      </div>
    </div>
  );
};
