import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BackHeader } from '@/components/layout/BackHeader';
import { useAccounts } from '@/hooks/useAccounts';
import { AddAccountForm } from './AddAccountForm';
import { EditAccountForm } from './EditAccountForm';
import { Wallet, Plus, Edit, Trash2, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';

interface AccountsListProps {
  onBack?: () => void;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const accountTypeLabels: Record<string, string> = {
  checking:    'Conta Corrente',
  savings:     'Poupança',
  investment:  'Investimento',
  wallet:      'Carteira',
  cash:        'Dinheiro',
  credit_card: 'Cartão de Crédito',
  other:       'Outro',
};

export const AccountsList: React.FC<AccountsListProps> = ({ onBack }) => {
  const { accounts, deleteAccount, isDeleting, refetch } = useAccounts();
  const [showAddForm, setShowAddForm]       = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);

  if (showAddForm) {
    return <AddAccountForm onBack={() => { setShowAddForm(false); refetch(); }} />;
  }

  if (editingAccount) {
    return <EditAccountForm account={editingAccount} onBack={() => { setEditingAccount(null); refetch(); }} />;
  }

  const getBalance = (a: any): number => a.balance ?? 0;

  // Saldo total: apenas contas reais (corrente, poupança, carteira, investimento)
  // Cartões de crédito representam dívida (passivo), não saldo positivo
  const regularAccounts    = accounts.filter(a => a.type !== 'credit_card');
  const creditCardAccounts = accounts.filter(a => a.type === 'credit_card');

  const totalBalance  = regularAccounts.reduce((sum, a) => sum + getBalance(a), 0);
  const totalCCDebt   = creditCardAccounts.reduce((sum, a) => sum + Math.abs(Math.min(0, getBalance(a))), 0);

  return (
    <div className="space-y-6">
      <BackHeader
        title="Contas"
        subtitle="Gerencie suas contas bancárias e carteiras"
        icon={<Wallet className="h-6 w-6" />}
        onBack={onBack}
        action={
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Conta
          </Button>
        }
      />

      {/* Resumo financeiro */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <p className="text-sm opacity-80">Saldo em Contas</p>
            <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
            <p className="text-xs opacity-70 mt-1">
              {regularAccounts.length} conta{regularAccounts.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {creditCardAccounts.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <CreditCard className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive font-medium">Faturas em Aberto</p>
              </div>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalCCDebt)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {creditCardAccounts.length} cartão{creditCardAccounts.length !== 1 ? 'es' : ''}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nenhuma conta cadastrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione suas contas bancárias para começar a controlar suas finanças
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account: any) => {
            const balance    = getBalance(account);
            const isCC       = account.type === 'credit_card';
            // Para cartão: saldo negativo = fatura em aberto (vermelho); positivo = crédito disponível
            const isPositive = isCC ? balance >= 0 : balance >= 0;
            return (
              <Card key={account.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                        {account.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {accountTypeLabels[account.type] || account.type}
                        </p>
                        {account.bank_name && (
                          <p className="text-xs text-muted-foreground">{account.bank_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {isPositive
                            ? <TrendingUp  className="h-3.5 w-3.5 text-green-500" />
                            : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                          <span className={`font-semibold ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isCC && balance < 0 ? `-${formatCurrency(Math.abs(balance))}` : formatCurrency(balance)}
                          </span>
                        </div>
                        {isCC && (
                          <p className="text-xs text-muted-foreground text-right">
                            {balance < 0 ? 'fatura em aberto' : 'crédito disponível'}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => setEditingAccount(account)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteAccount(account.id)}
                        disabled={isDeleting}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
