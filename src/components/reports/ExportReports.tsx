
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Download, FileText, Table } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { toast } from 'sonner';

export const ExportReports: React.FC = () => {
  const [periodType, setPeriodType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportOptions, setExportOptions] = useState({
    transactions: true,
    budgets: false,
    accounts: true,
    creditCards: true,
    charts: false,
    summary: true
  });
  const [loading, setLoading] = useState(false);

  const { transactions } = useTransactions();
  const { accounts } = useAccounts();
  const { creditCards } = useCreditCards();

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getFilteredData = () => {
    let filteredTransactions = [...transactions];
    
    if (periodType === 'monthly') {
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);
      filteredTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === month && date.getFullYear() === year;
      });
    } else if (periodType === 'custom' && startDate && endDate) {
      filteredTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });
    }

    return {
      transactions: filteredTransactions,
      accounts,
      creditCards
    };
  };

  const generateCSVContent = (data: any) => {
    let csvContent = '';

    if (exportOptions.summary) {
      csvContent += 'RESUMO FINANCEIRO\n';
      csvContent += `Período: ${periodType === 'monthly' ? 
        `${months[parseInt(selectedMonth)]} ${selectedYear}` : 
        `${startDate} até ${endDate}`}\n`;
      
      const totalIncome = data.transactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const totalExpense = data.transactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      csvContent += `Receitas: ${formatCurrency(totalIncome)}\n`;
      csvContent += `Despesas: ${formatCurrency(totalExpense)}\n`;
      csvContent += `Saldo: ${formatCurrency(totalIncome - totalExpense)}\n\n`;
    }

    if (exportOptions.transactions) {
      csvContent += 'TRANSAÇÕES\n';
      csvContent += 'Data,Descrição,Valor,Tipo,Categoria,Conta\n';
      data.transactions.forEach((t: any) => {
        csvContent += `${t.date},${t.description},${t.amount},${t.type},${t.category?.name || ''},${t.account?.name || ''}\n`;
      });
      csvContent += '\n';
    }

    if (exportOptions.accounts) {
      csvContent += 'CONTAS\n';
      csvContent += 'Nome,Tipo,Banco,Saldo\n';
      data.accounts.forEach((a: any) => {
        csvContent += `${a.name},${a.type},${a.bank_name || ''},${a.balance}\n`;
      });
      csvContent += '\n';
    }

    if (exportOptions.creditCards) {
      csvContent += 'CARTÕES DE CRÉDITO\n';
      csvContent += 'Nome,Banco,Limite,Usado,Disponível\n';
      data.creditCards.forEach((c: any) => {
        csvContent += `${c.name},${c.bank_name},${c.limit},${c.used_amount},${c.limit - c.used_amount}\n`;
      });
    }

    return csvContent;
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (periodType === 'custom' && (!startDate || !endDate)) {
      toast.error('Por favor, selecione as datas de início e fim');
      return;
    }

    setLoading(true);
    
    try {
      const data = getFilteredData();
      
      if (format === 'excel') {
        const csvContent = generateCSVContent(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio-financeiro-${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Relatório Excel exportado com sucesso!');
      } else {
        // Para PDF, seria necessário usar uma biblioteca como jsPDF
        toast.info('Exportação para PDF será implementada em breve');
      }
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <h2 className="text-lg font-semibold">Exportar Relatórios</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Exportação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Período */}
          <div className="space-y-4">
            <Label>Período</Label>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {periodType === 'monthly' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mês</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ano</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {periodType === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Opções de Exportação */}
          <div className="space-y-4">
            <Label>Dados para Exportar</Label>
            <div className="space-y-3">
              {Object.entries({
                transactions: 'Transações',
                budgets: 'Orçamentos',
                accounts: 'Contas',
                creditCards: 'Cartões de Crédito',
                charts: 'Gráficos',
                summary: 'Resumo Geral'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={exportOptions[key as keyof typeof exportOptions]}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, [key]: checked }))
                    }
                  />
                  <Label htmlFor={key}>{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Botões de Exportação */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleExport('pdf')}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <FileText size={16} />
              <span>{loading ? 'Exportando...' : 'Exportar PDF'}</span>
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              disabled={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Table size={16} />
              <span>{loading ? 'Exportando...' : 'Exportar Excel'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
