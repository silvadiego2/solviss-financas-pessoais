
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Download, 
  Tag, 
  Target, 
  Moon, 
  Sun, 
  User, 
  Settings,
  FileText,
  BarChart3
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface MoreOptionsProps {
  onNavigate?: (tab: string) => void;
}

export const MoreOptions: React.FC<MoreOptionsProps> = ({ onNavigate }) => {
  const { theme, toggleTheme } = useTheme();

  const handleNavigation = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    } else {
      // Fallback para quando usado no FinanceApp
      window.dispatchEvent(new CustomEvent('navigate', { detail: { tab } }));
    }
  };

  const menuItems = [
    {
      id: 'cards',
      title: 'Cartões de Crédito',
      description: 'Gerenciar cartões e faturas',
      icon: CreditCard,
      color: 'text-blue-600',
    },
    {
      id: 'goals',
      title: 'Objetivos Financeiros',
      description: 'Definir e acompanhar metas',
      icon: Target,
      color: 'text-green-600',
    },
    {
      id: 'categories',
      title: 'Gerenciar Categorias',
      description: 'Criar e organizar categorias',
      icon: Tag,
      color: 'text-purple-600',
    },
    {
      id: 'export',
      title: 'Exportar Relatórios',
      description: 'Baixar dados em PDF/Excel',
      icon: Download,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mais Opções</h2>
      </div>

      {/* Menu Principal */}
      <div className="space-y-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent 
                className="p-4"
                onClick={() => handleNavigation(item.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${item.color}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings size={20} />
            <span>Configurações</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tema */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              <div>
                <p className="font-medium">Tema</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {theme === 'dark' ? 'Modo escuro' : 'Modo claro'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleTheme}
            >
              Alterar
            </Button>
          </div>
          
          {/* Perfil */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User size={20} />
              <div>
                <p className="font-medium">Perfil</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gerenciar dados pessoais
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações do App */}
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Finanças Pessoais v1.0
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Desenvolvido com ❤️ para seu controle financeiro
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
