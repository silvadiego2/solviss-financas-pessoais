import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, BarChart2, Plus, TrendingUp, Edit, Trash2 } from 'lucide-react';
import { useBudgets, Budget } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { AddBudgetForm } from '@/components/budgets/AddBudgetForm';
import { formatCurrency } from '@/utils/formatters';

// Calcula gasto real do mês a partir das transações
const useSpentByCategory = () => {
  const { transactions } = useTransactions();
  return useMemo(() => {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();
    const map   = new Map<string, number>();
    for (const t of transactions as any[]) {
      if (t.type !== 'expense') continue;
      const d = new Date(t.date);
      if (d.getMonth() !== month || d.getFullYear() !== year) continue;
      if (!t.category_id) continue;
      map.set(t.category_id, (map.get(t.category_id) ?? 0) + Number(t.amount));
    }
    return map;
  }, [transactions]);
};

type StatusLevel = 'ok' | 'warning' | 'danger';

const getStatus = (pct: number): StatusLevel => {
  if (pct >= 100) return 'danger';
  if (pct >= 75)  return 'warning';
  return 'ok';
};

const statusClass: Record<StatusLevel, string> = {
  ok:      'bg-success',
  warning: 'bg-warning',
  danger:  'bg-destructive',
};

const badgeClass: Record<StatusLevel, string> = {
  ok:      'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger:  'bg-destructive/10 text-destructive',
};

export const GoalsControlar: React.FC = () => {
  const { budgets, loading, deleteBudget, isDeleting } = useBudgets();
  const spentMap   = useSpentByCategory();
  const [showForm,       setShowForm]       = useState(false);
  const [editingBudget,  setEditingBudget]  = useState<Budget | null>(null);

  // Enriquece cada orçamento com gasto real
  const enriched = useMemo(() =>
    budgets.map(b => {
      const spent   = spentMap.get(b.category_id) ?? 0;
      const pct     = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      const status  = getStatus(pct);
      const remaining = b.amount - spent;
      return { ...b, spentReal: spent, pct, status, remaining };
    }),
    [budgets, spentMap]
  );

  const totalLimit = enriched.reduce((s, b) => s + b.amount, 0);
  const totalSpent = enriched.reduce((s, b) => s + b.spentReal, 0);
  const totalPct   = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const totalStatus = getStatus(totalPct);

  const handleEdit = (b: Budget) => {
    setEditingBudget(b);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir este limite de gasto?')) deleteBudget(id);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingBudget(null);
  };

  if (showForm) {
    return <AddBudgetForm onClose={handleCloseForm} editingBudget={editingBudget} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Limite de gastos por categoria neste mês</p>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus size={16} className="mr-2" /> Novo Limite
        </Button>
      </div>

      {/* Resumo geral */}
      {enriched.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Resumo do mês</span>
              <Badge className={badgeClass[totalStatus]}>
                {totalPct.toFixed(0)}%
              </Badge>
            </div>
            <Progress
              value={Math.min(totalPct, 100)}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Gasto: <span className="font-medium text-foreground">{formatCurrency(totalSpent)}</span></span>
              <span>Limite: <span className="font-medium text-foreground">{formatCurrency(totalLimit)}</span></span>
            </div>
          </CardContent>
        </Card>
      )}

      {enriched.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <BarChart2 size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">Nenhum limite cadastrado</p>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              Defina quanto pode gastar por categoria e acompanhe em tempo real
            </p>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus size={16} className="mr-2" /> Criar Primeiro Limite
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {enriched.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Cabeçalho categoria */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {b.category?.icon && (
                      <span className="text-lg flex-shrink-0">{b.category.icon}</span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {b.category?.name ?? 'Sem categoria'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(b.spentReal)} de {formatCurrency(b.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge className={badgeClass[b.status]}>
                      {b.status === 'danger' && <AlertTriangle size={10} className="mr-1" />}
                      {b.status === 'warning' && <TrendingUp size={10} className="mr-1" />}
                      {b.pct.toFixed(0)}%
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(b)} className="h-7 w-7">
                      <Edit size={13} />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => handleDelete(b.id)}
                      disabled={isDeleting}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div
                  className="w-full bg-muted rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.min(b.pct, 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={`h-2 rounded-full transition-all ${statusClass[b.status]}`}
                    style={{ width: `${Math.min(b.pct, 100)}%` }}
                  />
                </div>

                {/* Restante / excedido */}
                <p className="text-xs text-muted-foreground">
                  {b.remaining >= 0
                    ? <>Restam <span className="font-semibold text-foreground">{formatCurrency(b.remaining)}</span></>
                    : <span className="text-destructive font-medium">Excedido em {formatCurrency(Math.abs(b.remaining))}</span>
                  }
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
