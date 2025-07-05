
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTransactions = async () => {
    if (!user) return;
    
    try {
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

      if (error) throw error;
      
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

      setTransactions(transformedData);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'category' | 'account'>) => {
    if (!user) return;

    try {
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

      setTransactions(prev => [transformedData, ...prev]);
      return transformedData;
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  return {
    transactions,
    loading,
    createTransaction,
    refetch: fetchTransactions,
  };
};
