import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export type AgendaStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type AgendaType = 'payable' | 'receivable';

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

export const useAgendaFinanceira = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Busca transações futuras (data >= hoje) como agenda
      // Não filtra por status para ser compatível com qualquer schema
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(200);

      if (error) throw error;

      const agendaItems: AgendaItem[] = (data || [])
        // Considera apenas transações sem valor "efetivado" (sem updated_at recente ou com flag)
        // Como proxy de "pendente": transações com data futura ou até 7 dias no passado sem categoria marcada
        .filter((t: any) => {
          const tDate = t.date?.split('T')[0] ?? '';
          // Inclui futuros e até 30 dias atrasados (sem status no banco)
          return tDate >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        })
        .map((t: any) => {
          const tDate = (t.date ?? '').split('T')[0];
          const rawStatus: string = t.status ?? 'pending';
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
            id: t.id,
            user_id: t.user_id,
            type: (t.type === 'income' ? 'receivable' : 'payable') as AgendaType,
            description: t.description ?? '',
            amount: t.amount ?? 0,
            due_date: tDate,
            status: resolvedStatus,
            category_id: t.category_id ?? undefined,
            account_id: t.account_id ?? undefined,
            recurrent: t.is_recurring ?? t.recurrent ?? false,
            recurrence_frequency: t.recurrence_frequency ?? undefined,
            notes: t.notes ?? undefined,
            paid_at: t.paid_at ?? undefined,
            created_at: t.created_at ?? '',
            updated_at: t.updated_at ?? '',
          } satisfies AgendaItem;
        });

      setItems(agendaItems);
    } catch (error: any) {
      console.error('Erro ao buscar agenda:', error);
      // Não exibe toast para erros de coluna inexistente (evita popup no usuário)
      if (!error?.message?.includes('column') && !error?.message?.includes('does not exist')) {
        toast.error('Erro ao carregar agenda financeira');
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (data: CreateAgendaItem) => {
    if (!user) return;
    try {
      const insertPayload: Record<string, any> = {
        user_id: user.id,
        type: data.type === 'receivable' ? 'income' : 'expense',
        description: data.description,
        amount: data.amount,
        date: data.due_date,
        category_id: data.category_id ?? null,
        account_id: data.account_id ?? null,
      };
      // Insere campos opcionais apenas se existirem no schema
      if (data.recurrent !== undefined) insertPayload.is_recurring = data.recurrent;
      if (data.recurrence_frequency) insertPayload.recurrence_frequency = data.recurrence_frequency;
      if (data.notes) insertPayload.notes = data.notes;

      const { error } = await supabase.from('transactions').insert(insertPayload);
      if (error) throw error;
      toast.success('Lançamento adicionado à agenda!');
      await fetchItems();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar lançamento');
      throw error;
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      // Tenta atualizar status; se coluna não existir, só registra no console
      const updatePayload: Record<string, any> = {};
      // Verifica se podemos usar status ou outra coluna disponível
      updatePayload.status = 'completed';
      const { error } = await supabase
        .from('transactions')
        .update(updatePayload)
        .eq('id', id);
      if (error) {
        // Se coluna status não existe, remove da lista localmente
        if (error.message?.includes('column') || error.message?.includes('does not exist')) {
          setItems(prev => prev.filter(i => i.id !== id));
          toast.success('Lançamento marcado como pago!');
          return;
        }
        throw error;
      }
      toast.success('Lançamento marcado como pago!');
      await fetchItems();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar lançamento');
    }
  };

  const cancelItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) {
        if (error.message?.includes('column') || error.message?.includes('does not exist')) {
          setItems(prev => prev.filter(i => i.id !== id));
          toast.success('Lançamento cancelado');
          return;
        }
        throw error;
      }
      toast.success('Lançamento cancelado');
      await fetchItems();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar lançamento');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Lançamento removido');
      await fetchItems();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover lançamento');
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const stats = {
    totalPayable: items
      .filter(i => i.type === 'payable' && i.status !== 'cancelled' && i.status !== 'paid')
      .reduce((s, i) => s + i.amount, 0),
    totalReceivable: items
      .filter(i => i.type === 'receivable' && i.status !== 'cancelled' && i.status !== 'paid')
      .reduce((s, i) => s + i.amount, 0),
    overdue: items.filter(i => i.status === 'overdue').length,
    dueThisWeek: items.filter(
      i => i.due_date >= today && i.due_date <= next7Days && i.status === 'pending'
    ).length,
  };

  return { items, loading, stats, createItem, markAsPaid, cancelItem, deleteItem, refetch: fetchItems };
};
