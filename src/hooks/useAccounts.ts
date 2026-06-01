import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'wallet' | 'investment';
  balance: number;
  credit_limit?: number;
  due_day?: number;
  closing_day?: number;
  bank_name?: string;
  is_active: boolean;
}

export const useAccounts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchAccounts = async (): Promise<Account[]> => {
    if (!user) return [];

    // FIX: is_active é boolean | null no schema.
    // .eq('is_active', true) exclui linhas com NULL no PostgreSQL.
    // .neq('is_active', false) inclui TRUE e NULL — comportamento correto.
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .neq('is_active', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar contas:', error);
      throw error;
    }

    console.log('[useAccounts] contas carregadas:', data?.length ?? 0, data);
    return data || [];
  };

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: fetchAccounts,
    enabled: !!user,
    staleTime: 30 * 1000, // 30s — reduzido para detectar mudanças rápido
  });

  // Contas regulares (sem cartão de crédito) para cálculo de saldo
  const regularAccounts = accounts.filter(account => account.type !== 'credit_card');
  const creditCardAccounts = accounts.filter(account => account.type === 'credit_card');

  const createAccountMutation = useMutation({
    mutationFn: async (accountData: Omit<Account, 'id' | 'is_active'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      console.log('Creating account with data:', accountData);

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
    onError: (error) => {
      console.error('Erro ao criar conta:', error);
      toast.error('Erro ao criar conta');
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Account> & { id: string }) => {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
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
    onError: (error) => {
      console.error('Erro ao atualizar conta:', error);
      toast.error('Erro ao atualizar conta');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast.success('Conta excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar conta:', error);
      toast.error('Erro ao deletar conta');
    },
  });

  return {
    accounts,
    regularAccounts,
    creditCardAccounts,
    loading: isLoading,
    createAccount: createAccountMutation.mutate,
    updateAccount: updateAccountMutation.mutate,
    deleteAccount: deleteAccountMutation.mutate,
    isCreating: createAccountMutation.isPending,
    isUpdating: updateAccountMutation.isPending,
    isDeleting: deleteAccountMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  };
};
