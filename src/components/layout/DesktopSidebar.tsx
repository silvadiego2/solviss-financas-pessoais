import React from 'react';
import { 
  Home, Wallet, CreditCard, Target, BarChart3, 
  Tags, Settings, PlusCircle, TrendingUp, LogOut,
  Moon, Sun, User, ChevronLeft, ChevronRight,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface DesktopSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navSections = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', icon: Home, label: 'Dashboard' },
      { id: 'accounts', icon: Wallet, label: 'Contas' },
      { id: 'cards', icon: CreditCard, label: 'Cartões' },
      { id: 'transactions', icon: Receipt, label: 'Transações' },
    ]
  },
  {
    label: 'Planejamento',
    items: [
      { id: 'budgets', icon: Target, label: 'Orçamentos' },
      { id: 'goals', icon: TrendingUp, label: 'Metas' },
      { id: 'categories', icon: Tags, label: 'Categorias' },
    ]
  },
  {
    label: 'Análise',
    items: [
      { id: 'reports', icon: BarChart3, label: 'Relatórios' },
    ]
  },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
}) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo / Brand */}
      <div className={cn(
        'flex items-center h-14 px-3 border-b border-border',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <span className="text-lg font-bold text-primary tracking-tight">Finanças</span>
        )}
        <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-8 w-8">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Add transaction button */}
      <div className="px-3 py-3">
        <Button
          onClick={() => onTabChange('add')}
          className="w-full gap-2"
          size={collapsed ? 'icon' : 'default'}
        >
          <PlusCircle size={18} />
          {!collapsed && <span>Nova Transação</span>}
        </Button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1 font-semibold">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      'flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      collapsed && 'justify-center px-0'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon size={18} />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border p-2 space-y-0.5">
        <button
          onClick={() => onTabChange('more')}
          className={cn(
            'flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
            activeTab === 'more'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            collapsed && 'justify-center px-0'
          )}
        >
          <Settings size={18} />
          {!collapsed && <span>Mais Opções</span>}
        </button>

        <button
          onClick={toggleTheme}
          className={cn(
            'flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            collapsed && 'justify-center px-0'
          )}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          {!collapsed && <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>}
        </button>

        {/* User info */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-2.5 py-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={14} className="text-primary" />
            </div>
            <p className="text-xs text-muted-foreground truncate flex-1">
              {user?.email}
            </p>
          </div>
        )}

        <button
          onClick={signOut}
          className={cn(
            'flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut size={18} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};
