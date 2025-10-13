import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDependencyCheck = () => {
  const [checking, setChecking] = useState(false);

  const checkAccountDependencies = async (accountId: string) => {
    setChecking(true);
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id')
        .eq('account_id', accountId);

      if (error) throw error;

      return {
        hasTransactions: (transactions?.length || 0) > 0,
        transactionCount: transactions?.length || 0,
      };
    } catch (error) {
      console.error('Error checking account dependencies:', error);
      toast.error('Erro ao verificar dependências da conta');
      return { hasTransactions: false, transactionCount: 0 };
    } finally {
      setChecking(false);
    }
  };

  const checkCategoryDependencies = async (categoryId: string) => {
    setChecking(true);
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id')
        .eq('category_id', categoryId);

      if (error) throw error;

      return {
        hasTransactions: (transactions?.length || 0) > 0,
        transactionCount: transactions?.length || 0,
      };
    } catch (error) {
      console.error('Error checking category dependencies:', error);
      toast.error('Erro ao verificar dependências da categoria');
      return { hasTransactions: false, transactionCount: 0 };
    } finally {
      setChecking(false);
    }
  };

  return {
    checking,
    checkAccountDependencies,
    checkCategoryDependencies,
  };
};
