
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Calendar, Receipt, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { CreditCard } from '@/hooks/useCreditCards';
import { EditTransactionForm } from '@/components/transactions/EditTransactionForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface CreditCardInvoicesProps {
  card: CreditCard;
  onClose: () => void;
}

export const CreditCardInvoices: React.FC<CreditCardInvoicesProps> = ({ card, onClose }) => {
  const { transactions, deleteTransaction } = useTransactions();
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month];
  };

  // Filtrar transações do cartão
  const cardTransactions = transactions.filter(t => t.account_id === card.id);

  // Agrupar transações por mês/ano
  const groupTransactionsByMonth = (transactions: Transaction[]) => {
    const grouped: { [key: string]: Transaction[] } = {};
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(transaction);
    });
    return grouped;
  };

  const groupedTransactions = groupTransactionsByMonth(cardTransactions);

  // Obter faturas abertas e fechadas
  const getInvoicesByStatus = () => {
    const invoices: {
      year: number;
      month: number;
      key: string;
      transactions: Transaction[];
      total: number;
      isClosed: boolean;
      monthName: string;
    }[] = [];
    const currentDate = new Date();
    
    for (let i = -12; i <= 3; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      const monthTransactions = groupedTransactions[key] || [];
      const total = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      if (total > 0) {
        const closingDate = new Date(year, month, card.closing_day);
        const isClosed = currentDate > closingDate;
        
        invoices.push({
          year,
          month,
          key,
          transactions: monthTransactions,
          total,
          isClosed,
          monthName: getMonthName(month)
        });
      }
    }
    
    return invoices;
  };

  const allInvoices = getInvoicesByStatus();
  const openInvoices = allInvoices.filter(inv => !inv.isClosed);
  const closedInvoices = allInvoices.filter(inv => inv.isClosed);

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteTransaction(transactionId);
      toast.success('Transação excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir transação');
    }
  };

  const toggleInvoice = (key: string) => {
    setExpandedInvoice(expandedInvoice === key ? null : key);
  };

  // Se estiver editando uma transação, mostrar o formulário de edição
  if (editingTransaction) {
    return (
      <EditTransactionForm 
        transaction={editingTransaction} 
        onClose={() => setEditingTransaction(null)} 
      />
    );
  }

  const renderInvoiceCard = (invoice: typeof allInvoices[0], isClosed: boolean) => (
    <Card key={invoice.key}>
      <Collapsible open={expandedInvoice === invoice.key} onOpenChange={() => toggleInvoice(invoice.key)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center space-x-2">
                <Calendar size={16} />
                <span>{invoice.monthName} {invoice.year}</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${isClosed ? 'text-muted-foreground' : 'text-destructive'}`}>
                  {formatCurrency(invoice.total)}
                </span>
                {expandedInvoice === invoice.key ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
              <span>{invoice.transactions.length} transação(ões)</span>
              {isClosed && <span className="text-green-600 font-medium">✓ Fechada</span>}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border-t pt-3 space-y-2">
              {invoice.transactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{transaction.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(transaction.date).toLocaleDateString('pt-BR')}</span>
                      {transaction.category && (
                        <span className="bg-muted px-1.5 py-0.5 rounded">
                          {transaction.category.icon} {transaction.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-destructive">
                      {formatCurrency(transaction.amount)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTransaction(transaction);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A transação "{transaction.description}" será permanentemente removida.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
            
            {!isClosed && (
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
                <div>Fechamento: {card.closing_day}/{invoice.month + 1}/{invoice.year}</div>
                <div>Vencimento: {card.due_day}/{invoice.month + 1}/{invoice.year}</div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="p-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-lg font-semibold">Faturas - {card.name}</h2>
      </div>

      <Tabs defaultValue="open" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="open">Abertas ({openInvoices.length})</TabsTrigger>
          <TabsTrigger value="closed">Fechadas ({closedInvoices.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="open" className="space-y-4">
          {openInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Receipt size={48} className="text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma fatura em aberto</p>
              </CardContent>
            </Card>
          ) : (
            openInvoices.map((invoice) => renderInvoiceCard(invoice, false))
          )}
        </TabsContent>
        
        <TabsContent value="closed" className="space-y-4">
          {closedInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Receipt size={48} className="text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma fatura fechada</p>
              </CardContent>
            </Card>
          ) : (
            closedInvoices.map((invoice) => renderInvoiceCard(invoice, true))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
