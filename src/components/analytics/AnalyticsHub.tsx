import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, Brain, MousePointer, Target, TrendingUp, 
  Activity, PieChart, LineChart, Zap, ArrowRight
} from 'lucide-react';
import { AdvancedAnalyticsDashboard } from './AdvancedAnalyticsDashboard';
import { InteractiveAnalytics } from './InteractiveAnalytics';
import { IntelligentGoals } from './IntelligentGoals';
import { AdvancedReports } from '@/components/reports/AdvancedReports';
import { BackHeader } from '@/components/layout/BackHeader';

interface AnalyticsHubProps {
  onBack?: () => void;
}

type AnalyticsView = 'hub' | 'dashboard' | 'interactive' | 'goals' | 'reports';

export const AnalyticsHub: React.FC<AnalyticsHubProps> = ({ onBack }) => {
  const [currentView, setCurrentView] = useState<AnalyticsView>('hub');

  const handleBackToHub = () => {
    setCurrentView('hub');
  };

  if (currentView === 'dashboard') {
    return <AdvancedAnalyticsDashboard onBack={handleBackToHub} />;
  }

  if (currentView === 'interactive') {
    return <InteractiveAnalytics onBack={handleBackToHub} />;
  }

  if (currentView === 'goals') {
    return <IntelligentGoals onBack={handleBackToHub} />;
  }

  if (currentView === 'reports') {
    return <AdvancedReports />;
  }

  return (
    <div className="space-y-6">
      {onBack && <BackHeader title="Analytics Center" onBack={onBack} />}
      
      {!onBack && (
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Analytics Center</h2>
          <p className="text-muted-foreground">
            Análises avançadas e insights inteligentes para suas finanças
          </p>
        </div>
      )}

      {/* Cards de Funcionalidades Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setCurrentView('dashboard')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <div className="font-semibold">Dashboard Avançado</div>
                  <div className="text-sm text-muted-foreground">KPIs e métricas detalhadas</div>
                </div>
              </div>
              <ArrowRight size={20} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm">Taxa de poupança e burn rate</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-orange-600" />
                <span className="text-sm">Fluxo de caixa com projeções</span>
              </div>
              <div className="flex items-center gap-2">
                <PieChart size={16} className="text-purple-600" />
                <span className="text-sm">Análise de categorias com tendências</span>
              </div>
              <Badge variant="secondary" className="mt-2">Análise Preditiva</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setCurrentView('interactive')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <MousePointer size={24} />
                </div>
                <div>
                  <div className="font-semibold">Analytics Interativo</div>
                  <div className="text-sm text-muted-foreground">Explore dados com drill-down</div>
                </div>
              </div>
              <ArrowRight size={20} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-yellow-600" />
                <span className="text-sm">Mapas de calor de gastos</span>
              </div>
              <div className="flex items-center gap-2">
                <LineChart size={16} className="text-blue-600" />
                <span className="text-sm">Análise de padrões temporais</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-red-600" />
                <span className="text-sm">Correlações entre categorias</span>
              </div>
              <Badge variant="secondary" className="mt-2">Visualização Interativa</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setCurrentView('goals')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <Brain size={24} />
                </div>
                <div>
                  <div className="font-semibold">Metas Inteligentes</div>
                  <div className="text-sm text-muted-foreground">IA para análise de objetivos</div>
                </div>
              </div>
              <ArrowRight size={20} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-blue-600" />
                <span className="text-sm">Análise preditiva de metas</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm">Insights e recomendações</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-orange-600" />
                <span className="text-sm">Monitoramento de progresso</span>
              </div>
              <Badge variant="secondary" className="mt-2">Inteligência Artificial</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setCurrentView('reports')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <div className="font-semibold">Relatórios Customizáveis</div>
                  <div className="text-sm text-muted-foreground">Exportação e análise avançada</div>
                </div>
              </div>
              <ArrowRight size={20} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PieChart size={16} className="text-purple-600" />
                <span className="text-sm">Múltiplos tipos de gráficos</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm">Comparação orçamento vs gasto</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-blue-600" />
                <span className="text-sm">Exportação PDF e Excel</span>
              </div>
              <Badge variant="secondary" className="mt-2">Relatórios Profissionais</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Recursos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap size={20} />
            Recursos Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
              <BarChart3 size={20} className="text-blue-600" />
              <div>
                <div className="font-medium text-sm">Dashboard KPI</div>
                <div className="text-xs text-muted-foreground">Métricas em tempo real</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
              <MousePointer size={20} className="text-green-600" />
              <div>
                <div className="font-medium text-sm">Drill-down</div>
                <div className="text-xs text-muted-foreground">Exploração interativa</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50">
              <Brain size={20} className="text-purple-600" />
              <div>
                <div className="font-medium text-sm">IA Preditiva</div>
                <div className="text-xs text-muted-foreground">Análise inteligente</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50">
              <Activity size={20} className="text-orange-600" />
              <div>
                <div className="font-medium text-sm">Heatmaps</div>
                <div className="text-xs text-muted-foreground">Padrões visuais</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dicas de Uso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 Dicas para Melhor Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Dashboard Avançado</h4>
              <p className="text-muted-foreground">
                Use para acompanhar KPIs importantes como taxa de poupança e burn rate. 
                Ideal para visão geral da saúde financeira.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Analytics Interativo</h4>
              <p className="text-muted-foreground">
                Clique nas categorias para explorar detalhes. Use filtros para 
                analisar períodos específicos e contas individuais.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Metas Inteligentes</h4>
              <p className="text-muted-foreground">
                Receba insights automáticos sobre viabilidade das metas e 
                sugestões de ajustes baseadas no seu padrão de gastos.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Relatórios Customizáveis</h4>
              <p className="text-muted-foreground">
                Configure períodos personalizados e exporte dados em diferentes 
                formatos para análises externas ou apresentações.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};