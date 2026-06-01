import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, BarChart3, TrendingUp } from 'lucide-react';
import { AdvancedAnalyticsDashboard } from '@/components/analytics/AdvancedAnalyticsDashboard';
import { InteractiveAnalytics } from '@/components/analytics/InteractiveAnalytics';

type DetailView = 'menu' | 'dashboard' | 'interactive';

export const ReportsDetailed: React.FC = () => {
  const [view, setView] = useState<DetailView>('menu');

  if (view === 'dashboard')   return <AdvancedAnalyticsDashboard onBack={() => setView('menu')} />;
  if (view === 'interactive') return <InteractiveAnalytics       onBack={() => setView('menu')} />;

  const items = [
    {
      id: 'dashboard' as const,
      icon: <BarChart3 size={18} className="text-primary" />,
      title: 'Dashboard Avançado',
      description: 'Visão completa com gráficos detalhados por período',
    },
    {
      id: 'interactive' as const,
      icon: <TrendingUp size={18} className="text-primary" />,
      title: 'Analytics Interativo',
      description: 'Explore seus dados com filtros e comparativos dinâmicos',
    },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card
          key={item.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setView(item.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
