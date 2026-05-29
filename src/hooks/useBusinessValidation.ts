import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Validações de negócio + verificação de dependências antes de excluir registros.
 * Unifica o antigo useDependencyCheck (removido).
 *
 * Fixes aplicados:
 *  - checkAccountDependencies / checkCategoryDependencies: trocados de
 *    SELECT id (baixava todos os ids) para count:exact/head:true — zero data
 *  - recalculateAccountBalance: tenta RPC server-side primeiro; fallback
 *    client-side só se a função não existir no schema (PGRST202)
 *  - validateAccountDeletion / validateCategoryDeletion: já estavam corretos
 */
export const useBusinessValidation = () => {

  // ─── Dependências ──────────────────────────────────────────────────────────

  const checkAccountDependencies = async (accountId: string) => {
    try {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId);

      if (error) throw error;
      return { hasTransactions: (count ?? 0) > 0, transactionCount: count ?? 0 };
    } catch {
      return { hasTransactions: false, transactionCount: 0 };
    }
  };

  const checkCategoryDependencies = async (categoryId: string) => {
    try {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (error) throw error;
      return { hasTransactions: (count ?? 0) > 0, transactionCount: count ?? 0 };
    } catch {
      return { hasTransactions: false, transactionCount: 0 };
    }
  };

  // ─── Validações de exclusão ────────────────────────────────────────────────

  const validateAccountDeletion = async (accountId: string): Promise<boolean> => {
    try {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId);

      if (error) throw error;
      if (count && count > 0) {
        toast.error('Não é possível excluir esta conta', {
          description: `Existem ${count} transação(ões) vinculadas. Exclua ou transfira antes.`,
          duration: 5000,
        });
        return false;
      }
      return true;
    } catch {
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
          description: `Existem ${count} transação(ões) vinculadas. Reclassifique antes.`,
          duration: 5000,
        });
        return false;
      }
      return true;
    } catch {
      toast.error('Erro ao validar exclusão');
      return false;
    }
  };

  // ─── Validação de limite de crédito ───────────────────────────────────────

  const validateCreditLimit = async (
    accountId: string,
    newAmount: number,
    isExpense: boolean,
  ): Promise<boolean> => {
    if (!isExpense) return true;
    try {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('type, credit_limit, balance')
        .eq('id', accountId)
        .single();

      if (error) throw error;

      if ((account.type as string) === 'credit_card' && account.credit_limit) {
        const usedCredit = Math.abs(account.balance ?? 0);
        const available  = account.credit_limit - usedCredit;
        if (newAmount > available) {
          toast.error('Limite de crédito insuficiente', {
            description: `Disponível: R$ ${available.toFixed(2)} · Necessário: R$ ${newAmount.toFixed(2)}`,
            duration: 5000,
          });
          return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  };

  // ─── Recalcular saldo ─────────────────────────────────────────────────────

  /**
   * Tenta RPC server-side (recalculate_account_balance) — zero data transfer.
   * Fallback client-side só se a RPC não existir no schema (PGRST202).
   */
  const recalculateAccountBalance = async (accountId: string): Promise<void> => {
    try {
      const { error: rpcError } = await (supabase as any)
        .rpc('recalculate_account_balance', { p_account_id: accountId });

      if (!rpcError) return;

      const isNotFound =
        rpcError.message?.includes('PGRST202') ||
        rpcError.message?.includes('does not exist') ||
        rpcError.message?.includes('function');

      if (!isNotFound) throw rpcError;

      // Fallback: busca apenas amount + type (mínimo necessário)
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('account_id', accountId);

      if (error) throw error;

      let balance = 0;
      (transactions ?? []).forEach((t: any) => {
        if      (t.type === 'income')  balance += Number(t.amount);
        else if (t.type === 'expense') balance -= Number(t.amount);
      });

      const { error: updErr } = await supabase
        .from('accounts')
        .update({ balance })
        .eq('id', accountId);

      if (updErr) throw updErr;
    } catch {
      toast.error('Erro ao recalcular saldo da conta');
    }
  };

  // ─── Verificar orçamento ──────────────────────────────────────────────────

  const checkBudgetExceeded = async (
    userId: string,
    categoryId: string,
    amount: number,
  ): Promise<void> => {
    try {
      const now = new Date();
      const { data: budget, error } = await supabase
        .from('budgets')
        .select('amount, spent')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear())
        .maybeSingle();

      if (error) throw error;

      if (budget) {
        const newSpent = (budget.spent ?? 0) + amount;
        if (newSpent > budget.amount) {
          toast.warning('Orçamento ultrapassado!', {
            description: `Excedido em R$ ${(newSpent - budget.amount).toFixed(2)}`,
            duration: 5000,
          });
        } else if (newSpent >= budget.amount * 0.8) {
          toast.warning('Atenção ao orçamento', {
            description: `Restam R$ ${(budget.amount - newSpent).toFixed(2)}`,
            duration: 5000,
          });
        }
      }
    } catch {
      // silencioso — não bloqueia a operação
    }
  };

  return {
    checkAccountDependencies,
    checkCategoryDependencies,
    validateAccountDeletion,
    validateCategoryDeletion,
    validateCreditLimit,
    recalculateAccountBalance,
    checkBudgetExceeded,
  };
};
