import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp } from 'lucide-react';
import { ReportsOverview } from './ReportsOverview';
import { ReportsDetailed } from './ReportsDetailed';

type Tab = 'overview' | 'detailed';

export const SimpleReports: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-muted-foreground">Relatórios</p>
        <h1 className="text-2xl font-bold mt-0.5">Relatórios Financeiros</h1>
      </div>

      {/* Abas */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        <button
          onClick={() => setTab('overview')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'overview'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <BarChart3 size={15} />
          Visão Geral
        </button>
        <button
          onClick={() => setTab('detailed')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'detailed'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <TrendingUp size={15} />
          Detalhado
        </button>
      </div>

      {/* Conteúdo */}
      {tab === 'overview' ? <ReportsOverview /> : <ReportsDetailed />}
    </div>
  );
};
