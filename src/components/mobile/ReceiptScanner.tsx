import React, { useState, useEffect } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { BackHeader } from '@/components/layout/BackHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, Loader2, FileImage, DollarSign, Calendar, User, Trash2 } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import Tesseract from 'tesseract.js';
import { toast } from 'sonner';

interface ScannedData {
  amount?: number;
  description?: string;
  date?: string;
  merchant?: string;
  account_id?: string;
  category_id?: string;
}

interface ReceiptScannerProps {
  onBack?: () => void;
  onTransactionCreated?: (transaction: any) => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onBack, onTransactionCreated }) => {
  const { capturePhoto, selectFromGallery } = useCamera();
  const { createTransaction, isCreating } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [editedData, setEditedData] = useState<ScannedData | null>(null);

  const handleCapturePhoto = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
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
      setEditedData(extracted);
      
      toast.success('Recibo processado com sucesso!');
      await Haptics.impact({ style: ImpactStyle.Medium });
      
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

  const handleCreateTransaction = async () => {
    if (!editedData || !editedData.amount) {
      toast.error('Por favor, preencha pelo menos o valor da transação');
      return;
    }

    if (!editedData.account_id) {
      toast.error('Por favor, selecione uma conta');
      return;
    }

    try {
      // Convert image to file if available
      let receiptFile: File | undefined;
      if (capturedImage) {
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        receiptFile = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
      }

      const transactionData = {
        type: 'expense' as const,
        amount: editedData.amount,
        description: editedData.description || 'Transação escaneada',
        date: editedData.date || new Date().toISOString().split('T')[0],
        account_id: editedData.account_id,
        category_id: editedData.category_id,
        status: 'completed' as const,
        receiptFile,
      };

      createTransaction(transactionData);
      
      // Reset scanner
      resetScanner();
      
      if (onBack) {
        onBack();
      }
      
      toast.success('Transação criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      toast.error('Erro ao criar transação');
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setIsProcessing(false);
    setScannedData(null);
    setEditedData(null);
  };

  // Set default account when accounts are loaded
  useEffect(() => {
    if (accounts.length > 0 && editedData && !editedData.account_id) {
      setEditedData(prev => prev ? { ...prev, account_id: accounts[0].id } : null);
    }
  }, [accounts, editedData]);

  return (
    <div className="space-y-6">
      {onBack && <BackHeader title="Scanner de Recibos" onBack={onBack} />}
      
      {!onBack && (
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Scanner de Recibos</h2>
          <p className="text-muted-foreground">
            Capture recibos e crie transações automaticamente
          </p>
        </div>
      )}

      {/* Capture Options */}
      {!capturedImage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera size={20} />
              Capturar Recibo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button onClick={handleCapturePhoto} className="flex items-center gap-2">
                <Camera size={18} />
                Tirar Foto
              </Button>
              
              <Button variant="outline" onClick={handleSelectFromGallery} className="flex items-center gap-2">
                <FileImage size={18} />
                Selecionar da Galeria
              </Button>
              
              <div className="relative">
                <Button
                  variant="outline"
                  className="w-full flex items-center gap-2"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload size={18} />
                  Upload de Arquivo
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview */}
      {capturedImage && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Imagem Capturada</CardTitle>
              <Button variant="outline" size="sm" onClick={resetScanner}>
                <Trash2 size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img
                src={capturedImage}
                alt="Recibo capturado"
                className="max-w-full max-h-96 rounded-lg border shadow-md"
              />
            </div>
            
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                <Loader2 size={18} className="animate-spin" />
                <span>Processando OCR...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction Form */}
      {scannedData && !isProcessing && editedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} />
              Dados da Transação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={editedData.amount || ''}
                  onChange={(e) => setEditedData(prev => prev ? {...prev, amount: parseFloat(e.target.value) || 0} : null)}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={editedData.description || ''}
                  onChange={(e) => setEditedData(prev => prev ? {...prev, description: e.target.value} : null)}
                  placeholder="Descrição da transação"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={editedData.date || ''}
                  onChange={(e) => setEditedData(prev => prev ? {...prev, date: e.target.value} : null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">Conta *</Label>
                <Select 
                  value={editedData.account_id || ''} 
                  onValueChange={(value) => setEditedData(prev => prev ? {...prev, account_id: value} : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select 
                  value={editedData.category_id || ''} 
                  onValueChange={(value) => setEditedData(prev => prev ? {...prev, category_id: value} : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat.transaction_type === 'expense').map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="merchant">Estabelecimento</Label>
                <Input
                  id="merchant"
                  value={editedData.merchant || ''}
                  onChange={(e) => setEditedData(prev => prev ? {...prev, merchant: e.target.value} : null)}
                  placeholder="Nome do estabelecimento"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={resetScanner}
                  className="flex-1"
                  disabled={isCreating}
                >
                  <Trash2 size={16} className="mr-2" />
                  Descartar
                </Button>
                <Button 
                  onClick={handleCreateTransaction}
                  className="flex-1"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <DollarSign size={16} className="mr-2" />
                  )}
                  {isCreating ? 'Criando...' : 'Criar Transação'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!capturedImage && !isProcessing && (
        <Card className="text-center py-8">
          <CardContent>
            <Camera size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Pronto para escanear!</h3>
            <p className="text-muted-foreground mb-4">
              Capture uma foto do seu recibo ou selecione uma imagem da galeria para começar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};