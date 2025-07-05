
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip } from 'recharts';
import { Download, FileText, Calendar, TrendingUp } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];

export const AdvancedReports: React.FC = () => {
  const { transactions } = useTransactions();
  const { budgets } = useBudgets();
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Dados para gráfico mensal (últimos X meses)
  const getMonthlyData = () => {
    const months = parseInt(selectedPeriod);
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === month && tDate.getFullYear() === year;
      });
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      data.push({
        month: monthName,
        receitas: income,
        despesas: expenses,
        saldo: income - expenses,
      });
    }
    return data;
  };

  // Dados para gráfico de categorias
  const getCategoryData = () => {
    const categoryTotals = new Map();
    
    transactions
      .filter(t => t.type === 'expense' && t.category)
      .forEach(t => {
        const categoryName = t.category!.name;
        const current = categoryTotals.get(categoryName) || 0;
        categoryTotals.set(categoryName, current + Number(t.amount));
      });
    
    return Array.from(categoryTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  // Dados de comparação orçamento vs gasto
  const getBudgetComparisonData = () => {
    return budgets.map(budget => ({
      category: budget.category?.name || 'Sem categoria',
      orcado: budget.amount,
      gasto: budget.spent,
      restante: budget.amount - budget.spent,
    }));
  };

  const monthlyData = getMonthlyData();
  const categoryData = getCategoryData();
  const budgetData = getBudgetComparisonData();

  // Função para exportar PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    // Título
    doc.setFontSize(20);
    doc.text('Relatório Financeiro', 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Gerado em: ${currentDate}`, 20, 45);
    
    // Resumo do período
    const totalIncome = monthlyData.reduce((sum, month) => sum + month.receitas, 0);
    const totalExpenses = monthlyData.reduce((sum, month) => sum + month.despesas, 0);
    const balance = totalIncome - totalExpenses;
    
    doc.setFontSize(14);
    doc.text('Resumo do Período:', 20, 65);
    doc.setFontSize(12);
    doc.text(`Total de Receitas: ${formatCurrency(totalIncome)}`, 20, 80);
    doc.text(`Total de Despesas: ${formatCurrency(totalExpenses)}`, 20, 95);
    doc.text(`Saldo: ${formatCurrency(balance)}`, 20, 110);
    
    // Maiores categorias de despesa
    doc.setFontSize(14);
    doc.text('Principais Categorias de Despesa:', 20, 135);
    doc.setFontSize(12);
    
    categoryData.slice(0, 5).forEach((category, index) => {
      doc.text(`${index + 1}. ${category.name}: ${formatCurrency(category.value)}`, 25, 150 + (index * 15));
    });
    
    doc.save('relatorio-financeiro.pdf');
  };

  // Função para exportar Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Aba de transações
    const transactionsSheet = XLSX.utils.json_to_sheet(transactions.map(t => ({
      'Data': new Date(t.date).toLocaleDateString('pt-BR'),
      'Descrição': t.description,
      'Categoria': t.category?.name || 'Sem categoria',
      'Tipo': t.type === 'income' ? 'Receita' : 'Despesa',
      'Valor': t.amount,
      'Conta': t.account?.name || 'Sem conta',
    })));
    
    XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transações');
    
    // Aba de dados mensais
    const monthlySheet = XLSX.utils.json_to_sheet(monthlyData.map(m => ({
      'Mês': m.month,
      'Receitas': m.receitas,
      'Despesas': m.despesas,
      'Saldo': m.saldo,
    })));
    
    XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Dados Mensais');
    
    // Aba de categorias
    const categorySheet = XLSX.utils.json_to_sheet(categoryData.map(c => ({
      'Categoria': c.name,
      'Total Gasto': c.value,
    })));
    
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Por Categoria');
    
    XLSX.writeFile(workbook, 'relatorio-financeiro.xlsx');
  };

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                labelLine={false}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="receitas" stroke="#10B981" strokeWidth={3} />
              <Line type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={3} />
              <Line type="monotone" dataKey="saldo" stroke="#8B5CF6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="receitas" fill="#10B981" />
              <Bar dataKey="despesas" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Relatórios Avançados</h2>
        <div className="flex space-x-2">
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <FileText size={16} className="mr-2" />
            PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <Download size={16} className="mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Controles */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Calendar size={16} />
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <TrendingUp size={16} />
              <Select value={chartType} onValueChange={(value: 'bar' | 'pie' | 'line') => setChartType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Barras</SelectItem>
                  <SelectItem value="pie">Pizza</SelectItem>
                  <SelectItem value="line">Linha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Principal */}
      <Card>
        <CardHeader>
          <CardTitle>
            {chartType === 'pie' ? 'Despesas por Categoria' : `Evolução Financeira (${selectedPeriod} meses)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Comparação Orçamento vs Gasto */}
      {budgetData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Orçamento vs Realizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetData}>
                  <XAxis dataKey="category" />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="orcado" fill="#3B82F6" name="Orçado" />
                  <Bar dataKey="gasto" fill="#EF4444" name="Gasto" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {monthlyData.length > 0 && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(monthlyData.reduce((sum, m) => sum + m.receitas, 0))}
                  </div>
                  <div className="text-sm text-gray-500">Total de Receitas</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(monthlyData.reduce((sum, m) => sum + m.despesas, 0))}
                  </div>
                  <div className="text-sm text-gray-500">Total de Despesas</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    monthlyData.reduce((sum, m) => sum + m.saldo, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(monthlyData.reduce((sum, m) => sum + m.saldo, 0))}
                  </div>
                  <div className="text-sm text-gray-500">Saldo do Período</div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
