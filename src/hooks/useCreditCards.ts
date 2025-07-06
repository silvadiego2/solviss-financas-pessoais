
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

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
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCreditCards = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('credit_cards' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setCreditCards((data as CreditCard[]) || []);
    } catch (error) {
      console.error('Erro ao buscar cartões:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCreditCard = async (cardData: Omit<CreditCard, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('credit_cards' as any)
        .insert([{ ...cardData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      setCreditCards(prev => [...prev, data as CreditCard]);
      return data as CreditCard;
    } catch (error) {
      console.error('Erro ao criar cartão:', error);
      throw error;
    }
  };

  const updateCreditCard = async (id: string, updates: Partial<CreditCard>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('credit_cards' as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setCreditCards(prev => prev.map(card => card.id === id ? (data as CreditCard) : card));
      return data as CreditCard;
    } catch (error) {
      console.error('Erro ao atualizar cartão:', error);
      throw error;
    }
  };

  const deleteCreditCard = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('credit_cards' as any)
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setCreditCards(prev => prev.filter(card => card.id !== id));
    } catch (error) {
      console.error('Erro ao deletar cartão:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchCreditCards();
  }, [user]);

  return {
    creditCards,
    loading,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard,
    refetch: fetchCreditCards,
  };
};
