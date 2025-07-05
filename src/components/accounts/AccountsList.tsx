
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Wallet, Building, PiggyBank, TrendingUp } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return <div className="p-4">Carregando contas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Minhas Contas</h2>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Nenhuma conta cadastrada</p>
            <p className="text-sm text-gray-400 mt-2">
              Adicione uma conta para começar a gerenciar suas finanças
            </p>
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
