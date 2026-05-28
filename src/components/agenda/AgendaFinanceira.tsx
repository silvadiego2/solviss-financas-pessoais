import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const { items, loading, stats, createItem, markAsPaid, cancelItem, deleteItem } = useAgendaFinanceira();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<CreateAgendaItem>({
    type: 'payable',
    description: '',
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    recurrent: false,
  });

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.due_date) return;
    setSaving(true);
    try {
      await createItem(form);
      setDialogOpen(false);
      setForm({ type: 'payable', description: '', amount: 0, due_date: new Date().toISOString().split('T')[0], recurrent: false });
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'payable') return item.type === 'payable';
    if (activeTab === 'receivable') return item.type === 'receivable';
    if (activeTab === 'overdue') return item.status === 'overdue';
    return true;
  });

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Agenda Financeira" onBack={onBack} />}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">A Pagar</span>
            </div>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalPayable)}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-900">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">A Receber</span>
            </div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalReceivable)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(stats.overdue > 0 || stats.dueThisWeek > 0) && (
        <div className="space-y-2">
          {stats.overdue > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                <strong>{stats.overdue}</strong> lançamento{stats.overdue > 1 ? 's' : ''} vencido{stats.overdue > 1 ? 's' : ''} — pague o quanto antes!
              </p>
            </div>
          )}
          {stats.dueThisWeek > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>{stats.dueThisWeek}</strong> lançamento{stats.dueThisWeek > 1 ? 's' : ''} vence{stats.dueThisWeek > 1 ? 'm' : ''} nos próximos 7 dias.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Header com botão novo */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Lançamentos</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Novo Lançamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={form.type === 'payable' ? 'default' : 'outline'}
                  onClick={() => setForm(f => ({ ...f, type: 'payable' }))}
                  className="text-sm"
                >
                  💸 A Pagar
                </Button>
                <Button
                  variant={form.type === 'receivable' ? 'default' : 'outline'}
                  onClick={() => setForm(f => ({ ...f, type: 'receivable' }))}
                  className="text-sm"
                >
                  💰 A Receber
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input
                  placeholder="Ex: Aluguel, Salário..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={form.amount || ''}
                  onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category_id || ''}
                  onValueChange={v => setForm(f => ({ ...f, category_id: v || undefined }))}
                >
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Conta vinculada</Label>
                <Select
                  value={form.account_id || ''}
                  onValueChange={v => setForm(f => ({ ...f, account_id: v || undefined }))}
                >
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={form.recurrent ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm(f => ({ ...f, recurrent: !f.recurrent }))}
                >
                  🔁 Recorrente
                </Button>
                {form.recurrent && (
                  <Select
                    value={form.recurrence_frequency || 'monthly'}
                    onValueChange={(v: any) => setForm(f => ({ ...f, recurrence_frequency: v }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving || !form.description || !form.amount}>
                {saving ? 'Salvando...' : 'Salvar Lançamento'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="payable">A Pagar</TabsTrigger>
          <TabsTrigger value="receivable">A Receber</TabsTrigger>
          <TabsTrigger value="overdue">Vencidos</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarClock className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">Nenhum lançamento aqui</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Clique em "Novo" para adicionar uma conta a pagar ou a receber.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => {
            const { label: dateLabel, color: dateColor } = getDueDateLabel(item.due_date);
            const status = statusConfig[item.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <Card key={item.id} className={item.status === 'overdue' ? 'border-red-200 dark:border-red-900' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 ${item.type === 'payable' ? 'text-red-500' : 'text-green-500'}`}>
                      {item.type === 'payable' ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{item.description}</span>
                        <Badge variant={status.variant} className="text-xs">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        {item.recurrent && <Badge variant="outline" className="text-xs">🔁 Recorrente</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs font-medium ${dateColor}`}>{dateLabel}</span>
                        <span className="text-base font-bold">
                          {item.type === 'payable' ? '- ' : '+ '}
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {item.status === 'pending' || item.status === 'overdue' ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Marcar como pago"
                            onClick={() => markAsPaid(item.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            title="Cancelar"
                            onClick={() => cancelItem(item.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          title="Excluir"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
