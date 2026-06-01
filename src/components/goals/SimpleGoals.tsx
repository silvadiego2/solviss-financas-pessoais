import React, { useState } from 'react';
import { Target, PiggyBank, BarChart2 } from 'lucide-react';
import { GoalsPoupar } from './GoalsPoupar';
import { GoalsControlar } from './GoalsControlar';
import { cn } from '@/lib/utils';

type Tab = 'poupar' | 'controlar';

export const SimpleGoals: React.FC = () => {
  const [tab, setTab] = useState<Tab>('poupar');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Metas</p>
          <h1 className="text-2xl font-bold mt-0.5">Metas Financeiras</h1>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        <button
          onClick={() => setTab('poupar')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'poupar'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <PiggyBank size={15} />
          Poupar
        </button>
        <button
          onClick={() => setTab('controlar')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'controlar'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <BarChart2 size={15} />
          Controlar
        </button>
      </div>

      {/* Conteúdo */}
      {tab === 'poupar' ? <GoalsPoupar /> : <GoalsControlar />}
    </div>
  );
};
