
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Wallet, PiggyBank, TrendingUp, Plus, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAccounts } from '@/hooks/useAccounts';
import { AddAccountForm } from './AddAccountForm';
import { EditAccountForm } from './EditAccountForm';
import { AccountsListSkeleton } from '@/components/ui/skeleton-loaders';

const getAccountIcon = (type: string) => {
  switch (type) {
    case 'checking':
      return <Building size={20} />;
    case 'savings':
      return <PiggyBank size={20} />;
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
    case 'wallet':
      return 'Carteira';
    case 'investment':
      return 'Investimento';
    default:
      return type;
  }
};

export const AccountsList: React.FC = () => {
  const { regularAccounts, loading, deleteAccount } = useAccounts(); // Use regularAccounts
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleDelete = (accountId: string) => {
    deleteAccount(accountId);
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingAccount(null);
  };

  if (loading) {
    return <AccountsListSkeleton />;
  }

  if (showAddForm && !editingAccount) {
    return <AddAccountForm onClose={handleCloseForm} editingAccount={editingAccount} />;
  }

  if (editingAccount) {
    return <EditAccountForm account={editingAccount} onClose={handleCloseForm} />;
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

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Contas:</strong> Inclui contas correntes, poupança, carteiras e investimentos. 
          Os cartões de crédito são gerenciados separadamente na aba "Cartões".
        </p>
      </div>

      {regularAccounts.length === 0 ? (
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
          {regularAccounts.map((account) => (
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
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className={`font-semibold ${
                        Number(account.balance) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(Number(account.balance))}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(account)}
                        className="p-1 h-auto"
                      >
                        <Edit size={16} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
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
                              onClick={() => handleDelete(account.id)}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
