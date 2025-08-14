import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackHeader } from '@/components/layout/BackHeader';
import { useAccounts, Account } from '@/hooks/useAccounts';
import { toast } from 'sonner';

interface EditAccountFormProps {
  account: Account;
  onClose: () => void;
}

export const EditAccountForm: React.FC<EditAccountFormProps> = ({ account, onClose }) => {
  const { updateAccount, isUpdating } = useAccounts();
  const [formData, setFormData] = useState({
    name: account.name,
    type: account.type,
    balance: account.balance.toString(),
    bank_name: account.bank_name || '',
    credit_limit: account.credit_limit?.toString() || '',
    due_day: account.due_day?.toString() || '',
    closing_day: account.closing_day?.toString() || ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updatedAccount: Partial<Account> & { id: string } = {
        id: account.id,
        name: formData.name,
        type: formData.type as Account['type'],
        balance: parseFloat(formData.balance) || 0,
        bank_name: formData.bank_name || null,
      };

      // Adicionar campos específicos de cartão de crédito se necessário
      if (formData.type === 'credit_card') {
        updatedAccount.credit_limit = parseFloat(formData.credit_limit) || null;
        updatedAccount.due_day = parseInt(formData.due_day) || null;
        updatedAccount.closing_day = parseInt(formData.closing_day) || null;
      }

      await updateAccount(updatedAccount);
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast.error('Erro ao atualizar conta');
    }
  };

  return (
    <div className="space-y-4">
      <BackHeader title="Editar Conta" onBack={onClose} />
      
      <Card>
        <CardHeader>
          <CardTitle>Editar Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Conta</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo da Conta</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleInputChange('type', value)}
              >
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
              <Label htmlFor="balance">Saldo Atual</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => handleInputChange('balance', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="bank_name">Nome do Banco (opcional)</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => handleInputChange('bank_name', e.target.value)}
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
                    onChange={(e) => handleInputChange('credit_limit', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="closing_day">Dia do Fechamento</Label>
                    <Input
                      id="closing_day"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.closing_day}
                      onChange={(e) => handleInputChange('closing_day', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_day">Dia do Vencimento</Label>
                    <Input
                      id="due_day"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.due_day}
                      onChange={(e) => handleInputChange('due_day', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex space-x-3">
              <Button type="submit" disabled={isUpdating} className="flex-1">
                {isUpdating ? 'Atualizando...' : 'Salvar Alterações'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};