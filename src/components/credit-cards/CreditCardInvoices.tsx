
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Receipt } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { CreditCard } from '@/hooks/useCreditCards';

interface CreditCardInvoicesProps {
  card: CreditCard;
  onClose: () => void;
}

export const CreditCardInvoices: React.FC<CreditCardInvoicesProps> = ({ card, onClose }) => {
  const { transactions } = useTransactions();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
  const groupTransactionsByMonth = (transactions: any[]) => {
    const grouped: { [key: string]: any[] } = {};
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
  const currentMonthKey = `${selectedYear}-${selectedMonth}`;
  const currentMonthTransactions = groupedTransactions[currentMonthKey] || [];
  const currentMonthTotal = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Verificar se a fatura está fechada (baseado no dia de fechamento)
  const isInvoiceClosed = () => {
    const today = new Date();
    const closingDate = new Date(selectedYear, selectedMonth, card.closing_day);
    return today > closingDate;
  };

  // Obter faturas abertas e fechadas
  const getInvoicesByStatus = () => {
    const invoices: any[] = [];
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
          <TabsTrigger value="open">Faturas Abertas ({openInvoices.length})</TabsTrigger>
          <TabsTrigger value="closed">Faturas Fechadas ({closedInvoices.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="open" className="space-y-4">
          {openInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Receipt size={48} className="text-gray-400 mb-4" />
                <p className="text-gray-500">Nenhuma fatura em aberto</p>
              </CardContent>
            </Card>
          ) : (
            openInvoices.map((invoice) => (
              <Card key={invoice.key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Calendar size={16} />
                      <span>{invoice.monthName} {invoice.year}</span>
                    </CardTitle>
                    <span className="text-lg font-bold text-red-600">
                      {formatCurrency(invoice.total)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {invoice.transactions.length} transação(ões)
                    </p>
                    <div className="text-xs text-gray-500">
                      Fechamento: {card.closing_day}/{invoice.month + 1}/{invoice.year}
                    </div>
                    <div className="text-xs text-gray-500">
                      Vencimento: {card.due_day}/{invoice.month + 1}/{invoice.year}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="closed" className="space-y-4">
          {closedInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Receipt size={48} className="text-gray-400 mb-4" />
                <p className="text-gray-500">Nenhuma fatura fechada</p>
              </CardContent>
            </Card>
          ) : (
            closedInvoices.map((invoice) => (
              <Card key={invoice.key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Calendar size={16} />
                      <span>{invoice.monthName} {invoice.year}</span>
                    </CardTitle>
                    <span className="text-lg font-bold text-gray-600">
                      {formatCurrency(invoice.total)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {invoice.transactions.length} transação(ões)
                    </p>
                    <div className="text-xs text-green-600 font-medium">
                      ✓ Fatura Fechada
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
