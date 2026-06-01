import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

// Alinhado 100% com o schema real do banco (types.ts)
export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'wallet' | 'investment';
  balance: number | null;       // Único campo de saldo no banco
  credit_limit?: number | null;
  due_day?: number | null;
  closing_day?: number | null;
  bank_name?: string | null;
  is_active: boolean | null;
  user_id: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export const useAccounts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchAccounts = async (): Promise<Account[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .neq('is_active', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[useAccounts] erro ao buscar:', error);
      throw error;
    }

    console.log('[useAccounts] carregadas:', data?.length ?? 0, data);
    return (data as Account[]) || [];
  };

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: fetchAccounts,
    enabled: !!user,
    staleTime: 0, // sempre re-fetch para refletir edições
  });

  const regularAccounts    = accounts.filter(a => a.type !== 'credit_card');
  const creditCardAccounts = accounts.filter(a => a.type === 'credit_card');

  const createAccountMutation = useMutation({
    mutationFn: async (accountData: Omit<Account, 'id' | 'is_active' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('accounts')
        .insert([{ ...accountData, user_id: user.id, is_active: true }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast.success('Conta criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('[useAccounts] erro ao criar:', error);
      toast.error('Erro ao criar conta: ' + (error?.message ?? ''));
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Account> & { id: string }) => {
      // Remove campos que não existem no schema antes de enviar
      const { user_id, created_at, updated_at, is_active, ...safeUpdates } = updates as any;
      const { data, error } = await supabase
        .from('accounts')
        .update(safeUpdates)
        .eq('id', id)
        .eq('user_id', user?.id ?? '')
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast.success('Conta atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('[useAccounts] erro ao atualizar:', error);
      toast.error('Erro ao atualizar conta: ' + (error?.message ?? ''));
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user?.id ?? '');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast.success('Conta excluída com sucesso!');
    },
    onError: (error: any) => {
      console.error('[useAccounts] erro ao deletar:', error);
      toast.error('Erro ao excluir conta: ' + (error?.message ?? ''));
    },
  });

  return {
    accounts,
    regularAccounts,
    creditCardAccounts,
    loading: isLoading,
    createAccount: createAccountMutation.mutate,
    updateAccount: updateAccountMutation.mutateAsync,
    deleteAccount: deleteAccountMutation.mutate,
    isCreating: createAccountMutation.isPending,
    isUpdating: updateAccountMutation.isPending,
    isDeleting: deleteAccountMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  };
};
