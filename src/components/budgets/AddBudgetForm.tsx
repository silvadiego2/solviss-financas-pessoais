import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useBudgets, Budget } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';

interface AddBudgetFormProps {
  onClose: () => void;
  editingBudget?: Budget | null;
}

export const AddBudgetForm: React.FC<AddBudgetFormProps> = ({ onClose, editingBudget }) => {
  const { createBudget, updateBudget, isCreating, isUpdating } = useBudgets();
  const { categories } = useCategories();

  const now = new Date();
  const [formData, setFormData] = useState({
    category_id: editingBudget?.category_id || '',
    amount:      editingBudget?.amount      || 0,
    month:       editingBudget?.month       || now.getMonth() + 1,
    year:        editingBudget?.year        || now.getFullYear(),
    spent:       editingBudget?.spent       || 0,
  });

  const expenseCategories = (categories as any[]).filter(
    c => !c.type || c.type === 'expense'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id || formData.amount <= 0) return;
    if (editingBudget) {
      updateBudget({ id: editingBudget.id, ...formData });
    } else {
      createBudget(formData);
    }
    onClose();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          {editingBudget ? 'Editar Limite' : 'Novo Limite de Gasto'}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={20} />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <select
              id="category"
              value={formData.category_id}
              onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="">Selecione uma categoria</option>
              {expenseCategories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ''}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Limite mensal (R$) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
              placeholder="0,00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mês</Label>
              <select
                id="month"
                value={formData.month}
                onChange={e => setFormData({ ...formData, month: Number(e.target.value) })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                min="2020"
                max="2099"
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating} className="flex-1">
              {isCreating || isUpdating ? 'Salvando...' : editingBudget ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
