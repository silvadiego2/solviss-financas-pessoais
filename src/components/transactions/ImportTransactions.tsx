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
import { Upload, Download, CheckCircle, XCircle, AlertCircle, FileText, CreditCard, Wallet } from 'lucide-react';
import { BackHeader } from '@/components/layout/BackHeader';
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
  const [importing, setImporting]           = useState(false);
  const [progress, setProgress]             = useState(0);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const { createTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const creditCardAccounts = accounts.filter(a => a.type === 'credit_card');
  const otherAccounts = accounts.filter(a => a.type !== 'credit_card');

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Por favor, selecione um arquivo PDF');
      return;
    }
    setPdfFile(file);
    setTransactions([]);
    setErrors([]);
    setParsing(true);
    try {
      const result = await parsePdfInvoice(file);
      setTransactions(result.transactions);
      setDetectedBank(result.bank || '');
      setTotalAmount(result.totalAmount);
      setInvoiceMonth(result.invoiceMonth);
      if (result.errors?.length) setErrors(result.errors);
      toast.success(`${result.transactions.length} transações encontradas na fatura`);
    } catch (err) {
      toast.error('Erro ao processar PDF. Verifique se é uma fatura válida.');
      setErrors(['Não foi possível processar este PDF.']);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedAccountId) { toast.error('Selecione uma conta'); return; }
    setImporting(true);
    setProgress(0);
    let imported = 0;
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      try {
        await createTransaction({
          type: 'expense',
          amount: t.amount,
          description: t.description,
          date: t.date,
          account_id: selectedAccountId,
          category_id: t.category_id,
          status: 'completed',
        });
        imported++;
      } catch {}
      setProgress(Math.round(((i + 1) / transactions.length) * 100));
    }
    setImporting(false);
    setShowConfirm(false);
    toast.success(`${imported} transações importadas com sucesso!`);
    onBack();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Fatura de Cartão em PDF
          </CardTitle>
          <CardDescription>
            Importe sua fatura de cartão de crédito diretamente em PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Selecionar fatura PDF</Label>
            <Input type="file" accept=".pdf" onChange={handlePdfSelect} disabled={parsing} />
          </div>

          {parsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              Processando fatura...
            </div>
          )}

          {detectedBank && (
            <Alert>
              <AlertDescription>
                Banco detectado: <strong>{detectedBank}</strong>
                {invoiceMonth && <> — Fatura de <strong>{invoiceMonth}</strong></>}
                {totalAmount !== undefined && <> — Total: <strong>R$ {totalAmount.toFixed(2)}</strong></>}
              </AlertDescription>
            </Alert>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errors.map((e, i) => <div key={i}>{e}</div>)}
              </AlertDescription>
            </Alert>
          )}

          {transactions.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Conta de destino</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta do cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditCardAccounts.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> Cartões de Crédito
                        </div>
                        {creditCardAccounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </>
                    )}
                    {otherAccounts.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Wallet className="w-3 h-3" /> Outras Contas
                        </div>
                        {otherAccounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-3 py-2 text-sm font-medium flex items-center justify-between">
                  <span>{transactions.length} transações encontradas</span>
                  <Badge variant="secondary">{transactions.filter(t => t.category_id).length} categorizadas</Badge>
                </div>
                <ScrollArea className="h-64">
                  <div className="divide-y">
                    {transactions.map((t, i) => (
                      <div key={i} className="px-3 py-2 text-sm flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{t.description}</p>
                          <p className="text-xs text-muted-foreground">{t.date}</p>
                        </div>
                        <span className="font-mono text-red-600 shrink-0">
                          R$ {Number(t.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {importing && (
                <div className="space-y-1">
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground text-center">{progress}% importado</p>
                </div>
              )}

              <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <Button className="w-full" onClick={() => setShowConfirm(true)} disabled={!selectedAccountId || importing}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar {transactions.length} Transações
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar importação</AlertDialogTitle>
                    <AlertDialogDescription>
                      Serão importadas <strong>{transactions.length}</strong> transações para a conta selecionada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleImport}>Importar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Aba Planilha ────────────────────────────────────────────────────────────

function SpreadsheetImportTab({ onBack }: { onBack: () => void }) {
  const [file, setFile]                         = useState<File | null>(null);
  const [rows, setRows]                         = useState<SpreadsheetRow[]>([]);
  const [headers, setHeaders]                   = useState<string[]>([]);
  const [mapping, setMapping]                   = useState<ColumnMapping>({});
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [step, setStep]                         = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [importing, setImporting]               = useState(false);
  const [progress, setProgress]                 = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [showDuplicates, setShowDuplicates]     = useState(false);
  const [duplicateCount, setDuplicateCount]     = useState(0);

  const { createTransaction, transactions: existingTransactions } = useTransactions();
  const { accounts }    = useAccounts();
  const { categories }  = useCategories();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { rows: parsedRows, headers: parsedHeaders } = await parseSpreadsheet(f);
      setFile(f);
      setRows(parsedRows);
      setHeaders(parsedHeaders);
      setMapping({});
      setStep('mapping');
      toast.success(`${parsedRows.length} linhas encontradas`);
    } catch {
      toast.error('Erro ao ler o arquivo. Verifique o formato.');
    }
  };

  const handleDownloadExample = () => {
    const blob = generateExampleFile();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'exemplo-importacao.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const requiredFields: (keyof ColumnMapping)[] = ['date', 'description', 'amount'];

  const handleValidate = () => {
    const engine = new AutoCategorizationEngine([]);
    const results: ValidationResult[] = rows.map((row, i) => {
      try {
        const t = convertRowToTransaction(row, mapping);
        if (!t.date || !t.description || !t.amount) {
          return { row: i + 2, status: 'error' as const, message: 'Campos obrigatórios ausentes' };
        }
        if (!t.category_id) {
          const suggested = engine.suggestCategory(t.description, categories);
          if (suggested) t.category_id = suggested;
        }
        return { row: i + 2, status: 'success' as const, message: 'OK', transaction: t };
      } catch (err) {
        return { row: i + 2, status: 'error' as const, message: String(err) };
      }
    });

    const validTransactions = results
      .filter(r => r.status === 'success' && r.transaction)
      .map(r => ({
        id: String(r.row),
        description: r.transaction!.description,
        amount: r.transaction!.amount,
        date: r.transaction!.date,
        account_id: selectedAccountId,
      }));

    const allForDetection = [
      ...existingTransactions.map(t => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        date: t.date,
        account_id: t.account_id,
      })),
      ...validTransactions,
    ];

    const dedupEngine = new DuplicateDetectionEngine();
    const groups = dedupEngine.detectDuplicates(allForDetection);
    const importedDups = groups.filter(g =>
      g.transactions.some(t => validTransactions.find(vt => vt.id === t.id))
    );
    setDuplicateCount(importedDups.length);

    setValidationResults(results);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!selectedAccountId) { toast.error('Selecione uma conta'); return; }
    setImporting(true);
    setStep('importing');
    setProgress(0);

    const toImport = validationResults.filter(r => r.status === 'success' && r.transaction);
    let imported = 0;

    for (let i = 0; i < toImport.length; i++) {
      const r = toImport[i];
      try {
        await createTransaction({
          ...r.transaction!,
          account_id: selectedAccountId,
          status: 'completed',
        });
        imported++;
      } catch {}
      setProgress(Math.round(((i + 1) / toImport.length) * 100));
    }

    setImporting(false);
    toast.success(`${imported} transações importadas com sucesso!`);
    onBack();
  };

  if (step === 'upload') return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="w-4 h-4" />
            Importar Planilha
          </CardTitle>
          <CardDescription>CSV ou Excel (.xlsx)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} />
          <Separator />
          <Button variant="outline" className="w-full" onClick={handleDownloadExample}>
            <Download className="w-4 h-4 mr-2" />
            Baixar arquivo de exemplo
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  if (step === 'mapping') return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapeamento de Colunas</CardTitle>
          <CardDescription>Associe as colunas do arquivo aos campos do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['date', 'description', 'amount', 'type', 'category'] as (keyof ColumnMapping)[]).map(field => (
            <div key={field} className="grid grid-cols-2 gap-3 items-center">
              <Label className="capitalize">
                {field === 'date' ? 'Data *' : field === 'description' ? 'Descrição *' : field === 'amount' ? 'Valor *' : field === 'type' ? 'Tipo' : 'Categoria'}
              </Label>
              <Select value={mapping[field] || ''} onValueChange={v => setMapping(p => ({ ...p, [field]: v || undefined }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Ignorar —</SelectItem>
                  {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3 items-center">
            <Label>Conta *</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
            <Button
              className="flex-1"
              disabled={!requiredFields.every(f => mapping[f]) || !selectedAccountId}
              onClick={handleValidate}
            >
              Validar e Pré-visualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (step === 'preview') return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: CheckCircle, color: 'text-green-600', count: validationResults.filter(r => r.status === 'success').length, label: 'Válidas' },
          { icon: AlertCircle, color: 'text-yellow-600', count: validationResults.filter(r => r.status === 'warning').length, label: 'Avisos' },
          { icon: XCircle, color: 'text-red-600', count: validationResults.filter(r => r.status === 'error').length, label: 'Erros' },
        ].map(({ icon: Icon, color, count, label }) => (
          <Card key={label}>
            <CardContent className="p-3 flex items-center gap-2">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {duplicateCount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {duplicateCount} possíveis duplicatas detectadas. Revise antes de importar.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pré-visualização</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-72">
            <div className="divide-y">
              {validationResults.slice(0, 50).map((r, i) => (
                <div key={i} className="px-4 py-2 flex items-center gap-3 text-sm">
                  {r.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> :
                   r.status === 'warning' ? <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" /> :
                   <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{r.transaction?.description || `Linha ${r.row}`}</p>
                    {r.status !== 'success' && <p className="text-xs text-muted-foreground">{r.message}</p>}
                  </div>
                  {r.transaction && (
                    <span className="font-mono shrink-0">R$ {Number(r.transaction.amount).toFixed(2)}</span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('mapping')}>Voltar</Button>
        <Button
          className="flex-1"
          disabled={validationResults.filter(r => r.status === 'success').length === 0}
          onClick={handleImport}
        >
          <Upload className="w-4 h-4 mr-2" />
          Importar {validationResults.filter(r => r.status === 'success').length} Transações
        </Button>
      </div>
    </div>
  );

  if (step === 'importing') return (
    <Card>
      <CardContent className="p-8 text-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
        <Progress value={progress} />
        <p className="text-sm text-muted-foreground">Importando... {progress}%</p>
      </CardContent>
    </Card>
  );

  return null;
}

// ─── Componente principal ────────────────────────────────────────────────────

export function ImportTransactions({ onBack }: ImportTransactionsProps) {
  return (
    <div className="space-y-6">
      <BackHeader
        title="Importar Transações"
        subtitle="Planilha (CSV/Excel) ou fatura de cartão em PDF"
        icon={<Upload className="h-6 w-6" />}
        onBack={onBack}
      />

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
