import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Upload, Download, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { parseSpreadsheet, generateExampleFile, convertRowToTransaction, ColumnMapping, ParsedTransaction, SpreadsheetRow } from '@/utils/spreadsheetParser';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { DuplicateDetectionEngine } from '@/utils/duplicateDetection';
import { AutoCategorizationEngine } from '@/utils/autoCategorizationEngine';

interface ImportTransactionsProps {
  onBack: () => void;
}

interface ValidationResult {
  row: number;
  status: 'success' | 'warning' | 'error';
  message: string;
  transaction?: ParsedTransaction;
}

export function ImportTransactions({ onBack }: ImportTransactionsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<SpreadsheetRow[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { createTransaction, transactions } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      const result = await parseSpreadsheet(selectedFile);
      setFile(selectedFile);
      setHeaders(result.headers);
      setRawData(result.data);
      setMapping(result.suggestedMapping);
      setStep('mapping');
      toast.success('Arquivo carregado com sucesso!');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleMappingComplete = () => {
    if (!mapping.date || !mapping.description || !mapping.amount || !mapping.type) {
      toast.error('Por favor, mapeie todos os campos obrigatórios');
      return;
    }

    validateData();
    setStep('preview');
  };

  const validateData = () => {
    const results: ValidationResult[] = [];
    const duplicateEngine = new DuplicateDetectionEngine();
    const categorizationEngine = new AutoCategorizationEngine(categories);

    rawData.forEach((row, index) => {
      const transaction = convertRowToTransaction(row, mapping as ColumnMapping);
      
      if (!transaction) {
        results.push({
          row: index + 1,
          status: 'error',
          message: 'Dados inválidos ou incompletos',
        });
        return;
      }

      // Validar valores
      if (transaction.amount <= 0) {
        results.push({
          row: index + 1,
          status: 'error',
          message: 'Valor deve ser maior que zero',
        });
        return;
      }

      // Sugerir categoria se não fornecida
      if (!transaction.category) {
        const suggestion = categorizationEngine.categorizeTransaction(
          transaction.description,
          transaction.amount
        );
        if (suggestion) {
          const category = categories.find(c => c.id === suggestion.categoryId);
          transaction.category = category?.name;
        }
      }

      // Verificar duplicatas
      const existingTransactions = transactions.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        date: t.date,
        account_id: t.account_id,
      }));

      const duplicates = duplicateEngine.detectDuplicates([
        ...existingTransactions,
        {
          id: `temp-${index}`,
          description: transaction.description,
          amount: transaction.amount,
          date: transaction.date,
          account_id: '',
        },
      ]);

      const isDuplicate = duplicates.some(group => 
        group.transactions.some(t => t.id === `temp-${index}`)
      );

      if (isDuplicate) {
        results.push({
          row: index + 1,
          status: 'warning',
          message: 'Possível duplicata detectada',
          transaction,
        });
      } else {
        results.push({
          row: index + 1,
          status: 'success',
          message: 'OK',
          transaction,
        });
      }
    });

    setValidationResults(results);
  };

  const handleImport = async () => {
    setStep('importing');
    setImportProgress(0);

    const validTransactions = validationResults.filter(
      r => r.transaction && r.status !== 'error'
    );

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validTransactions.length; i++) {
      const result = validTransactions[i];
      const transaction = result.transaction!;

      try {
        // Encontrar conta
        let accountId = accounts[0]?.id;
        if (transaction.account) {
          const account = accounts.find(a => 
            a.name.toLowerCase().includes(transaction.account!.toLowerCase())
          );
          if (account) accountId = account.id;
        }

        // Encontrar categoria
        let categoryId: string | undefined;
        if (transaction.category) {
          const category = categories.find(c => 
            c.name.toLowerCase() === transaction.category!.toLowerCase()
          );
          if (category) categoryId = category.id;
        }

        await createTransaction({
          description: transaction.description,
          amount: transaction.amount,
          date: transaction.date,
          type: transaction.type,
          account_id: accountId,
          category_id: categoryId,
          notes: transaction.notes,
          tags: transaction.tags,
          status: 'completed',
        });

        successCount++;
      } catch (error) {
        console.error('Error importing transaction:', error);
        errorCount++;
      }

      setImportProgress(((i + 1) / validTransactions.length) * 100);
    }

    toast.success(`Importação concluída! ${successCount} transações importadas.`);
    if (errorCount > 0) {
      toast.error(`${errorCount} transações falharam.`);
    }

    onBack();
  };

  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importar Transações
        </CardTitle>
        <CardDescription>
          Importe suas transações a partir de uma planilha CSV ou Excel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Sua planilha deve conter pelo menos: Data, Descrição, Valor e Tipo (Receita/Despesa)
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="file">Selecione o arquivo</Label>
          <Input
            id="file"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
          />
        </div>

        <Button
          variant="outline"
          onClick={generateExampleFile}
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar Arquivo de Exemplo
        </Button>
      </CardContent>
    </Card>
  );

  const renderMappingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Mapeamento de Colunas</CardTitle>
        <CardDescription>
          Relacione as colunas da sua planilha com os campos do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Data *</Label>
            <Select
              value={mapping.date}
              onValueChange={(value) => setMapping({ ...mapping, date: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {headers.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Select
              value={mapping.description}
              onValueChange={(value) => setMapping({ ...mapping, description: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {headers.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor *</Label>
            <Select
              value={mapping.amount}
              onValueChange={(value) => setMapping({ ...mapping, amount: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {headers.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo (Receita/Despesa) *</Label>
            <Select
              value={mapping.type}
              onValueChange={(value) => setMapping({ ...mapping, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {headers.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Categoria (Opcional)</Label>
            <Select
              value={mapping.category || "none"}
              onValueChange={(value) => setMapping({ ...mapping, category: value === "none" ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {headers.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Conta (Opcional)</Label>
            <Select
              value={mapping.account || "none"}
              onValueChange={(value) => setMapping({ ...mapping, account: value === "none" ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {headers.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('upload')}>
            Voltar
          </Button>
          <Button onClick={handleMappingComplete} className="flex-1">
            Continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPreviewStep = () => {
    const successCount = validationResults.filter(r => r.status === 'success').length;
    const warningCount = validationResults.filter(r => r.status === 'warning').length;
    const errorCount = validationResults.filter(r => r.status === 'error').length;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Prévia da Importação</CardTitle>
          <CardDescription>
            Revise as transações antes de importar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              {successCount} OK
            </Badge>
            <Badge variant="default" className="bg-yellow-500">
              <AlertCircle className="w-3 h-3 mr-1" />
              {warningCount} Avisos
            </Badge>
            <Badge variant="destructive">
              <XCircle className="w-3 h-3 mr-1" />
              {errorCount} Erros
            </Badge>
          </div>

          <ScrollArea className="h-96 border rounded-lg">
            <div className="p-4 space-y-2">
              {validationResults.map((result) => (
                <div
                  key={result.row}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <div className="flex items-center gap-2">
                    {result.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {result.status === 'warning' && (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    {result.status === 'error' && (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Linha {result.row}</p>
                      {result.transaction && (
                        <p className="text-xs text-muted-foreground">
                          {result.transaction.description} - R$ {result.transaction.amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {result.message}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('mapping')}>
              Voltar
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={errorCount === validationResults.length}
              className="flex-1"
            >
              Importar {successCount + warningCount} Transações
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderImportingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Importando Transações</CardTitle>
        <CardDescription>
          Por favor, aguarde enquanto processamos suas transações...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={importProgress} />
        <p className="text-center text-sm text-muted-foreground">
          {Math.round(importProgress)}% concluído
        </p>
      </CardContent>
    </Card>
  );

  const successCount = validationResults.filter(r => r.status === 'success').length;
  const warningCount = validationResults.filter(r => r.status === 'warning').length;
  const validTransactions = validationResults.filter(r => r.transaction && r.status !== 'error');
  
  const totalAmount = validTransactions.reduce((sum, r) => {
    if (!r.transaction) return sum;
    return sum + (r.transaction.type === 'income' ? r.transaction.amount : -r.transaction.amount);
  }, 0);

  const incomeTotal = validTransactions
    .filter(r => r.transaction?.type === 'income')
    .reduce((sum, r) => sum + (r.transaction?.amount || 0), 0);
    
  const expenseTotal = validTransactions
    .filter(r => r.transaction?.type === 'expense')
    .reduce((sum, r) => sum + (r.transaction?.amount || 0), 0);

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      {step === 'upload' && renderUploadStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'importing' && renderImportingStep()}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Você está prestes a importar as seguintes transações:</p>
                
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{successCount + warningCount}</p>
                    <p className="text-xs text-muted-foreground">Transações</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${totalAmount >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                      {totalAmount >= 0 ? '+' : ''}R$ {totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Saldo Líquido</p>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Receitas: R$ {incomeTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive" />
                    <span>Despesas: R$ {expenseTotal.toFixed(2)}</span>
                  </div>
                </div>

                {warningCount > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {warningCount} transação(ões) com avisos serão importadas.
                    </AlertDescription>
                  </Alert>
                )}

                <p className="text-sm text-muted-foreground">
                  Esta ação não pode ser desfeita facilmente. Deseja continuar?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowConfirmDialog(false);
              handleImport();
            }}>
              Confirmar Importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
