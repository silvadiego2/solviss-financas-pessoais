import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface CreditCard {
  id: string;
  name: string;
  bank_name: string;
  limit: number;
  /** Total efetivamente comprometido no limite (faturas fechadas não pagas + fatura aberta) */
  used_amount: number;
  /** Somente o total da fatura fechada(s) ainda não pagas */
  unpaid_invoices_total: number;
  /** Somente o total da fatura corrente (em aberto) */
  open_invoice_total: number;
  closing_day: number;
  due_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

/** Retorna "YYYY-MM-DD" usando data LOCAL — sem conversão UTC. */
function toLocalDateStr(d: Date): string {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  return toLocalDateStr(new Date());
}

/**
 * Retorna o período "referência" de fatura (ano/mês) de uma transação,
 * levando em conta o dia de fechamento — lógica idêntica ao CreditCardInvoices.
 *
 * Se a data da transação é DEPOIS do fechamento deste mês, ela pertence
 * à fatura do próximo mês; caso contrário, pertence à fatura deste mês.
 */
function invoicePeriod(
  dateStr: string,
  closingDay: number,
): { year: number; month: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date      = new Date(y, m - 1, d); // data LOCAL, sem UTC
  const day       = date.getDate();

  if (day > closingDay) {
    // Pertence à fatura do próximo mês
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return { year: next.getFullYear(), month: next.getMonth() }; // 0-based
  }
  return { year: date.getFullYear(), month: date.getMonth() }; // 0-based
}

/**
 * Calcula as datas de fechamento e vencimento de um ciclo (year/month 0-based).
 */
function invoiceDates(
  year: number,
  month: number, // 0-based
  closingDay: number,
  dueDay: number,
): { closingDate: Date; dueDate: Date } {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const closingDate = new Date(year, month, Math.min(closingDay, daysInMonth));
  // Vencimento é no mês seguinte
  const dueDate     = new Date(year, month + 1, dueDay);
  return { closingDate, dueDate };
}

/**
 * Palavras-chave que identificam um lançamento como pagamento da fatura.
 * Aceita variações comuns que usuários digitam.
 */
const PAYMENT_KEYWORDS = [
  'pagamento fatura',
  'pag. fatura',
  'pag fatura',
  'pagto fatura',
  'pagamento cartão',
  'pag. cartão',
  'pag cartão',
  'pagamento cartao',
  'pag cartao',
  'pagamento de fatura',
  'crédito fatura',
  'credito fatura',
  'pagamento de cartão',
  'fatura paga',
];

/**
 * Determina se uma fatura foi paga a partir das transações do PRÓPRIO cartão.
 *
 * Critérios (qualquer um satisfaz):
 *  1. Existe um income no cartão com descrição contendo keyword de pagamento.
 *  2. Existe um income no cartão cujo valor >= 95% do total da fatura
 *     (cobre pagamento total ou quase total).
 *
 * Nota: quando o usuário registra o pagamento numa conta bancária (income
 * na conta, não no cartão), o saldo do cartão não é afetado diretamente.
 * Por isso, a detecção aqui é conservadora: só abate do limite quando há
 * evidência de crédito no próprio cartão.
 */
function isFaturaPaid(faturaTotal: number, cardTransactions: Array<{ type: string; amount: number; description: string }>): boolean {
  for (const tx of cardTransactions) {
    if (tx.type !== 'income') continue;
    const desc = tx.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedDesc = desc;
    // Critério 1: keyword de pagamento
    if (PAYMENT_KEYWORDS.some(kw =>
      normalizedDesc.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    )) return true;
    // Critério 2: valor >= 95% do total (pagamento integral ou quase)
    if (faturaTotal > 0 && tx.amount >= faturaTotal * 0.95) return true;
  }
  return false;
}

// ─── Fetcher principal ────────────────────────────────────────────────────────

async function fetchCreditCardsWithLimit(
  userId: string,
): Promise<CreditCard[]> {
  // 1. Busca contas do tipo credit_card ativas
  const { data: accounts, error: accErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'credit_card')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (accErr) throw accErr;
  if (!accounts || accounts.length === 0) return [];

  return Promise.all(
    accounts.map(async (account) => {
      const closingDay = account.closing_day ?? 10;
      const dueDay     = account.due_day     ?? 10;
      const limit      = Number(account.credit_limit) || 0;

      // 2. Busca TODAS as transações do cartão (sem filtro de período)
      //    para poder avaliar todas as faturas, pagas ou não.
      const PAGE = 1000;
      let from = 0;
      let allTx: Array<{ type: string; amount: number; description: string; date: string }> = [];

      while (true) {
        const { data, error } = await supabase
          .from('transactions')
          .select('type, amount, description, date')
          .eq('user_id', userId)
          .eq('account_id', account.id)
          .or('status.is.null,status.neq.cancelled')
          .order('date', { ascending: false })
          .range(from, from + PAGE - 1);

        if (error) throw error;
        const rows = (data ?? []).map(t => ({ ...t, amount: Number(t.amount) }));
        allTx = allTx.concat(rows);
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }

      // 3. Agrupa por ciclo de fatura
      const grouped: Record<string, typeof allTx> = {};
      for (const tx of allTx) {
        const { year, month } = invoicePeriod(tx.date, closingDay);
        const key = `${year}-${String(month).padStart(2, '0')}`;
        (grouped[key] ??= []).push(tx);
      }

      const now = new Date();
      let unpaid_invoices_total = 0;
      let open_invoice_total    = 0;

      for (const [key, txs] of Object.entries(grouped)) {
        const [y, m] = key.split('-').map(Number);
        const { closingDate } = invoiceDates(y, m, closingDay, dueDay);
        const isClosed = now > closingDate;

        // Total da fatura: soma despesas, subtrai estornos/créditos
        const faturaTotal = txs.reduce((s, tx) => {
          if (tx.type === 'expense') return s + tx.amount;
          if (tx.type === 'income')  return s - tx.amount;
          return s;
        }, 0);

        if (faturaTotal <= 0) continue; // fatura zerada / crédito puro — ignora

        if (!isClosed) {
          // Fatura corrente (em aberto) — sempre compromete o limite
          open_invoice_total += faturaTotal;
        } else {
          // Fatura fechada: só compromete o limite se NÃO foi paga
          const paid = isFaturaPaid(faturaTotal, txs);
          if (!paid) {
            unpaid_invoices_total += faturaTotal;
          }
        }
      }

      const used_amount = Math.max(0, unpaid_invoices_total + open_invoice_total);

      return {
        id:          account.id,
        name:        account.name,
        bank_name:   account.bank_name  ?? '',
        limit,
        used_amount,
        unpaid_invoices_total: Math.max(0, unpaid_invoices_total),
        open_invoice_total:    Math.max(0, open_invoice_total),
        closing_day: closingDay,
        due_day:     dueDay,
        is_active:   account.is_active  ?? true,
        created_at:  account.created_at ?? '',
        updated_at:  account.updated_at ?? '',
      } satisfies CreditCard;
    })
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCreditCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // queryKey inclui todayStr() para que os ciclos recalculem à meia-noite
  const { data: creditCards = [], isLoading } = useQuery({
    queryKey:  ['credit_cards', user?.id, todayStr()],
    queryFn:   () => fetchCreditCardsWithLimit(user!.id),
    enabled:   !!user,
    staleTime: 0,
    gcTime:    5 * 60 * 1000,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createCreditCardMutation = useMutation({
    mutationFn: async (cardData: Omit<CreditCard, 'id' | 'created_at' | 'updated_at' | 'used_amount' | 'unpaid_invoices_total' | 'open_invoice_total'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('accounts')
        .insert([{
          user_id:      user.id,
          name:         cardData.name,
          bank_name:    cardData.bank_name,
          type:         'credit_card' as const,
          credit_limit: cardData.limit,
          balance:      cardData.limit,
          closing_day:  cardData.closing_day,
          due_day:      cardData.due_day,
          is_active:    cardData.is_active,
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
    onError: (e: any) => toast.error('Erro ao adicionar cartão', { description: e?.message }),
  });

  const updateCreditCardMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditCard> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.name        !== undefined) updateData.name        = updates.name;
      if (updates.bank_name   !== undefined) updateData.bank_name   = updates.bank_name;
      if (updates.closing_day !== undefined) updateData.closing_day = updates.closing_day;
      if (updates.due_day     !== undefined) updateData.due_day     = updates.due_day;
      if (updates.is_active   !== undefined) updateData.is_active   = updates.is_active;
      if (updates.limit       !== undefined) updateData.credit_limit = updates.limit;

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
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Cartão atualizado com sucesso!');
    },
    onError: (e: any) => toast.error('Erro ao atualizar cartão', { description: e?.message }),
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
    onError: (e: any) => toast.error('Erro ao excluir cartão', { description: e?.message }),
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
