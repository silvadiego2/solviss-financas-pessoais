import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Upload,
  Tags, 
  Target, 
  CreditCard, 
  Palette, 
  User,
  UserPlus,
  Building,
  ChevronRight,
  Shield,
  Cloud,
  TrendingUp,
  Zap,
  Database,
  Trash2,
  Repeat,
  BarChart3,
  Settings
} from 'lucide-react';

interface MoreOptionsProps {
  onNavigate: (tab: string) => void;
  onToggleTheme?: () => void;
}

export const MoreOptions: React.FC<MoreOptionsProps> = ({ onNavigate, onToggleTheme }) => {

  // Aba: GERENCIAR
  const manageItems = [
    {
      title: 'Contas e Conexões Bancárias',
      description: 'Gerenciar contas e sincronizar bancos',
      icon: Building,
      action: () => onNavigate('accounts')
    },
    {
      title: 'Cartões de Crédito',
      description: 'Gerenciar cartões e faturas',
      icon: CreditCard,
      action: () => onNavigate('cards')
    },
    {
      title: 'Orçamentos Mensais',
      description: 'Controlar gastos por categoria',
      icon: Target,
      action: () => onNavigate('budgets')
    },
    {
      title: 'Objetivos Financeiros',
      description: 'Definir e acompanhar metas',
      icon: Target,
      action: () => onNavigate('goals')
    },
    {
      title: 'Gerenciar Categorias',
      description: 'Criar e editar categorias',
      icon: Tags,
      action: () => onNavigate('categories')
    },
    {
      title: 'Transações Recorrentes',
      description: 'Gerencie suas recorrências automáticas',
      icon: Repeat,
      action: () => onNavigate('recurring-transactions')
    },
    {
      title: 'Importar Transações',
      description: 'Importar de planilha CSV ou Excel',
      icon: Upload,
      action: () => onNavigate('import-transactions')
    },
    {
      title: 'Exportar Relatórios',
      description: 'Exportar dados financeiros',
      icon: Download,
      action: () => onNavigate('export')
    },
    {
      title: 'Configurações',
      description: 'Preferências, segurança e mais',
      icon: Settings,
      action: () => onNavigate('settings')
    },
  ];

  // Aba: ACOMPANHAR
  const trackItems = [
    {
      title: 'Relatórios Financeiros',
      description: 'Visualizar análises e gráficos',
      icon: BarChart3,
      action: () => onNavigate('reports')
    },
    {
      title: 'Central de Analytics',
      description: 'Analytics avançados e insights inteligentes',
      icon: TrendingUp,
      action: () => onNavigate('analytics')
    },
    {
      title: 'Automação Financeira',
      description: 'Regras automáticas para suas finanças',
      icon: Zap,
      action: () => onNavigate('auto-rules')
    },
    {
      title: 'Conexões Bancárias',
      description: 'Conectar e sincronizar contas bancárias',
      icon: Building,
      action: () => onNavigate('banking')
    },
    {
      title: 'Backup Automático',
      description: 'Configurar backup automático dos dados',
      icon: Cloud,
      action: () => onNavigate('auto-backup')
    },
  ];

  // Aba: SOBRE
  const aboutItems = [
    {
      title: 'Perfil do Usuário',
      description: 'Editar informações pessoais',
      icon: User,
      action: () => onNavigate('profile')
    },
    {
      title: 'Completar Cadastro',
      description: 'Adicione informações adicionais ao seu perfil',
      icon: UserPlus,
      action: () => onNavigate('profile')
    },
    {
      title: 'Tema da Interface',
      description: 'Alternar entre claro e escuro',
      icon: Palette,
      action: () => onToggleTheme?.()
    },
    {
      title: 'Segurança e Auditoria',
      description: 'Log de atividades e validações',
      icon: Shield,
      action: () => onNavigate('security')
    },
    {
      title: 'Dados de Demonstração',
      description: 'Criar dados de exemplo para testar o app',
      icon: Database,
      action: () => onNavigate('demo-data')
    },
    {
      title: 'Limpar Todos os Dados',
      description: '⚠️ Remover todos os dados (irreversível)',
      icon: Trash2,
      action: () => onNavigate('data-reset'),
      variant: 'destructive' as const
    },
  ];

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
            <TabsTrigger value="about">Sobre</TabsTrigger>
          </TabsList>

          {/* Aba: GERENCIAR */}
          <TabsContent value="manage" className="space-y-3 mt-4">
            {manageItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start h-auto py-3"
                onClick={item.action}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Button>
            ))}
          </TabsContent>

          {/* Aba: ACOMPANHAR */}
          <TabsContent value="track" className="space-y-3 mt-4">
            {trackItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start h-auto py-3"
                onClick={item.action}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Button>
            ))}
          </TabsContent>

          {/* Aba: SOBRE */}
          <TabsContent value="about" className="space-y-3 mt-4">
            {aboutItems.map((item, index) => (
              <Button
                key={index}
                variant={item.variant || "ghost"}
                className="w-full justify-start h-auto py-3"
                onClick={item.action}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Button>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
