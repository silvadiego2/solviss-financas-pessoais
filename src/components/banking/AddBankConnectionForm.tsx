
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { useBankConnections } from '@/hooks/useBankConnections';
import { toast } from 'sonner';

interface AddBankConnectionFormProps {
  onClose: () => void;
}

const providers = [
  { value: 'pluggy', label: 'Pluggy' },
  { value: 'belvo', label: 'Belvo' },
  { value: 'direct_bank', label: 'API Direta do Banco' },
];

const banks = [
  'Nubank', 'Itaú', 'Bradesco', 'Banco do Brasil', 'Santander', 
  'Caixa', 'BTG Pactual', 'Inter', 'C6 Bank', 'Original',
  'Safra', 'Votorantim', 'PicPay', 'Mercado Pago'
];

export const AddBankConnectionForm: React.FC<AddBankConnectionFormProps> = ({ onClose }) => {
  const [provider, setProvider] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountExternalId, setAccountExternalId] = useState('');
  const [loading, setLoading] = useState(false);

  const { createConnection } = useBankConnections();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!provider || !bankName || !accountExternalId) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    
    try {
      await createConnection({
        provider,
        bank_name: bankName,
        account_external_id: accountExternalId,
        connection_status: 'active'
      });

      toast.success('Conexão bancária criada com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar conexão:', error);
      toast.error(error.message || 'Erro ao criar conexão bancária');
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
        <h2 className="text-lg font-semibold">Nova Conexão Bancária</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Conexão</CardTitle>
          <p className="text-sm text-gray-600">
            Configure a conexão com seu banco para sincronizar transações automaticamente.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provedor de Integração *</Label>
              <Select value={provider} onValueChange={setProvider} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Provedor usado para conectar com o banco (ex: Pluggy, Belvo)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank">Banco *</Label>
              <Select value={bankName} onValueChange={setBankName} required>
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
              <Label htmlFor="accountId">ID da Conta Externa *</Label>
              <Input
                id="accountId"
                type="text"
                placeholder="Ex: 12345"
                value={accountExternalId}
                onChange={(e) => setAccountExternalId(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                ID fornecido pelo provedor para identificar a conta bancária
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">⚠️ Importante</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Esta é uma integração somente leitura</li>
                <li>• Suas credenciais bancárias são criptografadas</li>
                <li>• Não é possível fazer transferências via app</li>
                <li>• Você pode revogar o acesso a qualquer momento</li>
              </ul>
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
                {loading ? 'Conectando...' : 'Conectar Banco'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
