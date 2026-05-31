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
 * Formata uma Date para "YYYY-MM-DD" usando a data LOCAL do browser
 * (evita o bug de timezone onde toISOString() pode retornar o dia seguinte
 * quando o horário local está atrás do UTC, ex: Brasília UTC-3).
 */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Retorna o intervalo de datas da fatura ATUAL em aberto.
 *
 * O ciclo sempre é:
 *   início = closing_day + 1  do mês M-1
 *   fim    = closing_day      do mês M  (mês corrente, sem avançar)
 *
 * Usar o mês corrente fixo garante que, mesmo depois do fechamento
 * (fatura fechada mas ainda não paga), os valores continuam visíveis.
 * Ex com fechamento dia 10 e hoje = 31/Mai:
 *   início = 11/Abr, fim = 10/Mai  ← fatura de Maio, já fechada, a pagar
 */
function getInvoiceCycle(closingDay: number): { start: string; end: string } {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth(); // 0-based

  // fim = closing_day do mês corrente (ajustado para últim dia se necessário)
  const daysInCurMonth = new Date(year, month + 1, 0).getDate();
  const endDay = Math.min(closingDay, daysInCurMonth);
  const endDate = new Date(year, month, endDay);

  // início = closing_day + 1 do mês anterior
  const prevYear  = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  const startDay = Math.min(closingDay + 1, daysInPrevMonth);
  const startDate = new Date(prevYear, prevMonth, startDay);

  return { start: localDateStr(startDate), end: localDateStr(endDate) };
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
          if (tx.type === 'income')  return sum - Number(tx.amount);
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
    staleTime: 60 * 1000, // 1 min — evita refetch excessivo mas mantém dados frescos
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
