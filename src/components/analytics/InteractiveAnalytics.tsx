import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Tooltip, LineChart, Line, ScatterChart, Scatter,
  CartesianGrid, Cell,
} from 'recharts';
import {
  Filter, Calendar, ArrowRight,
  MousePointer, Zap, Eye, BarChart3,
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
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

export const InteractiveAnalytics: React.FC<InteractiveAnalyticsProps> = ({ onBack }) => {
  const { transactions } = useTransactions();
  const { accounts } = useAccounts();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('3');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [viewType, setViewType] = useState<'heatmap' | 'pattern' | 'correlation'>('heatmap');

  // ── Filtro base ────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    const months = parseInt(selectedTimeframe);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      const withinTime = d >= cutoff;
      const matchAcc = selectedAccount === 'all' || t.account_id === selectedAccount;
      return withinTime && matchAcc;
    });
  }, [transactions, selectedTimeframe, selectedAccount]);

  // ── Drill-down por categoria ───────────────────────────────────
  const categoryDrillDown = useMemo(() => {
    const map = new Map<string, DrillDownData>();
    filteredTransactions
      .filter(t => t.type === 'expense' && t.category)
      .forEach(t => {
        const name = t.category!.name;
        const existing = map.get(name) ?? { category: name, transactions: [], total: 0 };
        existing.transactions.push(t);
        existing.total += Number(t.amount);
        map.set(name, existing);
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  // ── Heatmap: gastos por dia da semana ─────────────────────────
  // (transações do Supabase têm apenas date YYYY-MM-DD, sem hora)
  const heatmapData = useMemo(() => {
    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};
    DAY_NAMES.forEach(d => { totals[d] = 0; counts[d] = 0; });

    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const day = DAY_NAMES[new Date(t.date + 'T00:00:00').getDay()];
        totals[day] += Number(t.amount);
        counts[day] += 1;
      });

    return DAY_NAMES.map(day => ({
      day,
      total: totals[day],
      count: counts[day],
      avg: counts[day] > 0 ? totals[day] / counts[day] : 0,
    }));
  }, [filteredTransactions]);

  const maxHeatmap = useMemo(() => Math.max(...heatmapData.map(d => d.total), 1), [heatmapData]);

  // ── Padrões mensais ────────────────────────────────────────────
  const spendingPatterns = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expenses: number; transactions: number }>();
    filteredTransactions.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const entry = map.get(key) ?? { month: label, income: 0, expenses: 0, transactions: 0 };
      if (t.type === 'income') entry.income += Number(t.amount);
      else entry.expenses += Number(t.amount);
      entry.transactions++;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        ...v,
        savingsRate: v.income > 0 ? ((v.income - v.expenses) / v.income) * 100 : 0,
      }));
  }, [filteredTransactions]);

  // ── Correlação: top categorias x valor médio ──────────────────
  const correlationData = useMemo(() => {
    return categoryDrillDown.slice(0, 10).map(c => ({
      name: c.category.length > 12 ? c.category.slice(0, 12) + '…' : c.category,
      total: c.total,
      avg: c.total / Math.max(c.transactions.length, 1),
      count: c.transactions.length,
    }));
  }, [categoryDrillDown]);

  // ── Render visualização ────────────────────────────────────────
  const renderVisualization = () => {
    if (filteredTransactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
          <BarChart3 size={40} className="opacity-30" />
          <p className="text-sm">Nenhuma transação no período selecionado</p>
        </div>
      );
    }

    switch (viewType) {
      case 'heatmap':
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Total de gastos por dia da semana no período
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={heatmapData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={52} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'total' ? formatCurrency(value) : value,
                    name === 'total' ? 'Total gasto' : 'Qtd transações',
                  ]}
                  labelFormatter={label => `Dia: ${label}`}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {heatmapData.map((entry, index) => (
                    <Cell
                      key={entry.day}
                      fill={`hsl(var(--primary) / ${0.3 + 0.7 * (entry.total / maxHeatmap)})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-7 gap-1 mt-2">
              {heatmapData.map(d => (
                <div key={d.day} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{d.count} transações</p>
                  <p className="text-[10px] font-medium">{d.avg > 0 ? formatCurrency(d.avg) : '—'}</p>
                  <p className="text-[9px] text-muted-foreground">média</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'pattern':
        if (spendingPatterns.length === 0) {
          return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sem dados suficientes</div>;
        }
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Receitas vs Despesas mensais e taxa de poupança
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={spendingPatterns} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: number, name: string) => [
                  formatCurrency(v),
                  name === 'income' ? 'Receitas' : 'Despesas',
                ]} />
                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="income" />
                <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'correlation':
        if (correlationData.length === 0) {
          return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sem categorias suficientes</div>;
        }
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Total gasto vs valor médio por transação — por categoria
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="total"
                  name="Total"
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Total gasto', position: 'insideBottom', offset: -2, fontSize: 11 }}
                />
                <YAxis
                  dataKey="avg"
                  name="Média"
                  tickFormatter={v => `R$${v.toFixed(0)}`}
                  tick={{ fontSize: 11 }}
                  width={60}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-2 text-xs shadow">
                        <p className="font-semibold">{d.name}</p>
                        <p>Total: {formatCurrency(d.total)}</p>
                        <p>Média: {formatCurrency(d.avg)}</p>
                        <p>Transações: {d.count}</p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={correlationData}
                  fill="hsl(var(--primary))"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );

      default:
        return null;
    }
  };

  const selectedCategoryData = selectedCategory
    ? categoryDrillDown.find(c => c.category === selectedCategory)
    : null;

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
            <span className="text-sm text-muted-foreground">Clique nas categorias para explorar</span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
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

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-muted-foreground" />
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Eye size={16} className="text-muted-foreground" />
              <Select value={viewType} onValueChange={(v: 'heatmap' | 'pattern' | 'correlation') => setViewType(v)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heatmap">Gastos por dia</SelectItem>
                  <SelectItem value="pattern">Padrões mensais</SelectItem>
                  <SelectItem value="correlation">Correlação categorias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categorias clicáveis */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 size={18} />
              Categorias
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {categoryDrillDown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem despesas no período</p>
            ) : (
              categoryDrillDown.map((cat, index) => (
                <div
                  key={cat.category}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                    selectedCategory === cat.category
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/40'
                  }`}
                  onClick={() => setSelectedCategory(selectedCategory === cat.category ? null : cat.category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-sm font-medium truncate max-w-[120px]">{cat.category}</span>
                    </div>
                    <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-sm font-bold">{formatCurrency(cat.total)}</span>
                    <Badge variant="outline" className="text-[10px] h-5">{cat.transactions.length} transações</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Visualização principal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap size={18} />
              Visualização Interativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderVisualization()}
          </CardContent>
        </Card>
      </div>

      {/* Drill-down */}
      {selectedCategoryData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhes: {selectedCategoryData.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="transactions">
              <TabsList>
                <TabsTrigger value="transactions">Transações</TabsTrigger>
                <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
                <TabsTrigger value="stats">Estatísticas</TabsTrigger>
              </TabsList>

              <TabsContent value="transactions" className="mt-4">
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {selectedCategoryData.transactions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 15)
                    .map(t => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <p className="text-sm font-bold">{formatCurrency(Number(t.amount))}</p>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={selectedCategoryData.transactions
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .reduce((acc: any[], t) => {
                        const label = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                        const existing = acc.find(x => x.month === label);
                        if (existing) existing.total += Number(t.amount);
                        else acc.push({ month: label, total: Number(t.amount) });
                        return acc;
                      }, [])}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={52} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Gasto']} />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="stats" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Transações', value: selectedCategoryData.transactions.length.toString() },
                    { label: 'Valor Médio', value: formatCurrency(selectedCategoryData.total / selectedCategoryData.transactions.length) },
                    { label: 'Maior Valor', value: formatCurrency(Math.max(...selectedCategoryData.transactions.map(t => Number(t.amount)))) },
                    { label: 'Menor Valor', value: formatCurrency(Math.min(...selectedCategoryData.transactions.map(t => Number(t.amount)))) },
                  ].map(s => (
                    <div key={s.label} className="text-center p-3 rounded-lg bg-muted/40">
                      <p className="text-lg font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
