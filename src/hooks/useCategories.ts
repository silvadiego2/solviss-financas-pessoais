import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  type: 'income' | 'expense' | 'transfer';
  transaction_type?: 'income' | 'expense' | 'transfer';
  parent_id?: string;
  user_id?: string | null;
  is_active: boolean;
}

export interface CreateCategoryInput {
  name: string;
  icon?: string;
  color?: string;
  type: 'income' | 'expense';
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  const fetchCategories = async () => {
    if (!user) return;

    try {
      // Busca categorias do usuário OU categorias globais do sistema (user_id IS NULL)
      // .neq('is_active', false) inclui linhas com is_active = TRUE e is_active = NULL
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .neq('is_active', false)
        .order('name', { ascending: true });

      if (error) throw error;

      // Normaliza: garante que 'type' e 'transaction_type' existam nos dois campos
      const normalized = (data || []).map((c: any) => ({
        ...c,
        type: c.type ?? c.transaction_type ?? 'expense',
        transaction_type: c.transaction_type ?? c.type ?? 'expense',
      })) as Category[];

      setCategories(normalized);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (categoryData: CreateCategoryInput) => {
    if (!user) throw new Error('Usuário não autenticado');
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: categoryData.name,
          icon: categoryData.icon,
          color: categoryData.color,
          type: categoryData.type,
          transaction_type: categoryData.type,
          user_id: user.id,
          is_active: true,
        } as any])
        .select()
        .single();

      if (error) throw error;

      await fetchCategories();
      toast.success('Categoria criada com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      toast.error('Erro ao criar categoria');
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const updateCategory = async (id: string, updates: Partial<CreateCategoryInput>) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const payload: any = { ...updates };
      if (updates.type) {
        payload.transaction_type = updates.type;
      }

      const { data, error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      await fetchCategories();
      toast.success('Categoria atualizada com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast.error('Erro ao atualizar categoria');
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchCategories();
      toast.success('Categoria excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.error('Erro ao excluir categoria');
      throw error;
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  return {
    categories,
    loading,
    isCreating,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
