
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, FileText, Table, Settings, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { BackHeader } from '@/components/layout/BackHeader';
import { useExportReports, type ExportPeriod, type ExportOptions } from '@/hooks/useExportReports';
import { format } from 'date-fns';

interface ExportReportsProps {
  onBack?: () => void;
}

export const ExportReports: React.FC<ExportReportsProps> = ({ onBack }) => {
  const { isExporting, exportToPDF, exportToExcel, exportToCSV } = useExportReports();
  const [selectedPeriod, setSelectedPeriod] = useState<ExportPeriod>('last_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [exportOptions, setExportOptions] = useState<Omit<ExportOptions, 'period' | 'customPeriod'>>({
    includeTransactions: true,
    includeCategories: true,
    includeBudgets: true,
    includeAccounts: true
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const getExportOptions = (): ExportOptions => ({
    ...exportOptions,
    period: selectedPeriod,
    customPeriod: selectedPeriod === 'custom' && customStartDate && customEndDate ? {
      startDate: new Date(customStartDate),
      endDate: new Date(customEndDate)
    } : undefined
  });

  const handleExportPDF = async () => {
    if (selectedPeriod === 'custom' && (!customStartDate || !customEndDate)) {
      toast.error('Por favor, selecione as datas para o período personalizado');
      return;
    }
    await exportToPDF(getExportOptions());
  };

  const handleExportExcel = async () => {
    if (selectedPeriod === 'custom' && (!customStartDate || !customEndDate)) {
      toast.error('Por favor, selecione as datas para o período personalizado');
      return;
    }
    await exportToExcel(getExportOptions());
  };

  const handleExportCSV = async () => {
    if (selectedPeriod === 'custom' && (!customStartDate || !customEndDate)) {
      toast.error('Por favor, selecione as datas para o período personalizado');
      return;
    }
    await exportToCSV(getExportOptions());
  };

  const getPeriodLabel = (period: ExportPeriod) => {
    switch (period) {
      case 'last_month': return 'Último mês';
      case 'last_3_months': return 'Últimos 3 meses';
      case 'last_year': return 'Último ano';
      case 'custom': return 'Período personalizado';
    }
  };

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Exportar Relatórios" onBack={onBack} />}
      
      {!onBack && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Exportar Relatórios</h2>
        </div>
      )}

      {/* Período de Exportação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar size={20} />
            <span>Período dos Dados</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(['last_month', 'last_3_months', 'last_year', 'custom'] as ExportPeriod[]).map(period => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? "default" : "outline"}
                  onClick={() => setSelectedPeriod(period)}
                  className="justify-start text-sm"
                >
                  {getPeriodLabel(period)}
                </Button>
              ))}
            </div>

            {/* Período Personalizado */}
            {selectedPeriod === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mt-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Data Inicial</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Data Final</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Opções Avançadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings size={20} />
              <span>Opções de Exportação</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            >
              Configurar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showAdvancedOptions && (
            <div className="space-y-4 mb-4 p-4 border rounded-lg">
              <h4 className="font-medium">Incluir nos relatórios:</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-transactions"
                    checked={exportOptions.includeTransactions}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeTransactions: !!checked }))
                    }
                  />
                  <Label htmlFor="include-transactions">Transações</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-categories"
                    checked={exportOptions.includeCategories}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeCategories: !!checked }))
                    }
                  />
                  <Label htmlFor="include-categories">Resumo por Categorias</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-accounts"
                    checked={exportOptions.includeAccounts}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeAccounts: !!checked }))
                    }
                  />
                  <Label htmlFor="include-accounts">Informações das Contas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-budgets"
                    checked={exportOptions.includeBudgets}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeBudgets: !!checked }))
                    }
                  />
                  <Label htmlFor="include-budgets">Orçamentos</Label>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              <FileText size={20} className="mr-3" />
              {isExporting ? 'Exportando...' : 'Exportar Relatório em PDF'}
            </Button>
            
            <Button 
              onClick={handleExportExcel}
              disabled={isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              <Table size={20} className="mr-3" />
              {isExporting ? 'Exportando...' : 'Exportar Planilha Excel'}
            </Button>
            
            <Button 
              onClick={handleExportCSV}
              disabled={isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              <Download size={20} className="mr-3" />
              {isExporting ? 'Exportando...' : 'Exportar Dados CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <h4 className="font-medium text-foreground">Sobre os formatos:</h4>
            <ul className="space-y-1 pl-4">
              <li>• <strong>PDF</strong>: Relatório visual formatado com resumos e gráficos</li>
              <li>• <strong>Excel</strong>: Planilha completa com múltiplas abas para análise detalhada</li>
              <li>• <strong>CSV</strong>: Dados de transações para importação em outros sistemas</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
