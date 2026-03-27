import React from 'react';
import { Brain } from 'lucide-react';

export const Inteligencia: React.FC<{ onBack?: () => void }> = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Inteligência</p>
        <h1 className="text-2xl font-bold mt-1">Inteligência Financeira</h1>
      </div>
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Insights inteligentes em breve.</p>
        <p className="text-xs text-muted-foreground mt-2">Análises automáticas, categorização inteligente e alertas personalizados.</p>
      </div>
    </div>
  );
};
