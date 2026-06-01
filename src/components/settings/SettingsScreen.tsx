import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { BackHeader } from '@/components/layout/BackHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings, Moon, Sun, Shield, Database, Trash2, Download, Upload, ChevronRight } from 'lucide-react';

interface SettingsScreenProps {
  onBack?: () => void;
  onNavigate?: (view: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onNavigate }) => {
  const { theme, toggleTheme } = useTheme();

  const sections = [
    {
      title: 'Aparência',
      items: [
        {
          icon: theme === 'dark' ? Moon : Sun,
          label: 'Modo escuro',
          description: 'Alterna entre tema claro e escuro',
          type: 'toggle' as const,
          value: theme === 'dark',
          onChange: () => toggleTheme(),
        },
      ],
    },
    {
      title: 'Dados',
      items: [
        {
          icon: Download,
          label: 'Exportar relatórios',
          description: 'PDF ou Excel',
          type: 'nav' as const,
          onPress: () => onNavigate?.('export'),
        },
        {
          icon: Upload,
          label: 'Importar transações',
          description: 'CSV, Excel ou PDF',
          type: 'nav' as const,
          onPress: () => onNavigate?.('import'),
        },
        {
          icon: Database,
          label: 'Backup automático',
          description: 'Agende exportações periódicas',
          type: 'nav' as const,
          onPress: () => onNavigate?.('backup'),
        },
      ],
    },
    {
      title: 'Segurança',
      items: [
        {
          icon: Shield,
          label: 'Dashboard de segurança',
          description: 'Logs de auditoria e atividade',
          type: 'nav' as const,
          onPress: () => onNavigate?.('security'),
        },
      ],
    },
    {
      title: 'Avançado',
      items: [
        {
          icon: Trash2,
          label: 'Limpar todos os dados',
          description: 'Remove todas as informações',
          type: 'nav' as const,
          danger: true,
          onPress: () => onNavigate?.('reset'),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <BackHeader
        title="Configurações"
        subtitle="Personalize o app e gerencie seus dados"
        icon={<Settings className="h-6 w-6" />}
        onBack={onBack}
      />

      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">{section.title}</h3>
          <Card>
            <CardContent className="p-0">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === section.items.length - 1;
                return (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between px-4 py-3 ${
                      !isLast ? 'border-b' : ''
                    } ${item.type === 'nav' ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
                    onClick={item.type === 'nav' ? (item as any).onPress : undefined}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-4 w-4 ${'danger' in item && item.danger ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <div>
                        <p className={`text-sm font-medium ${'danger' in item && item.danger ? 'text-destructive' : ''}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    {item.type === 'toggle' ? (
                      <Switch
                        checked={(item as any).value}
                        onCheckedChange={(item as any).onChange}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};
