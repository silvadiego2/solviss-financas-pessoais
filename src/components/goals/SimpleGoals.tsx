
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle } from 'lucide-react';

export const SimpleGoals: React.FC = () => {
  // Dados mockados para exemplo - pode ser conectado ao Supabase posteriormente
  const goals = [
    {
      id: '1',
      name: 'Reserva de Emergência',
      description: 'Juntar 6 meses de gastos',
      target_amount: 30000,
      current_amount: 12500,
      target_date: '2024-12-31',
      is_completed: false,
    },
    {
      id: '2',  
      name: 'Viagem de Férias',
      description: 'Viagem para Europa',
      target_amount: 15000,
      current_amount: 8200,
      target_date: '2024-07-15',
      is_completed: false,
    },
    {
      id: '3',
      name: 'Novo Smartphone',
      description: 'iPhone 15 Pro',
      target_amount: 8000,
      current_amount: 8000,
      target_date: '2024-03-01',
      is_completed: true,
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Objetivos Financeiros</h2>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Target size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Nenhum objetivo cadastrado</p>
            <p className="text-sm text-gray-400 mt-2">
              Defina seus objetivos financeiros e acompanhe o progresso
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = getProgress(goal.current_amount, goal.target_amount);
            const daysRemaining = getDaysRemaining(goal.target_date);
            
            return (
              <Card key={goal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center">
                      {goal.is_completed ? (
                        <CheckCircle size={20} className="text-green-600 mr-2" />
                      ) : (
                        <Target size={20} className="text-blue-600 mr-2" />
                      )}
                      {goal.name}
                    </CardTitle>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      goal.is_completed 
                        ? 'bg-green-100 text-green-800'
                        : daysRemaining < 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}>
                      {goal.is_completed 
                        ? 'Concluído'
                        : daysRemaining < 0
                          ? 'Atrasado'
                          : `${daysRemaining} dias`
                      }
                    </span>
                  </div>
                  {goal.description && (
                    <p className="text-sm text-gray-600">{goal.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  
                  <Progress value={progress} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-600">Atual: </span>
                      <span className="font-medium">{formatCurrency(goal.current_amount)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Meta: </span>
                      <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <span>Faltam: </span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(goal.target_amount - goal.current_amount)}
                    </span>
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
