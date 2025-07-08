
import React from 'react';
import { Home, CreditCard, PlusCircle, BarChart3, User, Wallet, Download, Target, Settings } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'accounts', icon: Wallet, label: 'Contas' },
    { id: 'cards', icon: CreditCard, label: 'Cartões' },
    { id: 'add', icon: PlusCircle, label: 'Adicionar' },
    { id: 'budgets', icon: Target, label: 'Orçamentos' },
    { id: 'reports', icon: BarChart3, label: 'Relatórios' },
    { id: 'more', icon: Settings, label: 'Mais' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-2 z-50">
      <nav className="flex justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'
              }`}
            >
              <Icon size={18} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
