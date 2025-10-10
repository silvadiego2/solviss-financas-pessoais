import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Upload,
  Tags, 
  Target, 
  CreditCard, 
  Palette, 
  User,
  Building,
  ChevronRight,
  Shield,
  Cloud,
  TrendingUp,
  Scan,
  Bell,
  Zap,
  Database,
  Receipt,
  Trash2,
  Repeat
} from 'lucide-react';

interface MoreOptionsProps {
  onNavigate: (tab: string) => void;
  onToggleTheme?: () => void;
}

export const MoreOptions: React.FC<MoreOptionsProps> = ({ onNavigate, onToggleTheme }) => {

  const menuItems = [
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
    {
      title: 'Gerenciar Transações',
      description: 'Ver, editar e excluir transações',
      icon: Receipt,
      action: () => onNavigate('transactions')
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
      title: 'Central de Analytics',
      description: 'Analytics avançados e insights inteligentes',
      icon: TrendingUp,
      action: () => onNavigate('analytics')
    },
    {
      title: 'Scanner de Recibos',
      description: 'Capture recibos via câmera com OCR',
      icon: Scan,
      action: () => onNavigate('receipt-scanner')
    },
    {
      title: 'Notificações Inteligentes',
      description: 'Configure alertas e lembretes automáticos',
      icon: Bell,
      action: () => onNavigate('notifications')
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
      title: 'Relatórios Exportar',
      description: 'Exportar dados financeiros',
      icon: Download,
      action: () => onNavigate('export')
    },
    {
      title: 'Backup Automático',
      description: 'Configurar backup automático dos dados',
      icon: Cloud,
      action: () => onNavigate('auto-backup')
    },
    {
      title: 'Gerenciar Categorias',
      description: 'Criar e editar categorias',
      icon: Tags,
      action: () => onNavigate('categories')
    },
    {
      title: 'Objetivos Financeiros',
      description: 'Definir e acompanhar metas',
      icon: Target,
      action: () => onNavigate('goals')
    },
    {
      title: 'Cartões de Crédito',
      description: 'Gerenciar cartões e faturas',
      icon: CreditCard,
      action: () => onNavigate('cards')
    },
    {
      title: 'Tema da Interface',
      description: 'Alternar entre claro e escuro',
      icon: Palette,
      action: () => onToggleTheme?.()
    },
    {
      title: 'Perfil do Usuário',
      description: 'Configurações da conta',
      icon: User,
      action: () => onNavigate('profile')
    },
    {
      title: 'Segurança e Auditoria',
      description: 'Log de atividades e validações',
      icon: Shield,
      action: () => onNavigate('security')
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mais Opções</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {menuItems.map((item, index) => (
          <Button
            key={index}
            variant={item.variant || "ghost"}
            className="w-full justify-between"
            onClick={item.action}
          >
            <div className="flex items-center space-x-2">
              <item.icon className="h-4 w-4" />
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
