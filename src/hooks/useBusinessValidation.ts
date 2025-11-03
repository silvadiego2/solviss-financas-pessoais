import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBusinessValidation = () => {
  const validateAccountDeletion = async (accountId: string): Promise<boolean> => {
    try {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId);

      if (error) throw error;

      if (count && count > 0) {
        toast.error('Não é possível excluir esta conta', {
          description: `Existem ${count} transação(ões) vinculadas. Exclua ou transfira as transações primeiro.`,
          duration: 5000,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao validar exclusão de conta:', error);
      toast.error('Erro ao validar exclusão');
      return false;
    }
  };

  const validateCategoryDeletion = async (categoryId: string): Promise<boolean> => {
    try {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (error) throw error;

      if (count && count > 0) {
        toast.error('Não é possível excluir esta categoria', {
          description: `Existem ${count} transação(ões) vinculadas. Reclassifique as transações primeiro.`,
          duration: 5000,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao validar exclusão de categoria:', error);
      toast.error('Erro ao validar exclusão');
      return false;
    }
  };

  const validateCreditLimit = async (
    accountId: string,
    newAmount: number,
    isExpense: boolean
  ): Promise<boolean> => {
    if (!isExpense) return true;

    try {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('type, credit_limit, balance')
        .eq('id', accountId)
        .single();

      if (error) throw error;

      if (account.type === 'credit_card' && account.credit_limit) {
        const usedCredit = Math.abs(account.balance || 0);
        const availableCredit = account.credit_limit - usedCredit;

        if (newAmount > availableCredit) {
          toast.error('Limite de crédito insuficiente', {
            description: `Disponível: R$ ${availableCredit.toFixed(2)}. Necessário: R$ ${newAmount.toFixed(2)}`,
            duration: 5000,
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao validar limite de crédito:', error);
      return true; // Permitir em caso de erro para não bloquear operação
    }
  };

  const recalculateAccountBalance = async (accountId: string): Promise<void> => {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('account_id', accountId)
        .eq('status', 'completed' as any);

      if (error) throw error;

      let balance = 0;
      transactions?.forEach((t: any) => {
        if (t.type === 'income') {
          balance += Number(t.amount);
        } else if (t.type === 'expense') {
          balance -= Number(t.amount);
        }
      });

      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance })
        .eq('id', accountId);

      if (updateError) throw updateError;

      console.log(`✅ Saldo recalculado para conta ${accountId}: R$ ${balance.toFixed(2)}`);
    } catch (error) {
      console.error('Erro ao recalcular saldo:', error);
      toast.error('Erro ao recalcular saldo da conta');
    }
  };

  const checkBudgetExceeded = async (
    userId: string,
    categoryId: string,
    amount: number
  ): Promise<void> => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('amount, spent')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      if (budgetError) throw budgetError;

      if (budget) {
        const newSpent = (budget.spent || 0) + amount;
        if (newSpent > budget.amount) {
          const exceeded = newSpent - budget.amount;
          toast.warning('Orçamento ultrapassado!', {
            description: `Você excedeu o orçamento em R$ ${exceeded.toFixed(2)}`,
            duration: 5000,
          });
        } else if (newSpent >= budget.amount * 0.8) {
          const remaining = budget.amount - newSpent;
          toast.warning('Atenção ao orçamento', {
            description: `Restam apenas R$ ${remaining.toFixed(2)} do seu orçamento`,
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar orçamento:', error);
    }
  };

  return {
    validateAccountDeletion,
    validateCategoryDeletion,
    validateCreditLimit,
    recalculateAccountBalance,
    checkBudgetExceeded,
  };
};
