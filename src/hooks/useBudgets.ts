
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchBudgets = async (month?: number, year?: number): Promise<Budget[]> => {
    if (!user) return [];
    
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();
    
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
    
    return (data || []).map((item: any) => ({
      id: item.id,
      category_id: item.category_id,
      amount: item.amount,
      spent: item.spent || 0,
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
  };

  const { data: budgets = [], isLoading, error } = useQuery({
    queryKey: ['budgets', user?.id],
    queryFn: () => fetchBudgets(),
    enabled: !!user,
  });

  const createBudgetMutation = useMutation({
    mutationFn: async (budgetData: Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'category'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('budgets')
        .insert([{ ...budgetData, user_id: user.id }])
        .select(`
          *,
          categories!budgets_category_id_fkey(id, name, icon, color)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar orçamento:', error);
      toast.error('Erro ao criar orçamento');
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Budget> & { id: string }) => {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select(`
          *,
          categories!budgets_category_id_fkey(id, name, icon, color)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar orçamento:', error);
      toast.error('Erro ao atualizar orçamento');
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir orçamento:', error);
      toast.error('Erro ao excluir orçamento');
    },
  });

  return {
    budgets,
    loading: isLoading,
    error,
    createBudget: createBudgetMutation.mutate,
    updateBudget: updateBudgetMutation.mutate,
    deleteBudget: deleteBudgetMutation.mutate,
    isCreating: createBudgetMutation.isPending,
    isUpdating: updateBudgetMutation.isPending,
    isDeleting: deleteBudgetMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  };
};
