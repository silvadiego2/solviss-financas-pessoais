import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Tags, 
  Target, 
  CreditCard, 
  Palette, 
  User,
  Building,
  ChevronRight,
  Shield
} from 'lucide-react';

interface MoreOptionsProps {
  onNavigate: (tab: string) => void;
  onToggleTheme?: () => void;
}

export const MoreOptions: React.FC<MoreOptionsProps> = ({ onNavigate, onToggleTheme }) => {

  const menuItems = [
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
            variant="ghost"
            className="w-full justify-between"
            onClick={item.action}
          >
            <div className="flex items-center space-x-2">
              <item.icon className="h-4 w-4" />
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
