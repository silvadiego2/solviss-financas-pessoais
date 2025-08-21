import { useState } from 'react';
import { useTransactions } from './useTransactions';
import { useAccounts } from './useAccounts';
import { useCategories } from './useCategories';
import { useBudgets } from './useBudgets';
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

export const useExportReports = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { transactions } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { budgets } = useBudgets();

  const getDateRange = (period: ExportPeriod, customPeriod?: CustomPeriod) => {
    const now = new Date();
    
    switch (period) {
      case 'last_month':
        return {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1))
        };
      case 'last_3_months':
        return {
          start: subMonths(now, 3),
          end: now
        };
      case 'last_year':
        return {
          start: subDays(now, 365),
          end: now
        };
      case 'custom':
        return customPeriod ? {
          start: customPeriod.startDate,
          end: customPeriod.endDate
        } : { start: now, end: now };
      default:
        return { start: now, end: now };
    }
  };

  const filterDataByPeriod = (options: ExportOptions) => {
    const { start, end } = getDateRange(options.period, options.customPeriod);
    
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= start && transactionDate <= end;
    });

    return {
      transactions: filteredTransactions,
      accounts: accounts,
      categories: categories,
      budgets: budgets.filter(b => {
        const budgetMonth = new Date(b.year, b.month - 1);
        return budgetMonth >= start && budgetMonth <= end;
      }),
      period: { start, end }
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const exportToPDF = async (options: ExportOptions) => {
    setIsExporting(true);
    
    try {
      const data = filterDataByPeriod(options);
      const pdf = new jsPDF();
      
      // Título
      pdf.setFontSize(20);
      pdf.text('Relatório Financeiro', 20, 30);
      
      // Período
      pdf.setFontSize(12);
      pdf.text(`Período: ${format(data.period.start, 'dd/MM/yyyy')} - ${format(data.period.end, 'dd/MM/yyyy')}`, 20, 45);
      
      let yPosition = 60;
      
      // Resumo Geral
      if (options.includeTransactions) {
        const totalIncome = data.transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const totalExpenses = data.transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        pdf.setFontSize(14);
        pdf.text('Resumo Geral:', 20, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(10);
        pdf.text(`Total de Receitas: ${formatCurrency(totalIncome)}`, 20, yPosition);
        yPosition += 10;
        pdf.text(`Total de Despesas: ${formatCurrency(totalExpenses)}`, 20, yPosition);
        yPosition += 10;
        pdf.text(`Saldo Líquido: ${formatCurrency(totalIncome - totalExpenses)}`, 20, yPosition);
        yPosition += 20;
      }
      
      // Transações por Categoria
      if (options.includeCategories && options.includeTransactions) {
        pdf.setFontSize(14);
        pdf.text('Gastos por Categoria:', 20, yPosition);
        yPosition += 15;
        
        const categoryTotals = data.transactions
          .filter(t => t.type === 'expense')
          .reduce((acc, t) => {
            const categoryName = data.categories.find(c => c.id === t.category_id)?.name || 'Sem categoria';
            acc[categoryName] = (acc[categoryName] || 0) + Number(t.amount);
            return acc;
          }, {} as Record<string, number>);
        
        pdf.setFontSize(10);
        Object.entries(categoryTotals)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .forEach(([category, amount]) => {
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 30;
            }
            pdf.text(`${category}: ${formatCurrency(amount)}`, 20, yPosition);
            yPosition += 10;
          });
      }
      
      // Salvar PDF
      pdf.save(`relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar relatório PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async (options: ExportOptions) => {
    setIsExporting(true);
    
    try {
      const data = filterDataByPeriod(options);
      const workbook = XLSX.utils.book_new();
      
      // Aba de Transações
      if (options.includeTransactions) {
        const transactionData = data.transactions.map(t => ({
          'Data': format(new Date(t.date), 'dd/MM/yyyy'),
          'Descrição': t.description,
          'Categoria': data.categories.find(c => c.id === t.category_id)?.name || 'Sem categoria',
          'Conta': data.accounts.find(a => a.id === t.account_id)?.name || 'Conta não encontrada',
          'Tipo': t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência',
          'Valor': Number(t.amount),
          'Status': t.status === 'completed' ? 'Concluído' : t.status === 'pending' ? 'Pendente' : 'Cancelado',
          'Observações': t.notes || ''
        }));
        
        const transactionSheet = XLSX.utils.json_to_sheet(transactionData);
        XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transações');
      }
      
      // Aba de Resumo por Categoria
      if (options.includeCategories && options.includeTransactions) {
        const categoryData = data.categories.map(category => {
          const categoryTransactions = data.transactions.filter(t => t.category_id === category.id);
          const income = categoryTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);
          const expenses = categoryTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          return {
            'Categoria': category.name,
            'Tipo': category.transaction_type === 'income' ? 'Receita' : category.transaction_type === 'expense' ? 'Despesa' : 'Transferência',
            'Total Receitas': income,
            'Total Despesas': expenses,
            'Saldo': income - expenses,
            'Transações': categoryTransactions.length
          };
        }).filter(c => c['Total Receitas'] > 0 || c['Total Despesas'] > 0);
        
        const categorySheet = XLSX.utils.json_to_sheet(categoryData);
        XLSX.utils.book_append_sheet(workbook, categorySheet, 'Resumo por Categoria');
      }
      
      // Aba de Contas
      if (options.includeAccounts) {
        const accountData = data.accounts.map(account => ({
          'Nome': account.name,
          'Tipo': account.type === 'checking' ? 'Conta Corrente' : 
                  account.type === 'savings' ? 'Poupança' : 
                  account.type === 'credit_card' ? 'Cartão de Crédito' : 'Investimento',
          'Banco': account.bank_name || 'Não informado',
          'Saldo Atual': Number(account.balance || 0),
          'Limite de Crédito': account.credit_limit ? Number(account.credit_limit) : null,
          'Status': account.is_active ? 'Ativa' : 'Inativa'
        }));
        
        const accountSheet = XLSX.utils.json_to_sheet(accountData);
        XLSX.utils.book_append_sheet(workbook, accountSheet, 'Contas');
      }
      
      // Aba de Orçamentos
      if (options.includeBudgets) {
        const budgetData = data.budgets.map(budget => {
          const category = data.categories.find(c => c.id === budget.category_id);
          return {
            'Categoria': category?.name || 'Categoria não encontrada',
            'Mês': `${String(budget.month).padStart(2, '0')}/${budget.year}`,
            'Orçamento Planejado': Number(budget.amount),
            'Valor Gasto': Number(budget.spent || 0),
            'Diferença': Number(budget.amount) - Number(budget.spent || 0),
            'Percentual Usado': Math.round(((Number(budget.spent || 0)) / Number(budget.amount)) * 100)
          };
        });
        
        const budgetSheet = XLSX.utils.json_to_sheet(budgetData);
        XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Orçamentos');
      }
      
      // Salvar Excel
      XLSX.writeFile(workbook, `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Relatório Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar relatório Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async (options: ExportOptions) => {
    setIsExporting(true);
    
    try {
      const data = filterDataByPeriod(options);
      
      if (options.includeTransactions) {
        const csvData = data.transactions.map(t => ({
          'Data': format(new Date(t.date), 'dd/MM/yyyy'),
          'Descrição': t.description,
          'Categoria': data.categories.find(c => c.id === t.category_id)?.name || 'Sem categoria',
          'Conta': data.accounts.find(a => a.id === t.account_id)?.name || 'Conta não encontrada',
          'Tipo': t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência',
          'Valor': Number(t.amount),
          'Status': t.status === 'completed' ? 'Concluído' : t.status === 'pending' ? 'Pendente' : 'Cancelado',
          'Observações': t.notes || ''
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(csvData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Relatório CSV exportado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar relatório CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportToPDF,
    exportToExcel,
    exportToCSV,
    formatCurrency
  };
};