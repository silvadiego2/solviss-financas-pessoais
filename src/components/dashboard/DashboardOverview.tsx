import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Wallet, TrendingUp, CreditCard, Plus, Edit, Trash2, Target } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useDependencyCheck } from '@/hooks/useDependencyCheck';
import { useGoals } from '@/hooks/useGoals';
import { useBudgets } from '@/hooks/useBudgets';
import { AddAccountForm } from '@/components/accounts/AddAccountForm';
import { AddCreditCardForm } from '@/components/credit-cards/AddCreditCardForm';
import { AddTransactionForm } from '@/components/transactions/AddTransactionForm';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { DashboardSkeleton } from '@/components/ui/skeleton-loaders';

interface DashboardOverviewProps {
  onNavigate?: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { regularAccounts, deleteAccount, loading: accountsLoading } = useAccounts();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { creditCards, deleteCreditCard, loading: cardsLoading } = useCreditCards();
  const { checkAccountDependencies } = useDependencyCheck();
  const { goals, isLoading: goalsLoading } = useGoals();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);

  const totalBalance = regularAccounts.reduce((sum, account) => sum + Number(account.balance), 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  });
  
  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const monthlyExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalCreditLimit = creditCards.reduce((sum, card) => sum + card.limit, 0);
  const totalCreditUsed = creditCards.reduce((sum, card) => sum + card.used_amount, 0);
  const totalCreditAvailable = totalCreditLimit - totalCreditUsed;

  // Calculate goals progress
  const activeGoals = goals.filter(g => !g.is_completed);
  const totalGoalProgress = activeGoals.length > 0 
    ? activeGoals.reduce((sum, g) => sum + (Number(g.current_amount) / Number(g.target_amount)) * 100, 0) / activeGoals.length
    : 0;

  // Calculate budget usage
  const monthBudgets = budgets.filter(b => b.month === currentMonth + 1 && b.year === currentYear);
  const totalBudgetUsage = monthBudgets.length > 0
    ? monthBudgets.reduce((sum, b) => sum + (Number(b.spent) / Number(b.amount)) * 100, 0) / monthBudgets.length
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    const deps = await checkAccountDependencies(accountId);
    
    if (deps.hasTransactions) {
      const confirmDelete = window.confirm(
        `A conta "${accountName}" possui ${deps.transactionCount} transação(ões) vinculada(s). Todas as transações serão excluídas também. Deseja continuar?`
      );
      
      if (!confirmDelete) return;
    }
    
    deleteAccount(accountId);
  };

  const handleDeleteCard = (cardId: string) => {
    deleteCreditCard(cardId);
  };

  if (showAddAccountForm) {
    return <AddAccountForm onClose={() => setShowAddAccountForm(false)} />;
  }

  if (showAddCardForm) {
    return <AddCreditCardForm onClose={() => setShowAddCardForm(false)} />;
  }

  if (showAddTransactionForm) {
    return <AddTransactionForm onClose={() => setShowAddTransactionForm(false)} />;
  }

  // Show skeleton while loading
  if (accountsLoading || transactionsLoading || cardsLoading || goalsLoading || budgetsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Available Balance (Regular Accounts Only) */}
      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white" data-onboarding="balance-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium opacity-90">Saldo Disponível</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Wallet size={20} />
            <span className="text-2xl font-bold">{formatCurrency(totalBalance)}</span>
          </div>
          <p className="text-xs opacity-80 mt-1">Contas correntes, poupança e carteiras</p>
        </CardContent>
      </Card>

      {/* Credit Cards Summary */}
      {creditCards.length > 0 && (
        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Resumo Cartões de Crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <CreditCard size={20} />
                  <span className="text-lg font-bold">{formatCurrency(totalCreditAvailable)}</span>
                </div>
                <p className="text-xs opacity-80">Limite disponível</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatCurrency(totalCreditUsed)} usado</p>
                <p className="text-xs opacity-80">de {formatCurrency(totalCreditLimit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receitas e Despesas do Mês */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center">
              <ArrowUp size={16} className="mr-1" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-lg font-semibold">{formatCurrency(monthlyIncome)}</span>
            <p className="text-xs text-gray-500">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center">
              <ArrowDown size={16} className="mr-1" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-lg font-semibold">{formatCurrency(monthlyExpenses)}</span>
            <p className="text-xs text-gray-500">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Contas Widget (Regular Accounts Only) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <div className="flex items-center">
              <Wallet size={16} className="mr-1" />
              Contas ({regularAccounts.length})
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddAccountForm(true)}
              className="p-1 h-auto"
              data-onboarding="add-account"
            >
              <Plus size={16} className="text-green-600" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {regularAccounts.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma conta cadastrada</p>
          ) : (
            <div className="space-y-2">
              {regularAccounts.slice(0, 3).map((account) => (
                <div key={account.id} className="flex justify-between items-center group">
                  <div className="flex-1">
                    <span className="text-sm">{account.name}</span>
                    <span className="text-sm font-medium ml-2">{formatCurrency(Number(account.balance))}</span>
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate?.('accounts')}
                      className="p-1 h-auto"
                    >
                      <Edit size={12} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a conta "{account.name}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteAccount(account.id, account.name)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {regularAccounts.length > 3 && (
                <p className="text-xs text-gray-500">+{regularAccounts.length - 3} contas</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cartões de Crédito Widget */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard size={16} className="mr-1" />
              Cartões ({creditCards.length})
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddCardForm(true)}
              className="p-1 h-auto"
            >
              <Plus size={16} className="text-green-600" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {creditCards.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum cartão cadastrado</p>
          ) : (
            <div className="space-y-2">
              {creditCards.slice(0, 3).map((card) => {
                const usagePercentage = ((card.used_amount / card.limit) * 100);
                return (
                  <div key={card.id} className="group">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <span className="text-sm">{card.name}</span>
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div 
                            className={`h-1 rounded-full ${
                              usagePercentage >= 80 ? 'bg-red-500' : usagePercentage >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <span className="text-sm font-medium">
                          {formatCurrency(card.limit - card.used_amount)}
                        </span>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigate?.('cards')}
                            className="p-1 h-auto"
                          >
                            <Edit size={12} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1 h-auto text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o cartão "{card.name}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCard(card.id)}
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
                  </div>
                );
              })}
              {creditCards.length > 3 && (
                <p className="text-xs text-gray-500">+{creditCards.length - 3} cartões</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado do Mês */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <TrendingUp size={16} className="mr-1" />
            Resultado do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className={`text-lg font-semibold ${
            monthlyIncome - monthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(monthlyIncome - monthlyExpenses)}
          </span>
          <p className="text-xs text-gray-500">
            {monthlyIncome - monthlyExpenses >= 0 ? 'Superávit' : 'Déficit'}
          </p>
        </CardContent>
      </Card>

      {/* Card Orçamentos Mensais */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onNavigate?.('budgets')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Target size={16} className="mr-1 text-blue-600" />
            Orçamentos Mensais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {monthBudgets.length} {monthBudgets.length === 1 ? 'categoria' : 'categorias'}
              </span>
              <span className="text-xs text-gray-500">
                {totalBudgetUsage.toFixed(0)}% usado
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  totalBudgetUsage >= 90 ? 'bg-red-500' : 
                  totalBudgetUsage >= 70 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(totalBudgetUsage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Toque para gerenciar orçamentos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card Objetivos Financeiros */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onNavigate?.('goals')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <TrendingUp size={16} className="mr-1 text-purple-600" />
            Objetivos Financeiros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {activeGoals.length} {activeGoals.length === 1 ? 'objetivo ativo' : 'objetivos ativos'}
              </span>
              <span className="text-xs text-gray-500">
                {totalGoalProgress.toFixed(0)}% concluído
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-purple-500 transition-all"
                style={{ width: `${Math.min(totalGoalProgress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Toque para acompanhar metas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactions.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-lg">
                  {transaction.category?.icon || (transaction.type === 'income' ? '💰' : '💸')}
                </div>
                <div>
                  <p className="text-sm font-medium">{transaction.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(transaction.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${
                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
              </span>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhuma transação encontrada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={() => setShowAddTransactionForm(true)}
        label="Nova Transação"
        data-onboarding="add-transaction"
      />
    </div>
  );
};
