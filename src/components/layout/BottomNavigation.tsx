
import React from 'react';
import { Home, CreditCard, PlusCircle, BarChart3, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'dashboard', label: 'Início', icon: Home },
  { id: 'accounts', label: 'Contas', icon: CreditCard },
  { id: 'add', label: 'Adicionar', icon: PlusCircle },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'goals', label: 'Objetivos', icon: Target },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center py-2 px-3 rounded-lg transition-colors",
                isActive
                  ? "text-green-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon size={20} className={cn(
                isActive && tab.id === 'add'
                  ? "text-white bg-green-600 rounded-full p-1"
                  : ""
              )} />
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
