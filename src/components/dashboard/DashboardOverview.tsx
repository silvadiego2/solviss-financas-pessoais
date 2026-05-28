import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUp, ArrowDown, Wallet, CreditCard,
  Target, ChevronRight, AlertTriangle, ArrowLeftRight,
  TrendingUp, TrendingDown, Eye, EyeOff,
} from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/components/auth/AuthProvider';
import { TransferForm } from '@/components/accounts/TransferForm';
import { TransactionSheet } from '@/components/transactions/TransactionSheet';
import { AgendaWidget } from './AgendaWidget';
import { DashboardSkeleton } from '@/components/ui/skeleton-loaders';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { formatCurrency, formatDateBR } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DashboardOverviewProps {
  onNavigate?: (tab: string) => void;
}

type EditSheetState =
  | { mode: 'edit'; transaction: any }
  | { mode: 'closed' };

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const {
    regularAccounts = [],
    creditCards = [],
    transactions = [],
    recurringTransactions = [],
    budgets = [],
    goals = [],
    stats,
    isLoading,
    month,
    year,
  } = useDashboardData();

  const { user } = useAuth();
  const [hideBalance, setHideBalance] = useState(false);
  const [editSheet, setEditSheet]     = useState<EditSheetState>({ mode: 'closed' });

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalBalance = useMemo(
    () => regularAccounts.reduce((s, a) => s + a.balance, 0),
    [regularAccounts]
  );

  const {
    monthlyIncome   = 0,
    monthlyExpenses = 0,
    available       = 0,
    spendingChartData = [],
    expensesByCategory = [],
  } = stats ?? {};

  const incomeUsedPct = monthlyIncome > 0
    ? Math.min((monthlyExpenses / monthlyIncome) * 100, 100)
    : 0;

  const recurringRisk = useMemo(
    () => recurringTransactions.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
    [recurringTransactions]
  );

  const currentMonth = month ?? new Date().getMonth() + 1;
  const currentYear  = year  ?? new Date().getFullYear();

  const monthBudgets = useMemo(
    () => budgets.filter(b => b.month === currentMonth && b.year === currentYear),
    [budgets, currentMonth, currentYear]
  );
  const totalBudgetUsage = monthBudgets.length > 0
    ? monthBudgets.reduce((s, b) => s + (b.spent / b.amount) * 100, 0) / monthBudgets.length
    : 0;

  const activeGoals = useMemo(() => goals.filter(g => !g.is_completed), [goals]);
  const totalGoalProgress = activeGoals.length > 0
    ? activeGoals.reduce((s, g) => s + (g.current_amount / g.target_amount) * 100, 0) / activeGoals.length
    : 0;

  const userName      = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'você';
  const todayRaw      = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const todayFormatted = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  // ── Combined chart (income + expense por dia) ───────────────────────────
  const chartData = useMemo(() => {
    // spendingChartData já tem {day, amount}; enriquecemos com income se disponível
    return spendingChartData;
  }, [spendingChartData]);

  if (isLoading) return <DashboardSkeleton />;

  const mask = (v: number) => hideBalance ? '••••••' : formatCurrency(v);

  return (
    <>
      {/* Sheet de edição de transação (dashboard) */}
      <TransactionSheet
        state={editSheet}
        onClose={() => setEditSheet({ mode: 'closed' })}
      />

      <div className="space-y-8 pb-6">

        {/* ── 1. HEADER ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <p className="label-eyebrow">{todayFormatted}</p>
            <h1 className="text-3xl font-semibold mt-1 tracking-tight">
              Olá, <span className="text-primary capitalize">{userName}</span> 👋
            </h1>
          </div>
          <TransferForm
            trigger={
              <Button variant="outline" size="sm" className="gap-1.5 mt-1">
                <ArrowLeftRight size={14} /> Transferir
              </Button>
            }
          />
        </div>

        {/* Alert recorrentes */}
        {recurringRisk > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3">
            <AlertTriangle size={16} className="text-warning flex-shrink-0" />
            <p className="text-sm text-foreground/80">
              <span className="font-semibold text-foreground">{formatCurrency(recurringRisk)}</span> em recorrentes programados este mês.
            </p>
          </div>
        )}

        {/* ── 2. SALDO TOTAL — heroi tipográfico ─────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground px-7 py-8 shadow-lg">
          {/* grade sutil */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />
          {/* brilho */}
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 opacity-70">
                <Wallet size={13} />
                <span className="text-[11px] font-semibold uppercase tracking-widest">Patrimônio Total</span>
              </div>
              <button
                onClick={() => setHideBalance(b => !b)}
                className="opacity-60 hover:opacity-100 transition-opacity p-1"
                aria-label={hideBalance ? 'Mostrar saldo' : 'Ocultar saldo'}
              >
                {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Número grande — foco visual principal */}
            <p className="figure-hero text-5xl sm:text-6xl font-bold tracking-tight leading-none mt-1">
              {mask(totalBalance)}
            </p>

            <div className="h-px w-full bg-white/10 my-5" />

            {/* Receitas / Despesas / Disponível inline */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider opacity-60 font-medium mb-1">
                  <ArrowUp size={10} /> Receitas
                </div>
                <p className="figure text-base font-semibold">{mask(monthlyIncome)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider opacity-60 font-medium mb-1">
                  <ArrowDown size={10} /> Despesas
                </div>
                <p className="figure text-base font-semibold">{mask(monthlyExpenses)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider opacity-60 font-medium mb-1">
                  {available >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />} Disponível
                </div>
                <p className={cn('figure text-base font-semibold', available < 0 && 'text-red-300')}>
                  {mask(available)}
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="mt-5">
              <div className="w-full bg-white/10 rounded-full h-1">
                <div
                  className={cn(
                    'h-1 rounded-full transition-all',
                    incomeUsedPct >= 90 ? 'bg-red-400' : incomeUsedPct >= 70 ? 'bg-yellow-300' : 'bg-white/70'
                  )}
                  style={{ width: `${incomeUsedPct}%` }}
                />
              </div>
              <p className="text-[11px] opacity-50 mt-1.5">{incomeUsedPct.toFixed(0)}% da receita utilizada</p>
            </div>
          </div>
        </div>

        {/* ── 3. KPIs rápidos ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Orçamentos */}
          <button
            onClick={() => onNavigate?.('budgets-list')}
            className="card-elevated p-4 text-left hover:shadow-md transition-shadow rounded-2xl"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Target size={16} className="text-primary" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Orçamentos</p>
            <div className="w-full bg-muted rounded-full h-1 mt-2">
              <div
                className={cn('h-1 rounded-full', totalBudgetUsage >= 90 ? 'bg-destructive' : 'bg-primary')}
                style={{ width: `${Math.min(totalBudgetUsage, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{totalBudgetUsage.toFixed(0)}%</p>
          </button>

          {/* Metas */}
          <button
            onClick={() => onNavigate?.('goals')}
            className="card-elevated p-4 text-left hover:shadow-md transition-shadow rounded-2xl"
          >
            <div className="h-8 w-8 rounded-lg bg-chart-2/10 flex items-center justify-center mb-3">
              <TrendingUp size={16} className="text-chart-2" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Metas</p>
            <div className="w-full bg-muted rounded-full h-1 mt-2">
              <div
                className="h-1 rounded-full bg-chart-2"
                style={{ width: `${Math.min(totalGoalProgress, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{activeGoals.length} ativas</p>
          </button>

          {/* Cartões */}
          <button
            onClick={() => onNavigate?.('cards')}
            className="card-elevated p-4 text-left hover:shadow-md transition-shadow rounded-2xl"
          >
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center mb-3">
              <CreditCard size={16} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Cartões</p>
            <p className="text-sm font-semibold mt-2">{creditCards.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">ativos</p>
          </button>
        </div>

        {/* ── 4. GRÁFICO DO MÊS ────────────────────────────────────────────── */}
        <div className="card-elevated rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Gastos do Mês</p>
              <p className="text-xs text-muted-foreground mt-0.5">Evolução acumulada</p>
            </div>
            <Button
              variant="ghost" size="sm"
              className="text-xs text-primary h-auto py-1"
              onClick={() => onNavigate?.('reports')}
            >
              Relatórios <ChevronRight size={13} className="ml-1" />
            </Button>
          </div>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Sem movimentações este mês
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
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
                  fill="url(#dashGrad)"
                  strokeWidth={2}
                  dot={false}
                  name="Acumulado"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── 5. TRANSAÇÕES RECENTES ───────────────────────────────────────── */}
        <div className="card-elevated rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <p className="text-sm font-semibold">Transações Recentes</p>
            <Button
              variant="ghost" size="sm"
              className="text-xs text-primary h-auto py-1"
              onClick={() => onNavigate?.('transactions')}
            >
              Ver todas <ChevronRight size={13} className="ml-1" />
            </Button>
          </div>

          <div className="divide-y divide-border">
            {transactions.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                Nenhuma transação recente
              </div>
            ) : (
              transactions.slice(0, 7).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setEditSheet({ mode: 'edit', transaction: t })}
                  className="flex items-center gap-3 w-full text-left px-5 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    t.type === 'income'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-chart-income'
                      : 'bg-red-50 dark:bg-red-950/40 text-chart-expense'
                  )}>
                    {t.type === 'income' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatDateBR(t.date)}</span>
                      {t.category_name && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {t.category_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    'text-sm font-semibold flex-shrink-0 tabular-nums',
                    t.type === 'income' ? 'text-chart-income' : 'text-foreground'
                  )}>
                    {t.type === 'income' ? '+' : '-'}{mask(t.amount)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── 6. DESPESAS POR CATEGORIA ────────────────────────────────────── */}
        {expensesByCategory.length > 0 && (
          <div className="card-elevated rounded-2xl p-5">
            <p className="text-sm font-semibold mb-4">Despesas por Categoria</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="40%" height={140}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={32} outerRadius={58}
                    paddingAngle={2} strokeWidth={0}
                  >
                    {expensesByCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {expensesByCategory.slice(0, 5).map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate flex-1 text-muted-foreground">{cat.name}</span>
                    <span className="font-medium tabular-nums">{formatCurrency(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 7. CARTÕES DE CRÉDITO ───────────────────────────────────────── */}
        {creditCards.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cartões de Crédito</p>
              <Button variant="ghost" size="sm" className="text-xs text-primary h-auto py-1" onClick={() => onNavigate?.('cards')}>
                Ver todos <ChevronRight size={13} className="ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {creditCards.slice(0, 2).map((card) => (
                <button
                  key={card.id}
                  onClick={() => onNavigate?.('cards')}
                  className="card-elevated p-4 flex items-center gap-3 text-left hover:shadow-md transition-shadow rounded-2xl"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard size={17} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{card.name}</p>
                    <p className="text-xs text-muted-foreground">Limite: {formatCurrency(card.credit_limit)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-destructive">{formatCurrency(card.current_balance)}</p>
                    <p className="text-xs text-muted-foreground">fatura</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 8. AGENDA ─────────────────────────────────────────────────────────────── */}
        <AgendaWidget onNavigate={onNavigate} />

      </div>
    </>
  );
};
