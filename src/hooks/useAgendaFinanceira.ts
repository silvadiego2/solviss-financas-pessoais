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
    if (!user) return;
    setLoading(true);
    try {
      // Usa tabela de transactions com status 'pending' como agenda
      // Campo due_date é mapeado de 'date' para itens futuros
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'overdue'])
        .order('date', { ascending: true });

      if (error) throw error;

      // Mapeia transações pendentes para formato de agenda
      const agendaItems: AgendaItem[] = (data || []).map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        type: t.type === 'income' ? 'receivable' : 'payable',
        description: t.description,
        amount: t.amount,
        due_date: t.date,
        status: (t.date < today && t.status === 'pending') ? 'overdue' : t.status,
        category_id: t.category_id,
        account_id: t.account_id,
        recurrent: t.is_recurring || false,
        recurrence_frequency: t.recurrence_frequency,
        notes: t.notes,
        paid_at: t.paid_at,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));

      setItems(agendaItems);
    } catch (error: any) {
      console.error('Erro ao buscar agenda:', error);
      toast.error('Erro ao carregar agenda financeira');
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
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: data.type === 'receivable' ? 'income' : 'expense',
        description: data.description,
        amount: data.amount,
        date: data.due_date,
        status: 'pending',
        category_id: data.category_id || null,
        account_id: data.account_id || null,
        is_recurring: data.recurrent || false,
        recurrence_frequency: data.recurrence_frequency || null,
        notes: data.notes || null,
      });
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
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'completed', paid_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
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
      if (error) throw error;
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

  // Estatísticas
  const today = new Date().toISOString().split('T')[0];
  const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const stats = {
    totalPayable: items.filter(i => i.type === 'payable' && i.status !== 'cancelled').reduce((s, i) => s + i.amount, 0),
    totalReceivable: items.filter(i => i.type === 'receivable' && i.status !== 'cancelled').reduce((s, i) => s + i.amount, 0),
    overdue: items.filter(i => i.status === 'overdue').length,
    dueThisWeek: items.filter(i => i.due_date >= today && i.due_date <= next7Days && i.status === 'pending').length,
  };

  return { items, loading, stats, createItem, markAsPaid, cancelItem, deleteItem, refetch: fetchItems };
};
