import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, FileUp, X, Banknote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTransactions } from '@/hooks/useTransactions'; // Ajuste o caminho se necessário
import { parseOFX } from '@/utils/ofxParser';
import { parseCSV } from '@/utils/csvParser';
import { toast } from 'sonner';

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
}

export function BankStatementImporter() {
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createTransactionAsync } = useTransactions();

  // Busca as contas disponíveis para o usuário escolher onde lançar
  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase.from('accounts').select('id, name');
      if (data) setAccounts(data);
    }
    fetchAccounts();
  }, []);

  const handleFileParse = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        let result;

        if (file.name.toLowerCase().endsWith('.ofx')) {
          result = parseOFX(text);
        } else if (file.name.toLowerCase().endsWith('.csv')) {
          result = parseCSV(text, file.name);
        } else {
          toast.error('Formato não suportado. Envie um arquivo .OFX ou .CSV');
          return;
        }

        if (result.transactions.length === 0) {
          toast.error('Nenhuma transação encontrada no arquivo.');
          return;
        }

        setParsedTransactions(result.transactions);
        toast.success(`${result.transactions.length} transações encontradas!`);
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        toast.error('Erro ao ler o arquivo. Verifique se o formato é válido.');
      }
    };
    reader.readAsText(file);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileParse(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedAccountId) {
      toast.error('Por favor, selecione uma conta de destino.');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const tx of parsedTransactions) {
        try {
          await createTransactionAsync({
            account_id: selectedAccountId,
            amount: tx.amount,
            date: tx.date,
            description: tx.description,
            type: tx.type,
            status: 'completed', // Já vem consolidado do banco
            // category_id: Aqui você pode mapear a "tx.category" para um ID real depois
          });
          successCount++;
        } catch (err) {
          errorCount++;
          console.error('Erro ao importar transação:', tx.description, err);
        }
      }

      if (errorCount > 0) {
        toast.warning(`Importação concluída com ${errorCount} erros. ${successCount} salvas.`);
      } else {
        toast.success(`Todas as ${successCount} transações foram importadas!`);
        setParsedTransactions([]); // Limpa a tela após sucesso
      }
    } catch (error) {
      toast.error('Erro fatal durante a importação.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* Área de Upload */}
      {parsedTransactions.length === 0 ? (
        <div 
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
          }`}
          onDragEnter={onDrag}
          onDragLeave={onDrag}
          onDragOver={onDrag}
          onDrop={onDrop}
        >
          <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <UploadCloud size={32} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Importar Extrato Bancário</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            Arraste e solte o seu arquivo .OFX ou .CSV do Nubank, Itaú, etc., ou clique no botão abaixo.
          </p>
          
          <input 
            type="file" 
            accept=".ofx,.csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileParse(e.target.files[0])}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2"
          >
            <FileUp size={20} />
            Selecionar Arquivo
          </button>
        </div>
      ) : (
        /* Área de Preview e Importação */
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="text-success" />
                {parsedTransactions.length} transações identificadas
              </h3>
              <p className="text-sm text-muted-foreground">Revise os dados antes de salvar no sistema.</p>
            </div>
            
            <button 
              onClick={() => setParsedTransactions([])}
              className="text-muted-foreground hover:bg-muted p-2 rounded-md transition-colors"
              title="Cancelar e enviar outro arquivo"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Conta de Destino *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                </div>
                <select 
                  className="w-full bg-background border border-input rounded-md py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  disabled={isImporting}
                >
                  <option value="">Selecione a conta...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleImport}
                disabled={!selectedAccountId || isImporting}
                className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isImporting ? (
                  <><Loader2 className="animate-spin" size={18} /> Importando...</>
                ) : (
                  <><FileUp size={18} /> Salvar Transações</>
                )}
              </button>
            </div>
          </div>

          {/* Tabela de Preview */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedTransactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-medium truncate max-w-[200px]">
                        {tx.description}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${tx.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                        {tx.type === 'income' ? '+ ' : '- '}
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}