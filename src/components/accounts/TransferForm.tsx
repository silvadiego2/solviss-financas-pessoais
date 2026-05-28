import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftRight } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatters';

interface TransferFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const TransferForm: React.FC<TransferFormProps> = ({ trigger, onSuccess }) => {
  const { user } = useAuth();
  const { accounts, refetch } = useAccounts();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: 'Transferência entre contas',
  });

  const fromAccount = accounts.find(a => a.id === form.fromAccountId);
  const toAccount = accounts.find(a => a.id === form.toAccountId);
  const amount = parseFloat(form.amount) || 0;
  const insufficientFunds = fromAccount && amount > Number(fromAccount.balance);

  const handleTransfer = async () => {
    if (!user || !form.fromAccountId || !form.toAccountId || !amount) return;
    if (form.fromAccountId === form.toAccountId) {
      toast.error('Selecione contas diferentes');
      return;
    }
    if (insufficientFunds) {
      toast.error('Saldo insuficiente na conta de origem');
      return;
    }
    setSaving(true);
    try {
      // Debito na conta origem
      const { error: e1 } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'expense',
        description: `${form.description} → ${toAccount?.name}`,
        amount,
        date: form.date,
        account_id: form.fromAccountId,
        transfer_id: crypto.randomUUID(),
        is_transfer: true,
        status: 'completed',
      });
      if (e1) throw e1;

      // Crédito na conta destino
      const { error: e2 } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'income',
        description: `${form.description} ← ${fromAccount?.name}`,
        amount,
        date: form.date,
        account_id: form.toAccountId,
        is_transfer: true,
        status: 'completed',
      });
      if (e2) throw e2;

      toast.success(`Transferência de ${formatCurrency(amount)} realizada com sucesso!`);
      setOpen(false);
      setForm({ fromAccountId: '', toAccountId: '', amount: '', date: new Date().toISOString().split('T')[0], description: 'Transferência entre contas' });
      onSuccess?.();
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao realizar transferência');
    } finally {
      setSaving(false);
    }
  };

  const eligibleAccounts = accounts.filter(a => a.type !== 'credit');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <ArrowLeftRight className="h-4 w-4 mr-2" /> Transferir
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" /> Transferência entre Contas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Conta de Origem *</Label>
            <Select value={form.fromAccountId} onValueChange={v => setForm(f => ({ ...f, fromAccountId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta origem" />
              </SelectTrigger>
              <SelectContent>
                {eligibleAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {formatCurrency(Number(a.balance))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center">
            <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Label>Conta de Destino *</Label>
            <Select value={form.toAccountId} onValueChange={v => setForm(f => ({ ...f, toAccountId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta destino" />
              </SelectTrigger>
              <SelectContent>
                {eligibleAccounts
                  .filter(a => a.id !== form.fromAccountId)
                  .map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — {formatCurrency(Number(a.balance))}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className={insufficientFunds ? 'border-destructive' : ''}
            />
            {insufficientFunds && (
              <p className="text-xs text-destructive">Saldo insuficiente. Disponível: {formatCurrency(Number(fromAccount?.balance))}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Opcional"
            />
          </div>

          {form.fromAccountId && form.toAccountId && amount > 0 && (
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p className="font-medium">Resumo da Transferência</p>
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">{fromAccount?.name}</span> →{' '}
                <span className="text-foreground font-medium">{toAccount?.name}</span>
              </p>
              <p className="text-lg font-bold">{formatCurrency(amount)}</p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleTransfer}
            disabled={saving || !form.fromAccountId || !form.toAccountId || !amount || insufficientFunds}
          >
            {saving ? 'Transferindo...' : 'Confirmar Transferência'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
