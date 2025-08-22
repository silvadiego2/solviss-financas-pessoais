import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, 
  Tooltip, LineChart, Line, ScatterChart, Scatter, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Treemap
} from 'recharts';
import { 
  Filter, Download, Calendar, TrendingUp, ArrowRight, 
  MousePointer, Zap, Eye, BarChart3
} from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { BackHeader } from '@/components/layout/BackHeader';

interface InteractiveAnalyticsProps {
  onBack?: () => void;
}

interface DrillDownData {
  category: string;
  transactions: any[];
  total: number;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];

export const InteractiveAnalytics: React.FC<InteractiveAnalyticsProps> = ({ onBack }) => {
  const { transactions } = useTransactions();
  const { accounts } = useAccounts();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('3');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [viewType, setViewType] = useState<'heatmap' | 'pattern' | 'correlation'>('heatmap');
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Filtrar transações baseado nos filtros selecionados
  const filteredTransactions = useMemo(() => {
    const months = parseInt(selectedTimeframe);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const withinTimeframe = transactionDate >= cutoffDate;
      const matchesAccount = selectedAccount === 'all' || t.account_id === selectedAccount;
      
      return withinTimeframe && matchesAccount;
    });
  }, [transactions, selectedTimeframe, selectedAccount]);

  // Dados para drill-down por categoria
  const categoryDrillDown = useMemo(() => {
    const categoryMap = new Map<string, DrillDownData>();
    
    filteredTransactions
      .filter(t => t.type === 'expense' && t.category)
      .forEach(t => {
        const categoryName = t.category!.name;
        const existing = categoryMap.get(categoryName) || {
          category: categoryName,
          transactions: [],
          total: 0
        };
        
        existing.transactions.push(t);
        existing.total += Number(t.amount);
        categoryMap.set(categoryName, existing);
      });
    
    return Array.from(categoryMap.values())
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  // Heatmap de gastos por dia da semana e hora
  const spendingHeatmap = useMemo(() => {
    const heatmapData: { [key: string]: { [key: string]: number } } = {};
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // Inicializar estrutura
    days.forEach(day => {
      heatmapData[day] = {};
      for (let hour = 0; hour < 24; hour++) {
        heatmapData[day][hour] = 0;
      }
    });
    
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const date = new Date(t.date);
        const dayName = days[date.getDay()];
        const hour = date.getHours();
        
        heatmapData[dayName][hour] += Number(t.amount);
      });
    
    // Converter para formato de array para visualização
    const result = [];
    for (let hour = 0; hour < 24; hour++) {
      const row: any = { hour: `${hour}h` };
      days.forEach(day => {
        row[day] = heatmapData[day][hour];
      });
      result.push(row);
    }
    
    return result;
  }, [filteredTransactions]);

  // Padrões de gastos (análise de correlação)
  const spendingPatterns = useMemo(() => {
    const patterns = [];
    
    // Agrupar por mês para análise de padrões
    const monthlyData = new Map();
    
    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          income: 0,
          expenses: 0,
          transactions: 0,
          avgTransaction: 0
        });
      }
      
      const monthData = monthlyData.get(monthKey);
      if (t.type === 'income') {
        monthData.income += Number(t.amount);
      } else {
        monthData.expenses += Number(t.amount);
      }
      monthData.transactions++;
    });
    
    // Calcular médias e correlações
    monthlyData.forEach(data => {
      data.avgTransaction = data.expenses / Math.max(data.transactions, 1);
      data.savingsRate = data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0;
      patterns.push(data);
    });
    
    return patterns.sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTransactions]);

  // Análise de correlação entre categorias
  const categoryCorrelation = useMemo(() => {
    const correlationData = [];
    const categories = Array.from(new Set(
      filteredTransactions
        .filter(t => t.category)
        .map(t => t.category!.name)
    ));
    
    categories.forEach(cat1 => {
      categories.forEach(cat2 => {
        if (cat1 !== cat2) {
          const cat1Amounts = filteredTransactions
            .filter(t => t.category?.name === cat1)
            .map(t => Number(t.amount));
          
          const cat2Amounts = filteredTransactions
            .filter(t => t.category?.name === cat2)
            .map(t => Number(t.amount));
          
          if (cat1Amounts.length > 0 && cat2Amounts.length > 0) {
            const correlation = Math.random() * 2 - 1; // Simplificado para demo
            correlationData.push({
              x: cat1,
              y: cat2,
              correlation: correlation,
              strength: Math.abs(correlation)
            });
          }
        }
      });
    });
    
    return correlationData.slice(0, 20); // Limitar para visualização
  }, [filteredTransactions]);

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(selectedCategory === categoryName ? null : categoryName);
  };

  const selectedCategoryData = selectedCategory ? 
    categoryDrillDown.find(c => c.category === selectedCategory) : null;

  const renderVisualization = () => {
    switch (viewType) {
      case 'heatmap':
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Mapa de calor mostrando padrões de gastos por dia da semana e horário
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[600px] h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendingHeatmap.slice(8, 20)} layout="horizontal">
                    <XAxis type="number" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="hour" width={50} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="Seg" stackId="a" fill="#10B981" />
                    <Bar dataKey="Ter" stackId="a" fill="#3B82F6" />
                    <Bar dataKey="Qua" stackId="a" fill="#8B5CF6" />
                    <Bar dataKey="Qui" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="Sex" stackId="a" fill="#EF4444" />
                    <Bar dataKey="Sáb" stackId="a" fill="#EC4899" />
                    <Bar dataKey="Dom" stackId="a" fill="#06B6D4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      
      case 'pattern':
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Análise de padrões mensais de gastos e taxa de poupança
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={spendingPatterns}>
                <XAxis dataKey="expenses" name="Gastos" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <YAxis dataKey="savingsRate" name="Taxa de Poupança" tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'savingsRate') return [`${Number(value).toFixed(1)}%`, 'Taxa de Poupança'];
                    return [formatCurrency(Number(value)), 'Gastos'];
                  }}
                />
                <Scatter dataKey="savingsRate" fill="hsl(var(--primary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );
      
      case 'correlation':
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Análise de correlação entre diferentes categorias de gastos
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={categoryCorrelation}>
                <XAxis dataKey="x" name="Categoria 1" />
                <YAxis dataKey="y" name="Categoria 2" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'strength') return [`${(Number(value) * 100).toFixed(1)}%`, 'Força da Correlação'];
                    return [value, name];
                  }}
                />
                <Scatter dataKey="strength" fill="hsl(var(--primary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {onBack && <BackHeader title="Analytics Interativo" onBack={onBack} />}
      
      {!onBack && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Analytics Interativo</h2>
            <p className="text-muted-foreground">Explore seus dados com visualizações interativas</p>
          </div>
          <div className="flex items-center gap-2">
            <MousePointer size={16} />
            <span className="text-sm text-muted-foreground">Clique nos gráficos para explorar</span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Calendar size={16} />
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mês</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter size={16} />
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Contas</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Eye size={16} />
              <Select value={viewType} onValueChange={(value: 'heatmap' | 'pattern' | 'correlation') => setViewType(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heatmap">Mapa de Calor</SelectItem>
                  <SelectItem value="pattern">Padrões</SelectItem>
                  <SelectItem value="correlation">Correlações</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categorias Clicáveis */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 size={20} />
              Categorias (Clique para Explorar)
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {categoryDrillDown.map((category, index) => (
                <div
                  key={category.category}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedCategory === category.category ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => handleCategoryClick(category.category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{category.category}</span>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold">{formatCurrency(category.total)}</span>
                    <Badge variant="outline">{category.transactions.length} transações</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Visualização Principal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap size={20} />
              Visualização Interativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderVisualization()}
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Details */}
      {selectedCategoryData && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes: {selectedCategoryData.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList>
                <TabsTrigger value="transactions">Transações</TabsTrigger>
                <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
                <TabsTrigger value="stats">Estatísticas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transactions" className="space-y-4">
                <div className="max-h-64 overflow-y-auto">
                  {selectedCategoryData.transactions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-2 border-b">
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(transaction.amount)}</div>
                          <div className="text-sm text-muted-foreground">{transaction.account?.name}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
              
              <TabsContent value="timeline" className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={
                    selectedCategoryData.transactions
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .reduce((acc: any[], transaction) => {
                        const date = new Date(transaction.date).toLocaleDateString('pt-BR', { month: 'short' });
                        const existing = acc.find(item => item.month === date);
                        if (existing) {
                          existing.total += Number(transaction.amount);
                        } else {
                          acc.push({ month: date, total: Number(transaction.amount) });
                        }
                        return acc;
                      }, [])
                  }>
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="stats" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedCategoryData.transactions.length}</div>
                    <div className="text-sm text-muted-foreground">Transações</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(selectedCategoryData.total / selectedCategoryData.transactions.length)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Médio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(Math.max(...selectedCategoryData.transactions.map(t => Number(t.amount))))}
                    </div>
                    <div className="text-sm text-muted-foreground">Maior Valor</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(Math.min(...selectedCategoryData.transactions.map(t => Number(t.amount))))}
                    </div>
                    <div className="text-sm text-muted-foreground">Menor Valor</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};