import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Receipt, Repeat, Search, Filter, X } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { EditTransactionForm } from './EditTransactionForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TransactionFilters {
  search: string;
  type: string;
  categoryId: string;
  accountId: string;
  period: string;
}

export const TransactionsList: React.FC = () => {
  const { transactions, deleteTransaction, loading } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const saved = localStorage.getItem('transactionFilters');
    return saved ? JSON.parse(saved) : {
      search: '',
      type: 'all',
      categoryId: 'all',
      accountId: 'all',
      period: 'all',
    };
  });

  useEffect(() => {
    localStorage.setItem('transactionFilters', JSON.stringify(filters));
  }, [filters]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-600';
      case 'expense':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income':
        return 'Receita';
      case 'expense':
        return 'Despesa';
      default:
        return 'Transferência';
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search filter
      if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && transaction.type !== filters.type) {
        return false;
      }

      // Category filter
      if (filters.categoryId !== 'all' && transaction.category_id !== filters.categoryId) {
        return false;
      }

      // Account filter
      if (filters.accountId !== 'all' && transaction.account_id !== filters.accountId) {
        return false;
      }

      // Period filter
      if (filters.period !== 'all') {
        const transactionDate = new Date(transaction.date);
        const now = new Date();
        
        switch (filters.period) {
          case 'today':
            return transactionDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return transactionDate >= weekAgo;
          case 'month':
            return transactionDate.getMonth() === now.getMonth() && 
                   transactionDate.getFullYear() === now.getFullYear();
          case 'year':
            return transactionDate.getFullYear() === now.getFullYear();
        }
      }

      return true;
    });
  }, [transactions, filters]);

  const clearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      categoryId: 'all',
      accountId: 'all',
      period: 'all',
    });
  };

  const hasActiveFilters = filters.search || filters.type !== 'all' || 
    filters.categoryId !== 'all' || filters.accountId !== 'all' || filters.period !== 'all';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (editingTransaction) {
    return (
      <EditTransactionForm
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Todas as Transações</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter size={16} />
          Filtros
        </Button>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select value={filters.period} onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="year">Este ano</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.categoryId} onValueChange={(value) => setFilters(prev => ({ ...prev, categoryId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.accountId} onValueChange={(value) => setFilters(prev => ({ ...prev, accountId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full flex items-center gap-2"
              >
                <X size={16} />
                Limpar Filtros
              </Button>
            )}

            {/* Results Counter */}
            <p className="text-sm text-muted-foreground text-center">
              {filteredTransactions.length} transação(ões) encontrada(s)
            </p>
          </CardContent>
        </Card>
      )}

      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Receipt size={48} className="text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma transação encontrada
            </h3>
            <p className="text-gray-500 text-center">
              {hasActiveFilters ? 'Tente ajustar os filtros' : 'Adicione sua primeira transação para começar'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {transaction.category?.icon && (
                        <span className="text-lg">{transaction.category.icon}</span>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{transaction.description}</h4>
                          {transaction.is_recurring && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Repeat className="h-3 w-3" />
                              Recorrente
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{transaction.category?.name || 'Sem categoria'}</span>
                          <span>•</span>
                          <span>{transaction.account?.name}</span>
                          <span>•</span>
                          <span>
                            {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className={`font-semibold ${getTypeColor(transaction.type)}`}>
                        {transaction.type === 'expense' && '-'}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{getTypeLabel(transaction.type)}</p>
                    </div>

                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTransaction(transaction)}
                      >
                        <Edit size={16} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir esta transação? Esta ação não pode ser
                              desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTransaction(transaction.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>

                {transaction.notes && (
                  <p className="text-sm text-muted-foreground mt-2 pl-8">{transaction.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
