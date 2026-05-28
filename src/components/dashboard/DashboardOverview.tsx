import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUp, ArrowDown, Wallet, TrendingUp, CreditCard,
  Plus, Target, ChevronRight, AlertTriangle, ArrowLeftRight,
} from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useGoals } from '@/hooks/useGoals';
import { useBudgets } from '@/hooks/useBudgets';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAuth } from '@/components/auth/AuthProvider';
import { AddTransactionForm } from '@/components/transactions/AddTransactionForm';
import { EditTransactionForm } from '@/components/transactions/EditTransactionForm';
import { TransferForm } from '@/components/accounts/TransferForm';
import { AgendaWidget } from './AgendaWidget';
import { DashboardSkeleton } from '@/components/ui/skeleton-loaders';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { formatCurrency, formatDateBR } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardOverviewProps {
  onNavigate?: (tab: string) => void;
}

// Cores do design system — respeitam dark mode via variáveis CSS
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--chart-income))',
  'hsl(var(--chart-expense))',
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { regularAccounts, loading: accountsLoading } = useAccounts();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { creditCards, loading: cardsLoading } = useCreditCards();
  const { goals, isLoading: goalsLoading } = useGoals();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const { recurringTransactions } = useRecurringTransactions();
  const { user } = useAuth();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const totalBalance = regularAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const {
    monthlyIncome,
    monthlyExpenses,
    available,
    spendingChartData,
    expensesByCategory,
  } = useDashboardStats(transactions);

  // % de receita já gasta (não % do calendário)
  const incomeUsedPct = monthlyIncome > 0
    ? Math.min((monthlyExpenses / monthlyIncome) * 100, 100)
    : 0;

  const recurringWeekAmount = useMemo(() =>
    (recurringTransactions || [])
      .filter((r: any) => r.type === 'expense')
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
    [recurringTransactions]
  );

  const monthBudgets = budgets.filter(b => b.month === currentMonth + 1 && b.year === currentYear);
  const totalBudgetUsage = monthBudgets.length > 0
    ? monthBudgets.reduce((s, b) => s + (Number(b.spent) / Number(b.amount)) * 100, 0) / monthBudgets.length
    : 0;

  const activeGoals = goals.filter(g => !g.is_completed);
  const totalGoalProgress = activeGoals.length > 0
    ? activeGoals.reduce((s, g) => s + (Number(g.current_amount) / Number(g.target_amount)) * 100, 0) / activeGoals.length
    : 0;

  // Nome amigável do usuário (parte antes do @)
  const userName = user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'você';

  const todayLabel = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  // Capitaliza primeiro caractere
  const todayFormatted = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  if (showAddForm) return <AddTransactionForm onClose={() => setShowAddForm(false)} />;
  if (editingTransaction) return <EditTransactionForm transaction={editingTransaction} onClose={() => setEditingTransaction(null)} />;

  if (accountsLoading || transactionsLoading || cardsLoading || goalsLoading || budgetsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="label-eyebrow">{todayFormatted}</p>
        <h1 className="text-3xl font-semibold mt-1 tracking-tight">
          Olá, <span className="text-primary capitalize">{userName}</span> 👋
        </h1>
      </div>

      {/* Alert Banner */}
      {recurringWeekAmount > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-warning/10 border border-warning/30 px-4 py-3">
          <AlertTriangle size={18} className="text-warning flex-shrink-0" />
          <p className="text-sm text-foreground/80">
            <span className="figure font-semibold text-foreground">{formatCurrency(recurringWeekAmount)}</span> em recorrentes programados.
          </p>
        </div>
      )}

      {/* Balance Hero + Disponível */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card principal */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-primary text-primary-foreground p-7 shadow-premium">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet size={14} className="opacity-60" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">Patrimônio Total</span>
              </div>
              <TransferForm
                trigger={
                  <Button size="sm" variant="secondary" className="h-7 px-3 text-xs bg-white/10 hover:bg-white/20 text-primary-foreground border-0">
                    <ArrowLeftRight size={12} className="mr-1" /> Transferir
                  </Button>
                }
              />
            </div>
            <p className="figure-hero text-5xl">{formatCurrency(totalBalance)}</p>
            <div className="h-px w-full bg-white/10 my-6" />
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-60 font-medium">
                  <ArrowUp size={11} /> Receitas do mês
                </div>
                <p className="figure text-lg mt-1.5">{formatCurrency(monthlyIncome)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-60 font-medium">
                  <ArrowDown size={11} /> Despesas do mês
                </div>
                <p className="figure text-lg mt-1.5">{formatCurrency(monthlyExpenses)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card disponível */}
        <div className="card-elevated p-6 flex flex-col">
          <p className="label-eyebrow">Disponível no mês</p>
          <p className={`figure-hero text-3xl mt-2 ${available >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(available)}
          </p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-4">
            <div
              className={`h-1.5 rounded-full transition-all ${
                incomeUsedPct >= 90 ? 'bg-destructive' : incomeUsedPct >= 70 ? 'bg-warning' : 'bg-primary'
              }`}
              style={{ width: `${incomeUsedPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {incomeUsedPct.toFixed(0)}% da receita gasta
          </p>
          <div className="flex gap-2 mt-auto pt-5">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowAddForm(true)}>
              <Plus size={14} className="mr-1" /> Receita
            </Button>
            <Button size="sm" className="flex-1" onClick={() => setShowAddForm(true)}>
              <Plus size={14} className="mr-1" /> Despesa
            </Button>
          </div>
        </div>
      </div>

      {/* Cartões de Crédito */}
      {creditCards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cartões de Crédito</p>
            <Button variant="ghost" size="sm" className="text-xs text-primary h-auto py-1" onClick={() => onNavigate?.('cards')}>
              Ver todos <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {creditCards.slice(0, 3).map((card) => (
              <div
                key={card.id}
                className="card-elevated p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onNavigate?.('cards')}
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard size={18} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{card.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Limite: {formatCurrency(Number(card.credit_limit))}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-destructive">
                    {formatCurrency(Number(card.current_balance ?? 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">fatura</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agenda Widget */}
      <AgendaWidget onNavigate={onNavigate} />

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
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  fill="url(#spendGradient)"
                  strokeWidth={2}
                  name="Acumulado"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Últimas Transações + Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Últimas Transações</CardTitle>
              <Button
                variant="ghost" size="sm"
                className="text-xs text-primary h-auto py-1"
                onClick={() => onNavigate?.('transactions')}
              >
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
                    t.type === 'income'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-chart-income'
                      : 'bg-red-50 dark:bg-red-950/40 text-chart-expense'
                  }`}>
                    {t.type === 'income' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatDateBR(t.date)}</span>
                      {(t as any).category_name && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {(t as any).category_name}
                        </Badge>
                      )}
                    </div>
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
                      cx="50%" cy="50%"
                      innerRadius={35} outerRadius={65}
                      paddingAngle={2} strokeWidth={0}
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
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
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

      {/* Orçamentos + Metas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate?.('budgets-list')}
        >
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
              <div
                className={`h-1.5 rounded-full transition-all ${
                  totalBudgetUsage >= 90 ? 'bg-destructive' : totalBudgetUsage >= 70 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(totalBudgetUsage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totalBudgetUsage.toFixed(0)}% utilizado</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate?.('goals')}
        >
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
              <div
                className="h-1.5 rounded-full bg-chart-2 transition-all"
                style={{ width: `${Math.min(totalGoalProgress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totalGoalProgress.toFixed(0)}% concluído</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
