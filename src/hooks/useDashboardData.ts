/**
 * useDashboardData
 * ────────────────────────────────────────────────────────────────────────────
 * Busca TODOS os dados do dashboard em uma única query coordenada via
 * Promise.all — 4 tabelas em paralelo, um único roundtrip de rede.
 *
 * Schema real da tabela accounts (confirmado em types.ts):
 *   id, name, type, balance, credit_limit, is_active,
 *   bank_name, closing_day, due_day, user_id, created_at, updated_at
 *
 * NOTA: a coluna `current_balance` NÃO existe no banco —
 *   a fatura do cartão é representada pelo campo `balance` (negativo
 *   quando há dívida). Usar Math.abs(balance) como fatura.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

const STALE_TIME = 60 * 1000;       // 1 min — garante re-fetch após navegação
const GC_TIME   = 10 * 60 * 1000;  // 10 min
const TX_LIMIT  = 500;

export const DASHBOARD_QUERY_KEY = (userId: string) => ['dashboard-data', userId];

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DashAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  credit_limit?: number | null;
  is_credit_card?: boolean;
}

export interface DashTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  date: string;
  category_id?: string | null;
  account_id?: string;
  category_name?: string | null;
  is_recurring?: boolean;
  recurrence_frequency?: string | null;
}

export interface DashBudget {
  id: string;
  category_id: string;
  amount: number;
  spent: number;
  month: number;
  year: number;
}

export interface DashGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  is_completed: boolean;
  target_date?: string | null;  // nome correto no schema (era deadline antes)
}

export interface DashCreditCard {
  id: string;
  name: string;
  credit_limit: number;
  current_balance: number;  // derivado de Math.abs(balance) — não vem do banco
}

export interface ChartDayPoint {
  day: number;
  income: number;
  expense: number;
}

// ─── Fetcher ─────────────────────────────────────────────────────────────────

async function fetchDashboard(userId: string) {
  const now        = new Date();
  const month      = now.getMonth() + 1;
  const year       = now.getFullYear();
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

  const ninetyDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  })();

  const [
    accountsRes,
    transactionsRes,
    budgetsRes,
    goalsRes,
  ] = await Promise.all([
    // Seleciona apenas colunas que existem no schema (types.ts)
    // IMPORTANTE: current_balance NAO existe — nao incluir no SELECT
    supabase
      .from('accounts')
      .select('id, name, type, balance, credit_limit, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name'),

    // Transações dos últimos 90 dias — limite 500
    supabase
      .from('transactions')
      .select(`
        id, description, amount, type, date,
        category_id, account_id,
        is_recurring, recurrence_frequency,
        category:categories(name)
      `)
      .eq('user_id', userId)
      .gte('date', ninetyDaysAgo)
      .order('date', { ascending: false })
      .limit(TX_LIMIT),

    // Orçamentos do mês atual
    supabase
      .from('budgets')
      .select('id, category_id, amount, spent, month, year')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year),

    // Metas ativas — usa target_date (nome correto no schema)
    supabase
      .from('goals')
      .select('id, name, target_amount, current_amount, is_completed, target_date')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('created_at', { ascending: false }),
  ]);

  // Loga erros para diagnóstico sem engolir silenciosamente
  if (accountsRes.error)     console.error('[dashboard] accounts error:',     accountsRes.error);
  if (transactionsRes.error) console.error('[dashboard] transactions error:', transactionsRes.error);
  if (budgetsRes.error)      console.error('[dashboard] budgets error:',      budgetsRes.error);
  if (goalsRes.error)        console.error('[dashboard] goals error:',        goalsRes.error);

  // Erro fatal apenas em contas e transações (críticas para o dashboard)
  if (accountsRes.error)     throw accountsRes.error;
  if (transactionsRes.error) throw transactionsRes.error;

  // Flag de limite de transações
  const transactionCount        = (transactionsRes.data ?? []).length;
  const transactionLimitReached = transactionCount === TX_LIMIT;

  // Normaliza transações
  const transactions: DashTransaction[] = (transactionsRes.data ?? []).map((t: any) => ({
    id:                   t.id,
    description:          t.description,
    amount:               Number(t.amount),
    type:                 t.type as DashTransaction['type'],
    date:                 t.date,
    category_id:          t.category_id,
    account_id:           t.account_id,
    category_name:        t.category?.name ?? null,
    is_recurring:         t.is_recurring ?? false,
    recurrence_frequency: t.recurrence_frequency ?? null,
  }));

  // Normaliza contas — apenas colunas reais do schema
  const allAccounts: DashAccount[] = (accountsRes.data ?? []).map((a: any) => ({
    id:           a.id,
    name:         a.name,
    type:         a.type,
    balance:      Number(a.balance ?? 0),
    credit_limit: a.credit_limit != null ? Number(a.credit_limit) : null,
    is_credit_card: a.type === 'credit_card',
  }));

  const regularAccounts = allAccounts.filter(a => !a.is_credit_card);

  // Fatura = Math.abs(balance)
  // Cartões com saldo devedor têm balance negativo no banco
  // ex: balance = -850.00 → fatura = R$ 850,00
  const creditCards: DashCreditCard[] = allAccounts
    .filter(a => a.is_credit_card)
    .map(a => ({
      id:              a.id,
      name:            a.name,
      credit_limit:    a.credit_limit ?? 0,
      current_balance: Math.abs(a.balance),
    }));

  // Recorrentes derivados (zero query extra)
  const recurringTransactions = transactions.filter(
    t => t.is_recurring === true || (t.recurrence_frequency != null && t.recurrence_frequency !== '')
  );

  return {
    allAccounts,
    regularAccounts,
    creditCards,
    transactions,
    recurringTransactions,
    transactionCount,
    transactionLimitReached,
    budgets: (budgetsRes.data ?? []).map((b: any) => ({
      id:          b.id,
      category_id: b.category_id,
      amount:      Number(b.amount),
      spent:       Number(b.spent ?? 0),
      month:       b.month,
      year:        b.year,
    })) as DashBudget[],
    goals: (goalsRes.data ?? []).map((g: any) => ({
      id:             g.id,
      name:           g.name,
      target_amount:  Number(g.target_amount),
      current_amount: Number(g.current_amount ?? 0),
      is_completed:   Boolean(g.is_completed),
      target_date:    g.target_date ?? null,
    })) as DashGoal[],
    month,
    year,
    monthStart,
  };
}

// ─── Hook público ──────────────────────────────────────────────────────────────

export function useDashboardData() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: DASHBOARD_QUERY_KEY(user?.id ?? ''),
    queryFn:  () => fetchDashboard(user!.id),
    enabled:  !!user,
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
    retry: 1,
  });

  // KPIs — só recalculam quando query.data muda
  const stats = useMemo(() => {
    if (!query.data) return null;
    const { transactions, month, year } = query.data;

    const monthTx = transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const monthlyIncome   = monthTx.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0);
    const monthlyExpenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const available       = monthlyIncome - monthlyExpenses;

    const incomeMap  = new Map<number, number>();
    const expenseMap = new Map<number, number>();

    monthTx.forEach(t => {
      const day = new Date(t.date + 'T00:00:00').getDate();
      if (t.type === 'income') {
        incomeMap.set(day, (incomeMap.get(day) ?? 0) + t.amount);
      } else if (t.type === 'expense') {
        expenseMap.set(day, (expenseMap.get(day) ?? 0) + t.amount);
      }
    });

    const today = new Date().getDate();
    const spendingChartData: ChartDayPoint[] = Array.from({ length: today }, (_, i) => ({
      day:     i + 1,
      income:  incomeMap.get(i + 1)  ?? 0,
      expense: expenseMap.get(i + 1) ?? 0,
    }));

    const catMap = new Map<string, number>();
    monthTx
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const name = t.category_name ?? 'Sem categoria';
        catMap.set(name, (catMap.get(name) ?? 0) + t.amount);
      });
    const expensesByCategory = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    return { monthlyIncome, monthlyExpenses, available, spendingChartData, expensesByCategory };
  }, [query.data]);

  return {
    ...query.data,
    stats,
    isLoading:  query.isLoading,
    isFetching: query.isFetching,
    error:      query.error,
    refetch:    query.refetch,
  };
}
