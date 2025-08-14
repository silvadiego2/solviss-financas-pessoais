
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface BankConnection {
  id: string;
  user_id: string;
  provider: string;
  bank_name: string;
  account_external_id: string;
  connection_status: string;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncedTransaction {
  id: string;
  user_id: string;
  bank_connection_id: string;
  external_transaction_id: string;
  account_id?: string;
  amount: number;
  description: string;
  date: string;
  category_suggestion?: string;
  transaction_type: string;
  is_matched: boolean;
  matched_transaction_id?: string;
  raw_data?: any;
  created_at: string;
  updated_at: string;
  bank_connection?: {
    bank_name: string;
    provider: string;
  };
}

export const useBankConnections = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchBankConnections = async (): Promise<BankConnection[]> => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar conexões bancárias:', error);
      throw error;
    }
    
    return data || [];
  };

  const fetchSyncedTransactions = async (): Promise<SyncedTransaction[]> => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('synced_transactions')
      .select(`
        *,
        bank_connection:bank_connections(bank_name, provider)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar transações sincronizadas:', error);
      throw error;
    }
    
    return data || [];
  };

  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['bank_connections', user?.id],
    queryFn: fetchBankConnections,
    enabled: !!user,
  });

  const { data: syncedTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['synced_transactions', user?.id],
    queryFn: fetchSyncedTransactions,
    enabled: !!user,
  });

  const createConnectionMutation = useMutation({
    mutationFn: async (connectionData: Omit<BankConnection, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('bank_connections')
        .insert([{ ...connectionData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_connections'] });
      toast.success('Conexão bancária criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar conexão bancária:', error);
      toast.error('Erro ao criar conexão bancária');
    },
  });

  const syncTransactionsMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Call the sync function via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('sync-bank-data', {
        body: { connection_id: connectionId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['synced_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank_connections'] });
      toast.success('Transações sincronizadas com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao sincronizar transações:', error);
      toast.error('Erro ao sincronizar transações');
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_connections')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_connections'] });
      queryClient.invalidateQueries({ queryKey: ['synced_transactions'] });
      toast.success('Conexão bancária removida com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao remover conexão bancária:', error);
      toast.error('Erro ao remover conexão bancária');
    },
  });

  return {
    connections,
    syncedTransactions,
    loading: connectionsLoading || transactionsLoading,
    createConnection: createConnectionMutation.mutate,
    syncTransactions: syncTransactionsMutation.mutate,
    deleteConnection: deleteConnectionMutation.mutate,
    isCreating: createConnectionMutation.isPending,
    isSyncing: syncTransactionsMutation.isPending,
    isDeleting: deleteConnectionMutation.isPending,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_connections'] });
      queryClient.invalidateQueries({ queryKey: ['synced_transactions'] });
    },
  };
};
