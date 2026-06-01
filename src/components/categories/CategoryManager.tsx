import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { BackHeader } from '@/components/layout/BackHeader';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { defaultCategories } from '@/data/defaultCategories';

interface CategoryManagerProps {
  onBack?: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onBack }) => {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: '📋',
    color: '#6B7280',
    transaction_type: 'expense' as 'income' | 'expense',
  });

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, newCategory);
        setEditingCategory(null);
      } else {
        await createCategory(newCategory);
      }
      setShowAddForm(false);
      setNewCategory({ name: '', icon: '📋', color: '#6B7280', transaction_type: 'expense' });
    } catch (_) {}
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      icon: category.icon || '📋',
      color: category.color || '#6B7280',
      transaction_type: category.transaction_type,
    });
    setShowAddForm(true);
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    const transactionCount = count ?? 0;
    const message = transactionCount > 0
      ? `A categoria "${categoryName}" possui ${transactionCount} transação(ões) vinculada(s).\n\n⚠️ Ao excluir, as transações ficarão sem categoria.\n\nDeseja continuar?`
      : `Excluir a categoria "${categoryName}"?`;

    if (!window.confirm(message)) return;
    try { await deleteCategory(categoryId); } catch (_) {}
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingCategory(null);
    setNewCategory({ name: '', icon: '📋', color: '#6B7280', transaction_type: 'expense' });
  };

  const incomeCategories  = categories.filter(c => c.transaction_type === 'income');
  const expenseCategories = categories.filter(c => c.transaction_type === 'expense');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackHeader
        title="Categorias"
        onBack={onBack}
        action={
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5">
            <Plus size={15} />
            <span>Nova</span>
          </Button>
        }
      />

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Pets, Academia..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Ícone</Label>
                  <Input
                    id="icon"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="📋"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={newCategory.transaction_type}
                    onValueChange={(value: 'income' | 'expense') =>
                      setNewCategory(prev => ({ ...prev, transaction_type: value }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <Input
                    id="color"
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCancelForm}>Cancelar</Button>
                <Button type="submit">{editingCategory ? 'Salvar Alterações' : 'Adicionar'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Receitas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600 text-base">
            <Tag size={17} /><span>Receitas ({incomeCategories.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {incomeCategories.map((category) => (
              <div key={category.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg leading-none">{category.icon}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditCategory(category)}>
                    <Edit size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(category.id, category.name)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
            {incomeCategories.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Nenhuma categoria de receita</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Despesas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 text-base">
            <Tag size={17} /><span>Despesas ({expenseCategories.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {expenseCategories.map((category) => (
              <div key={category.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg leading-none">{category.icon}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditCategory(category)}>
                    <Edit size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(category.id, category.name)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
            {expenseCategories.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Nenhuma categoria de despesa</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sugestões */}
      {defaultCategories.filter(d => !categories.some(e => e.name.toLowerCase() === d.name.toLowerCase())).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Sugestões</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {defaultCategories
                .filter(d => !categories.some(e => e.name.toLowerCase() === d.name.toLowerCase()))
                .slice(0, 6)
                .map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2"
                    onClick={() => {
                      setNewCategory({
                        name: suggestion.name,
                        icon: suggestion.icon,
                        color: suggestion.color,
                        transaction_type: suggestion.transaction_type,
                      });
                      setShowAddForm(true);
                    }}
                  >
                    <span className="mr-2">{suggestion.icon}</span>
                    <span className="text-xs">{suggestion.name}</span>
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
