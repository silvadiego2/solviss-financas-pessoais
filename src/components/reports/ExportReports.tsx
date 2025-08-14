
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Table } from 'lucide-react';
import { toast } from 'sonner';
import { BackHeader } from '@/components/layout/BackHeader';

interface ExportReportsProps {
  onBack?: () => void;
}

export const ExportReports: React.FC<ExportReportsProps> = ({ onBack }) => {
  const handleExportPDF = () => {
    toast.info('Exportação em PDF será implementada em breve');
  };

  const handleExportExcel = () => {
    toast.info('Exportação em Excel será implementada em breve');
  };

  const handleExportCSV = () => {
    toast.info('Exportação em CSV será implementada em breve');
  };

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Exportar Relatórios" onBack={onBack} />}
      
      {!onBack && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Exportar Relatórios</h2>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download size={20} />
            <span>Opções de Exportação</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button 
              onClick={handleExportPDF}
              className="w-full justify-start"
              variant="outline"
            >
              <FileText size={20} className="mr-3" />
              Exportar em PDF
            </Button>
            
            <Button 
              onClick={handleExportExcel}
              className="w-full justify-start"
              variant="outline"
            >
              <Table size={20} className="mr-3" />
              Exportar em Excel
            </Button>
            
            <Button 
              onClick={handleExportCSV}
              className="w-full justify-start"
              variant="outline"
            >
              <Download size={20} className="mr-3" />
              Exportar em CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Período dos Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Selecione o período dos dados que deseja exportar:
          </p>
          <div className="space-y-2">
            <Button variant="outline" className="w-full">
              Último mês
            </Button>
            <Button variant="outline" className="w-full">
              Últimos 3 meses
            </Button>
            <Button variant="outline" className="w-full">
              Último ano
            </Button>
            <Button variant="outline" className="w-full">
              Período personalizado
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
