import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useCamera } from '@/hooks/useCamera';
import { toast } from 'sonner';
import {
  CreditCard, Building, Upload, X, Camera,
  Scan, Loader2, FileImage, Trash2, ArrowDown, ArrowUp, Repeat,
} from 'lucide-react';
import { enhancedToast } from '@/components/ui/enhanced-toast';
import Tesseract from 'tesseract.js';
import { validateTransaction, parseAmount } from '@/utils/transactionSchema';
import { todayISO, formatDateBR } from '@/utils/dateHelpers';
import { suggestCategoryId } from '@/utils/autoCategorize';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface ScannedData {
  amount?: number;
  description?: string;
  date?: string;
  merchant?: string;
}

interface AddTransactionFormProps {
  onClose?: () => void;
}

const maskBRL = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ onClose }) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [showScannerDialog, setShowScannerDialog] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { accounts } = useAccounts();
  const { creditCards } = useCreditCards();
  const { categories } = useCategories();
  const { createTransaction } = useTransactions();
  const { capturePhoto, selectFromGallery } = useCamera();

  const filteredCategories = categories.filter(cat => cat.transaction_type === type);

  useEffect(() => {
    if (categoryId || !description) return;
    const suggested = suggestCategoryId(description, filteredCategories as any, type);
    if (suggested) setCategoryId(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, type, categories]);

  const allAccounts = [
    ...accounts.map(a => ({
      id: a.id, name: a.name, type: 'account' as const,
      icon: <Building size={15} className="text-muted-foreground flex-shrink-0" />,
      label: '(Conta)',
    })),
    ...creditCards.map(c => ({
      id: c.id, name: c.name, type: 'credit_card' as const,
      icon: <CreditCard size={15} className="text-muted-foreground flex-shrink-0" />,
      label: '(Cartão)',
    })),
  ];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(maskBRL(e.target.value));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    const validation = validateTransaction({
      type, amount, description, accountId, categoryId, date,
      isRecurring,
      recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
      recurrenceEndDate: isRecurring && recurrenceEndDate ? recurrenceEndDate : undefined,
    });

    if (!validation.success) {
      const errors = 'errors' in validation ? validation.errors : {};
      setValidationErrors(errors);
      enhancedToast.error('Erro de validação', {
        description: (Object.values(errors)[0] as string) || 'Verifique os campos.',
      });
      return;
    }

    const numericAmount = parseAmount(amount);
    setLoading(true);
    try {
      await createTransaction({
        type, amount: numericAmount, description,
        account_id: accountId, category_id: categoryId, date,
        status: 'completed',
        receiptFile: receiptFile || undefined,
        is_recurring: isRecurring,
        recurrence_frequency: isRecurring ? recurrenceFrequency : undefined,
        recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : undefined,
      });
      enhancedToast.success(
        `${type === 'income' ? 'Receita' : 'Despesa'} adicionada!`,
        { description: `${formatCurrency(numericAmount)} registrado com sucesso.` }
      );
      setAmount(''); setDescription(''); setAccountId('');
      setCategoryId(''); setDate(todayISO());
      removeReceipt(); setIsRecurring(false);
      setRecurrenceFrequency('monthly'); setRecurrenceEndDate('');
      setValidationErrors({});
      if (onClose) onClose();
    } catch (error: any) {
      enhancedToast.error('Erro ao adicionar transação', {
        description: error.message || 'Tente novamente.',
        important: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCapturePhoto = async () => {
    try { const p = await capturePhoto(); if (p.dataUrl) { setCapturedImage(p.dataUrl); processImage(p.dataUrl); } }
    catch { toast.error('Erro ao capturar foto'); }
  };
  const handleSelectFromGallery = async () => {
    try { const p = await selectFromGallery(); if (p.dataUrl) { setCapturedImage(p.dataUrl); processImage(p.dataUrl); } }
    catch { toast.error('Erro ao selecionar imagem'); }
  };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => { const d = e.target?.result as string; setCapturedImage(d); processImage(d); };
      reader.readAsDataURL(file);
    }
  };
  const processImage = async (imageDataUrl: string) => {
    setIsProcessing(true);
    try {
      toast.info('Processando imagem...');
      const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'por', { logger: m => console.log(m) });
      setScannedData(extractReceiptData(text));
      toast.success('Recibo processado!');
    } catch { toast.error('Erro ao processar imagem'); }
    finally { setIsProcessing(false); }
  };
  const extractReceiptData = (text: string): ScannedData => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const amounts = text.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/g);
    let amount: number | undefined;
    if (amounts?.length) {
      const nums = amounts.map(a => parseFloat(a.replace(/R\$\s*/, '').replace(/\./g, '').replace(',', '.'))).filter(n => !isNaN(n));
      if (nums.length) amount = Math.max(...nums);
    }
    const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
    let date: string | undefined;
    if (dateMatch) {
      const parts = dateMatch[1].split(/[\/\-\.]/);
      if (parts.length === 3) { const [d, m, y] = parts; date = `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; }
    }
    let merchant: string | undefined;
    for (const line of lines.slice(0, 5)) { if (line.length > 3 && line.length < 50 && !/^\d+$/.test(line)) { merchant = line; break; } }
    return { amount, date, merchant, description: merchant || 'Transação escaneada' };
  };
  const handleUseScannedData = async () => {
    if (scannedData) {
      if (scannedData.amount) setAmount(maskBRL(String(Math.round(scannedData.amount * 100))));
      if (scannedData.description) setDescription(scannedData.description);
      if (scannedData.date) setDate(scannedData.date);
      if (capturedImage) {
        try {
          const res = await fetch(capturedImage); const blob = await res.blob();
          setReceiptFile(new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }));
          setReceiptPreview(capturedImage);
        } catch { /* ignora */ }
      }
    }
    setCapturedImage(null); setIsProcessing(false); setScannedData(null); setShowScannerDialog(false);
  };
  const resetScanner = () => { setCapturedImage(null); setIsProcessing(false); setScannedData(null); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Nova Transação</CardTitle>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setType('expense'); setCategoryId(''); }}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border-2 transition-all',
                  type === 'expense'
                    ? 'bg-destructive/10 border-destructive text-destructive'
                    : 'border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive'
                )}
              >
                <ArrowDown size={16} /> Despesa
              </button>
              <button
                type="button"
                onClick={() => { setType('income'); setCategoryId(''); }}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border-2 transition-all',
                  type === 'income'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-border text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-600'
                )}
              >
                <ArrowUp size={16} /> Receita
              </button>
            </div>

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
                    value={amount}
                    onChange={handleAmountChange}
                    className="pl-9"
                  />
                </div>
                {validationErrors.amount && <p className="text-xs text-destructive">{validationErrors.amount}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                type="text"
                placeholder="Ex: Almoço, Salário, Compras..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {validationErrors.description && <p className="text-xs text-destructive">{validationErrors.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta / Cartão *</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {allAccounts.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">Nenhuma conta cadastrada</div>
                    ) : (
                      allAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {/* min-w-0 + truncate garantem que o nome não estoure o espaço */}
                          <span className="flex items-center gap-2 min-w-0 w-full overflow-hidden">
                            {a.icon}
                            <span className="truncate min-w-0 flex-1">{a.name}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">{a.label}</span>
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {validationErrors.accountId && <p className="text-xs text-destructive">{validationErrors.accountId}</p>}
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <CategoryCombobox
                  categories={filteredCategories as any}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Selecione"
                />
                {validationErrors.categoryId && <p className="text-xs text-destructive">{validationErrors.categoryId}</p>}
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(c) => setIsRecurring(c as boolean)}
                />
                <Label htmlFor="recurring" className="cursor-pointer flex items-center gap-1.5">
                  <Repeat size={14} className="text-muted-foreground" /> Transação Recorrente
                </Label>
              </div>
              {isRecurring && (
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequência</Label>
                    <Select value={recurrenceFrequency} onValueChange={(v: any) => setRecurrenceFrequency(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Input id="endDate" type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} min={date} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Comprovante / Nota Fiscal</Label>
              {!receiptPreview ? (
                <div className="flex gap-2">
                  <div
                    className="flex-1 flex items-center gap-2 border border-dashed border-border rounded-lg px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique para anexar</span>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                  <Dialog open={showScannerDialog} onOpenChange={setShowScannerDialog}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon" title="Escanear recibo">
                        <Scan className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Scanner de Recibo</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        {!capturedImage && (
                          <div className="grid grid-cols-1 gap-3">
                            <Button type="button" onClick={handleCapturePhoto} className="flex items-center gap-2">
                              <Camera size={18} /> Tirar Foto
                            </Button>
                            <Button type="button" variant="outline" onClick={handleSelectFromGallery} className="flex items-center gap-2">
                              <FileImage size={18} /> Selecionar da Galeria
                            </Button>
                            <div className="relative">
                              <Button type="button" variant="outline" className="w-full flex items-center gap-2" onClick={() => document.getElementById('scanner-file-upload')?.click()}>
                                <Upload size={18} /> Upload de Arquivo
                              </Button>
                              <input id="scanner-file-upload" type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </div>
                          </div>
                        )}
                        {capturedImage && isProcessing && (
                          <div className="text-center space-y-4">
                            <img src={capturedImage} alt="Recibo" className="max-w-full max-h-64 rounded-lg border mx-auto" />
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                              <Loader2 size={18} className="animate-spin" />
                              <span>Processando OCR...</span>
                            </div>
                          </div>
                        )}
                        {capturedImage && !isProcessing && scannedData && (
                          <div className="space-y-4">
                            <img src={capturedImage} alt="Recibo" className="max-w-full max-h-48 rounded-lg border mx-auto" />
                            <div className="space-y-2 p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium">Dados Extraídos:</p>
                              {scannedData.amount && <p className="text-sm">Valor: <span className="font-semibold">{formatCurrency(scannedData.amount)}</span></p>}
                              {scannedData.description && <p className="text-sm">Descrição: <span className="font-semibold">{scannedData.description}</span></p>}
                              {scannedData.date && <p className="text-sm">Data: <span className="font-semibold">{formatDateBR(scannedData.date)}</span></p>}
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" onClick={resetScanner} className="flex-1"><Trash2 size={16} className="mr-2" /> Descartar</Button>
                              <Button type="button" onClick={handleUseScannedData} className="flex-1">Usar Dados</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={receiptPreview} alt="Comprovante" className="w-full max-h-40 object-cover" />
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                  >
                    <X size={14} className="text-white" />
                  </button>
                  <div className="px-3 py-2 bg-muted/80 text-xs text-muted-foreground truncate">{receiptFile?.name}</div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Salvando...</>
              ) : (
                `Adicionar ${type === 'income' ? 'Receita' : 'Despesa'}`
              )}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};
