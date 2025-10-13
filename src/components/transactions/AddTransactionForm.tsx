
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { toast } from 'sonner';
import { CreditCard, Building, Upload, X } from 'lucide-react';
import { enhancedToast } from '@/components/ui/enhanced-toast';
import { ProgressIndicator } from '@/components/ui/progress-indicator';

interface AddTransactionFormProps {
  onClose?: () => void;
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ onClose }) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const { accounts } = useAccounts();
  const { creditCards } = useCreditCards();
  const { categories } = useCategories();
  const { createTransaction } = useTransactions();

  const filteredCategories = categories.filter(cat => cat.transaction_type === type);

  // Combinar contas e cartões de crédito
  const allAccounts = [
    ...accounts.map(account => ({
      id: account.id,
      name: account.name,
      type: 'account' as const,
      accountType: account.type,
      icon: <Building size={16} />
    })),
    ...creditCards.map(card => ({
      id: card.id,
      name: card.name,
      type: 'credit_card' as const,
      accountType: 'credit_card',
      bankName: card.bank_name,
      icon: <CreditCard size={16} />
    }))
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description || !accountId || !categoryId) {
      enhancedToast.error('Campos obrigatórios não preenchidos', {
        description: 'Por favor, preencha todos os campos obrigatórios para continuar.'
      });
      return;
    }

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      enhancedToast.error('Valor inválido', {
        description: 'O valor deve ser um número positivo.'
      });
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      // Simulate progress for better UX
      setProgress(25);
      
      await createTransaction({
        type,
        amount: numericAmount,
        description,
        account_id: accountId,
        category_id: categoryId,
        date,
        status: 'completed',
        receiptFile: receiptFile || undefined,
        is_recurring: isRecurring,
        recurrence_frequency: isRecurring ? recurrenceFrequency : undefined,
        recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : undefined,
      });

      setProgress(100);

      enhancedToast.success(
        `${type === 'income' ? 'Receita' : 'Despesa'} adicionada!`,
        {
          description: `${formatCurrency(numericAmount)} foi registrado com sucesso.`,
          action: {
            label: 'Ver Relatório',
            onClick: () => {
              // Navigate to reports
              console.log('Navigate to reports');
            }
          }
        }
      );
      
      // Limpar formulário
      setAmount('');
      setDescription('');
      setAccountId('');
      setCategoryId('');
      setDate(new Date().toISOString().split('T')[0]);
      setReceiptFile(null);
      setProgress(0);
      setIsRecurring(false);
      setRecurrenceFrequency('monthly');
      setRecurrenceEndDate('');
      
      // Call onClose if provided
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      enhancedToast.error('Erro ao adicionar transação', {
        description: error.message || 'Tente novamente em alguns instantes.',
        important: true
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Nova Transação</CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={type} onValueChange={(value) => setType(value as 'income' | 'expense')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expense" className="text-red-600">Despesa</TabsTrigger>
                <TabsTrigger value="income" className="text-green-600">Receita</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="text"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                type="text"
                placeholder="Ex: Almoço, Salário, Compras..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Conta/Cartão *</Label>
              <Select value={accountId} onValueChange={setAccountId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta ou cartão" />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center space-x-2">
                        {account.icon}
                        <span>{account.name}</span>
                        <span className="text-xs text-gray-500">
                          {account.type === 'credit_card' ? 
                            `(Cartão - ${account.bankName})` : 
                            '(Conta)'
                          }
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                />
                <Label htmlFor="recurring" className="cursor-pointer">
                  Transação Recorrente
                </Label>
              </div>

              {isRecurring && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequência</Label>
                    <Select
                      value={recurrenceFrequency}
                      onValueChange={(value: any) => setRecurrenceFrequency(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data Final</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      min={date}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt">Anexar Comprovante/Nota Fiscal</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Upload size={20} className="text-gray-400" />
              </div>
              {receiptFile && (
                <p className="text-sm text-green-600">
                  Arquivo selecionado: {receiptFile.name}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <ProgressIndicator 
                    variant="circular" 
                    size="sm" 
                    message="" 
                  />
                  <span>Adicionando...</span>
                </div>
              ) : (
                `Adicionar ${type === 'income' ? 'Receita' : 'Despesa'}`
              )}
            </Button>

            {loading && progress > 0 && (
              <div className="mt-2">
                <ProgressIndicator 
                  progress={progress}
                  message="Salvando transação..."
                  showPercentage={false}
                  size="sm"
                />
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
