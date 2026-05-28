import React from 'react';
import { Home, BarChart3, CreditCard, MoreHorizontal, Plus, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAddSheet: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard',    icon: Home,          label: 'Início' },
  { id: 'transactions', icon: Receipt,        label: 'Transações' },
  // slot central — FAB
  { id: 'reports',      icon: BarChart3,      label: 'Relatórios' },
  { id: 'more',         icon: MoreHorizontal, label: 'Mais' },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenAddSheet,
}) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 md:hidden"
      data-onboarding="bottom-nav"
    >
      {/* safe area para iOS */}
      <nav className="flex items-end justify-around max-w-md mx-auto px-2 pb-[env(safe-area-inset-bottom,0px)]">

        {/* Itens esquerda */}
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}

        {/* FAB central */}
        <div className="flex flex-col items-center pt-2 pb-1">
          <button
            onClick={onOpenAddSheet}
            data-onboarding="add-transaction"
            aria-label="Nova transação"
            className="h-12 w-12 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center -mt-5 active:scale-95 transition-transform"
          >
            <Plus size={22} className="text-primary-foreground" strokeWidth={2.5} />
          </button>
          <span className="text-[10px] mt-0.5 font-medium text-muted-foreground">Adicionar</span>
        </div>

        {/* Itens direita */}
        {NAV_ITEMS.slice(2).map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </nav>
    </div>
  );
};

// ─ sub-componente interno ───────────────────────────────────────────────────────────
interface NavButtonProps {
  item: { id: string; icon: React.FC<any>; label: string };
  isActive: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isActive, onClick }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center py-2 px-3 rounded-lg transition-colors min-w-[56px]',
        isActive ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
      <span className={cn('text-[10px] mt-0.5 font-medium', isActive && 'font-semibold')}>
        {item.label}
      </span>
    </button>
  );
};
