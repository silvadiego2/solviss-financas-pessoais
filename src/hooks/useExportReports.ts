/**
 * useExportReports
 * ────────────────────────────────────────────────────────────────────────
 * Gera relatórios PDF / Excel / CSV sem depender do useTransactions.
 *
 * Download Capacitor-aware:
 *  A função `downloadFile(filename, blob)` detecta a plataforma em runtime:
 *   • Web (browser): URL.createObjectURL + <a>.click() — comportamento original
 *   • Capacitor iOS/Android: grava em Documents via @capacitor/filesystem
 *     e abre o share sheet via @capacitor/share
 *   Se os plugins do Capacitor não estiverem instalados (build web puro),
 *   o fallback para createObjectURL é usado automaticamente.
 *
 * Fetch de dados:
 *  fetchAllForExport() busca TODOS os registros do período em lotes de 200
 *  (loop até hasMore=false) — nunca limita o relatório ao cache do dashboard.
 */
import { useState } from 'react';
import { useAccounts } from './useAccounts';
import { useCategories } from './useCategories';
import { useBudgets } from './useBudgets';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export type ExportPeriod = 'last_month' | 'last_3_months' | 'last_year' | 'custom';

export interface CustomPeriod {
  startDate: Date;
  endDate: Date;
}

export interface ExportOptions {
  period: ExportPeriod;
  customPeriod?: CustomPeriod;
  includeTransactions: boolean;
  includeCategories: boolean;
  includeBudgets: boolean;
  includeAccounts: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt   = (v: number) => BRL.format(v);
const toISO = (d: Date)   => d.toISOString().split('T')[0];

function getDateRange(period: ExportPeriod, customPeriod?: CustomPeriod) {
  const now = new Date();
  switch (period) {
    case 'last_month':    return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case 'last_3_months': return { start: subMonths(now, 3),              end: now };
    case 'last_year':     return { start: subDays(now, 365),              end: now };
    case 'custom':        return customPeriod
      ? { start: customPeriod.startDate, end: customPeriod.endDate }
      : { start: now, end: now };
    default:              return { start: now, end: now };
  }
}

/**
 * Baixa um arquivo detectando a plataforma em runtime.
 *
 * Web  → URL.createObjectURL + <a>.click()
 * iOS/Android (Capacitor) → Filesystem.writeFile (base64) + Share.share()
 *
 * Se os plugins não estiverem disponíveis (ex: build web sem Capacitor),
 * cai silenciosamente no fallback web.
 */
async function downloadFile(filename: string, blob: Blob): Promise<void> {
  // Tenta detectar ambiente Capacitor via import dinâmico
  // (não quebra em build web puro — o import retorna undefined se não instalado)
  let isCapacitor = false;
  try {
    const { Capacitor } = await import('@capacitor/core');
    isCapacitor = Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    isCapacitor = false;
  }

  if (isCapacitor) {
    try {
      // Converte Blob para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Grava no diretório Documents (visível no app Arquivos do iOS)
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { path } = await Filesystem.writeFile({
        path:      filename,
        data:      base64,
        directory: Directory.Documents,
        recursive: true,
      });

      // Abre o share sheet nativo para o usuário salvar/compartilhar
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: filename,
        url:   path,
        dialogTitle: 'Compartilhar relatório',
      });
      return;
    } catch (err) {
      // Plugins não instalados ou permissão negada — fallback para web
      console.warn('[useExportReports] Capacitor download falhou, usando fallback web:', err);
    }
  }

  // Fallback web (também usado no Capacitor se os plugins falharem)
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), {
    href:     url,
    download: filename,
    style:    'display:none',
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Busca TODOS os registros do período em lotes de 200 — nunca limita o relatório */
async function fetchAllForExport(userId: string, dateFrom: string, dateTo: string) {
  const BATCH = 200;
  let page    = 0;
  let all: any[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id, description, amount, type, date, status, notes,
        category_id, account_id,
        category:categories(id, name),
        account:accounts!transactions_account_id_fkey(id, name)
      `)
      .eq('user_id', userId)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false })
      .range(page * BATCH, page * BATCH + BATCH - 1);

    if (error) throw error;
    all = all.concat(data ?? []);
    if ((data ?? []).length < BATCH) break;
    page++;
  }

  return all.map((t: any) => ({
    ...t,
    amount:        Number(t.amount),
    category_name: t.category?.name ?? 'Sem categoria',
    account_name:  t.account?.name  ?? 'Conta não encontrada',
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export const useExportReports = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { user }       = useAuth();
  const { accounts }   = useAccounts();
  const { categories } = useCategories();
  const { budgets }    = useBudgets();

  async function resolveData(options: ExportOptions) {
    const { start, end } = getDateRange(options.period, options.customPeriod);
    const dateFrom = toISO(start);
    const dateTo   = toISO(end);

    const txs = options.includeTransactions
      ? await fetchAllForExport(user!.id, dateFrom, dateTo)
      : [];

    const filteredBudgets = budgets.filter(b => {
      const budgetMonth = new Date(b.year, b.month - 1);
      return budgetMonth >= start && budgetMonth <= end;
    });

    return { txs, accounts, categories, budgets: filteredBudgets, start, end };
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  const exportToPDF = async (options: ExportOptions) => {
    setIsExporting(true);
    try {
      const { txs, categories: cats, start, end } = await resolveData(options);
      const pdf = new jsPDF();

      pdf.setFontSize(20);
      pdf.text('Relatório Financeiro', 20, 30);
      pdf.setFontSize(12);
      pdf.text(`Período: ${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`, 20, 45);

      let y = 60;

      if (options.includeTransactions) {
        const totalIncome   = txs.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0);
        const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        pdf.setFontSize(14); pdf.text('Resumo Geral:', 20, y); y += 15;
        pdf.setFontSize(10);
        pdf.text(`Total de Receitas: ${fmt(totalIncome)}`,             20, y); y += 10;
        pdf.text(`Total de Despesas: ${fmt(totalExpenses)}`,           20, y); y += 10;
        pdf.text(`Saldo Líquido: ${fmt(totalIncome - totalExpenses)}`, 20, y); y += 20;
      }

      if (options.includeCategories && options.includeTransactions) {
        pdf.setFontSize(14); pdf.text('Gastos por Categoria:', 20, y); y += 15;

        const catTotals: Record<string, number> = {};
        txs.filter(t => t.type === 'expense').forEach(t => {
          const name = cats.find(c => c.id === t.category_id)?.name ?? 'Sem categoria';
          catTotals[name] = (catTotals[name] ?? 0) + t.amount;
        });

        pdf.setFontSize(10);
        Object.entries(catTotals)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .forEach(([cat, amount]) => {
            if (y > 270) { pdf.addPage(); y = 30; }
            pdf.text(`${cat}: ${fmt(amount)}`, 20, y); y += 10;
          });
      }

      pdf.save(`relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao exportar relatório PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Excel ─────────────────────────────────────────────────────────────────
  const exportToExcel = async (options: ExportOptions) => {
    setIsExporting(true);
    try {
      const { txs, accounts: accs, categories: cats, budgets: buds } = await resolveData(options);
      const wb = XLSX.utils.book_new();

      if (options.includeTransactions) {
        const rows = txs.map(t => ({
          'Data':        format(new Date(t.date + 'T00:00:00'), 'dd/MM/yyyy'),
          'Descrição':   t.description,
          'Categoria':   t.category_name,
          'Conta':       t.account_name,
          'Tipo':        t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência',
          'Valor':       t.amount,
          'Status':      t.status === 'completed' ? 'Concluído' : t.status === 'pending' ? 'Pendente' : 'Cancelado',
          'Observações': t.notes ?? '',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Transações');
      }

      if (options.includeCategories && options.includeTransactions) {
        const rows = cats
          .map(cat => {
            const catTxs   = txs.filter(t => t.category_id === cat.id);
            const income   = catTxs.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0);
            const expenses = catTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            return {
              'Categoria':       cat.name,
              'Total Receitas':  income,
              'Total Despesas':  expenses,
              'Saldo':           income - expenses,
              'Transações':      catTxs.length,
            };
          })
          .filter(r => r['Total Receitas'] > 0 || r['Total Despesas'] > 0);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Resumo por Categoria');
      }

      if (options.includeAccounts) {
        const rows = accs.map((a: any) => ({
          'Nome':           a.name,
          'Tipo':           a.type === 'checking'    ? 'Conta Corrente'
                          : a.type === 'savings'     ? 'Poupança'
                          : a.type === 'credit_card' ? 'Cartão de Crédito'
                          : 'Investimento',
          'Banco':          a.bank_name ?? 'Não informado',
          'Saldo Atual':    Number(a.balance ?? 0),
          'Limite Crédito': a.credit_limit ? Number(a.credit_limit) : null,
          'Status':         a.is_active ? 'Ativa' : 'Inativa',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Contas');
      }

      if (options.includeBudgets) {
        const rows = buds.map((b: any) => {
          const cat = cats.find(c => c.id === b.category_id);
          return {
            'Categoria':           cat?.name ?? 'Não encontrada',
            'Mês':                 `${String(b.month).padStart(2, '0')}/${b.year}`,
            'Orçamento Planejado': Number(b.amount),
            'Valor Gasto':         Number(b.spent ?? 0),
            'Diferença':           Number(b.amount) - Number(b.spent ?? 0),
            'Percentual Usado':    Math.round((Number(b.spent ?? 0) / Number(b.amount)) * 100),
          };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Orçamentos');
      }

      const xlsxBlob = new Blob(
        [XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      );
      await downloadFile(`relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.xlsx`, xlsxBlob);
      toast.success('Relatório Excel exportado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao exportar relatório Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // ── CSV ───────────────────────────────────────────────────────────────────
  const exportToCSV = async (options: ExportOptions) => {
    setIsExporting(true);
    try {
      const { txs } = await resolveData(options);

      if (!options.includeTransactions) {
        toast.error('Selecione pelo menos Transações para exportar CSV');
        return;
      }

      const rows = txs.map(t => ({
        'Data':        format(new Date(t.date + 'T00:00:00'), 'dd/MM/yyyy'),
        'Descrição':   t.description,
        'Categoria':   t.category_name,
        'Conta':       t.account_name,
        'Tipo':        t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência',
        'Valor':       t.amount,
        'Status':      t.status === 'completed' ? 'Concluído' : t.status === 'pending' ? 'Pendente' : 'Cancelado',
        'Observações': t.notes ?? '',
      }));

      const csv     = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
      const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      await downloadFile(`transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`, csvBlob);
      toast.success('Relatório CSV exportado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao exportar relatório CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, exportToPDF, exportToExcel, exportToCSV };
};
