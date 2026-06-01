import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { ReceiptScanner, ScannedData } from './ReceiptScanner';
import {
  X, Upload, ArrowDown, ArrowUp, Loader2,
  Building, CreditCard as CreditCardIcon, Scan,
} from 'lucide-react';
import { useTransactions, Transaction, getReceiptUrl } from '@/hooks/useTransactions';
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

const maskBRL = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const numToMask = (value: number | string): string => {
  const cents = Math.round(Number(value) * 100);
  return maskBRL(String(cents));
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const EditTransactionForm: React.FC<EditTransactionFormProps> = ({ transaction, onClose }) => {
  const { updateTransactionAsync } = useTransactions();
  const { accounts }    = useAccounts();
  const { creditCards } = useCreditCards();
  const { categories }  = useCategories();

  const [amountMasked, setAmountMasked] = useState(numToMask(transaction.amount));
  const [description,  setDescription]  = useState(transaction.description);
  const [date,         setDate]         = useState(transaction.date ? String(transaction.date).slice(0, 10) : '');
  const [accountId,    setAccountId]    = useState(transaction.account_id);
  const [categoryId,   setCategoryId]   = useState(transaction.category_id || '');
  const [notes,        setNotes]        = useState(transaction.notes || '');
  const [status,       setStatus]       = useState(transaction.status);
  const [receiptFile,    setReceiptFile]    = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [showScanner,  setShowScanner]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega a signed URL do comprovante já salvo no storage
  useEffect(() => {
    if (!transaction.receipt_image_url) return;
    setReceiptLoading(true);
    getReceiptUrl(transaction.receipt_image_url)
      .then(url => setReceiptPreview(url))
      .catch(() => setReceiptPreview(null))
      .finally(() => setReceiptLoading(false));
  }, [transaction.receipt_image_url]);

  const filteredCategories = categories.filter(
    cat => cat.transaction_type === transaction.type
  );

  const allAccounts = [
    ...accounts.map(a => ({
      id: a.id, name: a.name, type: 'account' as const,
      icon: <Building size={15} className="text-muted-foreground" />,
      label: '(Conta)',
    })),
    ...creditCards.map(c => ({
      id: c.id, name: c.name, type: 'credit_card' as const,
      icon: <CreditCardIcon size={15} className="text-muted-foreground" />,
      label: '(Cartão)',
    })),
  ];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setAmountMasked(maskBRL(e.target.value));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const dataUrl = await fileToDataUrl(file);
    setReceiptPreview(dataUrl);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScanResult = async (data: ScannedData) => {
    if (data.thumbnail) {
      setReceiptFile(data.thumbnail);
      const dataUrl = await fileToDataUrl(data.thumbnail);
      setReceiptPreview(dataUrl);
    }
    if (data.source !== 'photo-only') {
      if (data.amount)      setAmountMasked(maskBRL(String(Math.round(data.amount * 100))));
      if (data.description) setDescription(data.description);
      if (data.date)        setDate(data.date);
    }
    setShowScanner(false);
    if (data.source === 'photo-only') {
      enhancedToast.success('Comprovante salvo!', { description: 'Foto recortada e anexada à transação.' });
    } else {
      enhancedToast.success(
        data.source === 'qrcode' ? 'NF-e lida com sucesso!' : 'Recibo processado!',
        { description: data.amount ? `Valor: ${formatCurrency(data.amount)}` : 'Confira os dados.' },
      );
    }
  };

  const parseAmount = (masked: string): number =>
    parseFloat(masked.replace(/\./g, '').replace(',', '.')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseAmount(amountMasked);
    if (!numericAmount || !description || !accountId) {
      enhancedToast.error('Campos obrigatórios', { description: 'Preencha valor, descrição e conta.' });
      return;
    }
    setLoading(true);
    try {
      // mutateAsync: aguarda upload antes de fechar; erros de storage aparecem no toast
      await updateTransactionAsync({
        id: transaction.id,
        description, amount: numericAmount, date,
        account_id: accountId, category_id: categoryId,
        notes, status,
        receiptFile: receiptFile || undefined,
        // Se não há novo arquivo: mantém path existente OU limpa se removido
        receipt_image_url: receiptFile
          ? undefined
          : receiptPreview
            ? transaction.receipt_image_url
            : undefined,
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
              <span className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                isIncome
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive'
              )}>
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
            <div className="grid grid-cols-2 gap-4 overflow-hidden">
              <div className="space-y-2 min-w-0 overflow-hidden">
                <Label htmlFor="edit-amount">Valor *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                  <Input id="edit-amount" type="text" inputMode="numeric" placeholder="0,00"
                    value={amountMasked} onChange={handleAmountChange} className="pl-9 w-full" />
                </div>
              </div>
              <div className="space-y-2 min-w-0 overflow-hidden">
                <Label htmlFor="edit-date">Data *</Label>
                <Input id="edit-date" type="date" value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-w-0 block" style={{ maxWidth: '100%' }} required />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição *</Label>
              <Input id="edit-description" value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Supermercado, Salário..." required />
            </div>

            {/* Conta + Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta / Cartão *</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {allAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="flex items-center gap-2">
                          {a.icon} {a.name}
                          <span className="text-xs text-muted-foreground">{a.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <CategoryCombobox categories={filteredCategories as any}
                  value={categoryId} onChange={setCategoryId} placeholder="Selecione" />
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
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea id="edit-notes" value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre esta transação..."
                rows={2} />
            </div>

            {/* Comprovante */}
            <div className="space-y-2">
              <Label>Comprovante / Nota Fiscal</Label>

              {receiptLoading && (
                <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 size={15} className="animate-spin flex-shrink-0" />
                  Carregando comprovante...
                </div>
              )}

              {!receiptLoading && !receiptPreview && (
                <div className="flex gap-2">
                  <div
                    className="flex-1 flex items-center gap-2 border border-dashed border-border rounded-lg px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors min-w-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={15} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">
                      {transaction.receipt_image_url
                        ? 'Comprovante indisponível — clique para substituir'
                        : 'Clique para anexar'}
                    </span>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf"
                    onChange={handleFileChange} className="hidden" />
                  <Dialog open={showScanner} onOpenChange={setShowScanner}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline"
                        className="flex items-center gap-1.5 px-3 flex-shrink-0"
                        title="Escanear nota fiscal">
                        <Scan size={15} />
                        <span className="text-xs hidden sm:inline">Escanear NF</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm max-h-[92dvh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Scan size={16} /> Scanner de Nota Fiscal
                        </DialogTitle>
                      </DialogHeader>
                      <ReceiptScanner onResult={handleScanResult} onCancel={() => setShowScanner(false)} />
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {!receiptLoading && receiptPreview && (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={receiptPreview} alt="Comprovante"
                    className="w-full max-h-40 object-cover"
                    onError={() => setReceiptPreview(null)} />
                  <button type="button" onClick={removeReceipt}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                    title="Remover comprovante">
                    <X size={14} className="text-white" />
                  </button>
                  <div className="px-3 py-2 bg-muted/80 text-xs text-muted-foreground flex items-center justify-between">
                    <span className="truncate">{receiptFile?.name ?? 'Comprovante salvo'}</span>
                    <span className="flex-shrink-0 ml-2">
                      {receiptFile ? `${Math.round(receiptFile.size / 1024)}KB` : ''}
                    </span>
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
                {loading
                  ? <><Loader2 size={16} className="mr-2 animate-spin" /> Salvando...</>
                  : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
