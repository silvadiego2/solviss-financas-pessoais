import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Receipt, Repeat, Search, Filter, X, ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { EditTransactionForm } from './EditTransactionForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const TransactionsList: React.FC = () => {
  const { transactions, deleteTransaction, loading } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || t.type === filterType;
      return matchSearch && matchType;
    });
  }, [transactions, search, filterType]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (editingTransaction) {
    return <EditTransactionForm transaction={editingTransaction} onClose={() => setEditingTransaction(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-muted-foreground">Transações</p>
        <h1 className="text-2xl font-bold mt-1">Suas Transações</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Receitas</p>
          <p className="text-lg font-bold text-chart-income mt-1">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Despesas</p>
          <p className="text-lg font-bold text-chart-expense mt-1">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Balanço</p>
          <p className="text-lg font-bold mt-1">{formatCurrency(totalIncome - totalExpense)}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar transações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction List */}
      <div className="bg-card rounded-2xl border border-border divide-y divide-border">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma transação encontrada.
          </div>
        ) : (
          filteredTransactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors group">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                t.type === 'income'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-chart-income'
                  : 'bg-red-50 dark:bg-red-950/40 text-chart-expense'
              }`}>
                {t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  {t.is_recurring && (
                    <Badge variant="outline" className="text-[10px] gap-0.5 py-0">
                      <Repeat className="h-2.5 w-2.5" /> Rec.
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(t as any).category?.name && `${(t as any).category.name} · `}
                  {format(new Date(t.date), 'dd/MM/yyyy', { locale: ptBR })}
                  {(t as any).account?.name && ` · ${(t as any).account.name}`}
                </p>
              </div>
              <p className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                t.type === 'income' ? 'text-chart-income' : 'text-foreground'
              }`}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
              </p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditingTransaction(t)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-accent transition-all"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>Tem certeza que deseja excluir esta transação?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteTransaction(t.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground text-center">
        {filteredTransactions.length} transação(ões) encontrada(s)
      </p>
    </div>
  );
};
