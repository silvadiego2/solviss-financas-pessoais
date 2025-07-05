
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface Budget {
  id: string;
  category_id: string;
  amount: number;
  spent: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
}

export const useBudgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBudgets = async (month?: number, year?: number) => {
    if (!user) return;
    
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();
    
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          categories!budgets_category_id_fkey(id, name, icon, color)
        `)
        .eq('user_id', user.id)
        .eq('month', targetMonth)
        .eq('year', targetYear);

      if (error) throw error;
      
      const transformedData: Budget[] = (data || []).map((item: any) => ({
        id: item.id,
        category_id: item.category_id,
        amount: item.amount,
        spent: item.spent,
        month: item.month,
        year: item.year,
        created_at: item.created_at,
        updated_at: item.updated_at,
        category: item.categories ? {
          id: item.categories.id,
          name: item.categories.name,
          icon: item.categories.icon,
          color: item.categories.color,
        } : undefined,
      }));

      setBudgets(transformedData);
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBudget = async (budgetData: Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'category'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert([{ ...budgetData, user_id: user.id }])
        .select(`
          *,
          categories!budgets_category_id_fkey(id, name, icon, color)
        `)
        .single();

      if (error) throw error;
      
      const transformedData: Budget = {
        id: data.id,
        category_id: data.category_id,
        amount: data.amount,
        spent: data.spent,
        month: data.month,
        year: data.year,
        created_at: data.created_at,
        updated_at: data.updated_at,
        category: data.categories ? {
          id: data.categories.id,
          name: data.categories.name,
          icon: data.categories.icon,
          color: data.categories.color,
        } : undefined,
      };

      setBudgets(prev => [...prev, transformedData]);
      return transformedData;
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      throw error;
    }
  };

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select(`
          *,
          categories!budgets_category_id_fkey(id, name, icon, color)
        `)
        .single();

      if (error) throw error;
      
      const transformedData: Budget = {
        id: data.id,
        category_id: data.category_id,
        amount: data.amount,
        spent: data.spent,
        month: data.month,
        year: data.year,
        created_at: data.created_at,
        updated_at: data.updated_at,
        category: data.categories ? {
          id: data.categories.id,
          name: data.categories.name,
          icon: data.categories.icon,
          color: data.categories.color,
        } : undefined,
      };
      
      setBudgets(prev => prev.map(budget => budget.id === id ? transformedData : budget));
      return transformedData;
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      throw error;
    }
  };

  const deleteBudget = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setBudgets(prev => prev.filter(budget => budget.id !== id));
    } catch (error) {
      console.error('Erro ao deletar orçamento:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [user]);

  return {
    budgets,
    loading,
    createBudget,
    updateBudget,
    deleteBudget,
    refetch: fetchBudgets,
  };
};
