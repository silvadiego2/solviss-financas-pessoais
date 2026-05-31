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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Upload, Download, CheckCircle, XCircle, AlertCircle, ArrowLeft, FileText, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { parseSpreadsheet, generateExampleFile, convertRowToTransaction, ColumnMapping, ParsedTransaction, SpreadsheetRow } from '@/utils/spreadsheetParser';
import { parsePdfInvoice } from '@/utils/pdfInvoiceParser';
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

// ─── Aba PDF ────────────────────────────────────────────────────────────────

function PdfImportTab({ onBack }: { onBack: () => void }) {
  const [pdfFile, setPdfFile]               = useState<File | null>(null);
  const [parsing, setParsing]               = useState(false);
  const [transactions, setTransactions]     = useState<ParsedTransaction[]>([]);
  const [detectedBank, setDetectedBank]     = useState('');
  const [totalAmount, setTotalAmount]       = useState<number | undefined>();
  const [invoiceMonth, setInvoiceMonth]     = useState<string | undefined>();
  const [errors, setErrors]                 = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [importing, setImporting]           = useState(false);
  const [progress, setProgress]             = useState(0);
  const [showConfirm, setShowConfirm]       = useState(false);

  const { createTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  // Apenas cartões de crédito
  const creditCardAccounts = accounts.filter(a => a.type === 'credit_card');

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Selecione um arquivo PDF');
      return;
    }
    setPdfFile(file);
    setParsing(true);
    setErrors([]);
    setTransactions([]);
    try {
      const result = await parsePdfInvoice(file);
      setTransactions(result.transactions);
      setDetectedBank(result.detectedBank);
      setTotalAmount(result.totalAmount);
      setInvoiceMonth(result.invoiceMonth);
      setErrors(result.errors);
      if (result.transactions.length > 0) {
        toast.success(`${result.transactions.length} transações encontradas (${result.detectedBank})`);
      }
    } catch (err) {
      toast.error('Erro ao processar PDF: ' + (err as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    setShowConfirm(false);
    setImporting(true);
    setProgress(0);

    const categorizationEngine = new AutoCategorizationEngine(categories);
    let ok = 0, fail = 0;

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      try {
        let categoryId: string | undefined;
        const suggestion = categorizationEngine.categorizeTransaction(t.description, t.amount);
        if (suggestion) categoryId = suggestion.categoryId;

        await createTransaction({
          description: t.description,
          amount:      t.amount,
          date:        t.date,
          type:        t.type,
          account_id:  selectedAccountId || accounts[0]?.id,
          category_id: categoryId,
          notes:       t.notes,
          status:      'completed',
        });
        ok++;
      } catch {
        fail++;
      }
      setProgress(((i + 1) / transactions.length) * 100);
    }

    toast.success(`${ok} transações importadas com sucesso!`);
    if (fail > 0) toast.error(`${fail} transações falharam.`);
    onBack();
  };

  const totalImportAmount = transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Importar Fatura PDF
          </CardTitle>
          <CardDescription>
            Suporte a Nubank, Itaú, Bradesco, Santander, Inter e formato genérico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              O PDF precisa ter texto selecionável (não pode ser foto/scan). Caso o banco só ofereça imagem, exporte o extrato em CSV pelo aplicativo.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="pdf-file">Selecione a fatura (.pdf)</Label>
            <Input
              id="pdf-file"
              type="file"
              accept=".pdf"
              onChange={handlePdfSelect}
              disabled={parsing}
            />
          </div>

          {parsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              Lendo PDF...
            </div>
          )}

          {errors.length > 0 && (
            <div className="space-y-1">
              {errors.map((e, i) => (
                <Alert key={i} variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{e}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {transactions.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Transações encontradas</CardTitle>
                <div className="flex items-center gap-2">
                  {detectedBank && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {detectedBank}
                    </Badge>
                  )}
                  {invoiceMonth && (
                    <Badge variant="outline">
                      {invoiceMonth}
                    </Badge>
                  )}
                </div>
              </div>
              {totalAmount && (
                <CardDescription>
                  Total da fatura: <strong>R$ {totalAmount.toFixed(2).replace('.', ',')}</strong>
                  {' · '}{transactions.length} lançamentos extraídos
                  {Math.abs(totalImportAmount - totalAmount) > 1 && (
                    <span className="text-yellow-600 ml-1">
                      (soma extraída R$ {totalImportAmount.toFixed(2).replace('.', ',')} — pode haver parcelas ou taxas não listadas)
                    </span>
                  )}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72 border rounded-lg">
                <div className="p-3 space-y-1">
                  {transactions.map((t, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground text-xs w-16 flex-shrink-0">
                          {t.date.split('-').reverse().join('/')}
                        </span>
                        <span className="truncate">{t.description}</span>
                      </div>
                      <span className="text-destructive font-medium ml-2 flex-shrink-0">
                        R$ {t.amount.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Seleção de conta */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  Lançar na conta
                </Label>
                {creditCardAccounts.length > 0 ? (
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cartão de crédito" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCardAccounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                      {accounts.filter(a => a.type !== 'credit_card').map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum cartão de crédito cadastrado. As transações serão importadas sem conta vinculada.
                  </p>
                )}
              </div>

              {importing ? (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">{Math.round(progress)}% concluído</p>
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => setShowConfirm(true)}
                  disabled={importing}
                >
                  Importar {transactions.length} transações
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Você está prestes a importar:</p>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{transactions.length}</p>
                    <p className="text-xs text-muted-foreground">Transações</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-destructive">
                      R$ {totalImportAmount.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita facilmente.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Aba Planilha (código original preservado integralmente) ─────────────────

function SpreadsheetImportTab({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<SpreadsheetRow[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [detectedBank, setDetectedBank] = useState<string | undefined>();

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
      setDetectedBank(result.detectedBank);
      if (result.detectedBank) {
        toast.success(`Banco detectado: ${result.detectedBank}! Mapeamento automático aplicado.`);
      } else {
        toast.success('Arquivo carregado com sucesso!');
      }
      setStep('mapping');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleMappingComplete = () => {
    if (!detectedBank) {
      if (!mapping.date || !mapping.description || !mapping.amount || !mapping.type) {
        toast.error('Por favor, mapeie todos os campos obrigatórios');
        return;
      }
    }
    validateData();
    setStep('preview');
  };

  const validateData = () => {
    const results: ValidationResult[] = [];
    const duplicateEngine = new DuplicateDetectionEngine();
    const categorizationEngine = new AutoCategorizationEngine(categories);

    rawData.forEach((row, index) => {
      const transaction = convertRowToTransaction(row, mapping as ColumnMapping, detectedBank);
      if (!transaction) {
        results.push({ row: index + 1, status: 'error', message: 'Dados inválidos ou incompletos' });
        return;
      }
      if (transaction.amount <= 0) {
        results.push({ row: index + 1, status: 'error', message: 'Valor deve ser maior que zero' });
        return;
      }
      if (!transaction.category) {
        const suggestion = categorizationEngine.categorizeTransaction(transaction.description, transaction.amount);
        if (suggestion) {
          const category = categories.find(c => c.id === suggestion.categoryId);
          transaction.category = category?.name;
        }
      }
      const existingTransactions = transactions.map(t => ({
        id: t.id, description: t.description, amount: t.amount, date: t.date, account_id: t.account_id,
      }));
      const duplicates = duplicateEngine.detectDuplicates([
        ...existingTransactions,
        { id: `temp-${index}`, description: transaction.description, amount: transaction.amount, date: transaction.date, account_id: '' },
      ]);
      const isDuplicate = duplicates.some(group => group.transactions.some(t => t.id === `temp-${index}`));
      results.push({
        row: index + 1,
        status: isDuplicate ? 'warning' : 'success',
        message: isDuplicate ? 'Possível duplicata detectada' : 'OK',
        transaction,
      });
    });
    setValidationResults(results);
  };

  const handleImport = async () => {
    setStep('importing');
    setImportProgress(0);
    const validTransactions = validationResults.filter(r => r.transaction && r.status !== 'error');
    let successCount = 0, errorCount = 0;
    for (let i = 0; i < validTransactions.length; i++) {
      const result = validTransactions[i];
      const transaction = result.transaction!;
      try {
        let accountId = accounts[0]?.id;
        if (transaction.account) {
          const account = accounts.find(a => a.name.toLowerCase().includes(transaction.account!.toLowerCase()));
          if (account) accountId = account.id;
        }
        let categoryId: string | undefined;
        if (transaction.category) {
          const category = categories.find(c => c.name.toLowerCase() === transaction.category!.toLowerCase());
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
    if (errorCount > 0) toast.error(`${errorCount} transações falharam.`);
    onBack();
  };

  const successCount  = validationResults.filter(r => r.status === 'success').length;
  const warningCount  = validationResults.filter(r => r.status === 'warning').length;
  const errorCount    = validationResults.filter(r => r.status === 'error').length;
  const validList     = validationResults.filter(r => r.transaction && r.status !== 'error');
  const totalAmount   = validList.reduce((s, r) => s + (r.transaction ? (r.transaction.type === 'income' ? r.transaction.amount : -r.transaction.amount) : 0), 0);
  const incomeTotal   = validList.filter(r => r.transaction?.type === 'income').reduce((s, r) => s + (r.transaction?.amount || 0), 0);
  const expenseTotal  = validList.filter(r => r.transaction?.type === 'expense').reduce((s, r) => s + (r.transaction?.amount || 0), 0);

  if (step === 'upload') return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" />Importar Planilha</CardTitle>
        <CardDescription>Importe a partir de CSV, Excel ou extrato bancário</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>Formatos suportados: CSV, Excel (.xlsx, .xls). Extratos do Banco do Brasil e Santander são detectados automaticamente.</AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Label htmlFor="sheet-file">Selecione o arquivo</Label>
          <Input id="sheet-file" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} />
          <p className="text-xs text-muted-foreground">Bancos suportados: Banco do Brasil, Santander</p>
        </div>
        <Button variant="outline" onClick={generateExampleFile} className="w-full">
          <Download className="w-4 h-4 mr-2" />Baixar Arquivo de Exemplo
        </Button>
      </CardContent>
    </Card>
  );

  if (step === 'mapping') return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Mapeamento de Colunas{detectedBank && <Badge variant="secondary" className="bg-green-100 text-green-800">{detectedBank} detectado</Badge>}</CardTitle>
        <CardDescription>{detectedBank ? `Formato do ${detectedBank} detectado automaticamente.` : 'Relacione as colunas da sua planilha com os campos do sistema'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {detectedBank && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">Mapeamento preenchido automaticamente. Clique em "Continuar".</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4">
          {(['date','description','amount','type'] as const).map(field => (
            <div key={field} className="space-y-2">
              <Label>{field === 'date' ? 'Data *' : field === 'description' ? 'Descrição *' : field === 'amount' ? 'Valor *' : 'Tipo *'}</Label>
              <Select value={mapping[field]} onValueChange={v => setMapping({ ...mapping, [field]: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
          <Separator />
          {(['category','account'] as const).map(field => (
            <div key={field} className="space-y-2">
              <Label>{field === 'category' ? 'Categoria (Opcional)' : 'Conta (Opcional)'}</Label>
              <Select value={mapping[field] || 'none'} onValueChange={v => setMapping({ ...mapping, [field]: v === 'none' ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
          <Button onClick={handleMappingComplete} className="flex-1">Continuar</Button>
        </div>
      </CardContent>
    </Card>
  );

  if (step === 'preview') return (
    <Card>
      <CardHeader>
        <CardTitle>Prévia da Importação</CardTitle>
        <CardDescription>Revise as transações antes de importar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />{successCount} OK</Badge>
          <Badge variant="default" className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />{warningCount} Avisos</Badge>
          <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{errorCount} Erros</Badge>
        </div>
        <ScrollArea className="h-96 border rounded-lg">
          <div className="p-4 space-y-2">
            {validationResults.map(result => (
              <div key={result.row} className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center gap-2">
                  {result.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {result.status === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                  {result.status === 'error'   && <XCircle className="w-4 h-4 text-destructive" />}
                  <div>
                    <p className="text-sm font-medium">Linha {result.row}</p>
                    {result.transaction && <p className="text-xs text-muted-foreground">{result.transaction.description} - R$ {result.transaction.amount.toFixed(2)}</p>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{result.message}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('mapping')}>Voltar</Button>
          <Button onClick={() => setShowConfirmDialog(true)} disabled={errorCount === validationResults.length} className="flex-1">
            Importar {successCount + warningCount} Transações
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (step === 'importing') return (
    <Card>
      <CardHeader>
        <CardTitle>Importando Transações</CardTitle>
        <CardDescription>Aguarde enquanto processamos suas transações...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={importProgress} />
        <p className="text-center text-sm text-muted-foreground">{Math.round(importProgress)}% concluído</p>
      </CardContent>
    </Card>
  );

  return (
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
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span>Receitas: R$ {incomeTotal.toFixed(2)}</span></div>
                <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" /><span>Despesas: R$ {expenseTotal.toFixed(2)}</span></div>
              </div>
              {warningCount > 0 && <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>{warningCount} transação(ões) com avisos serão importadas.</AlertDescription></Alert>}
              <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita facilmente.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setShowConfirmDialog(false); handleImport(); }}>Confirmar Importação</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Componente raiz ─────────────────────────────────────────────────────────

export function ImportTransactions({ onBack }: ImportTransactionsProps) {
  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar Transações</h1>
        <p className="text-sm text-muted-foreground mt-1">Planilha (CSV/Excel) ou fatura de cartão em PDF</p>
      </div>

      <Tabs defaultValue="spreadsheet">
        <TabsList className="w-full">
          <TabsTrigger value="spreadsheet" className="flex-1 flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            Planilha (CSV / Excel)
          </TabsTrigger>
          <TabsTrigger value="pdf" className="flex-1 flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            Fatura PDF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spreadsheet" className="mt-4">
          <SpreadsheetImportTab onBack={onBack} />
        </TabsContent>

        <TabsContent value="pdf" className="mt-4">
          <PdfImportTab onBack={onBack} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
