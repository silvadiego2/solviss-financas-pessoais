import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard as CreditCardIcon, Calendar, Receipt, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCreditCards } from '@/hooks/useCreditCards';
import { formatCurrency } from '@/utils/formatters';
import { AddCreditCardForm } from './AddCreditCardForm';
import { CreditCardInvoices } from './CreditCardInvoices';
import { EditCreditCardForm } from './EditCreditCardForm';

const getUsagePercentage = (used: number, limit: number) =>
  limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

const getBarColor = (pct: number): string => {
  if (pct >= 80) return 'var(--color-destructive, #ef4444)';
  if (pct >= 60) return 'var(--color-warning, #f59e0b)';
  return 'var(--color-success, #22c55e)';
};

const getPercentageTextClass = (pct: number): string => {
  if (pct >= 80) return 'text-destructive';
  if (pct >= 60) return 'text-yellow-500';
  return 'text-green-500';
};

export const CreditCardsList: React.FC = () => {
  const { creditCards, loading, deleteCreditCard } = useCreditCards();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [selectedCardForInvoices, setSelectedCardForInvoices] = useState<any>(null);

  const handleDelete = (cardId: string) => deleteCreditCard(cardId);
  const handleEdit = (card: any) => { setEditingCard(card); setShowAddForm(true); };
  const handleCloseForm = () => { setShowAddForm(false); setEditingCard(null); };

  // Totais calculados direto dos dados já agregados pelo useCreditCards (query no Supabase)
  const totalOpenInvoices = creditCards.reduce((s, c) => s + c.used_amount, 0);
  const totalLimit = creditCards.reduce((s, c) => s + c.limit, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (showAddForm && !editingCard) return <AddCreditCardForm onClose={handleCloseForm} editingCard={editingCard} />;
  if (editingCard) return <EditCreditCardForm card={editingCard} onClose={handleCloseForm} />;
  if (selectedCardForInvoices) return <CreditCardInvoices card={selectedCardForInvoices} onClose={() => setSelectedCardForInvoices(null)} />;

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cartões de Crédito</h2>
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus size={16} /> Novo Cartão
        </Button>
      </div>

      {creditCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-elevated p-5">
            <p className="label-eyebrow">Fatura do Mês</p>
            <p className="figure-hero text-2xl mt-2 text-destructive">{formatCurrency(totalOpenInvoices)}</p>
          </div>
          <div className="card-elevated p-5">
            <p className="label-eyebrow">Limite Total</p>
            <p className="figure-hero text-2xl mt-2">{formatCurrency(totalLimit)}</p>
          </div>
          <div className="card-elevated p-5">
            <p className="label-eyebrow">Cartões Ativos</p>
            <p className="figure-hero text-2xl mt-2">{creditCards.length}</p>
          </div>
        </div>
      )}

      {creditCards.length === 0 ? (
        <div className="card-elevated flex flex-col items-center justify-center py-14 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4">
            <CreditCardIcon size={22} className="text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-1">Nenhum cartão cadastrado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-5">
            Adicione seus cartões de crédito para controlar limites, faturas e vencimentos.
          </p>
          <Button onClick={() => setShowAddForm(true)}>Adicionar primeiro cartão</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {creditCards.map((card) => {
            const pct = getUsagePercentage(card.used_amount, card.limit);
            const available = card.limit - card.used_amount;
            const barColor = getBarColor(pct);
            const pctClass = getPercentageTextClass(pct);

            return (
              <div key={card.id} className="card-elevated overflow-hidden flex flex-col">
                <div className="relative bg-primary text-primary-foreground p-6">
                  <div
                    className="absolute inset-0 opacity-[0.05] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}
                  />
                  <div className="relative flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.14em] opacity-60 font-semibold">{card.bank_name}</p>
                      <h3 className="font-display text-lg font-semibold mt-1 truncate">{card.name}</h3>
                    </div>
                    <CreditCardIcon size={22} className="opacity-70 flex-shrink-0" />
                  </div>
                  <div className="relative mt-7">
                    <p className="text-[10px] uppercase tracking-[0.14em] opacity-60 font-semibold">Limite Disponível</p>
                    <p className={`figure-hero text-2xl mt-1 ${available < 0 ? 'text-destructive-foreground/90' : ''}`}>
                      {formatCurrency(available)}
                    </p>
                  </div>
                </div>

                <div className="p-5 space-y-5 flex-1">
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xs text-muted-foreground font-medium">Limite Utilizado</span>
                      <span className="figure text-sm">
                        {formatCurrency(card.used_amount)}{' '}
                        <span className="text-muted-foreground font-normal">/ {formatCurrency(card.limit)}</span>
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className={`text-xs font-semibold ${pctClass}`}>
                        {card.limit > 0 ? `${pct.toFixed(1)}% utilizado` : 'Limite não definido'}
                      </p>
                      {pct >= 80 && <p className="text-xs text-destructive font-medium">⚠️ Limite crítico</p>}
                      {pct >= 60 && pct < 80 && <p className="text-xs text-yellow-500 font-medium">Atenção</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-lg bg-muted/60 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        <Calendar size={11} /> Fechamento
                      </div>
                      <p className="figure text-sm mt-1">Dia {card.closing_day}</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        <Calendar size={11} /> Vencimento
                      </div>
                      <p className="figure text-sm mt-1">Dia {card.due_day}</p>
                    </div>
                  </div>
                </div>

                <div className="flex border-t border-border">
                  <button
                    onClick={() => setSelectedCardForInvoices(card)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-accent/60 transition-colors"
                  >
                    <Receipt size={14} /> Faturas
                  </button>
                  <div className="w-px bg-border" />
                  <button
                    onClick={() => handleEdit(card)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-accent/60 transition-colors"
                  >
                    <Edit size={14} /> Editar
                  </button>
                  <div className="w-px bg-border" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                        <Trash2 size={14} /> Excluir
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o cartão "{card.name}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(card.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
