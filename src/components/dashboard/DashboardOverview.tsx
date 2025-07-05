
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Wallet, TrendingUp } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';

export const DashboardOverview: React.FC = () => {
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();

  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
  
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Saldo Total */}
      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium opacity-90">Saldo Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Wallet size={20} />
            <span className="text-2xl font-bold">{formatCurrency(totalBalance)}</span>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
};
