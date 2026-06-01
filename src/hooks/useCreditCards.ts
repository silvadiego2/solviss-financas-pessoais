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

/** Retorna "YYYY-MM-DD" usando data LOCAL — sem conversão UTC. */
function toLocalDateStr(d: Date): string {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  return toLocalDateStr(new Date());
}

/**
 * Calcula o ciclo da fatura ATUAL para um dado closing_day.
 *
 * Regra:
 *   - Se hoje > fechamento deste mês  → ciclo é [fechamento_deste_mês + 1 dia → fechamento_próximo_mês]
 *   - Se hoje <= fechamento deste mês → ciclo é [fechamento_mês_anterior + 1 dia → fechamento_deste_mês]
 *
 * Retorna start e end como strings "YYYY-MM-DD" para comparação correta
 * com o campo DATE do Postgres (sem misturar com timestamps).
 */
function getInvoiceCycle(closingDay: number): { start: string; end: string } {
  const today      = new Date();
  const todayYear  = today.getFullYear();
  const todayMonth = today.getMonth(); // 0-based

  // Dia de fechamento deste mês (limitado ao último dia do mês)
  const daysInThisMonth   = new Date(todayYear, todayMonth + 1, 0).getDate();
  const closingThisMonth  = new Date(todayYear, todayMonth, Math.min(closingDay, daysInThisMonth));

  // Passou do fechamento deste mês?
  const pastClosing = today > closingThisMonth;

  let endYear: number;
  let endMonth: number; // 0-based
  if (pastClosing) {
    // Fatura do mês que vem
    endYear  = todayMonth === 11 ? todayYear + 1 : todayYear;
    endMonth = todayMonth === 11 ? 0 : todayMonth + 1;
  } else {
    // Fatura deste mês
    endYear  = todayYear;
    endMonth = todayMonth;
  }

  // end = dia de fechamento do mês de vencimento
  const daysInEndMonth = new Date(endYear, endMonth + 1, 0).getDate();
  const endDate        = new Date(endYear, endMonth, Math.min(closingDay, daysInEndMonth));

  // start = dia seguinte ao fechamento do mês anterior ao end
  const prevYear  = endMonth === 0 ? endYear - 1 : endYear;
  const prevMonth = endMonth === 0 ? 11 : endMonth - 1;
  const daysInPrevMonth    = new Date(prevYear, prevMonth + 1, 0).getDate();
  const closingPrevMonth   = Math.min(closingDay, daysInPrevMonth);
  // start = fechamento anterior + 1 dia (Date lida com overflow de mês automaticamente)
  const startDate = new Date(prevYear, prevMonth, closingPrevMonth + 1);

  return {
    start: toLocalDateStr(startDate),
    end:   toLocalDateStr(endDate),
  };
}

export const useCreditCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchCreditCards = async (): Promise<CreditCard[]> => {
    if (!user) return [];

    // 1. Busca todas as contas do tipo credit_card ativas
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
        const closingDay        = account.closing_day ?? 10;
        const { start, end }   = getInvoiceCycle(closingDay);

        /**
         * FIX 1: Compara date (DATE) com strings DATE puras — sem ISO timestamp.
         *        Evita comparação lexicográfica incorreta entre DATE e DATETIME.
         *
         * FIX 2: Usa .or('status.is.null,status.neq.cancelled') em vez de
         *        .neq('status','cancelled').
         *        No Postgres, NULL != 'cancelled' retorna NULL (falsy), removendo
         *        todas as transações sem status. A cláusula OR inclui os NULLs.
         */
        const { data: txRows, error: txErr } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', user.id)
          .eq('account_id', account.id)
          .gte('date', start)
          .lte('date', end)
          .or('status.is.null,status.neq.cancelled');

        if (txErr) throw txErr;

        // Soma despesas, subtrai estornos/créditos no cartão
        const used_amount = (txRows ?? []).reduce((sum, tx) => {
          if (tx.type === 'expense') return sum + Number(tx.amount);
          if (tx.type === 'income')  return sum - Number(tx.amount);
          return sum;
        }, 0);

        const limit = Number(account.credit_limit) || 0;

        return {
          id:          account.id,
          name:        account.name,
          bank_name:   account.bank_name  ?? '',
          limit,
          used_amount: Math.max(0, used_amount),
          closing_day: closingDay,
          due_day:     account.due_day    ?? 10,
          is_active:   account.is_active  ?? true,
          created_at:  account.created_at ?? '',
          updated_at:  account.updated_at ?? '',
        };
      })
    );

    return results;
  };

  // queryKey inclui todayStr() para que o ciclo recalcule à meia-noite
  const { data: creditCards = [], isLoading } = useQuery({
    queryKey:  ['credit_cards', user?.id, todayStr()],
    queryFn:   fetchCreditCards,
    enabled:   !!user,
    staleTime: 0,
    gcTime:    5 * 60 * 1000,
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const createCreditCardMutation = useMutation({
    mutationFn: async (cardData: Omit<CreditCard, 'id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('accounts')
        .insert([{
          user_id:      user.id,
          name:         cardData.name,
          bank_name:    cardData.bank_name,
          type:         'credit_card' as const,
          credit_limit: cardData.limit,
          // balance não é mais derivado de used_amount manual; será recalculado pelo hook
          balance:      cardData.limit,
          closing_day:  cardData.closing_day,
          due_day:      cardData.due_day,
          is_active:    cardData.is_active,
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
    onError: (e: any) => toast.error('Erro ao adicionar cartão', { description: e?.message }),
  });

  const updateCreditCardMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditCard> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.name        !== undefined) updateData.name        = updates.name;
      if (updates.bank_name   !== undefined) updateData.bank_name   = updates.bank_name;
      if (updates.closing_day !== undefined) updateData.closing_day = updates.closing_day;
      if (updates.due_day     !== undefined) updateData.due_day     = updates.due_day;
      if (updates.is_active   !== undefined) updateData.is_active   = updates.is_active;
      // Atualiza credit_limit sem tocar em balance (balance é derivado via hook, não mais campo mestre)
      if (updates.limit       !== undefined) updateData.credit_limit = updates.limit;

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
    onError: (e: any) => toast.error('Erro ao atualizar cartão', { description: e?.message }),
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
    onError: (e: any) => toast.error('Erro ao excluir cartão', { description: e?.message }),
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
