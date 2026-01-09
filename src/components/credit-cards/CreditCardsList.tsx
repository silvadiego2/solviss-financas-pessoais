import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard as CreditCardIcon, Settings, Calendar, Receipt, Eye, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useTransactions } from '@/hooks/useTransactions';
import { AddCreditCardForm } from './AddCreditCardForm';
import { CreditCardInvoices } from './CreditCardInvoices';
import { EditCreditCardForm } from './EditCreditCardForm';
import { BackHeader } from '@/components/layout/BackHeader';

interface CreditCardsListProps {
  onBack?: () => void;
}

export const CreditCardsList: React.FC<CreditCardsListProps> = ({ onBack }) => {
  const { creditCards, loading, deleteCreditCard } = useCreditCards();
  const { transactions } = useTransactions();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [selectedCardForInvoices, setSelectedCardForInvoices] = useState<any>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return limit > 0 ? (used / limit) * 100 : 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleDelete = (cardId: string) => {
    deleteCreditCard(cardId);
  };

  const handleEdit = (card: any) => {
    setEditingCard(card);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingCard(null);
  };

  // Calcular estatísticas gerais dos cartões
  const getCardStatistics = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    let totalOpenInvoices = 0;
    let totalExpenses = 0;

    creditCards.forEach(card => {
      const cardTransactions = transactions.filter(t => t.account_id === card.id);
      
      // Transações do mês atual para faturas abertas
      const currentMonthTransactions = cardTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      });
      
      const monthlyTotal = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
      totalOpenInvoices += monthlyTotal;
      totalExpenses += cardTransactions.reduce((sum, t) => sum + t.amount, 0);
    });

    return { totalOpenInvoices, totalExpenses };
  };

  const { totalOpenInvoices, totalExpenses } = getCardStatistics();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (showAddForm && !editingCard) {
    return <AddCreditCardForm onClose={handleCloseForm} editingCard={editingCard} />;
  }

  if (editingCard) {
    return <EditCreditCardForm card={editingCard} onClose={handleCloseForm} />;
  }

  if (selectedCardForInvoices) {
    return (
      <CreditCardInvoices 
        card={selectedCardForInvoices} 
        onClose={() => setSelectedCardForInvoices(null)} 
      />
    );
  }

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Cartões de Crédito" onBack={onBack} />}
      <div className="flex items-center justify-between">
        {!onBack && <h2 className="text-lg font-semibold">Cartões de Crédito</h2>}
        <Button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Adicionar Cartão</span>
        </Button>
      </div>

      {/* Resumo Geral */}
      {creditCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Faturas Abertas</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(totalOpenInvoices)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Total Gasto</p>
              <p className="text-lg font-bold text-gray-800">
                {formatCurrency(totalExpenses)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {creditCards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CreditCardIcon size={48} className="text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum cartão encontrado
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Adicione seus cartões de crédito para controlar melhor seus gastos
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              Adicionar Primeiro Cartão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {creditCards.map((card) => {
            const usagePercentage = getUsagePercentage(card.used_amount, card.limit);
            const availableLimit = card.limit - card.used_amount;
            
            return (
              <Card key={card.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{card.name}</CardTitle>
                      <p className="text-blue-100">{card.bank_name}</p>
                    </div>
                    <CreditCardIcon size={24} />
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Limite e Utilização */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Limite Utilizado</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(card.used_amount)} / {formatCurrency(card.limit)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${getUsageColor(usagePercentage)}`}
                          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {usagePercentage.toFixed(1)}% utilizado
                      </p>
                    </div>

                    {/* Limite Disponível */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Limite Disponível</span>
                      <span className={`text-sm font-medium ${availableLimit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(availableLimit)}
                      </span>
                    </div>

                    {/* Datas */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar size={16} className="text-gray-400" />
                        <div>
                          <p className="text-gray-600">Fechamento</p>
                          <p className="font-medium">Dia {card.closing_day}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar size={16} className="text-gray-400" />
                        <div>
                          <p className="text-gray-600">Vencimento</p>
                          <p className="font-medium">Dia {card.due_day}</p>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="grid grid-cols-4 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedCardForInvoices(card)}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(card)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings size={16} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </Button>
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
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
