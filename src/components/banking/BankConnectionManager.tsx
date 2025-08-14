
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, RefreshCw, Trash2, Building, Clock } from 'lucide-react';
import { useBankConnections } from '@/hooks/useBankConnections';
import { AddBankConnectionForm } from './AddBankConnectionForm';
import { BackHeader } from '@/components/layout/BackHeader';

interface BankConnectionManagerProps {
  onBack?: () => void;
}

export const BankConnectionManager: React.FC<BankConnectionManagerProps> = ({ onBack }) => {
  const { connections, syncedTransactions, loading, syncTransactions, deleteConnection, isSyncing, isDeleting } = useBankConnections();
  const [showAddForm, setShowAddForm] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      active: 'Ativa',
      expired: 'Expirada',
      error: 'Erro'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.error}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getTransactionCount = (connectionId: string) => {
    return syncedTransactions.filter(t => t.bank_connection_id === connectionId).length;
  };

  if (showAddForm) {
    return <AddBankConnectionForm onClose={() => setShowAddForm(false)} />;
  }

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Conexões Bancárias" onBack={onBack} />}
      
      {!onBack && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conexões Bancárias</h2>
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus size={16} className="mr-2" />
            Conectar Banco
          </Button>
        </div>
      )}

      {onBack && (
        <div className="flex justify-end">
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus size={16} className="mr-2" />
            Conectar Banco
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Carregando conexões...</div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Building size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Nenhuma conexão bancária</h3>
            <p className="text-gray-600 mb-4">
              Conecte suas contas bancárias para sincronizar transações automaticamente
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus size={16} className="mr-2" />
              Conectar Primeira Conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building size={20} />
                    <div>
                      <CardTitle className="text-base">{connection.bank_name}</CardTitle>
                      <p className="text-sm text-gray-600">{connection.provider}</p>
                    </div>
                  </div>
                  {getStatusBadge(connection.connection_status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Transações Sincronizadas</p>
                    <p className="font-medium">{getTransactionCount(connection.id)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Última Sincronização</p>
                    <p className="font-medium text-sm">
                      {connection.last_sync_at ? formatDate(connection.last_sync_at) : 'Nunca'}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => syncTransactions(connection.id)}
                    disabled={isSyncing}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" disabled={isDeleting}>
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Conexão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover a conexão com {connection.bank_name}? 
                          As transações sincronizadas serão mantidas, mas não haverá mais sincronização automática.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteConnection(connection.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {syncedTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transações Sincronizadas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {syncedTransactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <Building size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {transaction.bank_connection?.bank_name}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${
                      transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'income' ? '+' : '-'}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(Math.abs(transaction.amount))}
                    </span>
                    {transaction.is_matched && (
                      <p className="text-xs text-blue-600">✓ Associada</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
