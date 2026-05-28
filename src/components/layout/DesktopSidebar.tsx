import React from 'react';
import {
  Home, CreditCard, BarChart3,
  PlusCircle, TrendingUp, LogOut,
  Moon, Sun, User, ChevronLeft, ChevronRight,
  Receipt, MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface DesktopSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAddSheet: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

// ─ 5 itens primários ───────────────────────────────────────────────────────────
const PRIMARY_NAV = [
  { id: 'dashboard',    icon: Home,       label: 'Início' },
  { id: 'transactions', icon: Receipt,     label: 'Transações' },
  { id: 'cards',        icon: CreditCard,  label: 'Cartões' },
  { id: 'reports',      icon: BarChart3,   label: 'Relatórios' },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenAddSheet,
  collapsed,
  onToggleCollapse,
}) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo / Brand */}
      <div className={cn(
        'flex items-center h-14 px-3 border-b border-border',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">S</div>
            <span className="text-base font-bold text-foreground tracking-tight">Solviss</span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-8 w-8 flex-shrink-0">
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </Button>
      </div>

      {/* Botão Nova Transação — abre Sheet */}
      <div className="px-3 py-3">
        <Button
          onClick={onOpenAddSheet}
          className="w-full gap-2"
          size={collapsed ? 'icon' : 'default'}
          title={collapsed ? 'Nova Transação' : undefined}
        >
          <PlusCircle size={17} />
          {!collapsed && <span>Nova Transação</span>}
        </Button>
      </div>

      {/* Nav primária — 5 itens */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {PRIMARY_NAV.map((item) => {
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
      </nav>

      {/* Rodapé */}
      <div className="border-t border-border p-2 space-y-0.5">
        {/* Mais — acesso a todo o resto */}
        <button
          onClick={() => onTabChange('more')}
          className={cn(
            'flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
            activeTab === 'more'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? 'Mais' : undefined}
        >
          <MoreHorizontal size={18} />
          {!collapsed && <span>Mais</span>}
        </button>

        <button
          onClick={toggleTheme}
          className={cn(
            'flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? (theme === 'light' ? 'Modo Escuro' : 'Modo Claro') : undefined}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          {!collapsed && <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>}
        </button>

        {/* Usuário */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-2.5 py-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-primary" />
            </div>
            <p className="text-xs text-muted-foreground truncate flex-1">{user?.email}</p>
          </div>
        )}

        <button
          onClick={signOut}
          className={cn(
            'flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};
