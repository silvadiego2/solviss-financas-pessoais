import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BackHeader } from '@/components/layout/BackHeader';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Camera as CameraIcon, Upload, Scan, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createWorker } from 'tesseract.js';
import { useCategories } from '@/hooks/useCategories';

interface ScannedData {
  amount?: number;
  description?: string;
  date?: string;
  merchant?: string;
}

interface ReceiptScannerProps {
  onBack?: () => void;
  onTransactionCreated?: (transaction: any) => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onBack, onTransactionCreated }) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [editedData, setEditedData] = useState<ScannedData>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const { categories = [] } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const capturePhoto = async () => {
    try {
      // Haptic feedback
      await Haptics.impact({ style: ImpactStyle.Light });

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 80,
        width: 1024,
        height: 1024,
      });

      if (photo.dataUrl) {
        setCapturedImage(photo.dataUrl);
        processImage(photo.dataUrl);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Erro ao capturar foto');
    }
  };

  const selectFromGallery = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 80,
      });

      if (photo.dataUrl) {
        setCapturedImage(photo.dataUrl);
        processImage(photo.dataUrl);
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      toast.error('Erro ao selecionar imagem');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
      const worker = await createWorker('por');
      
      toast.info('Processando imagem...');
      
      const { data: { text } } = await worker.recognize(imageDataUrl);
      await worker.terminate();

      // Extract data from OCR text
      const extracted = extractReceiptData(text);
      setScannedData(extracted);
      setEditedData(extracted);
      
      toast.success('Recibo processado com sucesso!');
      
      // Haptic feedback for success
      await Haptics.impact({ style: ImpactStyle.Medium });
      
    } catch (error) {
      console.error('Error processing image:', error);
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
      // Take the largest amount found (likely to be the total)
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
      // Convert to YYYY-MM-DD format
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

    // Try to find merchant name (usually first few lines)
    let merchant: string | undefined;
    if (lines.length > 0) {
      // Look for the first line that looks like a business name
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
      description: merchant || 'Transação via OCR',
    };
  };

  const createTransaction = async () => {
    if (!editedData.amount || !selectedCategory) {
      toast.error('Preencha o valor e selecione uma categoria');
      return;
    }

    const transaction = {
      amount: editedData.amount,
      description: editedData.description || 'Transação via OCR',
      category_id: selectedCategory,
      date: editedData.date || new Date().toISOString().split('T')[0],
      type: 'expense',
    };

    try {
      // Here you would typically call your transaction creation API
      toast.success('Transação criada com sucesso!');
      onTransactionCreated?.(transaction);
      
      // Reset form
      setCapturedImage(null);
      setScannedData(null);
      setEditedData({});
      setSelectedCategory('');
      
      // Haptic feedback
      await Haptics.impact({ style: ImpactStyle.Heavy });
      
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Erro ao criar transação');
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setScannedData(null);
    setEditedData({});
    setSelectedCategory('');
  };

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Scanner de Recibos" onBack={onBack} />}
      
      {!onBack && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Scanner de Recibos</h1>
          <p className="text-muted-foreground">Capture recibos e crie transações automaticamente</p>
        </div>
      )}

      {!capturedImage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5" />
              Capturar Recibo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button onClick={capturePhoto} className="flex items-center gap-2">
                <CameraIcon className="w-4 h-4" />
                Tirar Foto
              </Button>
              
              <Button variant="outline" onClick={selectFromGallery} className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Galeria
              </Button>
              
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload de Arquivo
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {capturedImage && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Imagem Capturada</CardTitle>
              <Button variant="outline" size="sm" onClick={resetScanner}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <img
              src={capturedImage}
              alt="Recibo capturado"
              className="w-full max-w-sm mx-auto rounded-lg border"
            />
            
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando OCR...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {scannedData && !isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Dados Extraídos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={editedData.amount || ''}
                  onChange={(e) => setEditedData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={editedData.description || ''}
                  onChange={(e) => setEditedData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição da transação"
                />
              </div>

              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={editedData.date || ''}
                  onChange={(e) => setEditedData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createTransaction} className="flex-1">
                Criar Transação
              </Button>
              <Button variant="outline" onClick={resetScanner}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};