
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  date: string;
  notes?: string;
  tags?: string[];
  status: 'pending' | 'completed' | 'cancelled';
  transfer_account_id?: string;
  is_recurring?: boolean;
  recurrence_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_end_date?: string;
  receipt_image_url?: string;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  account?: {
    id: string;
    name: string;
  };
}

export interface CreateTransactionInput {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  account_id: string;
  category_id?: string;
  date: string;
  notes?: string;
  tags?: string[];
  status: 'pending' | 'completed' | 'cancelled';
  transfer_account_id?: string;
  is_recurring?: boolean;
  recurrence_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_end_date?: string;
  receiptFile?: File;
}

export const useTransactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchTransactions = async (): Promise<Transaction[]> => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name, icon, color),
        account:accounts!transactions_account_id_fkey(id, name)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar transações:', error);
      throw error;
    }
    
    return (data || []) as any;
  };

  const fetchSyncedTransactions = async () => {
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
      return [];
    }
    
    return data || [];
  };

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: fetchTransactions,
    enabled: !!user,
  });

  const { data: syncedTransactions = [] } = useQuery({
    queryKey: ['synced_transactions', user?.id],
    queryFn: fetchSyncedTransactions,
    enabled: !!user,
  });

  const uploadReceipt = async (file: File): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const createTransactionMutation = useMutation({
    mutationFn: async ({ receiptFile, ...transactionData }: CreateTransactionInput) => {
      if (!user) throw new Error('Usuário não autenticado');

      let receipt_image_url;
      if (receiptFile) {
        receipt_image_url = await uploadReceipt(receiptFile);
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert([{ 
          ...transactionData, 
          user_id: user.id,
          receipt_image_url 
        } as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Transação adicionada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar transação:', error);
      toast.error('Erro ao adicionar transação');
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, receiptFile, ...updates }: Partial<Transaction> & { id: string; receiptFile?: File }) => {
      let receipt_image_url = updates.receipt_image_url;
      
      if (receiptFile) {
        receipt_image_url = await uploadReceipt(receiptFile);
      }

      const { data, error } = await supabase
        .from('transactions')
        .update({ ...updates, receipt_image_url } as any)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Transação atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar transação:', error);
      toast.error('Erro ao atualizar transação');
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Transação excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar transação:', error);
      toast.error('Erro ao deletar transação');
    },
  });

  return {
    transactions,
    syncedTransactions,
    loading: isLoading,
    createTransaction: createTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,
    isCreating: createTransactionMutation.isPending,
    isUpdating: updateTransactionMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  };
};
