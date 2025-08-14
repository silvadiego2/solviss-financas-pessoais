import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BackHeader } from '@/components/layout/BackHeader';
import { useCreditCards, CreditCard } from '@/hooks/useCreditCards';
import { toast } from 'sonner';

interface EditCreditCardFormProps {
  card: CreditCard;
  onClose: () => void;
}

export const EditCreditCardForm: React.FC<EditCreditCardFormProps> = ({ card, onClose }) => {
  const { updateCreditCard, isUpdating } = useCreditCards();
  const [formData, setFormData] = useState({
    name: card.name,
    bank_name: card.bank_name || '',
    limit: card.limit.toString(),
    due_day: card.due_day.toString(),
    closing_day: card.closing_day.toString()
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updatedCard: Partial<CreditCard> & { id: string } = {
        id: card.id,
        name: formData.name,
        bank_name: formData.bank_name || null,
        limit: parseFloat(formData.limit) || 0,
        due_day: parseInt(formData.due_day) || 1,
        closing_day: parseInt(formData.closing_day) || 1
      };

      await updateCreditCard(updatedCard);
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar cartão:', error);
      toast.error('Erro ao atualizar cartão');
    }
  };

  return (
    <div className="space-y-4">
      <BackHeader title="Editar Cartão de Crédito" onBack={onClose} />
      
      <Card>
        <CardHeader>
          <CardTitle>Editar Cartão de Crédito</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Cartão</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="bank_name">Banco</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => handleInputChange('bank_name', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="limit">Limite do Cartão</Label>
              <Input
                id="limit"
                type="number"
                step="0.01"
                value={formData.limit}
                onChange={(e) => handleInputChange('limit', e.target.value)}
                required
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
                  required
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
                  required
                />
              </div>
            </div>

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