/**
 * useDashboardData
 * ─────────────────────────────────────────────────────────────────────────────
 * Busca TODOS os dados do dashboard em uma única query coordenada via
 * Promise.all — 5 tabelas em paralelo, um único roundtrip de rede.
 *
 * Benefícios vs. 7 hooks separados:
 *  • Elimina waterfall de loading (cada hook esperava o anterior terminar o render)
 *  • staleTime 3 min: não re-busca ao trocar de aba ou navegar de volta
 *  • gcTime 10 min: mantém cache mesmo se o componente desmontar
 *  • recurringTransactions derivado das transactions (zero query extra)
 *  • Estatísticas calculadas aqui com useMemo — não re-calculam em cada render
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

const STALE_TIME = 3 * 60 * 1000;   // 3 min
const GC_TIME   = 10 * 60 * 1000;  // 10 min

export const DASHBOARD_QUERY_KEY = (userId: string) => ['dashboard-data', userId];

// ─── Tipos mínimos para o dashboard ──────────────────────────────────────────

export interface DashAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  credit_limit?: number | null;
  current_balance?: number | null;
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
  deadline?: string | null;
}

export interface DashCreditCard {
  id: string;
  name: string;
  credit_limit: number;
  current_balance: number;
}

// ─── Fetcher ─────────────────────────────────────────────────────────────────

async function fetchDashboard(userId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Primeiro dia do mês atual (ISO)
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

  const [
    accountsRes,
    transactionsRes,
    budgetsRes,
    goalsRes,
  ] = await Promise.all([
    // Todas as contas (regulares + cartões)
    supabase
      .from('accounts')
      .select('id, name, type, balance, credit_limit, current_balance')
      .eq('user_id', userId)
      .order('name'),

    // Transações dos últimos 90 dias (suficiente para chart + KPIs + recorrentes)
    supabase
      .from('transactions')
      .select(`
        id, description, amount, type, date,
        category_id, account_id,
        is_recurring, recurrence_frequency,
        category:categories(name)
      `)
      .eq('user_id', userId)
      .gte('date', (() => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d.toISOString().split('T')[0];
      })())
      .order('date', { ascending: false })
      .limit(500),

    // Orçamentos do mês atual
    supabase
      .from('budgets')
      .select('id, category_id, amount, spent, month, year')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year),

    // Metas ativas
    supabase
      .from('goals')
      .select('id, name, target_amount, current_amount, is_completed, deadline')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('created_at', { ascending: false }),
  ]);

  // Erros fatais — lança apenas se não for schema error
  const fatal = [accountsRes, transactionsRes, budgetsRes, goalsRes].find(
    r => r.error && !r.error.message?.includes('does not exist') && r.error.code !== '42P01'
  );
  if (fatal?.error) throw fatal.error;

  // Normaliza transações
  const transactions: DashTransaction[] = (transactionsRes.data ?? []).map((t: any) => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    type: t.type as DashTransaction['type'],
    date: t.date,
    category_id: t.category_id,
    account_id: t.account_id,
    category_name: t.category?.name ?? null,
    is_recurring: t.is_recurring ?? false,
    recurrence_frequency: t.recurrence_frequency ?? null,
  }));

  // Separa contas regulares e cartões de crédito
  const allAccounts: DashAccount[] = (accountsRes.data ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance ?? 0),
    credit_limit: a.credit_limit ? Number(a.credit_limit) : null,
    current_balance: a.current_balance != null ? Number(a.current_balance) : null,
    is_credit_card: a.type === 'credit_card',
  }));

  const regularAccounts = allAccounts.filter(a => !a.is_credit_card);
  const creditCards: DashCreditCard[] = allAccounts
    .filter(a => a.is_credit_card)
    .map(a => ({
      id: a.id,
      name: a.name,
      credit_limit: a.credit_limit ?? 0,
      current_balance: a.current_balance ?? Math.abs(a.balance),
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
    budgets: (budgetsRes.data ?? []).map((b: any) => ({
      id: b.id,
      category_id: b.category_id,
      amount: Number(b.amount),
      spent: Number(b.spent ?? 0),
      month: b.month,
      year: b.year,
    })) as DashBudget[],
    goals: (goalsRes.data ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      target_amount: Number(g.target_amount),
      current_amount: Number(g.current_amount ?? 0),
      is_completed: Boolean(g.is_completed),
      deadline: g.deadline ?? null,
    })) as DashGoal[],
    month,
    year,
    monthStart,
  };
}

// ─── Hook público ─────────────────────────────────────────────────────────────

export function useDashboardData() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: DASHBOARD_QUERY_KEY(user?.id ?? ''),
    queryFn: () => fetchDashboard(user!.id),
    enabled: !!user,
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
    retry: 2,
  });

  // ── KPIs calculados com useMemo — só recalculam quando transactions muda ──
  const stats = useMemo(() => {
    if (!query.data) return null;
    const { transactions, month, year } = query.data;

    const monthTx = transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const monthlyIncome   = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthlyExpenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const available       = monthlyIncome - monthlyExpenses;

    // Gráfico acumulado de gastos do mês (dia → acumulado)
    const dayMap = new Map<number, number>();
    monthTx
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const day = new Date(t.date + 'T00:00:00').getDate();
        dayMap.set(day, (dayMap.get(day) ?? 0) + t.amount);
      });
    const today = new Date().getDate();
    let acc = 0;
    const spendingChartData = Array.from({ length: today }, (_, i) => {
      acc += dayMap.get(i + 1) ?? 0;
      return { day: i + 1, amount: acc };
    });

    // Despesas por categoria
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
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
