
import React from 'react';
import { Button } from '@/components/ui/button';
import { Home, Wallet, CreditCard, Plus, PieChart, Target, Settings } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'accounts', label: 'Contas', icon: Wallet },
    { id: 'cards', label: 'Cartões', icon: CreditCard },
    { id: 'add', label: 'Adicionar', icon: Plus },
    { id: 'budgets', label: 'Orçamentos', icon: Target },
    { id: 'categories', label: 'Categorias', icon: Settings },
    { id: 'reports', label: 'Relatórios', icon: PieChart },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-1">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center p-2 min-w-0 ${
                isActive 
                  ? 'text-green-600 bg-green-50 dark:bg-green-900/20' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Icon size={18} />
              <span className="text-xs mt-1 truncate max-w-12">{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
