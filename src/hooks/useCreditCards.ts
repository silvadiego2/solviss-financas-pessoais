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

/**
 * Calcula o início e fim do ciclo de fatura aberta de um cartão.
 * O ciclo vai do dia (closing_day + 1) do mês anterior até closing_day do mês atual.
 * Ex: fechamento dia 10 → ciclo: 11/Abr até 10/Mai
 */
function getInvoiceCycle(closingDay: number): { start: string; end: string } {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth(); // 0-based

  // Fim do ciclo = closing_day do mês corrente (ou do próximo, se já passou)
  let endDate = new Date(year, month, closingDay);
  if (today > endDate) {
    // Fechamento já ocorreu este mês — o ciclo aberto é para o próximo
    endDate = new Date(year, month + 1, closingDay);
  }

  // Início do ciclo = closing_day + 1 do mês anterior ao endDate
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, closingDay + 1);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(startDate), end: fmt(endDate) };
}

export const useCreditCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchCreditCards = async (): Promise<CreditCard[]> => {
    if (!user) return [];

    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'credit_card')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (accErr) throw accErr;
    if (!accounts || accounts.length === 0) return [];

    // Para cada cartão, soma transações no ciclo real da fatura
    const results = await Promise.all(
      accounts.map(async (account) => {
        const closingDay = account.closing_day || 1;
        const { start, end } = getInvoiceCycle(closingDay);

        const { data: txRows, error: txErr } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', user.id)
          .eq('account_id', account.id)
          .neq('status', 'cancelled')
          .gte('date', start)
          .lte('date', end);

        if (txErr) throw txErr;

        const used_amount = (txRows || []).reduce((sum, tx) => {
          if (tx.type === 'expense') return sum + Number(tx.amount);
          if (tx.type === 'income')  return sum - Number(tx.amount); // pagamentos/estornos
          return sum;
        }, 0);

        const limit = Number(account.credit_limit) || 0;

        return {
          id: account.id,
          name: account.name,
          bank_name: account.bank_name || '',
          limit,
          used_amount: Math.max(0, used_amount),
          closing_day: closingDay,
          due_day: account.due_day || 10,
          is_active: account.is_active ?? true,
          created_at: account.created_at || '',
          updated_at: account.updated_at || '',
        };
      })
    );

    return results;
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
