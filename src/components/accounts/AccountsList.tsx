
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Wallet, Building, PiggyBank, TrendingUp, Plus } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { AddAccountForm } from './AddAccountForm';

const getAccountIcon = (type: string) => {
  switch (type) {
    case 'checking':
      return <Building size={20} />;
    case 'savings':
      return <PiggyBank size={20} />;
    case 'credit_card':
      return <CreditCard size={20} />;
    case 'wallet':
      return <Wallet size={20} />;
    case 'investment':
      return <TrendingUp size={20} />;
    default:
      return <Wallet size={20} />;
  }
};

const getAccountTypeName = (type: string) => {
  switch (type) {
    case 'checking':
      return 'Conta Corrente';
    case 'savings':
      return 'Poupança';
    case 'credit_card':
      return 'Cartão de Crédito';
    case 'wallet':
      return 'Carteira';
    case 'investment':
      return 'Investimento';
    default:
      return type;
  }
};

export const AccountsList: React.FC = () => {
  const { accounts, loading } = useAccounts();
  const [showAddForm, setShowAddForm] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (showAddForm) {
    return <AddAccountForm onClose={() => setShowAddForm(false)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Minhas Contas</h2>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Adicionar Conta</span>
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Wallet size={48} className="text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma conta encontrada
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Adicione suas contas para começar a controlar suas finanças
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              Adicionar Primeira Conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-600">
                      {getAccountIcon(account.type)}
                    </div>
                    <div>
                      <h3 className="font-medium">{account.name}</h3>
                      <p className="text-sm text-gray-500">
                        {getAccountTypeName(account.type)}
                        {account.bank_name && ` • ${account.bank_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      account.type === 'credit_card' 
                        ? 'text-orange-600' 
                        : Number(account.balance) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                    }`}>
                      {formatCurrency(Number(account.balance))}
                    </p>
                    {account.credit_limit && (
                      <p className="text-xs text-gray-500">
                        Limite: {formatCurrency(Number(account.credit_limit))}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
