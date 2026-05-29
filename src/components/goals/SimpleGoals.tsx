import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle, Plus, Edit, Trash2, PiggyBank, X, Check } from 'lucide-react';
import { useGoals, Goal } from '@/hooks/useGoals';
import { AddGoalForm } from './AddGoalForm';
import { BackHeader } from '@/components/layout/BackHeader';
import { formatCurrency } from '@/utils/formatters';

interface SimpleGoalsProps {
  onBack?: () => void;
}

export const SimpleGoals: React.FC<SimpleGoalsProps> = ({ onBack }) => {
  const { goals, updateGoal, deleteGoal, isDeletingGoal, isUpdatingGoal } = useGoals();
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [editingGoal,  setEditingGoal]  = useState<Goal | null>(null);
  // id da meta com o mini-form de aporte aberto
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositValue,  setDepositValue]  = useState('');

  const getProgress = (current: number, target: number) =>
    Math.min((current / target) * 100, 100);

  const getDaysRemaining = (targetDate: string) => {
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setShowAddForm(true);
  };

  const handleDelete = (goalId: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) deleteGoal(goalId);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingGoal(null);
  };

  const openDeposit = (goalId: string) => {
    setDepositGoalId(goalId);
    setDepositValue('');
  };

  const closeDeposit = () => {
    setDepositGoalId(null);
    setDepositValue('');
  };

  const handleDeposit = (goal: Goal) => {
    // aceita vírgula como separador decimal
    const parsed = parseFloat(depositValue.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) return;

    const newAmount = goal.current_amount + parsed;
    const isCompleted = newAmount >= goal.target_amount;

    updateGoal({
      id: goal.id,
      current_amount: Math.min(newAmount, goal.target_amount),
      is_completed: isCompleted,
    });
    closeDeposit();
  };

  if (showAddForm) {
    return <AddGoalForm onClose={handleCloseForm} editingGoal={editingGoal} />;
  }

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Objetivos Financeiros" onBack={onBack} />}

      <div className="flex items-center justify-between">
        {!onBack && <h2 className="text-lg font-semibold">Objetivos Financeiros</h2>}
        <div className={!onBack ? '' : 'ml-auto'}>
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus size={16} className="mr-2" /> Adicionar Meta
          </Button>
        </div>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <Target size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">Nenhuma meta cadastrada</p>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              Defina objetivos financeiros e acompanhe o progresso
            </p>
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus size={16} className="mr-2" /> Adicionar Primeira Meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress      = getProgress(goal.current_amount, goal.target_amount);
            const daysRemaining = goal.target_date ? getDaysRemaining(goal.target_date) : null;
            const overdue       = daysRemaining !== null && daysRemaining < 0;
            const isDepositing  = depositGoalId === goal.id;

            return (
              <Card key={goal.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {goal.is_completed
                        ? <CheckCircle size={18} className="text-success flex-shrink-0" />
                        : <Target size={18} className="text-primary flex-shrink-0" />}
                      <CardTitle className="text-base truncate">{goal.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {goal.target_date && (
                        <Badge
                          variant="secondary"
                          className={goal.is_completed
                            ? 'bg-success/10 text-success'
                            : overdue
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-primary/10 text-primary'}
                        >
                          {goal.is_completed ? 'Concluído' : overdue ? 'Atrasado' : `${daysRemaining}d`}
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(goal)} className="h-7 w-7">
                        <Edit size={13} />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => handleDelete(goal.id)}
                        disabled={isDeletingGoal}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{formatCurrency(goal.current_amount)}</span>
                      {' '}de {formatCurrency(goal.target_amount)}
                    </span>
                    <span className="font-medium">{progress.toFixed(1)}%</span>
                  </div>

                  {!goal.is_completed && (
                    <p className="text-xs text-muted-foreground">
                      Faltam{' '}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(Math.max(0, goal.target_amount - goal.current_amount))}
                      </span>
                    </p>
                  )}

                  {/* ── Aporte inline ─────────────────────────────────── */}
                  {!goal.is_completed && (
                    isDepositing ? (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground shrink-0">R$</span>
                        <Input
                          autoFocus
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={depositValue}
                          onChange={e => setDepositValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleDeposit(goal);
                            if (e.key === 'Escape') closeDeposit();
                          }}
                          className="h-8 text-sm"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-success hover:text-success"
                          disabled={isUpdatingGoal}
                          onClick={() => handleDeposit(goal)}
                          aria-label="Confirmar aporte"
                        >
                          <Check size={15} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={closeDeposit}
                          aria-label="Cancelar"
                        >
                          <X size={15} />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs gap-1.5"
                        onClick={() => openDeposit(goal.id)}
                      >
                        <PiggyBank size={13} />
                        Registrar aporte
                      </Button>
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
