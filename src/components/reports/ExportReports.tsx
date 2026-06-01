import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackHeader } from '@/components/layout/BackHeader';
import { useExportReports } from '@/hooks/useExportReports';
import { FileText, FileSpreadsheet, Download, Calendar, BarChart3, Settings } from 'lucide-react';

interface ExportReportsProps {
  onBack?: () => void;
}

export const ExportReports: React.FC<ExportReportsProps> = ({ onBack }) => {
  const { exportToPDF, exportToExcel, isExporting } = useExportReports();
  const [period, setPeriod] = useState('current_month');
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [includeCategories, setIncludeCategories] = useState(true);
  const [includeBudgets, setIncludeBudgets] = useState(false);
  const [includeGoals, setIncludeGoals] = useState(false);

  const periodLabels: Record<string, string> = {
    current_month: 'Mês atual',
    last_month: 'Mês passado',
    last_3_months: 'Últimos 3 meses',
    last_6_months: 'Últimos 6 meses',
    current_year: 'Ano atual',
    all: 'Todo o histórico',
  };

  return (
    <div className="space-y-6">
      <BackHeader
        title="Exportar Relatórios"
        subtitle="Exporte seus dados financeiros em PDF ou Excel"
        icon={<Download className="h-6 w-6" />}
        onBack={onBack}
      />

      {/* Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Conteúdo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {([
            { key: 'transactions', label: 'Transações', value: includeTransactions, set: setIncludeTransactions },
            { key: 'categories', label: 'Categorias', value: includeCategories, set: setIncludeCategories },
            { key: 'budgets', label: 'Orçamentos', value: includeBudgets, set: setIncludeBudgets },
            { key: 'goals', label: 'Metas', value: includeGoals, set: setIncludeGoals },
          ]).map(({ key, label, value, set }) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="font-normal">{label}</Label>
              <Switch id={key} checked={value} onCheckedChange={set} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={exportToExcel}
          disabled={isExporting}
          className="flex-col h-auto py-4 gap-1"
        >
          <FileSpreadsheet className="h-6 w-6 text-green-600" />
          <span className="text-sm font-medium">Exportar Excel</span>
          <span className="text-xs text-muted-foreground">.xlsx</span>
        </Button>
        <Button
          variant="outline"
          onClick={exportToPDF}
          disabled={isExporting}
          className="flex-col h-auto py-4 gap-1"
        >
          <FileText className="h-6 w-6 text-red-600" />
          <span className="text-sm font-medium">Exportar PDF</span>
          <span className="text-xs text-muted-foreground">.pdf</span>
        </Button>
      </div>

      {isExporting && (
        <p className="text-center text-sm text-muted-foreground">
          Gerando relatório...
        </p>
      )}
    </div>
  );
};
