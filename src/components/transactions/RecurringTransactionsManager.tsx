import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { Repeat, Pause, Play, Trash2, RefreshCw } from 'lucide-react';
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

const frequencyLabels: Record<string, string> = {
  daily: '📅 Diária',
  weekly: '🗓️ Semanal',
  biweekly: '📆 Quinzenal',
  monthly: '🔄 Mensal',
  quarterly: '📊 Trimestral',
  semiannual: '📈 Semestral',
  annual: '🎯 Anual',
};

export const RecurringTransactionsManager: React.FC = () => {
  const {
    recurringTransactions,
    isLoading,
    toggleRecurrence,
    deleteRecurrence,
    processNow,
    isToggling,
    isDeleting,
    isProcessing,
  } = useRecurringTransactions();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                Transações Recorrentes
              </CardTitle>
              <CardDescription>
                Gerencie suas transações automáticas
              </CardDescription>
            </div>
            <Button
              onClick={() => processNow()}
              disabled={isProcessing}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              Processar Agora
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recurringTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma transação recorrente configurada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recurringTransactions.map((transaction: any) => (
                <Card key={transaction.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{transaction.description}</h4>
                          <Badge variant={transaction.is_active ? 'default' : 'secondary'}>
                            {transaction.is_active ? 'Ativa' : 'Pausada'}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>{frequencyLabels[transaction.recurrence_frequency] || transaction.recurrence_frequency}</span>
                          {transaction.category && (
                            <span>• {transaction.category.icon} {transaction.category.name}</span>
                          )}
                          {transaction.account && (
                            <span>• 🏦 {transaction.account.name}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium">
                            {formatCurrency(transaction.amount)}
                          </span>
                          <span className="text-muted-foreground">
                            Início: {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          {transaction.recurrence_end_date && (
                            <span className="text-muted-foreground">
                              Fim: {format(new Date(transaction.recurrence_end_date), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          )}
                        </div>

                        {transaction.last_processed_at && (
                          <p className="text-xs text-muted-foreground">
                            Última execução: {format(new Date(transaction.last_processed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          {transaction.is_active ? (
                            <Pause className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Play className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Switch
                            checked={transaction.is_active}
                            onCheckedChange={(checked) =>
                              toggleRecurrence({ id: transaction.id, isActive: checked })
                            }
                            disabled={isToggling}
                          />
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Recorrência</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir esta transação recorrente?
                                Esta ação não afetará as transações já criadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteRecurrence(transaction.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        </CardContent>
      </Card>
    </div>
  );
};
