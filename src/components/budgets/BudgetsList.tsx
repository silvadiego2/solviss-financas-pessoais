
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { useBudgets } from '@/hooks/useBudgets';
import { AddBudgetForm } from './AddBudgetForm';

export const BudgetsList: React.FC = () => {
  const { budgets, loading } = useBudgets();
  const [showAddForm, setShowAddForm] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getSpentPercentage = (spent: number, budget: number) => {
    return budget > 0 ? (spent / budget) * 100 : 0;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 100) return <AlertTriangle size={16} className="text-red-500" />;
    if (percentage >= 80) return <TrendingUp size={16} className="text-yellow-500" />;
    return <Target size={16} className="text-green-500" />;
  };

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const overallPercentage = getSpentPercentage(totalSpent, totalBudget);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (showAddForm) {
    return <AddBudgetForm onClose={() => setShowAddForm(false)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Orçamentos</h2>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Novo Orçamento</span>
        </Button>
      </div>

      {/* Resumo Geral */}
      {budgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target size={20} />
              <span>Resumo do Mês</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Orçado</span>
                <span className="font-medium">{formatCurrency(totalBudget)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Gasto</span>
                <span className={`font-medium ${overallPercentage >= 100 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(totalSpent)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${getProgressColor(overallPercentage)}`}
                  style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{overallPercentage.toFixed(1)}% do orçamento</span>
                <span className={overallPercentage >= 100 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(totalBudget - totalSpent)} restante
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target size={48} className="text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum orçamento encontrado
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Crie orçamentos para controlar melhor seus gastos mensais
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              Criar Primeiro Orçamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => {
            const spentPercentage = getSpentPercentage(budget.spent, budget.amount);
            const remaining = budget.amount - budget.spent;
            
            return (
              <Card key={budget.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{budget.category?.icon}</span>
                        <div>
                          <h3 className="font-medium">{budget.category?.name}</h3>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(budget.spent)} de {formatCurrency(budget.amount)}
                          </p>
                        </div>
                      </div>
                      {getStatusIcon(spentPercentage)}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${getProgressColor(spentPercentage)}`}
                          style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{spentPercentage.toFixed(1)}%</span>
                        <span className={remaining < 0 ? 'text-red-600' : 'text-green-600'}>
                          {remaining < 0 ? 'Excedido em ' : 'Restam '}
                          {formatCurrency(Math.abs(remaining))}
                        </span>
                      </div>
                    </div>

                    {/* Status Message */}
                    {spentPercentage >= 100 && (
                      <div className="flex items-center space-x-2 text-red-600 text-sm">
                        <AlertTriangle size={14} />
                        <span>Orçamento excedido!</span>
                      </div>
                    )}
                    {spentPercentage >= 80 && spentPercentage < 100 && (
                      <div className="flex items-center space-x-2 text-yellow-600 text-sm">
                        <TrendingUp size={14} />
                        <span>Atenção: próximo do limite</span>
                      </div>
                    )}
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
