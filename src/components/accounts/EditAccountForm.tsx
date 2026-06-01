import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackHeader } from '@/components/layout/BackHeader';
import { useAccounts } from '@/hooks/useAccounts';
import { Wallet } from 'lucide-react';

interface EditAccountFormProps {
  account: any;
  onBack: () => void;
}

export const EditAccountForm: React.FC<EditAccountFormProps> = ({ account, onBack }) => {
  const { updateAccount, isUpdating } = useAccounts();

  const [formData, setFormData] = useState({
    name:         account.name         ?? '',
    type:         account.type         ?? 'checking',
    balance:      (account.balance     ?? 0).toString(),
    bank_name:    account.bank_name    ?? '',
    credit_limit: account.credit_limit?.toString() ?? '',
    due_day:      account.due_day?.toString()       ?? '',
    closing_day:  account.closing_day?.toString()  ?? '',
  });

  const set = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Apenas colunas que existem no schema do banco
      const payload: Record<string, any> = {
        id:        account.id,
        name:      formData.name,
        type:      formData.type,
        balance:   parseFloat(formData.balance) || 0,
        bank_name: formData.bank_name || null,
      };

      if (formData.type === 'credit_card') {
        payload.credit_limit = parseFloat(formData.credit_limit) || null;
        payload.due_day      = parseInt(formData.due_day)        || null;
        payload.closing_day  = parseInt(formData.closing_day)    || null;
      }

      await updateAccount(payload);
      onBack();
    } catch (error: any) {
      console.error('Erro ao atualizar conta:', error);
    }
  };

  return (
    <div className="space-y-4">
      <BackHeader
        title="Editar Conta"
        subtitle={account.name}
        icon={<Wallet className="h-6 w-6" />}
        onBack={onBack}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <Label htmlFor="name">Nome da Conta</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => set('name', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo da Conta</Label>
              <Select value={formData.type} onValueChange={v => set('type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Conta Corrente</SelectItem>
                  <SelectItem value="savings">Poupança</SelectItem>
                  <SelectItem value="wallet">Carteira</SelectItem>
                  <SelectItem value="investment">Investimento</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="balance">Saldo Atual (R$)</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={e => set('balance', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="bank_name">Banco (opcional)</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={e => set('bank_name', e.target.value)}
                placeholder="Ex: Nubank, Itaú, Bradesco"
              />
            </div>

            {formData.type === 'credit_card' && (
              <>
                <div>
                  <Label htmlFor="credit_limit">Limite do Cartão</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    step="0.01"
                    value={formData.credit_limit}
                    onChange={e => set('credit_limit', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="closing_day">Dia Fechamento</Label>
                    <Input id="closing_day" type="number" min="1" max="31"
                      value={formData.closing_day}
                      onChange={e => set('closing_day', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="due_day">Dia Vencimento</Label>
                    <Input id="due_day" type="number" min="1" max="31"
                      value={formData.due_day}
                      onChange={e => set('due_day', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isUpdating} className="flex-1">
                {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button type="button" variant="outline" onClick={onBack}>
                Cancelar
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};
