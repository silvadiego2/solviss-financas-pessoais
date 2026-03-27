import React from 'react';
import { CalendarRange } from 'lucide-react';

export const Planejamento: React.FC<{ onBack?: () => void }> = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Planejamento</p>
        <h1 className="text-2xl font-bold mt-1">Planejamento Financeiro</h1>
      </div>
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <CalendarRange className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Planejamento financeiro em breve.</p>
        <p className="text-xs text-muted-foreground mt-2">Defina orçamentos por categoria e acompanhe seus gastos mensais.</p>
      </div>
    </div>
  );
};
