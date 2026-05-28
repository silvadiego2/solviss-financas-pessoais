import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface CreditCard {
  id: string;
  name: string;
  bank_name: string;
  limit: number;
  used_amount: number;
  closing_day: number;
  due_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCreditCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchCreditCards = async (): Promise<CreditCard[]> => {
    if (!user) return [];

    // Busca cartões + total gasto via transações do mês corrente
    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'credit_card')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (accErr) throw accErr;
    if (!accounts || accounts.length === 0) return [];

    const cardIds = accounts.map(a => a.id);

    // Soma das despesas do mês atual por cartão (status != cancelled)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: txRows, error: txErr } = await supabase
      .from('transactions')
      .select('account_id, amount, type')
      .eq('user_id', user.id)
      .in('account_id', cardIds)
      .neq('status', 'cancelled')
      .gte('date', firstDay)
      .lte('date', lastDay);

    if (txErr) throw txErr;

    // Agrupa por account_id — só conta despesas (type === 'expense')
    const usedByCard: Record<string, number> = {};
    for (const tx of txRows || []) {
      if (tx.type === 'expense') {
        usedByCard[tx.account_id] = (usedByCard[tx.account_id] || 0) + Number(tx.amount);
      }
    }

    return accounts.map(account => {
      const limit = Number(account.credit_limit) || 0;
      // Prioridade: soma real de transações do mês; fallback: balance stored
      const usedFromTx = usedByCard[account.id] ?? null;
      const usedFromBalance = limit - Number(account.balance || 0);
      const used_amount = usedFromTx !== null ? usedFromTx : Math.max(0, usedFromBalance);

      return {
        id: account.id,
        name: account.name,
        bank_name: account.bank_name || '',
        limit,
        used_amount,
        closing_day: account.closing_day || 1,
        due_day: account.due_day || 10,
        is_active: account.is_active ?? true,
        created_at: account.created_at || '',
        updated_at: account.updated_at || '',
      };
    });
  };

  const { data: creditCards = [], isLoading } = useQuery({
    queryKey: ['credit_cards', user?.id],
    queryFn: fetchCreditCards,
    enabled: !!user,
  });

  const createCreditCardMutation = useMutation({
    mutationFn: async (cardData: Omit<CreditCard, 'id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('accounts')
        .insert([{
          user_id: user.id,
          name: cardData.name,
          bank_name: cardData.bank_name,
          type: 'credit_card' as const,
          credit_limit: cardData.limit,
          balance: cardData.limit - cardData.used_amount,
          closing_day: cardData.closing_day,
          due_day: cardData.due_day,
          is_active: cardData.is_active,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Cartão adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar cartão', { description: error?.message });
    },
  });

  const updateCreditCardMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditCard> & { id: string }) => {
      const updateData: any = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.bank_name !== undefined) updateData.bank_name = updates.bank_name;
      if (updates.closing_day) updateData.closing_day = updates.closing_day;
      if (updates.due_day) updateData.due_day = updates.due_day;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

      if (updates.limit !== undefined || updates.used_amount !== undefined) {
        let used = updates.used_amount;
        let limit = updates.limit;

        if (used === undefined || limit === undefined) {
          const { data: current, error: fetchErr } = await supabase
            .from('accounts')
            .select('credit_limit, balance')
            .eq('id', id)
            .eq('user_id', user?.id)
            .single();
          if (fetchErr) throw fetchErr;
          const currentLimit = Number(current?.credit_limit || 0);
          const currentBalance = Number(current?.balance || 0);
          if (used === undefined) used = currentLimit - currentBalance;
          if (limit === undefined) limit = currentLimit;
        }

        updateData.credit_limit = limit;
        updateData.balance = (limit as number) - (used as number);
      }

      const { data, error } = await supabase
        .from('accounts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Cartão atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar cartão', { description: error?.message });
    },
  });

  const deleteCreditCardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Cartão excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir cartão', { description: error?.message });
    },
  });

  return {
    creditCards,
    loading: isLoading,
    createCreditCard: createCreditCardMutation.mutate,
    updateCreditCard: updateCreditCardMutation.mutate,
    deleteCreditCard: deleteCreditCardMutation.mutate,
    isCreating: createCreditCardMutation.isPending,
    isUpdating: updateCreditCardMutation.isPending,
    isDeleting: deleteCreditCardMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  };
};
