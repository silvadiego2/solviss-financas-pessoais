
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { useGoals, Goal } from '@/hooks/useGoals';

interface AddGoalFormProps {
  onClose: () => void;
  editingGoal?: Goal | null;
}

export const AddGoalForm: React.FC<AddGoalFormProps> = ({ onClose, editingGoal }) => {
  const { addGoal, updateGoal, isAddingGoal, isUpdatingGoal } = useGoals();
  const [formData, setFormData] = useState({
    name: editingGoal?.name || '',
    description: editingGoal?.description || '',
    target_amount: editingGoal?.target_amount || 0,
    current_amount: editingGoal?.current_amount || 0,
    target_date: editingGoal?.target_date || '',
    is_completed: editingGoal?.is_completed || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    if (editingGoal) {
      updateGoal({
        id: editingGoal.id,
        ...formData,
      });
    } else {
      addGoal(formData);
    }
    
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          {editingGoal ? 'Editar Meta' : 'Nova Meta Financeira'}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <X size={20} />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Meta *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Reserva de Emergência"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva sua meta financeira"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_amount">Valor Alvo *</Label>
              <Input
                id="target_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: Number(e.target.value) })}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_amount">Valor Atual</Label>
              <Input
                id="current_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.current_amount}
                onChange={(e) => setFormData({ ...formData, current_amount: Number(e.target.value) })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_date">Data Limite (Opcional)</Label>
            <Input
              id="target_date"
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            />
          </div>

          {editingGoal && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_completed"
                checked={formData.is_completed}
                onChange={(e) => setFormData({ ...formData, is_completed: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_completed">Meta concluída</Label>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isAddingGoal || isUpdatingGoal}
              className="flex-1"
            >
              {isAddingGoal || isUpdatingGoal ? 'Salvando...' : editingGoal ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
