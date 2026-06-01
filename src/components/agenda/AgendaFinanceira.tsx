import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BackHeader } from '@/components/layout/BackHeader';
import { useAgendaFinanceira, type CreateAgendaItem } from '@/hooks/useAgendaFinanceira';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock, Plus, CheckCircle2, Trash2,
  AlertTriangle, TrendingDown, TrendingUp, Clock,
  ArrowDownCircle, ArrowUpCircle, XCircle,
} from 'lucide-react';

interface AgendaFinanceiraProps {
  onBack?: () => void;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const getDueDateLabel = (dateStr: string) => {
  try {
    const d = parseISO(dateStr);
    if (isToday(d))    return { label: 'Hoje',    color: 'text-orange-500' };
    if (isTomorrow(d)) return { label: 'Amanhã',  color: 'text-yellow-500' };
    if (isPast(d))     return { label: 'Vencida', color: 'text-red-500'    };
    return { label: format(d, "dd 'de' MMM", { locale: ptBR }), color: 'text-muted-foreground' };
  } catch {
    return { label: dateStr, color: 'text-muted-foreground' };
  }
};

const STATUS_CONFIG = {
  pending:   { label: 'Pendente',   variant: 'secondary'   as const, Icon: Clock          },
  overdue:   { label: 'Vencida',    variant: 'destructive' as const, Icon: AlertTriangle   },
  paid:      { label: 'Pago',       variant: 'default'     as const, Icon: CheckCircle2    },
  cancelled: { label: 'Cancelado',  variant: 'outline'     as const, Icon: XCircle         },
} as const;

export const AgendaFinanceira: React.FC<AgendaFinanceiraProps> = ({ onBack }) => {
  const { items, loading, stats, createItem, markAsPaid, deleteItem } = useAgendaFinanceira();

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Partial<CreateAgendaItem>>({
    type: 'payable',
    recurrent: false,
  });

  const handleCreate = async () => {
    if (!form.description?.trim() || !form.amount || !form.due_date) return;
    await createItem(form as CreateAgendaItem);
    setShowDialog(false);
    setForm({ type: 'payable', recurrent: false });
  };

  // pending + overdue = ativos; paid + cancelled = histórico
  const activeItems = items.filter(i => i.status === 'pending' || i.status === 'overdue');
  const doneItems   = items.filter(i => i.status === 'paid'    || i.status === 'cancelled');

  const isPayable = (type: string) => type === 'payable';

  return (
    <div className="space-y-6">
      <BackHeader
        title="Agenda Financeira"
        subtitle="Contas a pagar e a receber organizadas"
        icon={<CalendarClock className="h-6 w-6" />}
        onBack={onBack}
        action={
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        }
      />

      {/* Cards de resumo */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
                <p className="text-xs text-muted-foreground">A pagar</p>
              </div>
              <p className="text-lg font-bold text-red-600">{formatCurrency(stats.totalPayable)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground">A receber</p>
              </div>
              <p className="text-lg font-bold text-green-600">{formatCurrency(stats.totalReceivable)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-xs text-muted-foreground">Vencidas</p>
              </div>
              <p className="text-lg font-bold">{stats.overdue}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-yellow-500" />
                <p className="text-xs text-muted-foreground">Esta semana</p>
              </div>
              <p className="text-lg font-bold">{stats.dueThisWeek}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : (
        <>
          {/* Ativos */}
          {activeItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Pendentes e Vencidas ({activeItems.length})
              </h3>
              {activeItems.map(item => {
                const { label, color } = getDueDateLabel(item.due_date);
                const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
                return (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {isPayable(item.type) ? (
                          <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.description}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-xs ${color}`}>{label}</span>
                            <Badge variant={cfg.variant} className="text-[10px] h-4 px-1.5">
                              {cfg.label}
                            </Badge>
                            {item.recurrent && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5">Recorrente</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-sm font-bold ${
                            isPayable(item.type) ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(item.amount)}
                          </span>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                            onClick={() => markAsPaid(item.id)}
                            title="Marcar como pago"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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

          {/* Histórico */}
          {doneItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Histórico ({doneItems.length})
              </h3>
              {doneItems.map(item => {
                const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.paid;
                return (
                  <Card key={item.id} className="opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {isPayable(item.type) ? (
                          <TrendingDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.description}</p>
                          <Badge variant={cfg.variant} className="text-[10px] h-4 px-1.5">
                            {cfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            {formatCurrency(item.amount)}
                          </span>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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

          {items.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center space-y-3">
                <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
                <p className="font-medium">Nenhum lançamento</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Adicione contas a pagar ou a receber para organizar seu fluxo financeiro
                </p>
                <Button size="sm" onClick={() => setShowDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar lançamento
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialog novo lançamento */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: Conta de luz"
                value={form.description || ''}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.type || 'payable'}
                  onValueChange={v => setForm(p => ({ ...p, type: v as any }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payable">A pagar (despesa)</SelectItem>
                    <SelectItem value="receivable">A receber (receita)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  min={0}
                  value={form.amount ?? ''}
                  onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={form.due_date || ''}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input
                placeholder="Opcional"
                value={form.notes || ''}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.recurrent ?? false}
                onCheckedChange={v => setForm(p => ({ ...p, recurrent: v }))}
              />
              <Label className="cursor-pointer">Recorrente</Label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                disabled={!form.description?.trim() || !form.amount || !form.due_date}
                onClick={handleCreate}
              >
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
