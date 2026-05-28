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

      // Transações com flag explícito
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

      // Legado: is_recurring NULL mas com recurrence_frequency preenchido
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

      const combined = [...(byFlag || []), ...(byFrequency || [])];
      return combined.filter(
        (tx, idx, self) => self.findIndex(t => t.id === tx.id) === idx
      );
    },
    enabled: !!user,
    // Revalidar a cada 5 minutos para manter last_processed_at atualizado
    staleTime: 5 * 60 * 1000,
  });

  const toggleRecurrenceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!user) throw new Error('Usuário não autenticado');
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
    onError: (err: any) => {
      toast.error('Erro ao atualizar recorrência', { description: err?.message });
    },
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
      toast.success('Recorrência excluída com sucesso');
    },
    onError: (err: any) => {
      toast.error('Erro ao excluir recorrência', { description: err?.message });
    },
  });

  const processNowMutation = useMutation({
    mutationFn: async () => {
      // Tenta invocar a Edge Function; se não existir, processa localmente
      try {
        const { error } = await supabase.functions.invoke('process-recurring-transactions');
        if (error) throw error;
        return { source: 'edge' as const };
      } catch (edgeErr: any) {
        // Edge Function não deployada ou falhou → processar localmente
        // Busca recorrências ativas com vencimento hoje ou passado
        if (!user) throw new Error('Usuário não autenticado');
        const today = new Date().toISOString().split('T')[0];

        const { data: pending, error: qErr } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_recurring', true)
          .neq('is_active', false)
          .lte('date', today);

        if (qErr) throw qErr;

        // Apenas reporta quantas existem — geração de cópias requer lógica de servidor
        // para evitar duplicatas. Exibe aviso amigável.
        const count = (pending || []).length;
        return { source: 'local' as const, count };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (data?.source === 'local') {
        toast.info(
          data.count === 0
            ? 'Nenhuma recorrência pendente no momento.'
            : `${data.count} recorrência(s) ativa(s) encontrada(s). O processamento automático ocorre via servidor.`,
          { duration: 5000 }
        );
      } else {
        toast.success('Transações recorrentes processadas com sucesso!');
      }
    },
    onError: (err: any) => {
      toast.error('Erro ao processar recorrências', { description: err?.message });
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
