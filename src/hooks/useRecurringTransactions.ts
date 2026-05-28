import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export const useRecurringTransactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: recurringTransactions, isLoading } = useQuery({
    queryKey: ['recurring-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Bug #1 fix: usar .eq() com true é correto, mas combinamos com
      // .not('is_recurring', 'is', null) para garantir que registros com
      // is_recurring=NULL (salvos antes da correção do INSERT) também apareçam
      // caso tenham recurrence_frequency preenchido.
      const { data: byFlag, error: e1 } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, icon, color),
          account:accounts(name, type)
        `)
        .eq('user_id', user.id)
        .eq('is_recurring', true)
        .order('date', { ascending: false });

      if (e1) throw e1;

      // Busca também transações com is_recurring NULL mas com recurrence_frequency
      // preenchido — dados legados salvos sem o flag explícito.
      const { data: byFrequency, error: e2 } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, icon, color),
          account:accounts(name, type)
        `)
        .eq('user_id', user.id)
        .is('is_recurring', null)
        .not('recurrence_frequency', 'is', null)
        .order('date', { ascending: false });

      if (e2) throw e2;

      // Mescla e deduplica por id
      const combined = [...(byFlag || []), ...(byFrequency || [])];
      const unique = combined.filter(
        (tx, idx, self) => self.findIndex(t => t.id === tx.id) === idx
      );

      return unique;
    },
    enabled: !!user,
  });

  const toggleRecurrenceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Bug #2 fix: filtrar por user_id para segurança
      const { error } = await supabase
        .from('transactions')
        .update({ is_active: isActive })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(variables.isActive ? 'Recorrência ativada' : 'Recorrência pausada');
    },
    onError: () => {
      toast.error('Erro ao atualizar recorrência');
    },
  });

  const deleteRecurrenceMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Bug #2 fix: filtrar por user_id para segurança
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
      toast.success('Recorrência excluída com sucesso');
    },
    onError: () => {
      toast.error('Erro ao excluir recorrência');
    },
  });

  const processNowMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('process-recurring-transactions');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transações recorrentes processadas');
    },
    onError: () => {
      toast.error('Erro ao processar recorrências');
    },
  });

  return {
    recurringTransactions: recurringTransactions || [],
    isLoading,
    toggleRecurrence: toggleRecurrenceMutation.mutate,
    deleteRecurrence: deleteRecurrenceMutation.mutate,
    processNow: processNowMutation.mutate,
    isToggling: toggleRecurrenceMutation.isPending,
    isDeleting: deleteRecurrenceMutation.isPending,
    isProcessing: processNowMutation.isPending,
  };
};
