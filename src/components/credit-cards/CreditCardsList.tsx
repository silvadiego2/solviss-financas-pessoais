
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard as CreditCardIcon, Settings, Calendar } from 'lucide-react';
import { useCreditCards } from '@/hooks/useCreditCards';
import { AddCreditCardForm } from './AddCreditCardForm';

export const CreditCardsList: React.FC = () => {
  const { creditCards, loading } = useCreditCards();
  const [showAddForm, setShowAddForm] = useState(false);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (showAddForm) {
    return <AddCreditCardForm onClose={() => setShowAddForm(false)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cartões de Crédito</h2>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Adicionar Cartão</span>
        </Button>
      </div>

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

                    {/* Botão de Configurações */}
                    <Button variant="outline" size="sm" className="w-full">
                      <Settings size={16} className="mr-2" />
                      Configurações
                    </Button>
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
