import React from 'react';
import { Home, Wallet, PlusCircle, CreditCard, Settings, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'transactions', icon: Receipt, label: 'Transações' },
    { id: 'add', icon: PlusCircle, label: 'Adicionar', isAction: true },
    { id: 'cards', icon: CreditCard, label: 'Cartões' },
    { id: 'more', icon: Settings, label: 'Mais' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-1.5 z-50 md:hidden" data-onboarding="bottom-nav">
      <nav className="flex justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex flex-col items-center py-1 px-2"
                data-onboarding="add-transaction"
              >
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center -mt-4 shadow-lg">
                  <Icon size={20} className="text-primary-foreground" />
                </div>
                <span className="text-[10px] mt-0.5 font-medium text-muted-foreground">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center py-1 px-2 rounded-lg transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon size={18} />
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
