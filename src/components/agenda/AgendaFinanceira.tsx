import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BackHeader } from '@/components/layout/BackHeader';
import { useAgendaFinanceira, type CreateAgendaItem } from '@/hooks/useAgendaFinanceira';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock, Plus, CheckCircle2, XCircle, Trash2,
  AlertTriangle, TrendingDown, TrendingUp, Clock, ChevronRight
} from 'lucide-react';

interface AgendaFinanceiraProps {
  onBack?: () => void;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const getDueDateLabel = (dateStr: string) => {
  const d = parseISO(dateStr);
  if (isToday(d)) return { label: 'Hoje', color: 'text-orange-500' };
  if (isTomorrow(d)) return { label: 'Amanhã', color: 'text-yellow-500' };
  if (isPast(d)) return { label: 'Vencida', color: 'text-red-500' };
  return { label: format(d, "dd 'de' MMM", { locale: ptBR }), color: 'text-muted-foreground' };
};

const statusConfig = {
  pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
  overdue: { label: 'Vencida', variant: 'destructive' as const, icon: AlertTriangle },
  paid: { label: 'Paga', variant: 'default' as const, icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', variant: 'outline' as const, icon: XCircle },
};

export const AgendaFinanceira: React.FC<AgendaFinanceiraProps> = ({ onBack }) => {
  const { items, loading, createItem, markAsPaid, deleteItem } = useAgendaFinanceira();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Partial<CreateAgendaItem>>({
    type: 'expense',
    status: 'pending',
    is_recurring: false,
  });

  const handleCreate = async () => {
    if (!form.title || !form.amount || !form.due_date) return;
    await createItem(form as CreateAgendaItem);
    setShowDialog(false);
    setForm({ type: 'expense', status: 'pending', is_recurring: false });
  };

  const pendingItems = items.filter(i => i.status === 'pending' || i.status === 'overdue');
  const doneItems = items.filter(i => i.status === 'paid' || i.status === 'cancelled');

  return (
    <div className="space-y-6">
      <BackHeader
        title="Agenda Financeira"
        subtitle="Contas a pagar e a receber organizadas"
        icon={<CalendarClock className="h-6 w-6" />}
        onBack={onBack}
        action={
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Lançamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Ex: Conta de luz"
                    value={form.title || ''}
                    onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.type || 'expense'} onValueChange={(v) => setForm(p => ({ ...p, type: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="income">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={form.amount || ''}
                      onChange={(e) => setForm(p => ({ ...p, amount: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    value={form.due_date || ''}
                    onChange={(e) => setForm(p => ({ ...p, due_date: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_recurring || false}
                    onCheckedChange={(v) => setForm(p => ({ ...p, is_recurring: v }))}
                  />
                  <Label>Recorrente</Label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleCreate} className="flex-1">Salvar</Button>
                  <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : (
        <>
          {/* Pending */}
          {pendingItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Pendentes ({pendingItems.length})</h3>
              {pendingItems.map(item => {
                const { label, color } = getDueDateLabel(item.due_date);
                const StatusIcon = statusConfig[item.status]?.icon || Clock;
                return (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          {item.type === 'expense' ? (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs ${color}`}>{label}</span>
                              <Badge variant={statusConfig[item.status]?.variant || 'secondary'} className="text-xs h-4">
                                {statusConfig[item.status]?.label || item.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${item.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(item.amount)}
                          </span>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-green-600"
                            onClick={() => markAsPaid(item.id)}
                            title="Marcar como pago"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Done */}
          {doneItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-muted-foreground">Concluídos ({doneItems.length})</h3>
              {doneItems.map(item => (
                <Card key={item.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {item.type === 'expense' ? (
                          <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <Badge variant={statusConfig[item.status]?.variant || 'outline'} className="text-xs h-4">
                            {statusConfig[item.status]?.label || item.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-muted-foreground">{formatCurrency(item.amount)}</span>
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {items.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Nenhum lançamento</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione contas a pagar ou receber para organizar seu fluxo financeiro
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
