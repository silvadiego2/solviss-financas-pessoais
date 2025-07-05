
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { useCreditCards } from '@/hooks/useCreditCards';
import { toast } from 'sonner';

interface AddCreditCardFormProps {
  onClose: () => void;
}

const banks = [
  'Nubank', 'Itaú', 'Bradesco', 'Banco do Brasil', 'Santander', 
  'Caixa', 'BTG Pactual', 'Inter', 'C6 Bank', 'Original',
  'Safra', 'Votorantim', 'PicPay', 'Mercado Pago', 'Outros'
];

export const AddCreditCardForm: React.FC<AddCreditCardFormProps> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [loading, setLoading] = useState(false);

  const { createCreditCard } = useCreditCards();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !bankName || !limit || !closingDay || !dueDay) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const numericLimit = parseFloat(limit.replace(',', '.'));
    if (isNaN(numericLimit) || numericLimit <= 0) {
      toast.error('Limite deve ser um valor positivo');
      return;
    }

    const closingDayNum = parseInt(closingDay);
    const dueDayNum = parseInt(dueDay);
    
    if (closingDayNum < 1 || closingDayNum > 31 || dueDayNum < 1 || dueDayNum > 31) {
      toast.error('Dias devem estar entre 1 e 31');
      return;
    }

    setLoading(true);
    
    try {
      await createCreditCard({
        name,
        bank_name: bankName,
        limit: numericLimit,
        used_amount: 0,
        closing_day: closingDayNum,
        due_day: dueDayNum,
        is_active: true,
      });

      toast.success('Cartão de crédito adicionado com sucesso!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar cartão');
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
        <h2 className="text-lg font-semibold">Adicionar Cartão de Crédito</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Cartão</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cartão *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Cartão Principal, Cartão Reserva..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
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
              <Label htmlFor="limit">Limite do Cartão *</Label>
              <Input
                id="limit"
                type="text"
                placeholder="0,00"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="closingDay">Dia do Fechamento *</Label>
                <Select value={closingDay} onValueChange={setClosingDay} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDay">Dia do Vencimento *</Label>
                <Select value={dueDay} onValueChange={setDueDay} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                {loading ? 'Adicionando...' : 'Adicionar Cartão'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
