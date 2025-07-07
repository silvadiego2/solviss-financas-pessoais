
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { toast } from 'sonner';

interface AddAccountFormProps {
  onClose: () => void;
  editingAccount?: any;
}

const accountTypes = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'wallet', label: 'Carteira' },
  { value: 'investment', label: 'Investimento' },
];

const banks = [
  'Nubank', 'Itaú', 'Bradesco', 'Banco do Brasil', 'Santander', 
  'Caixa', 'BTG Pactual', 'Inter', 'C6 Bank', 'Original',
  'Safra', 'Votorantim', 'PicPay', 'Mercado Pago', 'Outros'
];

export const AddAccountForm: React.FC<AddAccountFormProps> = ({ onClose, editingAccount }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [bankName, setBankName] = useState('');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);

  const { createAccount, updateAccount } = useAccounts();

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name || '');
      setType(editingAccount.type || '');
      setBankName(editingAccount.bank_name || '');
      setBalance(editingAccount.balance?.toString() || '');
    }
  }, [editingAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !type) {
      toast.error('Por favor, preencha os campos obrigatórios');
      return;
    }

    const numericBalance = balance ? parseFloat(balance.replace(',', '.')) : 0;
    if (isNaN(numericBalance)) {
      toast.error('Saldo deve ser um valor numérico válido');
      return;
    }

    setLoading(true);
    
    try {
      const accountData = {
        name,
        type: type as any,
        bank_name: bankName || undefined,
        balance: numericBalance,
      };

      if (editingAccount) {
        await updateAccount(editingAccount.id, accountData);
        toast.success('Conta atualizada com sucesso!');
      } else {
        await createAccount(accountData);
        toast.success('Conta adicionada com sucesso!');
      }

      onClose();
    } catch (error: any) {
      toast.error(error.message || `Erro ao ${editingAccount ? 'atualizar' : 'adicionar'} conta`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="p-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-lg font-semibold">
          {editingAccount ? 'Editar Conta' : 'Adicionar Conta'}
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Conta *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Conta Principal, Poupança..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Conta *</Label>
              <Select value={type} onValueChange={setType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((accountType) => (
                    <SelectItem key={accountType.value} value={accountType.value}>
                      {accountType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank">Banco (opcional)</Label>
              <Select value={bankName} onValueChange={setBankName}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Saldo Inicial</Label>
              <Input
                id="balance"
                type="text"
                placeholder="0,00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={loading}
              >
                {loading ? 
                  (editingAccount ? 'Atualizando...' : 'Adicionando...') : 
                  (editingAccount ? 'Atualizar Conta' : 'Adicionar Conta')
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
