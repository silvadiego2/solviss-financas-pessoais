import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BackHeader } from '@/components/layout/BackHeader';
import { AdvancedAnalyticsDashboard } from './AdvancedAnalyticsDashboard';
import { InteractiveAnalytics } from './InteractiveAnalytics';
import { IntelligentGoals } from './IntelligentGoals';
import { AdvancedReports } from './AdvancedReports';
import { BarChart3, TrendingUp, Target, FileText, ChevronRight } from 'lucide-react';

interface AnalyticsHubProps {
  onBack?: () => void;
}

type AnalyticsView = 'hub' | 'dashboard' | 'interactive' | 'goals' | 'reports';

export const AnalyticsHub: React.FC<AnalyticsHubProps> = ({ onBack }) => {
  const [currentView, setCurrentView] = useState<AnalyticsView>('hub');

  const handleBackToHub = () => setCurrentView('hub');

  if (currentView === 'dashboard') return <AdvancedAnalyticsDashboard onBack={handleBackToHub} />;
  if (currentView === 'interactive') return <InteractiveAnalytics onBack={handleBackToHub} />;
  if (currentView === 'goals') return <IntelligentGoals onBack={handleBackToHub} />;
  if (currentView === 'reports') return <AdvancedReports />;

  const items = [
    {
      id: 'dashboard' as const,
      icon: <BarChart3 className="h-5 w-5 text-blue-600" />,
      title: 'Dashboard Avançado',
      description: 'Visão completa com gráficos detalhados',
    },
    {
      id: 'interactive' as const,
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
      title: 'Analytics Interativo',
      description: 'Explore seus dados com filtros dinâmicos',
    },
    {
      id: 'goals' as const,
      icon: <Target className="h-5 w-5 text-purple-600" />,
      title: 'Metas Inteligentes',
      description: 'Acompanhe e projete suas metas financeiras',
    },
    {
      id: 'reports' as const,
      icon: <FileText className="h-5 w-5 text-orange-600" />,
      title: 'Relatórios Avançados',
      description: 'Gere relatórios detalhados e personalizados',
    },
  ];

  return (
    <div className="space-y-6">
      <BackHeader
        title="Analytics Center"
        subtitle="Análises avançadas e insights financeiros"
        icon={<BarChart3 className="h-6 w-6" />}
        onBack={onBack}
      />

      <div className="grid gap-3">
        {items.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setCurrentView(item.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
