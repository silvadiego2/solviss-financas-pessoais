/**
 * useAgendaFinanceira
 * ─────────────────────────────────────────────────────────────────────────────
 * Agenda de contas a pagar / receber (janela: 30 dias passados + futuros).
 *
 * Migrado de useState/useEffect manual para React Query:
 *  • Sem memory leak no unmount (o useEffect não cancelava a promise)
 *  • Cache automático — não re-busca ao trocar de aba
 *  • invalidateQueries após mutações em vez de fetchItems() manual
 *    (elimina race condition quando o usuário clica rápido)
 *  • Stats derivados via useMemo — não recalculam a cada render
 *
 * Mapeamento de tabela:
 *  A agenda usa `transactions` como fonte única de verdade.
 *  income  → receivable (a receber)
 *  expense → payable    (a pagar)
 *  status: pending/overdue derivado de `status` + data de vencimento
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export type AgendaStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type AgendaType   = 'payable' | 'receivable';

export interface AgendaItem {
  id: string;
  user_id: string;
  type: AgendaType;
  description: string;
  amount: number;
  due_date: string;
  status: AgendaStatus;
  category_id?: string;
  account_id?: string;
  recurrent: boolean;
  recurrence_frequency?: 'monthly' | 'weekly' | 'yearly';
  notes?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAgendaItem {
  type: AgendaType;
  description: string;
  amount: number;
  due_date: string;
  category_id?: string;
  account_id?: string;
  recurrent?: boolean;
  recurrence_frequency?: 'monthly' | 'weekly' | 'yearly';
  notes?: string;
}

const QUERY_KEY = (userId: string) => ['agenda-financeira', userId];

function windowStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

async function fetchAgenda(userId: string): Promise<AgendaItem[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id, user_id, description, amount, type, date, status, ' +
      'category_id, account_id, is_recurring, recurrence_frequency, ' +
      'notes, paid_at, created_at, updated_at'
    )
    .eq('user_id', userId)
    .gte('date', windowStart())
    .order('date', { ascending: true })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((t: any) => {
    const tDate     = (t.date ?? '').split('T')[0];
    const rawStatus = t.status ?? 'pending';
    let resolvedStatus: AgendaStatus;

    if (rawStatus === 'completed' || rawStatus === 'paid') {
      resolvedStatus = 'paid';
    } else if (rawStatus === 'cancelled') {
      resolvedStatus = 'cancelled';
    } else if (tDate < today) {
      resolvedStatus = 'overdue';
    } else {
      resolvedStatus = 'pending';
    }

    return {
      id:                   t.id,
      user_id:              t.user_id,
      type:                 (t.type === 'income' ? 'receivable' : 'payable') as AgendaType,
      description:          t.description ?? '',
      amount:               Number(t.amount ?? 0),
      due_date:             tDate,
      status:               resolvedStatus,
      category_id:          t.category_id          ?? undefined,
      account_id:           t.account_id           ?? undefined,
      recurrent:            t.is_recurring ?? t.recurrent ?? false,
      recurrence_frequency: t.recurrence_frequency ?? undefined,
      notes:                t.notes   ?? undefined,
      paid_at:              t.paid_at ?? undefined,
      created_at:           t.created_at ?? '',
      updated_at:           t.updated_at ?? '',
    } satisfies AgendaItem;
  });
}

export const useAgendaFinanceira = () => {
  const { user }    = useAuth();
  const queryClient = useQueryClient();
  const queryKey    = QUERY_KEY(user?.id ?? '');

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn:   () => fetchAgenda(user!.id),
    enabled:   !!user,
    staleTime: 2 * 60 * 1000,
    gcTime:    5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('does not exist') || error?.message?.includes('column')) return false;
      return failureCount < 2;
    },
  });

  // ── createItem ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: CreateAgendaItem) => {
      if (!user) throw new Error('Usuário não autenticado');

      const payload: Record<string, any> = {
        user_id:     user.id,
        type:        data.type === 'receivable' ? 'income' : 'expense',
        description: data.description,
        amount:      data.amount,
        date:        data.due_date,
        category_id: data.category_id ?? null,
        account_id:  data.account_id  ?? null,
      };
      if (data.recurrent !== undefined)  payload.is_recurring         = data.recurrent;
      if (data.recurrence_frequency)     payload.recurrence_frequency = data.recurrence_frequency;
      if (data.notes)                    payload.notes                = data.notes;

      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lançamento adicionado à agenda!');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao criar lançamento'),
  });

  // ── markAsPaid ─────────────────────────────────────────────────────────────
  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) {
        if (error.message?.includes('column') || error.message?.includes('does not exist')) return;
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Lançamento marcado como pago!');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar lançamento'),
  });

  // ── cancelItem ─────────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) {
        if (error.message?.includes('column') || error.message?.includes('does not exist')) return;
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Lançamento cancelado');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao cancelar lançamento'),
  });

  // ── deleteItem ─────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lançamento removido');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao remover lançamento'),
  });

  // ── Stats via useMemo ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today  = new Date().toISOString().split('T')[0];
    const next7  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const active = (s: AgendaStatus) => s !== 'cancelled' && s !== 'paid';

    return {
      totalPayable:    items.filter(i => i.type === 'payable'    && active(i.status)).reduce((s, i) => s + i.amount, 0),
      totalReceivable: items.filter(i => i.type === 'receivable' && active(i.status)).reduce((s, i) => s + i.amount, 0),
      overdue:         items.filter(i => i.status === 'overdue').length,
      dueThisWeek:     items.filter(i => i.due_date >= today && i.due_date <= next7 && i.status === 'pending').length,
    };
  }, [items]);

  return {
    items,
    loading,
    stats,
    createItem:  (data: CreateAgendaItem) => createMutation.mutate(data),
    markAsPaid:  (id: string) => markAsPaidMutation.mutate(id),
    cancelItem:  (id: string) => cancelMutation.mutate(id),
    deleteItem:  (id: string) => deleteMutation.mutate(id),
    refetch:     () => queryClient.invalidateQueries({ queryKey }),
  };
};
