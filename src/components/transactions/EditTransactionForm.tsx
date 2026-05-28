import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import {
  X, Upload, ArrowDown, ArrowUp, Loader2,
  Building, CreditCard as CreditCardIcon,
} from 'lucide-react';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useCategories } from '@/hooks/useCategories';
import { enhancedToast } from '@/components/ui/enhanced-toast';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface EditTransactionFormProps {
  transaction: Transaction;
  onClose: () => void;
}

// Mesma máscara BRL do AddTransactionForm
const maskBRL = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Converte número salvo (ex: 123.45) para string mascarada ("123,45")
const numToMask = (value: number | string): string => {
  const cents = Math.round(Number(value) * 100);
  return maskBRL(String(cents));
};

export const EditTransactionForm: React.FC<EditTransactionFormProps> = ({ transaction, onClose }) => {
  const { updateTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { creditCards } = useCreditCards();
  const { categories } = useCategories();

  const [amountMasked, setAmountMasked] = useState(numToMask(transaction.amount));
  const [description, setDescription] = useState(transaction.description);
  const [date, setDate] = useState(transaction.date ? String(transaction.date).slice(0, 10) : '');
  const [accountId, setAccountId] = useState(transaction.account_id);
  const [categoryId, setCategoryId] = useState(transaction.category_id || '');
  const [notes, setNotes] = useState(transaction.notes || '');
  const [status, setStatus] = useState(transaction.status);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(
    transaction.receipt_image_url || null
  );
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCategories = categories.filter(
    cat => cat.transaction_type === transaction.type
  );

  const allAccounts = [
    ...accounts.map(a => ({
      id: a.id, name: a.name, type: 'account' as const,
      icon: <Building size={15} className="text-muted-foreground" />,
    })),
    ...creditCards.map(c => ({
      id: c.id, name: c.name, type: 'credit_card' as const,
      icon: <CreditCardIcon size={15} className="text-muted-foreground" />,
    })),
  ];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountMasked(maskBRL(e.target.value));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseAmount = (masked: string): number => {
    return parseFloat(masked.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseAmount(amountMasked);
    if (!numericAmount || !description || !accountId) {
      enhancedToast.error('Campos obrigatórios', {
        description: 'Preencha valor, descrição e conta.',
      });
      return;
    }
    setLoading(true);
    try {
      await updateTransaction({
        id: transaction.id,
        description,
        amount: numericAmount,
        date,
        account_id: accountId,
        category_id: categoryId,
        notes,
        status,
        receiptFile: receiptFile || undefined,
      });
      enhancedToast.success('Transação atualizada!', {
        description: `${formatCurrency(numericAmount)} salvo com sucesso.`,
      });
      onClose();
    } catch (error: any) {
      enhancedToast.error('Erro ao salvar', {
        description: error.message || 'Tente novamente.',
        important: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const isIncome = transaction.type === 'income';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Editar Transação</CardTitle>
              {/* Badge visual do tipo — não editável */}
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                  isIncome
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-destructive/10 text-destructive'
                )}
              >
                {isIncome ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {isIncome ? 'Receita' : 'Despesa'}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Valor + Data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={amountMasked}
                    onChange={handleAmountChange}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Supermercado, Salário..."
                required
              />
            </div>

            {/* Conta + Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta / Cartão *</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {allAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="flex items-center gap-2">
                          {a.icon} {a.name}
                          <span className="text-xs text-muted-foreground">
                            {a.type === 'credit_card' ? '(Cartão)' : '(Conta)'}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <CategoryCombobox
                  categories={filteredCategories as any}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Selecione"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">✅ Concluída</SelectItem>
                  <SelectItem value="pending">⏳ Pendente</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre esta transação..."
                rows={2}
              />
            </div>

            {/* Comprovante */}
            <div className="space-y-2">
              <Label>Comprovante</Label>
              {!receiptPreview ? (
                <div
                  className="flex items-center gap-2 border border-dashed border-border rounded-lg px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para anexar</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={receiptPreview}
                    alt="Comprovante"
                    className="w-full max-h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                  >
                    <X size={14} className="text-white" />
                  </button>
                  <div className="px-3 py-2 bg-muted/80 text-xs text-muted-foreground truncate">
                    {receiptFile?.name ?? 'Recibo atual'}
                  </div>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-11 font-semibold" disabled={loading}>
                {loading ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> Salvando...</>
                ) : 'Salvar Alterações'}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};
