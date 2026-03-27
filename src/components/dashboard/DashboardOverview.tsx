import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Wallet, TrendingUp, CreditCard, Plus, Edit, Target, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useGoals } from '@/hooks/useGoals';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { AddTransactionForm } from '@/components/transactions/AddTransactionForm';
import { EditTransactionForm } from '@/components/transactions/EditTransactionForm';
import { DashboardSkeleton } from '@/components/ui/skeleton-loaders';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DashboardOverviewProps {
  onNavigate?: (tab: string) => void;
}

const CHART_COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(30, 95%, 52%)',
  'hsl(174, 62%, 47%)', 'hsl(340, 75%, 55%)', 'hsl(152, 60%, 42%)',
  'hsl(45, 93%, 47%)', 'hsl(199, 89%, 48%)',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { regularAccounts, loading: accountsLoading } = useAccounts();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { creditCards, loading: cardsLoading } = useCreditCards();
  const { goals, isLoading: goalsLoading } = useGoals();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const { categories } = useCategories();
  const { recurringTransactions } = useRecurringTransactions();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState<'income' | 'expense'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const totalBalance = regularAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const monthlyExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const available = monthlyIncome - monthlyExpenses;
  const budgetUsed = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;

  // Recurring this week
  const recurringWeekAmount = useMemo(() => {
    return (recurringTransactions || [])
      .filter((r: any) => r.type === 'expense')
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  }, [recurringTransactions]);

  // Spending chart data (cumulative expenses over days this month)
  const spendingChartData = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date().getDate();
    let cumulative = 0;
    const data: { day: number; amount: number }[] = [];
    for (let d = 1; d <= Math.min(today, daysInMonth); d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayExpenses = monthlyTransactions
        .filter(t => t.type === 'expense' && t.date === dateStr)
        .reduce((s, t) => s + Number(t.amount), 0);
      cumulative += dayExpenses;
      data.push({ day: d, amount: cumulative });
    }
    return data;
  }, [monthlyTransactions, currentMonth, currentYear]);

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();
    monthlyTransactions.filter(t => t.type === 'expense').forEach(t => {
      const catName = (t as any).category?.name || 'Sem Categoria';
      const existing = map.get(catName);
      if (existing) existing.value += Number(t.amount);
      else map.set(catName, { name: catName, value: Number(t.amount) });
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [monthlyTransactions]);

  // Budget info
  const monthBudgets = budgets.filter(b => b.month === currentMonth + 1 && b.year === currentYear);
  const totalBudgetUsage = monthBudgets.length > 0
    ? monthBudgets.reduce((s, b) => s + (Number(b.spent) / Number(b.amount)) * 100, 0) / monthBudgets.length
    : 0;

  const activeGoals = goals.filter(g => !g.is_completed);
  const totalGoalProgress = activeGoals.length > 0
    ? activeGoals.reduce((s, g) => s + (Number(g.current_amount) / Number(g.target_amount)) * 100, 0) / activeGoals.length
    : 0;

  if (showAddForm) return <AddTransactionForm onClose={() => setShowAddForm(false)} />;
  if (editingTransaction) return <EditTransactionForm transaction={editingTransaction} onClose={() => setEditingTransaction(null)} />;

  if (accountsLoading || transactionsLoading || cardsLoading || goalsLoading || budgetsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
        <h1 className="text-2xl font-bold mt-1">Visão Geral</h1>
      </div>

      {/* Alert Banner */}
      {recurringWeekAmount > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {formatCurrency(recurringWeekAmount)} em recorrentes programados.
          </p>
        </div>
      )}

      {/* Budget Card + Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Budget Card */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Orçamento Disponível</p>
            <p className={`text-2xl font-bold mt-1 ${available >= 0 ? 'text-chart-income' : 'text-destructive'}`}>
              {formatCurrency(available)}
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-3">
              <div
                className={`h-2 rounded-full transition-all ${budgetUsed >= 90 ? 'bg-destructive' : budgetUsed >= 70 ? 'bg-amber-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{budgetUsed.toFixed(0)}% utilizado do mês</p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" className="flex-1 text-chart-income border-chart-income/30" onClick={() => { setAddType('income'); setShowAddForm(true); }}>
                <Plus size={14} className="mr-1" /> Receita
              </Button>
              <Button size="sm" className="flex-1" onClick={() => { setAddType('expense'); setShowAddForm(true); }}>
                <Plus size={14} className="mr-1" /> Despesa
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="opacity-80" />
              <span className="text-xs font-medium opacity-80">Saldo Total</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <div className="flex items-center gap-1 text-xs opacity-80">
                  <ArrowUp size={12} /> Receitas
                </div>
                <p className="text-sm font-semibold">{formatCurrency(monthlyIncome)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs opacity-80">
                  <ArrowDown size={12} /> Despesas
                </div>
                <p className="text-sm font-semibold">{formatCurrency(monthlyExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Gastos Acumulados do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {spendingChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados este mês</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={spendingChartData}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#spendGradient)" strokeWidth={2} name="Acumulado" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions + Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Últimas Transações</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary h-auto py-1" onClick={() => onNavigate?.('transactions')}>
                Ver todas <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {transactions.slice(0, 6).map((t) => (
              <button
                key={t.id}
                onClick={() => setEditingTransaction(t)}
                className="flex items-center justify-between w-full text-left rounded-lg p-2.5 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    t.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-chart-income' : 'bg-red-50 dark:bg-red-950/40 text-chart-expense'
                  }`}>
                    {t.type === 'income' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ml-2 ${
                  t.type === 'income' ? 'text-chart-income' : 'text-chart-expense'
                }`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                </span>
              </button>
            ))}
            {transactions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transação encontrada</p>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem despesas este mês</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="45%" height={160}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {expensesByCategory.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 overflow-hidden">
                  {expensesByCategory.slice(0, 5).map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="truncate flex-1 text-muted-foreground">{cat.name}</span>
                      <span className="font-medium">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget + Goals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate?.('budgets')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Orçamentos</p>
                <p className="text-xs text-muted-foreground">{monthBudgets.length} categorias</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${totalBudgetUsage >= 90 ? 'bg-destructive' : totalBudgetUsage >= 70 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(totalBudgetUsage, 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totalBudgetUsage.toFixed(0)}% utilizado</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate?.('goals')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <TrendingUp size={18} className="text-chart-2" />
              </div>
              <div>
                <p className="text-sm font-medium">Metas</p>
                <p className="text-xs text-muted-foreground">{activeGoals.length} ativas</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-chart-2 transition-all" style={{ width: `${Math.min(totalGoalProgress, 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totalGoalProgress.toFixed(0)}% concluído</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
