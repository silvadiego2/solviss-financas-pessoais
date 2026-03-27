import React, { useState } from 'react';
import {
  Home, Receipt, CalendarRange, Repeat, TrendingUp,
  CreditCard, Target, Brain, BarChart3, Crown,
  Plug, Settings, Moon, Sun, User, LogOut,
  Menu, X, PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', icon: Home, label: 'Dashboard' },
  { id: 'transactions', icon: Receipt, label: 'Transações' },
  { id: 'budgets', icon: CalendarRange, label: 'Planejamento' },
  { id: 'recurring-transactions', icon: Repeat, label: 'Recorrentes' },
  { id: 'cash-flow', icon: TrendingUp, label: 'Fluxo de Caixa' },
  { id: 'cards', icon: CreditCard, label: 'Cartões' },
  { id: 'goals', icon: Target, label: 'Metas' },
  { id: 'intelligence', icon: Brain, label: 'Inteligência' },
  { id: 'reports', icon: BarChart3, label: 'Relatórios' },
  { id: 'plans', icon: Crown, label: 'Planos' },
  { id: 'integrations', icon: Plug, label: 'Integrações' },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ activeTab, onTabChange }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id: string) => {
    onTabChange(id);
    if (isMobile) setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-border">
        <span className="text-lg font-bold text-primary tracking-tight">Finanças</span>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="h-8 w-8">
            <X size={18} />
          </Button>
        )}
      </div>

      {/* New transaction */}
      <div className="px-3 py-3">
        <Button onClick={() => handleNav('add')} className="w-full gap-2" size="default">
          <PlusCircle size={18} />
          <span>Nova Transação</span>
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-2 space-y-0.5">
        <button
          onClick={() => handleNav('more')}
          className={cn(
            'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'more'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <Settings size={18} />
          <span>Configurações</span>
        </button>

        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
        </button>

        {/* User */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={14} className="text-primary" />
          </div>
          <p className="text-xs text-muted-foreground truncate flex-1">{user?.email}</p>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger trigger */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-md"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-card border-r border-border flex-shrink-0 transition-transform duration-300 z-50',
          isMobile
            ? 'fixed inset-y-0 left-0 w-64 ' + (mobileOpen ? 'translate-x-0' : '-translate-x-full')
            : 'sticky top-0 h-screen w-60'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
