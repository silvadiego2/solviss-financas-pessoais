import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BackHeader } from '@/components/layout/BackHeader';
import { ImportTransactions } from '@/components/transactions/ImportTransactions';
import { ExportReports } from '@/components/reports/ExportReports';
import { Upload, Download, ChevronRight } from 'lucide-react';

interface DataTransferHubProps {
  onBack?: () => void;
}

type View = 'menu' | 'import' | 'export';

export const DataTransferHub: React.FC<DataTransferHubProps> = ({ onBack }) => {
  const [view, setView] = useState<View>('menu');

  if (view === 'import') return <ImportTransactions onBack={() => setView('menu')} />;
  if (view === 'export') return <ExportReports      onBack={() => setView('menu')} />;

  const items = [
    {
      id: 'import' as const,
      icon: <Upload size={18} className="text-primary" />,
      title: 'Importar Transações',
      description: 'CSV ou Excel — carregue seu histórico bancário',
    },
    {
      id: 'export' as const,
      icon: <Download size={18} className="text-primary" />,
      title: 'Exportar Relatórios',
      description: 'Baixar seus dados em planilha ou PDF',
    },
  ];

  return (
    <div className="space-y-6">
      <BackHeader
        title="Importar / Exportar"
        subtitle="Entrada e saída de dados financeiros"
        icon={<Download className="h-6 w-6" />}
        onBack={onBack}
      />
      <div className="grid gap-3">
        {items.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setView(item.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
