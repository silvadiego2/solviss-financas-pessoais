
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { useGoals, Goal } from '@/hooks/useGoals';
import { AddGoalForm } from './AddGoalForm';
import { BackHeader } from '@/components/layout/BackHeader';

interface SimpleGoalsProps {
  onBack?: () => void;
}

export const SimpleGoals: React.FC<SimpleGoalsProps> = ({ onBack }) => {
  const { goals, deleteGoal, isDeletingGoal } = useGoals();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

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

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setShowAddForm(true);
  };

  const handleDelete = (goalId: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      deleteGoal(goalId);
    }
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingGoal(null);
  };

  if (showAddForm) {
    return <AddGoalForm onClose={handleCloseForm} editingGoal={editingGoal} />;
  }

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Objetivos Financeiros" onBack={onBack} />}
      
      {!onBack && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Objetivos Financeiros</h2>
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus size={16} className="mr-2" />
            Adicionar Meta
          </Button>
        </div>
      )}

      {onBack && (
        <div className="flex justify-end">
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus size={16} className="mr-2" />
            Adicionar Meta
          </Button>
        </div>
      )}

      {goals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Target size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">Nenhuma meta cadastrada</p>
            <p className="text-sm text-gray-400 mb-4">
              Defina seus objetivos financeiros e acompanhe o progresso
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus size={16} className="mr-2" />
              Adicionar Primeira Meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = getProgress(goal.current_amount, goal.target_amount);
            const daysRemaining = goal.target_date ? getDaysRemaining(goal.target_date) : null;
            
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
                    <div className="flex items-center gap-2">
                      {goal.target_date && (
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          goal.is_completed 
                            ? 'bg-green-100 text-green-800'
                            : daysRemaining && daysRemaining < 0
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {goal.is_completed 
                            ? 'Concluído'
                            : daysRemaining && daysRemaining < 0
                              ? 'Atrasado'
                              : `${daysRemaining} dias`
                          }
                        </span>
                      )}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(goal)}
                          className="h-8 w-8"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(goal.id)}
                          disabled={isDeletingGoal}
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
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
                      {formatCurrency(Math.max(0, goal.target_amount - goal.current_amount))}
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
