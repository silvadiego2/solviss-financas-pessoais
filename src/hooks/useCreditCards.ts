
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface CreditCard {
  id: string;
  name: string;
  bank_name: string;
  limit: number;
  used_amount: number;
  closing_day: number;
  due_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCreditCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchCreditCards = async (): Promise<CreditCard[]> => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'credit_card')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar cartões:', error);
      throw error;
    }
    
    // Transform accounts data to CreditCard format
    return (data || []).map(account => ({
      id: account.id,
      name: account.name,
      bank_name: account.bank_name || '',
      limit: account.credit_limit || 0,
      used_amount: (account.credit_limit || 0) - (account.balance || 0),
      closing_day: account.closing_day || 1,
      due_day: account.due_day || 10,
      is_active: account.is_active || true,
      created_at: account.created_at || '',
      updated_at: account.updated_at || ''
    }));
  };

  const { data: creditCards = [], isLoading, error } = useQuery({
    queryKey: ['credit_cards', user?.id],
    queryFn: fetchCreditCards,
    enabled: !!user,
  });

  const createCreditCardMutation = useMutation({
    mutationFn: async (cardData: Omit<CreditCard, 'id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('accounts')
        .insert([{ 
          user_id: user.id,
          name: cardData.name,
          bank_name: cardData.bank_name,
          type: 'credit_card' as const,
          credit_limit: cardData.limit,
          balance: cardData.limit - cardData.used_amount,
          closing_day: cardData.closing_day,
          due_day: cardData.due_day,
          is_active: cardData.is_active
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Cartão adicionado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar cartão:', error);
      toast.error('Erro ao adicionar cartão');
    },
  });

  const updateCreditCardMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditCard> & { id: string }) => {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.bank_name) updateData.bank_name = updates.bank_name;
      if (updates.limit) {
        updateData.credit_limit = updates.limit;
        updateData.balance = updates.limit - (updates.used_amount || 0);
      }
      if (updates.closing_day) updateData.closing_day = updates.closing_day;
      if (updates.due_day) updateData.due_day = updates.due_day;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

      const { data, error } = await supabase
        .from('accounts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Cartão atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar cartão:', error);
      toast.error('Erro ao atualizar cartão');
    },
  });

  const deleteCreditCardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Cartão excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar cartão:', error);
      toast.error('Erro ao deletar cartão');
    },
  });

  return {
    creditCards,
    loading: isLoading,
    createCreditCard: createCreditCardMutation.mutate,
    updateCreditCard: updateCreditCardMutation.mutate,
    deleteCreditCard: deleteCreditCardMutation.mutate,
    isCreating: createCreditCardMutation.isPending,
    isUpdating: updateCreditCardMutation.isPending,
    isDeleting: deleteCreditCardMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
  };
};
