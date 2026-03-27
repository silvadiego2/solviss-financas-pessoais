import React from 'react';
import { TrendingUp } from 'lucide-react';

export const FluxoDeCaixa: React.FC<{ onBack?: () => void }> = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Fluxo de Caixa</p>
        <h1 className="text-2xl font-bold mt-1">Fluxo de Caixa</h1>
      </div>
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Visualização de fluxo de caixa em breve.</p>
        <p className="text-xs text-muted-foreground mt-2">Acompanhe entradas e saídas ao longo do tempo com gráficos detalhados.</p>
      </div>
    </div>
  );
};
