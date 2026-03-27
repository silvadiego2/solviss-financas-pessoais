import React from 'react';
import { BarChart3 } from 'lucide-react';

export const Relatorios: React.FC<{ onBack?: () => void }> = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Relatórios</p>
        <h1 className="text-2xl font-bold mt-1">Relatórios Financeiros</h1>
      </div>
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Relatórios avançados em breve.</p>
        <p className="text-xs text-muted-foreground mt-2">Relatórios mensais, anuais e comparativos com exportação em PDF.</p>
      </div>
    </div>
  );
};
