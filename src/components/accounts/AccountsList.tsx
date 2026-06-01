import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Wallet, PiggyBank, TrendingUp, Plus, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { BackHeader } from '@/components/layout/BackHeader';
import { useAccounts } from '@/hooks/useAccounts';
import { supabase } from '@/integrations/supabase/client';
import { AddAccountForm } from './AddAccountForm';
import { EditAccountForm } from './EditAccountForm';
import { AccountsListSkeleton } from '@/components/ui/skeleton-loaders';

interface AccountsListProps {
  onBack?: () => void;
}

const getAccountIcon = (type: string) => {
  switch (type) {
    case 'checking':   return <Building size={20} />;
    case 'savings':    return <PiggyBank size={20} />;
    case 'wallet':     return <Wallet size={20} />;
    case 'investment': return <TrendingUp size={20} />;
    default:           return <Wallet size={20} />;
  }
};

const getAccountTypeName = (type: string) => {
  switch (type) {
    case 'checking':   return 'Conta Corrente';
    case 'savings':    return 'Poupança';
    case 'wallet':     return 'Carteira';
    case 'investment': return 'Investimento';
    default:           return type;
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const AccountsList: React.FC<AccountsListProps> = ({ onBack }) => {
  const { regularAccounts, loading, deleteAccount } = useAccounts();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const handleDelete = async (accountId: string, accountName: string) => {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId);

    const transactionCount = count ?? 0;
    if (transactionCount > 0) {
      const confirmDelete = window.confirm(
        `A conta "${accountName}" possui ${transactionCount} transação(ões) vinculada(s).\n\n⚠️ ATENÇÃO: Todas as transações vinculadas a esta conta serão excluídas permanentemente.\n\nDeseja continuar?`
      );
      if (!confirmDelete) return;
    }
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

  if (loading) return <AccountsListSkeleton />;
  if (showAddForm && !editingAccount) return <AddAccountForm onClose={handleCloseForm} editingAccount={editingAccount} />;
  if (editingAccount) return <EditAccountForm account={editingAccount} onClose={handleCloseForm} />;

  return (
    <div className="space-y-4">
      <BackHeader
        title="Contas Bancárias"
        onBack={onBack}
        action={
          <Button size="sm" onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5">
            <Plus size={15} />
            <span>Adicionar</span>
          </Button>
        }
      />

      {regularAccounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Wallet size={48} className="text-muted-foreground/40 mb-4" />
            <h3 className="text-base font-medium mb-1">Nenhuma conta cadastrada</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Adicione suas contas para controlar saldos e transações
            </p>
            <Button onClick={() => setShowAddForm(true)}>Adicionar Primeira Conta</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {regularAccounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-primary flex-shrink-0">{getAccountIcon(account.type)}</div>
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{account.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {getAccountTypeName(account.type)}
                        {account.bank_name && ` · ${account.bank_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className={`font-semibold text-sm ${
                      Number(account.balance) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Number(account.balance))}
                    </p>
                    <Button variant="ghost" size="sm" className="p-1.5 h-auto" onClick={() => handleEdit(account)}>
                      <Edit size={15} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1.5 h-auto text-destructive hover:text-destructive">
                          <Trash2 size={15} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir "{account.name}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(account.id, account.name)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
