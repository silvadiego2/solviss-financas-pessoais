import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BackHeader } from '@/components/layout/BackHeader';
import { useCategories } from '@/hooks/useCategories';
import { Tag, Plus, Trash2 } from 'lucide-react';
import { enhancedToast } from '@/components/ui/enhanced-toast';

interface CategoryManagerProps {
  onBack?: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onBack }) => {
  const { categories, createCategory, deleteCategory, isCreating } = useCategories();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    name: '',
    icon: '📋',
    color: '#6b7280',
    type: 'expense' as 'income' | 'expense',
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      enhancedToast.error('Nome da categoria é obrigatório');
      return;
    }
    await createCategory(form);
    setShowDialog(false);
    setForm({ name: '', icon: '📋', color: '#6b7280', type: 'expense' });
  };

  // Helper: lê 'type' ou 'transaction_type', com fallback para 'expense'
  const getType = (c: typeof categories[0]): string =>
    (c.type ?? (c as any).transaction_type ?? 'expense');

  const incomeCategories  = categories.filter(c => getType(c) === 'income');
  const expenseCategories = categories.filter(c => getType(c) === 'expense');

  const CategoryList = ({ cats }: { cats: typeof categories }) => (
    <div className="space-y-1">
      {cats.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center">Nenhuma categoria</p>
      ) : (
        cats.map(category => (
          <div
            key={category.id}
            className="flex items-center justify-between py-2.5 px-1 rounded hover:bg-muted/50 group"
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{category.icon}</span>
              <span className="font-medium text-sm">{category.name}</span>
              {!category.user_id && (
                <Badge variant="secondary" className="text-xs">Padrão</Badge>
              )}
            </div>
            {category.user_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteCategory(category.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <BackHeader
        title="Categorias"
        subtitle="Organize seus lançamentos por categoria"
        icon={<Tag className="h-6 w-6" />}
        onBack={onBack}
        action={
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nova
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Categoria</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Ex: Alimentação"
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Ícone (emoji)</Label>
                    <Input
                      value={form.icon}
                      onChange={(e) => setForm(p => ({ ...p, icon: e.target.value }))}
                      className="text-center text-lg"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={form.type}
                      onChange={(e) => setForm(p => ({ ...p, type: e.target.value as any }))}
                    >
                      <option value="expense">Despesa</option>
                      <option value="income">Receita</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleCreate} disabled={isCreating} className="flex-1">
                    {isCreating ? 'Criando...' : 'Criar Categoria'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="expense">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expense">Despesas ({expenseCategories.length})</TabsTrigger>
          <TabsTrigger value="income">Receitas ({incomeCategories.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="expense">
          <Card>
            <CardContent className="p-4">
              <CategoryList cats={expenseCategories} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="income">
          <Card>
            <CardContent className="p-4">
              <CategoryList cats={incomeCategories} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
