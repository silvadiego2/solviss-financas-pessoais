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

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, icon, color),
          account:accounts(name, type)
        `)
        .eq('user_id', user.id)
        .eq('is_recurring', true)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const toggleRecurrenceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ is_active: isActive })
        .eq('id', id);

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
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

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
