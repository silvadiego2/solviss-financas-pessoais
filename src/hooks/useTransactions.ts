
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  status: 'pending' | 'completed' | 'cancelled';
  account_id: string;
  category_id?: string;
  notes?: string;
  tags?: string[];
  receipt_image_url?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  account?: {
    id: string;
    name: string;
    type: string;
  };
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
        categories!transactions_category_id_fkey(id, name, icon, color),
        accounts!transactions_account_id_fkey(id, name, type)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erro ao buscar transações:', error);
      throw error;
    }
    
    // Transform the data to match our interface
    const transformedData: Transaction[] = (data || []).map((item: any) => ({
      id: item.id,
      amount: item.amount,
      description: item.description,
      date: item.date,
      type: item.type,
      status: item.status,
      account_id: item.account_id,
      category_id: item.category_id,
      notes: item.notes,
      tags: item.tags,
      receipt_image_url: item.receipt_image_url,
      category: item.categories ? {
        id: item.categories.id,
        name: item.categories.name,
        icon: item.categories.icon,
        color: item.categories.color,
      } : undefined,
      account: item.accounts ? {
        id: item.accounts.id,
        name: item.accounts.name,
        type: item.accounts.type,
      } : undefined,
    }));

    return transformedData;
  };

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: fetchTransactions,
    enabled: !!user,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: Omit<Transaction, 'id' | 'category' | 'account'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...transactionData, user_id: user.id }])
        .select(`
          *,
          categories!transactions_category_id_fkey(id, name, icon, color),
          accounts!transactions_account_id_fkey(id, name, type)
        `)
        .single();

      if (error) throw error;
      
      // Transform the single item data
      const transformedData: Transaction = {
        id: data.id,
        amount: data.amount,
        description: data.description,
        date: data.date,
        type: data.type,
        status: data.status,
        account_id: data.account_id,
        category_id: data.category_id,
        notes: data.notes,
        tags: data.tags,
        receipt_image_url: data.receipt_image_url,
        category: data.categories ? {
          id: data.categories.id,
          name: data.categories.name,
          icon: data.categories.icon,
          color: data.categories.color,
        } : undefined,
        account: data.accounts ? {
          id: data.accounts.id,
          name: data.accounts.name,
          type: data.accounts.type,
        } : undefined,
      };

      return transformedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar transação:', error);
      toast.error('Erro ao criar transação');
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select(`
          *,
          categories!transactions_category_id_fkey(id, name, icon, color),
          accounts!transactions_account_id_fkey(id, name, type)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
      toast.success('Transação excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar transação:', error);
      toast.error('Erro ao deletar transação');
    },
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: async ({ file, transactionId }: { file: File; transactionId: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${transactionId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // Update transaction with receipt URL
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ receipt_image_url: publicUrl })
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Comprovante salvo com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar comprovante:', error);
      toast.error('Erro ao salvar comprovante');
    },
  });

  return {
    transactions,
    loading: isLoading,
    createTransaction: createTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,
    uploadReceipt: uploadReceiptMutation.mutate,
    isCreating: createTransactionMutation.isPending,
    isUpdating: updateTransactionMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
    isUploading: uploadReceiptMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  };
};
