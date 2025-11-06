
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useCamera } from '@/hooks/useCamera';
import { toast } from 'sonner';
import { CreditCard, Building, Upload, X, Camera, Scan, Loader2, FileImage, Trash2 } from 'lucide-react';
import { enhancedToast } from '@/components/ui/enhanced-toast';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import Tesseract from 'tesseract.js';

interface ScannedData {
  amount?: number;
  description?: string;
  date?: string;
  merchant?: string;
}

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
  
  // Scanner states
  const [showScannerDialog, setShowScannerDialog] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);

  const { accounts } = useAccounts();
  const { creditCards } = useCreditCards();
  const { categories } = useCategories();
  const { createTransaction } = useTransactions();
  const { capturePhoto, selectFromGallery } = useCamera();

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

  // Scanner functions
  const handleCapturePhoto = async () => {
    try {
      const photo = await capturePhoto();
      if (photo.dataUrl) {
        setCapturedImage(photo.dataUrl);
        processImage(photo.dataUrl);
      }
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      toast.error('Erro ao capturar foto');
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      const photo = await selectFromGallery();
      if (photo.dataUrl) {
        setCapturedImage(photo.dataUrl);
        processImage(photo.dataUrl);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      toast.error('Erro ao selecionar imagem');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setCapturedImage(dataUrl);
        processImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageDataUrl: string) => {
    setIsProcessing(true);
    
    try {
      toast.info('Processando imagem...');
      
      const { data: { text } } = await Tesseract.recognize(
        imageDataUrl,
        'por',
        {
          logger: m => console.log(m)
        }
      );

      const extracted = extractReceiptData(text);
      setScannedData(extracted);
      
      toast.success('Recibo processado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      toast.error('Erro ao processar imagem');
    } finally {
      setIsProcessing(false);
    }
  };

  const extractReceiptData = (text: string): ScannedData => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Try to find amount (looking for patterns like R$ 123.45 or 123,45)
    const amountRegex = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/g;
    const amounts = text.match(amountRegex);
    
    let amount: number | undefined;
    if (amounts && amounts.length > 0) {
      const numericAmounts = amounts.map(a => {
        const cleaned = a.replace(/R\$\s*/, '').replace(/\./g, '').replace(',', '.');
        return parseFloat(cleaned);
      }).filter(n => !isNaN(n));
      
      if (numericAmounts.length > 0) {
        amount = Math.max(...numericAmounts);
      }
    }

    // Try to find date
    const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
    const dateMatch = text.match(dateRegex);
    let date: string | undefined;
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const parts = dateStr.split(/[\/\-\.]/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) {
          year = '20' + year;
        }
        date = `${year}-${month}-${day}`;
      }
    }

    // Try to find merchant name
    let merchant: string | undefined;
    if (lines.length > 0) {
      for (const line of lines.slice(0, 5)) {
        if (line.length > 3 && line.length < 50 && !/^\d+$/.test(line)) {
          merchant = line;
          break;
        }
      }
    }

    return {
      amount,
      date,
      merchant,
      description: merchant || 'Transação escaneada',
    };
  };

  const handleUseScannedData = async () => {
    if (scannedData) {
      setAmount(scannedData.amount?.toString().replace('.', ',') || '');
      setDescription(scannedData.description || '');
      setDate(scannedData.date || date);
      
      // Convert image to File
      if (capturedImage) {
        try {
          const response = await fetch(capturedImage);
          const blob = await response.blob();
          const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setReceiptFile(file);
        } catch (error) {
          console.error('Erro ao converter imagem:', error);
        }
      }
    }
    
    // Reset scanner and close dialog
    setCapturedImage(null);
    setIsProcessing(false);
    setScannedData(null);
    setShowScannerDialog(false);
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setIsProcessing(false);
    setScannedData(null);
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
              <div className="flex gap-2">
                {/* Botão de Upload Normal */}
                <div className="flex-1 flex items-center space-x-2">
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  <Upload size={20} className="text-gray-400" />
                </div>
                
                {/* Botão Scanner OCR */}
                <Dialog open={showScannerDialog} onOpenChange={setShowScannerDialog}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" title="Escanear recibo">
                      <Scan className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Scanner de Recibo</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Capture Options */}
                      {!capturedImage && (
                        <div className="grid grid-cols-1 gap-3">
                          <Button type="button" onClick={handleCapturePhoto} className="flex items-center gap-2">
                            <Camera size={18} />
                            Tirar Foto
                          </Button>
                          
                          <Button type="button" variant="outline" onClick={handleSelectFromGallery} className="flex items-center gap-2">
                            <FileImage size={18} />
                            Selecionar da Galeria
                          </Button>
                          
                          <div className="relative">
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full flex items-center gap-2"
                              onClick={() => document.getElementById('scanner-file-upload')?.click()}
                            >
                              <Upload size={18} />
                              Upload de Arquivo
                            </Button>
                            <input
                              id="scanner-file-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Processing State */}
                      {capturedImage && isProcessing && (
                        <div className="text-center space-y-4">
                          <img
                            src={capturedImage}
                            alt="Recibo capturado"
                            className="max-w-full max-h-64 rounded-lg border mx-auto"
                          />
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 size={18} className="animate-spin" />
                            <span>Processando OCR...</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Scanned Data Preview */}
                      {capturedImage && !isProcessing && scannedData && (
                        <div className="space-y-4">
                          <img
                            src={capturedImage}
                            alt="Recibo capturado"
                            className="max-w-full max-h-48 rounded-lg border mx-auto"
                          />
                          
                          <div className="space-y-2 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium">Dados Extraídos:</p>
                            {scannedData.amount && (
                              <p className="text-sm">Valor: <span className="font-semibold">{formatCurrency(scannedData.amount)}</span></p>
                            )}
                            {scannedData.description && (
                              <p className="text-sm">Descrição: <span className="font-semibold">{scannedData.description}</span></p>
                            )}
                            {scannedData.date && (
                              <p className="text-sm">Data: <span className="font-semibold">{new Date(scannedData.date).toLocaleDateString('pt-BR')}</span></p>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={resetScanner} className="flex-1">
                              <Trash2 size={16} className="mr-2" />
                              Descartar
                            </Button>
                            <Button type="button" onClick={handleUseScannedData} className="flex-1">
                              Usar Dados
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
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
