import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Upload,
  Tags,
  User,
  Building,
  ChevronRight,
  Shield,
  Cloud,
  TrendingUp,
  Zap,
  Database,
  Trash2,
  BarChart3,
  Settings,
  Copy,
  Sparkles,
  CalendarClock,
  Bell,
  CalendarRange,
} from 'lucide-react';

interface MoreOptionsProps {
  onNavigate: (tab: string) => void;
}

export const MoreOptions: React.FC<MoreOptionsProps> = ({ onNavigate }) => {
  const manageItems = [
    {
      title: 'Agenda Financeira',
      description: 'Contas a pagar e a receber',
      icon: CalendarClock,
      action: () => onNavigate('agenda'),
      highlight: true,
    },
    {
      title: 'Orçamentos Mensais',
      description: 'Limites de gasto por categoria',
      icon: CalendarRange,
      action: () => onNavigate('budgets-list'),
    },
    {
      title: 'Contas Bancárias',
      description: 'Gerenciar contas e saldos',
      icon: Building,
      action: () => onNavigate('accounts'),
    },
    {
      title: 'Gerenciar Categorias',
      description: 'Criar e editar categorias',
      icon: Tags,
      action: () => onNavigate('categories'),
    },
    {
      title: 'Importar Transações',
      description: 'Importar de planilha CSV ou Excel',
      icon: Upload,
      action: () => onNavigate('import-transactions'),
    },
    {
      title: 'Exportar Relatórios',
      description: 'Exportar dados financeiros',
      icon: Download,
      action: () => onNavigate('export'),
    },
    {
      title: 'Notificações',
      description: 'Alertas de vencimento e orçamento',
      icon: Bell,
      action: () => onNavigate('notifications'),
    },
  ];

  const trackItems = [
    {
      title: 'Relatórios Financeiros',
      description: 'Visualizar análises e gráficos',
      icon: BarChart3,
      action: () => onNavigate('reports'),
    },
    {
      title: 'Central de Analytics',
      description: 'Analytics avançados e insights inteligentes',
      icon: TrendingUp,
      action: () => onNavigate('analytics'),
    },
    {
      title: 'Automação Financeira',
      description: 'Regras automáticas para suas finanças',
      icon: Zap,
      action: () => onNavigate('auto-rules'),
    },
    {
      title: 'Categorização Automática',
      description: 'Classificar transações automaticamente por IA',
      icon: Sparkles,
      action: () => onNavigate('auto-categorization'),
    },
    {
      title: 'Detector de Duplicatas',
      description: 'Identificar e remover transações duplicadas',
      icon: Copy,
      action: () => onNavigate('duplicate-detection'),
    },
    {
      title: 'Backup Automático',
      description: 'Configurar backup automático dos dados',
      icon: Cloud,
      action: () => onNavigate('auto-backup'),
    },
  ];

  const accountItems = [
    {
      title: 'Perfil do Usuário',
      description: 'Editar informações pessoais',
      icon: User,
      action: () => onNavigate('profile'),
    },
    {
      title: 'Configurações',
      description: 'Tema, moeda, notificações e mais',
      icon: Settings,
      action: () => onNavigate('settings'),
    },
    {
      title: 'Segurança e Auditoria',
      description: 'Log de atividades e sessões',
      icon: Shield,
      action: () => onNavigate('security'),
    },
    {
      title: 'Dados de Demonstração',
      description: 'Criar dados de exemplo para testar o app',
      icon: Database,
      action: () => onNavigate('demo-data'),
    },
    {
      title: 'Limpar Todos os Dados',
      description: '⚠️ Remover todos os dados (irreversível)',
      icon: Trash2,
      action: () => onNavigate('data-reset'),
      variant: 'destructive' as const,
    },
  ];

  const renderItems = (items: typeof manageItems) =>
    items.map((item, index) => (
      <Button
        key={index}
        variant={item.variant || 'ghost'}
        className={`w-full justify-start h-auto py-3 ${
          (item as any).highlight ? 'border border-primary/30 bg-primary/5 hover:bg-primary/10' : ''
        }`}
        onClick={item.action}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <item.icon className={`h-5 w-5 ${(item as any).highlight ? 'text-primary' : ''}`} />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">{item.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </Button>
    ));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu Principal</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manage">Gerenciar</TabsTrigger>
            <TabsTrigger value="track">Acompanhar</TabsTrigger>
            <TabsTrigger value="account">Conta</TabsTrigger>
          </TabsList>
          <TabsContent value="manage" className="space-y-3 mt-4">{renderItems(manageItems)}</TabsContent>
          <TabsContent value="track" className="space-y-3 mt-4">{renderItems(trackItems)}</TabsContent>
          <TabsContent value="account" className="space-y-3 mt-4">{renderItems(accountItems)}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
