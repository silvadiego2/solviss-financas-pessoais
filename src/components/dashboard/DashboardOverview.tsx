import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Wallet, TrendingUp, CreditCard, Plus, Edit, Trash2, Target, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useDependencyCheck } from '@/hooks/useDependencyCheck';
import { useGoals } from '@/hooks/useGoals';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { AddAccountForm } from '@/components/accounts/AddAccountForm';
import { AddCreditCardForm } from '@/components/credit-cards/AddCreditCardForm';
import { AddTransactionForm } from '@/components/transactions/AddTransactionForm';
import { EditTransactionForm } from '@/components/transactions/EditTransactionForm';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { DashboardSkeleton } from '@/components/ui/skeleton-loaders';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DashboardOverviewProps {
  onNavigate?: (tab: string) => void;
}

const CHART_COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(30, 95%, 52%)',
  'hsl(174, 62%, 47%)', 'hsl(340, 75%, 55%)', 'hsl(152, 60%, 42%)',
  'hsl(45, 93%, 47%)', 'hsl(199, 89%, 48%)',
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { regularAccounts, deleteAccount, loading: accountsLoading } = useAccounts();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { creditCards, deleteCreditCard, loading: cardsLoading } = useCreditCards();
  const { checkAccountDependencies } = useDependencyCheck();
  const { goals, isLoading: goalsLoading } = useGoals();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const { categories } = useCategories();
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const totalBalance = regularAccounts.reduce((sum, account) => sum + Number(account.balance), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter(transaction => {
    const d = new Date(transaction.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
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

  const activeGoals = goals.filter(g => !g.is_completed);
  const totalGoalProgress = activeGoals.length > 0
    ? activeGoals.reduce((sum, g) => sum + (Number(g.current_amount) / Number(g.target_amount)) * 100, 0) / activeGoals.length
    : 0;

  const monthBudgets = budgets.filter(b => b.month === currentMonth + 1 && b.year === currentYear);
  const totalBudgetUsage = monthBudgets.length > 0
    ? monthBudgets.reduce((sum, b) => sum + (Number(b.spent) / Number(b.amount)) * 100, 0) / monthBudgets.length
    : 0;

  // Pie chart data: expenses by category this month
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    monthlyTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const catName = t.category?.name || 'Sem Categoria';
        const catColor = t.category?.color || '#94a3b8';
        const existing = map.get(catName);
        if (existing) {
          existing.value += Number(t.amount);
        } else {
          map.set(catName, { name: catName, value: Number(t.amount), color: catColor });
        }
      });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [monthlyTransactions]);

  // Line chart data: last 6 months income vs expenses
  const monthlyTrend = useMemo(() => {
    const months: { month: string; income: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });

      const monthTx = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === m && td.getFullYear() === y;
      });

      months.push({
        month: monthName,
        income: monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expenses: monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    return months;
  }, [transactions, currentMonth, currentYear]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    const deps = await checkAccountDependencies(accountId);
    if (deps.hasTransactions) {
      const confirmDelete = window.confirm(
        `A conta "${accountName}" possui ${deps.transactionCount} transação(ões) vinculada(s). Deseja continuar?`
      );
      if (!confirmDelete) return;
    }
    deleteAccount(accountId);
  };

  if (showAddAccountForm) return <AddAccountForm onClose={() => setShowAddAccountForm(false)} />;
  if (showAddCardForm) return <AddCreditCardForm onClose={() => setShowAddCardForm(false)} />;
  if (showAddTransactionForm) return <AddTransactionForm onClose={() => setShowAddTransactionForm(false)} />;
  if (editingTransaction) return <EditTransactionForm transaction={editingTransaction} onClose={() => setEditingTransaction(null)} />;

  if (accountsLoading || transactionsLoading || cardsLoading || goalsLoading || budgetsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" data-onboarding="balance-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="opacity-80" />
              <span className="text-xs font-medium opacity-80">Saldo Total</span>
            </div>
            <span className="text-xl font-bold">{formatCurrency(totalBalance)}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUp size={16} className="text-chart-income" />
              <span className="text-xs font-medium text-muted-foreground">Receitas</span>
            </div>
            <span className="text-xl font-bold text-chart-income">{formatCurrency(monthlyIncome)}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDown size={16} className="text-chart-expense" />
              <span className="text-xs font-medium text-muted-foreground">Despesas</span>
            </div>
            <span className="text-xl font-bold text-chart-expense">{formatCurrency(monthlyExpenses)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie Chart - Expenses by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem despesas este mês</p>
            ) : (
              <div className="flex items-center gap-2">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 overflow-hidden">
                  {expensesByCategory.slice(0, 5).map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="truncate flex-1 text-muted-foreground">{cat.name}</span>
                      <span className="font-medium text-foreground">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart - Monthly Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line type="monotone" dataKey="income" stroke="hsl(var(--chart-income))" strokeWidth={2} dot={{ r: 3 }} name="Receitas" />
                <Line type="monotone" dataKey="expenses" stroke="hsl(var(--chart-expense))" strokeWidth={2} dot={{ r: 3 }} name="Despesas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Credit Cards + Budget + Goals Row */}
      {creditCards.length > 0 && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate?.('cards')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <CreditCard size={18} className="text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-medium">Cartões de Crédito</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(totalCreditUsed)} usado de {formatCurrency(totalCreditLimit)}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-sm font-bold">{formatCurrency(totalCreditAvailable)}</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-3">
              <div
                className="h-1.5 rounded-full bg-destructive transition-all"
                style={{ width: `${totalCreditLimit > 0 ? Math.min((totalCreditUsed / totalCreditLimit) * 100, 100) : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Budget card */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate?.('budgets')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-chart-1/10 flex items-center justify-center">
                <Target size={18} className="text-chart-1" />
              </div>
              <div>
                <p className="text-sm font-medium">Orçamentos</p>
                <p className="text-xs text-muted-foreground">{monthBudgets.length} categorias</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  totalBudgetUsage >= 90 ? 'bg-destructive' : totalBudgetUsage >= 70 ? 'bg-yellow-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(totalBudgetUsage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totalBudgetUsage.toFixed(0)}% utilizado</p>
          </CardContent>
        </Card>

        {/* Goals card */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate?.('goals')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <TrendingUp size={18} className="text-chart-2" />
              </div>
              <div>
                <p className="text-sm font-medium">Metas</p>
                <p className="text-xs text-muted-foreground">{activeGoals.length} ativas</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-chart-2 transition-all"
                style={{ width: `${Math.min(totalGoalProgress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totalGoalProgress.toFixed(0)}% concluído</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Últimas Transações</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-primary h-auto py-1" onClick={() => onNavigate?.('transactions')}>
              Ver todas <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.slice(0, 6).map((transaction) => (
            <button
              key={transaction.id}
              onClick={() => setEditingTransaction(transaction)}
              className="flex items-center justify-between w-full text-left rounded-lg p-2 -mx-2 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-base">
                  {transaction.category?.icon || (transaction.type === 'income' ? '💰' : '💸')}
                </div>
                <div>
                  <p className="text-sm font-medium">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString('pt-BR')} • {transaction.account?.name || ''}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${
                transaction.type === 'income' ? 'text-chart-income' : 'text-chart-expense'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
              </span>
            </button>
          ))}
          {transactions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma transação encontrada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={() => setShowAddTransactionForm(true)}
        label="Nova Transação"
      />
    </div>
  );
};
