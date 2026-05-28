import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

const isSchemaError = (err: any) =>
  err?.message?.includes('does not exist') ||
  err?.message?.includes('column') ||
  err?.code === '42703' ||
  err?.code === '42P01';

export const useRecurringTransactions = () => {
  const { user }    = useAuth();
  const queryClient = useQueryClient();

  const { data: recurringTransactions = [], isLoading } = useQuery({
    queryKey: ['recurring-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Tentativa 1: filtrar diretamente no banco por is_recurring = true
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, description, amount, type, date, status,
          is_recurring, recurrence_frequency, recurrence_end_date,
          category_id, account_id,
          category:categories(name, icon, color),
          account:accounts!transactions_account_id_fkey(name, type)
        `)
        .eq('user_id', user.id)
        .eq('is_recurring', true)
        .order('date', { ascending: false })
        .limit(200);

      if (!error) return data ?? [];

      // Tentativa 2: coluna is_recurring pode não existir — tenta recurrence_frequency
      if (isSchemaError(error)) {
        const { data: data2, error: err2 } = await supabase
          .from('transactions')
          .select(`
            id, description, amount, type, date, status,
            recurrence_frequency,
            category_id, account_id,
            category:categories(name, icon, color),
            account:accounts!transactions_account_id_fkey(name, type)
          `)
          .eq('user_id', user.id)
          .not('recurrence_frequency', 'is', null)
          .order('date', { ascending: false })
          .limit(200);

        if (err2) {
          if (isSchemaError(err2)) return []; // schema incompleto, retorna vazio sem quebrar
          throw err2;
        }
        return data2 ?? [];
      }

      throw error;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: (count, err: any) => !isSchemaError(err) && count < 2,
  });

  const toggleRecurrenceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('transactions')
        .update({ is_active: isActive })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        if (isSchemaError(error)) {
          const { error: e2 } = await supabase
            .from('transactions')
            .update({ is_recurring: isActive })
            .eq('id', id)
            .eq('user_id', user.id);
          if (e2) throw e2;
          return;
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(variables.isActive ? 'Recorrência ativada' : 'Recorrência pausada');
    },
    onError: (err: any) => toast.error('Erro ao atualizar recorrência', { description: err?.message }),
  });

  const deleteRecurrenceMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Recorrência excluída');
    },
    onError: (err: any) => toast.error('Erro ao excluir recorrência', { description: err?.message }),
  });

  const processNowMutation = useMutation({
    mutationFn: async () => {
      try {
        const { error } = await supabase.functions.invoke('process-recurring-transactions');
        if (error) throw error;
        return { source: 'edge' as const };
      } catch {
        if (!user) throw new Error('Usuário não autenticado');
        const today = new Date().toISOString().split('T')[0];
        const { data: pending, error: qErr } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_recurring', true)
          .lte('date', today);
        if (qErr && !isSchemaError(qErr)) throw qErr;
        return { source: 'local' as const, count: pending?.length ?? 0 };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (data?.source === 'local') {
        toast.info(
          data.count === 0
            ? 'Nenhuma recorrência pendente.'
            : `${data.count} recorrência(s) ativa(s). O processamento ocorre automaticamente via servidor.`,
          { duration: 5000 }
        );
      } else {
        toast.success('Transações recorrentes processadas!');
      }
    },
    onError: (err: any) => toast.error('Erro ao processar recorrências', { description: err?.message }),
  });

  return {
    recurringTransactions,
    isLoading,
    toggleRecurrence: toggleRecurrenceMutation.mutate,
    deleteRecurrence: deleteRecurrenceMutation.mutate,
    processNow: processNowMutation.mutate,
    isToggling: toggleRecurrenceMutation.isPending,
    isDeleting: deleteRecurrenceMutation.isPending,
    isProcessing: processNowMutation.isPending,
  };
};
