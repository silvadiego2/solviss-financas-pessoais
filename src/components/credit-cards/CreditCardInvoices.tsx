import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  ArrowLeft, Calendar, Receipt, ChevronDown, ChevronUp,
  Pencil, Trash2, CreditCard as CardIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { CreditCard } from '@/hooks/useCreditCards';
import { TransactionSheet } from '@/components/transactions/TransactionSheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatCurrency, formatDateBR } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Transaction } from '@/hooks/useTransactions';

interface Props {
  card: CreditCard;
  onClose: () => void;
}

type SheetState = { mode: 'edit'; transaction: Transaction } | { mode: 'closed' };

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

/**
 * Converte "YYYY-MM-DD" em Date LOCAL sem deslocamento UTC.
 * new Date("2026-06-01") = UTC midnight = 31/Mai 21:00 BRT → errado.
 * new Date(2026, 5, 1)   = local midnight               → correto.
 */
function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Retorna o período de fatura (ano/mês) de uma transação,
 * levando em conta o dia de fechamento.
 * Usa a data LOCAL da transação (não UTC).
 */
function invoicePeriod(dateStr: string, closingDay: number): { year: number; month: number } {
  const date = parseDateLocal(dateStr);
  const d    = date.getDate();
  if (d > closingDay) {
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  }
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Busca TODAS as transações de um cartão sem limite de paginação. */
async function fetchAllCardTransactions(userId: string, accountId: string) {
  const PAGE = 1000;
  let from    = 0;
  let rows: any[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name, icon, color)
      `)
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .or('status.is.null,status.neq.cancelled')
      .order('date', { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) throw error;
    rows = rows.concat(data ?? []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }

  return rows.map((t: any) => ({
    ...t,
    amount:        Number(t.amount),
    category_name: t.category?.name ?? null,
  })) as Transaction[];
}

export const CreditCardInvoices: React.FC<Props> = ({ card, onClose }) => {
  const { user }    = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading: loading } = useQuery({
    queryKey:  ['card-invoices', card.id],
    queryFn:   () => fetchAllCardTransactions(user!.id, card.id),
    enabled:   !!user,
    staleTime: 0,
  });

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [sheet, setSheet]             = useState<SheetState>({ mode: 'closed' });

  const closingDay = card.closing_day || 1;
  const dueDay     = card.due_day     || 10;
  const limit      = card.limit       || 0;
  const used       = card.used_amount || 0;
  const available  = limit - used;
  const usedPct    = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  const handleDeleteTx = async (id: string, desc: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id);
    if (error) { toast.error('Erro ao excluir transação'); return; }
    queryClient.invalidateQueries({ queryKey: ['card-invoices', card.id] });
    queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    toast.success(`"${desc}" excluída`);
  };

  // Agrupa transações por período de fatura
  const invoices = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    for (const t of transactions) {
      const { year, month } = invoicePeriod(t.date, closingDay);
      const key = `${year}-${String(month).padStart(2, '0')}`;
      (grouped[key] ??= []).push(t);
    }

    const now = new Date();
    return Object.entries(grouped)
      .map(([key, txs]) => {
        const [y, m] = key.split('-').map(Number);

        // Total da fatura: soma expenses, subtrai incomes (estornos/créditos)
        const total = txs.reduce((s, t) => {
          if (t.type === 'expense') return s + t.amount;
          if (t.type === 'income')  return s - t.amount;
          return s;
        }, 0);

        const daysInClosingMonth = new Date(y, m + 1, 0).getDate();
        const closingDate = new Date(y, m, Math.min(closingDay, daysInClosingMonth));
        const dueDate     = new Date(y, m + 1, dueDay);
        const isClosed    = now > closingDate;
        const isOverdue   = isClosed && now > dueDate;
        return {
          key, year: y, month: m, txs, total,
          closingDate, dueDate, isClosed, isOverdue,
          monthName: MONTH_NAMES[m],
        };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [transactions, closingDay, dueDay]);

  const openInvoices   = invoices.filter(i => !i.isClosed);
  const closedInvoices = invoices.filter(i =>  i.isClosed);

  // Subtotais por categoria dentro da fatura
  const categoryBreakdown = (txs: Transaction[]) => {
    const map: Record<string, { name: string; icon: string; total: number }> = {};
    for (const t of txs) {
      if (t.type !== 'expense') continue; // só despesas no breakdown
      const id   = t.category?.name ?? 'Sem categoria';
      const icon = t.category?.icon ?? '•';
      if (!map[id]) map[id] = { name: id, icon, total: 0 };
      map[id].total += t.amount;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  };

  const renderInvoice = (inv: typeof invoices[0]) => {
    const isOpen    = expandedKey === inv.key;
    const breakdown = categoryBreakdown(inv.txs);

    return (
      <div key={inv.key} className="bg-card rounded-2xl border border-border overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={() => setExpandedKey(isOpen ? null : inv.key)}>

          {/* Header da fatura */}
          <button
            className="w-full text-left px-5 py-4 hover:bg-muted/30 transition-colors"
            onClick={() => setExpandedKey(isOpen ? null : inv.key)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">
                    {inv.monthName} {inv.year}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Fecha {inv.closingDate.toLocaleDateString('pt-BR')} &middot; Vence {inv.dueDate.toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {inv.isOverdue ? (
                  <Badge variant="destructive" className="text-[10px] py-0">Vencida</Badge>
                ) : inv.isClosed ? (
                  <Badge variant="secondary" className="text-[10px] py-0">Fechada</Badge>
                ) : (
                  <Badge className="text-[10px] py-0 bg-blue-500 hover:bg-blue-500">Em aberto</Badge>
                )}

                <span className={cn(
                  'text-base font-bold tabular-nums',
                  inv.isOverdue  ? 'text-destructive' :
                  inv.isClosed   ? 'text-muted-foreground' :
                                   'text-foreground'
                )}>
                  {formatCurrency(inv.total)}
                </span>

                {isOpen
                  ? <ChevronUp  className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground">
                {inv.txs.length} lançamento{inv.txs.length !== 1 ? 's' : ''}
              </span>
              {breakdown.slice(0, 2).map(b => (
                <span key={b.name} className="text-xs text-muted-foreground">
                  {b.icon} {b.name} {formatCurrency(b.total)}
                </span>
              ))}
              {breakdown.length > 2 && (
                <span className="text-xs text-muted-foreground">+{breakdown.length - 2} cats.</span>
              )}
            </div>
          </button>

          {/* Corpo expandido */}
          <CollapsibleContent>
            <div className="border-t border-border">

              {breakdown.length > 1 && (
                <div className="px-5 py-3 bg-muted/20 flex flex-wrap gap-x-4 gap-y-1">
                  {breakdown.map(b => (
                    <span key={b.name} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{b.icon} {b.name}</span>
                      {' '}{formatCurrency(b.total)}
                    </span>
                  ))}
                </div>
              )}

              <div className="divide-y divide-border">
                {inv.txs
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateBR(t.date)}
                          {t.category && ` · ${t.category.icon} ${t.category.name}`}
                        </p>
                      </div>

                      <span className={cn(
                        'text-sm font-semibold tabular-nums flex-shrink-0',
                        t.type === 'income' ? 'text-green-500' : 'text-destructive'
                      )}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSheet({ mode: 'edit', transaction: t }); }}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                          aria-label="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                              aria-label="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                &ldquo;{t.description}&rdquo; será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTx(t.id, t.description)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {inv.isClosed ? 'Fechada em' : 'Fecha em'}{' '}
                  {inv.closingDate.toLocaleDateString('pt-BR')}
                  {' · '}Vence {inv.dueDate.toLocaleDateString('pt-BR')}
                </span>
                <span className="text-sm font-bold tabular-nums">
                  Total: {formatCurrency(inv.total)}
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const EmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Receipt className="w-10 h-10 mb-3 opacity-25" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );

  return (
    <>
      {sheet.mode === 'edit' && (
        <TransactionSheet
          state={sheet}
          onClose={() => {
            setSheet({ mode: 'closed' });
            queryClient.invalidateQueries({ queryKey: ['card-invoices', card.id] });
            queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
          }}
        />
      )}

      <div className="space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="label-eyebrow">Cartão de crédito</p>
            <h2 className="text-xl font-semibold tracking-tight">{card.name}</h2>
          </div>
        </div>

        {/* Card de limite */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CardIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Limite utilizado</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(used)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatCurrency(available)} disponível de {formatCurrency(limit)}
              </p>
            </div>
            <p className={cn(
              'text-lg font-bold tabular-nums',
              usedPct >= 90 ? 'text-destructive' :
              usedPct >= 70 ? 'text-orange-500' :
              'text-green-500'
            )}>
              {usedPct.toFixed(0)}%
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                usedPct >= 90 ? 'bg-destructive' :
                usedPct >= 70 ? 'bg-orange-500' :
                'bg-green-500'
              )}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <p className="text-xs text-muted-foreground">Fechamento</p>
              <p className="text-sm font-medium">Dia {closingDay}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencimento</p>
              <p className="text-sm font-medium">Dia {dueDay}</p>
            </div>
          </div>
        </div>

        {/* Faturas em aberto */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Em aberto ({openInvoices.length})
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : openInvoices.length === 0 ? (
            <EmptyState label="Nenhuma fatura em aberto" />
          ) : (
            openInvoices.map(renderInvoice)
          )}
        </section>

        {/* Faturas fechadas */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Fechadas ({closedInvoices.length})
          </h3>
          {!loading && closedInvoices.length === 0 && (
            <EmptyState label="Nenhuma fatura fechada ainda" />
          )}
          {closedInvoices.map(renderInvoice)}
        </section>

      </div>
    </>
  );
};
