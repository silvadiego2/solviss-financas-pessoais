import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { BackHeader } from '@/components/layout/BackHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings, Moon, Sun, DollarSign, Calendar, Bell, Trash2 } from 'lucide-react';

interface SettingsScreenProps {
  onBack?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(true);
  const [currency, setCurrency] = useState('BRL');
  const [weekStart, setWeekStart] = useState('monday');

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
      title: 'Regional',
      items: [
        {
          icon: DollarSign,
          label: 'Moeda padrão',
          description: 'Moeda usada em toda a aplicação',
          type: 'select' as const,
          value: currency,
          options: [
            { value: 'BRL', label: 'R$ — Real Brasileiro' },
            { value: 'USD', label: '$ — Dólar Americano' },
            { value: 'EUR', label: '€ — Euro' },
          ],
          onChange: (v: string) => setCurrency(v),
        },
        {
          icon: Calendar,
          label: 'Primeiro dia da semana',
          description: 'Usado em calendários e gráficos',
          type: 'select' as const,
          value: weekStart,
          options: [
            { value: 'sunday',  label: 'Domingo' },
            { value: 'monday',  label: 'Segunda-feira' },
          ],
          onChange: (v: string) => setWeekStart(v),
        },
      ],
    },
    {
      title: 'Comportamento',
      items: [
        {
          icon: Bell,
          label: 'Notificações push',
          description: 'Alertas de vencimento e orçamento',
          type: 'toggle' as const,
          value: notifications,
          onChange: () => setNotifications(p => !p),
        },
        {
          icon: Trash2,
          label: 'Confirmar exclusões',
          description: 'Pede confirmação antes de excluir',
          type: 'toggle' as const,
          value: confirmDelete,
          onChange: () => setConfirmDelete(p => !p),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <BackHeader
        title="Configurações"
        subtitle="Tema, moeda e preferências"
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
                    className={`flex items-center justify-between px-4 py-3.5 ${
                      !isLast ? 'border-b' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>

                    {item.type === 'toggle' && (
                      <Switch
                        checked={(item as any).value}
                        onCheckedChange={(item as any).onChange}
                      />
                    )}

                    {item.type === 'select' && (
                      <select
                        value={(item as any).value}
                        onChange={e => (item as any).onChange(e.target.value)}
                        className="text-sm border border-input rounded-md px-2 py-1 bg-background text-foreground"
                      >
                        {(item as any).options.map((opt: any) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ))}

      <p className="text-xs text-muted-foreground text-center px-4">
        Para importar/exportar dados, backup e segurança, acesse o menu <strong>Mais</strong>.
      </p>
    </div>
  );
};
