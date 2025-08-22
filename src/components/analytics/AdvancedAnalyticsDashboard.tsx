import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, 
  PieChart, Pie, Cell, Tooltip, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Target, Calendar, 
  PieChart as PieChartIcon, BarChart3, Activity, AlertTriangle
} from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useGoals } from '@/hooks/useGoals';
import { BackHeader } from '@/components/layout/BackHeader';

interface AdvancedAnalyticsDashboardProps {
  onBack?: () => void;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];

export const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({ onBack }) => {
  const { transactions } = useTransactions();
  const { budgets } = useBudgets();
  const { goals } = useGoals();
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const [selectedMetric, setSelectedMetric] = useState<'flow' | 'categories' | 'trends'>('flow');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Métricas avançadas calculadas
  const advancedMetrics = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const lastMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    const currentIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const currentExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastIncome = lastMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastExpenses = lastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const incomeGrowth = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
    const expenseGrowth = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0;
    const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;
    const burnRate = currentExpenses / 30; // Gastos por dia
    
    // ROI médio baseado em investimentos
    const investments = currentMonthTransactions.filter(t => 
      t.category?.name.toLowerCase().includes('investimento') ||
      t.category?.name.toLowerCase().includes('aplicação')
    );
    const investmentAmount = investments.reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      currentIncome,
      currentExpenses,
      incomeGrowth,
      expenseGrowth,
      savingsRate,
      burnRate,
      netWorth: currentIncome - currentExpenses,
      investmentAmount,
      budgetUtilization: budgets.length > 0 ? 
        (budgets.reduce((sum, b) => sum + b.spent, 0) / budgets.reduce((sum, b) => sum + b.amount, 0)) * 100 : 0
    };
  }, [transactions, budgets]);

  // Dados para fluxo de caixa mensal com projeções
  const cashFlowData = useMemo(() => {
    const months = parseInt(selectedPeriod);
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === month && tDate.getFullYear() === year;
      });
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const netFlow = income - expenses;
      const cumulativeFlow = i === months - 1 ? netFlow : 
        data.length > 0 ? data[data.length - 1].cumulativo + netFlow : netFlow;
      
      data.push({
        month: monthName,
        receitas: income,
        despesas: expenses,
        liquido: netFlow,
        cumulativo: cumulativeFlow,
      });
    }
    
    // Adicionar projeção para próximo mês
    if (data.length > 0) {
      const avgIncome = data.slice(-3).reduce((sum, d) => sum + d.receitas, 0) / 3;
      const avgExpenses = data.slice(-3).reduce((sum, d) => sum + d.despesas, 0) / 3;
      const lastCumulative = data[data.length - 1].cumulativo;
      
      data.push({
        month: 'Proj',
        receitas: avgIncome,
        despesas: avgExpenses,
        liquido: avgIncome - avgExpenses,
        cumulativo: lastCumulative + (avgIncome - avgExpenses),
      });
    }
    
    return data;
  }, [transactions, selectedPeriod]);

  // Análise de categorias com tendências
  const categoryAnalysis = useMemo(() => {
    const categoryTotals = new Map();
    const categoryTrends = new Map();
    
    // Últimos 2 meses para calcular tendência
    const now = new Date();
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    
    transactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
      const categoryName = t.category!.name;
      const tDate = new Date(t.date);
      const amount = Number(t.amount);
      
      // Total geral
      const current = categoryTotals.get(categoryName) || 0;
      categoryTotals.set(categoryName, current + amount);
      
      // Tendência mensal
      const trends = categoryTrends.get(categoryName) || { current: 0, last: 0 };
      if (tDate.getMonth() === currentMonth) {
        trends.current += amount;
      } else if (tDate.getMonth() === lastMonth) {
        trends.last += amount;
      }
      categoryTrends.set(categoryName, trends);
    });
    
    return Array.from(categoryTotals.entries())
      .map(([name, value]) => {
        const trends = categoryTrends.get(name) || { current: 0, last: 0 };
        const trend = trends.last > 0 ? ((trends.current - trends.last) / trends.last) * 100 : 0;
        return { 
          name, 
          value, 
          trend,
          percentage: (value / Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0)) * 100
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions]);

  // Performance de metas
  const goalsPerformance = useMemo(() => {
    return goals.map(goal => {
      const progress = (goal.current_amount / goal.target_amount) * 100;
      const daysRemaining = goal.target_date ? 
        Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      let status: 'on-track' | 'behind' | 'ahead' | 'completed' = 'on-track';
      
      if (goal.is_completed) {
        status = 'completed';
      } else if (daysRemaining) {
        const expectedProgress = daysRemaining > 0 ? 
          ((new Date().getTime() - new Date(goal.created_at).getTime()) / 
           (new Date(goal.target_date!).getTime() - new Date(goal.created_at).getTime())) * 100 : 100;
        
        if (progress > expectedProgress + 10) status = 'ahead';
        else if (progress < expectedProgress - 10) status = 'behind';
      }
      
      return {
        ...goal,
        progress,
        status,
        daysRemaining
      };
    });
  }, [goals]);

  const renderMetricContent = () => {
    switch (selectedMetric) {
      case 'categories':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={categoryAnalysis}>
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'trend') return [`${value}%`, 'Tendência'];
                  return [formatCurrency(Number(value)), 'Valor'];
                }}
              />
              <Bar yAxisId="left" dataKey="value" fill="hsl(var(--primary))" />
              <Line yAxisId="right" type="monotone" dataKey="trend" stroke="#EF4444" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        );
      
      case 'trends':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cashFlowData}>
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Area type="monotone" dataKey="cumulativo" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              <Area type="monotone" dataKey="liquido" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={cashFlowData}>
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="receitas" fill="#10B981" />
              <Bar dataKey="despesas" fill="#EF4444" />
              <Line type="monotone" dataKey="liquido" stroke="hsl(var(--primary))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="space-y-6">
      {onBack && <BackHeader title="Analytics Avançado" onBack={onBack} />}
      
      {!onBack && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Analytics Avançado</h2>
        </div>
      )}

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-2xl font-bold">{formatCurrency(advancedMetrics.currentIncome)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {advancedMetrics.incomeGrowth >= 0 ? (
                    <TrendingUp size={16} className="text-green-600" />
                  ) : (
                    <TrendingDown size={16} className="text-red-600" />
                  )}
                  <span className={`text-sm ${
                    advancedMetrics.incomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(Math.abs(advancedMetrics.incomeGrowth))}
                  </span>
                </div>
              </div>
              <DollarSign size={24} className="text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Poupança</p>
                <p className="text-2xl font-bold">{formatPercentage(advancedMetrics.savingsRate)}</p>
                <div className="mt-2">
                  <Progress value={Math.max(0, advancedMetrics.savingsRate)} className="h-2" />
                </div>
              </div>
              <Target size={24} className="text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Burn Rate Diário</p>
                <p className="text-2xl font-bold">{formatCurrency(advancedMetrics.burnRate)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {advancedMetrics.currentIncome > 0 ? 
                    `${Math.floor(advancedMetrics.currentIncome / advancedMetrics.burnRate)} dias de reserva` :
                    'Sem receita registrada'
                  }
                </p>
              </div>
              <Activity size={24} className="text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Uso do Orçamento</p>
                <p className="text-2xl font-bold">{formatPercentage(advancedMetrics.budgetUtilization)}</p>
                <div className="mt-2">
                  <Progress 
                    value={Math.min(100, advancedMetrics.budgetUtilization)} 
                    className="h-2"
                  />
                </div>
              </div>
              <PieChartIcon size={24} className="text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de Visualização */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Calendar size={16} />
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <BarChart3 size={16} />
              <Select value={selectedMetric} onValueChange={(value: 'flow' | 'categories' | 'trends') => setSelectedMetric(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flow">Fluxo de Caixa</SelectItem>
                  <SelectItem value="categories">Análise de Categorias</SelectItem>
                  <SelectItem value="trends">Tendências</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualização Principal */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedMetric === 'flow' && 'Fluxo de Caixa com Projeções'}
            {selectedMetric === 'categories' && 'Análise de Categorias com Tendências'}
            {selectedMetric === 'trends' && 'Tendências Acumuladas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderMetricContent()}
        </CardContent>
      </Card>

      {/* Performance de Metas */}
      {goalsPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance de Metas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goalsPerformance.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{goal.name}</span>
                      <Badge variant={
                        goal.status === 'completed' ? 'default' :
                        goal.status === 'ahead' ? 'secondary' :
                        goal.status === 'behind' ? 'destructive' : 'outline'
                      }>
                        {goal.status === 'completed' && 'Concluído'}
                        {goal.status === 'ahead' && 'Adiantado'}
                        {goal.status === 'behind' && 'Atrasado'}
                        {goal.status === 'on-track' && 'No prazo'}
                      </Badge>
                    </div>
                    <Progress value={goal.progress} className="h-2 mb-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
                      <span>{formatPercentage(goal.progress)}</span>
                    </div>
                  </div>
                  {goal.status === 'behind' && (
                    <AlertTriangle size={20} className="text-red-600 ml-3" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Categorias de Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryAnalysis.slice(0, 5).map((category, index) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(category.value)}</div>
                    <div className={`text-xs ${
                      category.trend >= 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {category.trend >= 0 ? '+' : ''}{formatPercentage(category.trend)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Patrimônio Líquido</span>
                <span className={`font-medium ${
                  advancedMetrics.netWorth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(advancedMetrics.netWorth)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Investimentos</span>
                <span className="font-medium">{formatCurrency(advancedMetrics.investmentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Metas Ativas</span>
                <span className="font-medium">{goals.filter(g => !g.is_completed).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Orçamentos Ativos</span>
                <span className="font-medium">{budgets.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};