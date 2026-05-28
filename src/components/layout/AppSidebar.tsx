import React, { useState } from 'react';
import {
  Home, Receipt, CalendarRange, TrendingUp,
  CreditCard, Target, BarChart3, Crown,
  Settings, Moon, Sun, User, LogOut,
  Menu, X, PlusCircle, MoreHorizontal,
  Brain, Repeat,
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

// ── Navegação primária (desktop sidebar + mobile bottom bar) ──────────────
const PRIMARY_NAV = [
  { id: 'dashboard',    icon: Home,         label: 'Início' },
  { id: 'transactions', icon: Receipt,      label: 'Transações' },
  { id: 'budgets',      icon: CalendarRange, label: 'Planejamento' },
  { id: 'reports',      icon: BarChart3,    label: 'Relatórios' },
  { id: 'more',         icon: MoreHorizontal, label: 'Mais' },
];

// ── Navegação secundária (só desktop sidebar) ─────────────────────────────
const SECONDARY_NAV = [
  { id: 'cash-flow',             icon: TrendingUp,  label: 'Fluxo de Caixa' },
  { id: 'recurring-transactions',icon: Repeat,      label: 'Recorrentes' },
  { id: 'cards',                 icon: CreditCard,  label: 'Cartões' },
  { id: 'goals',                 icon: Target,      label: 'Metas' },
  { id: 'intelligence',          icon: Brain,       label: 'Inteligência' },
  { id: 'plans',                 icon: Crown,       label: 'Planos' },
];

// Todos os ids reconhecidos como "primários" para fins de highlight na bottom bar
const PRIMARY_IDS = new Set(PRIMARY_NAV.map(n => n.id));

export const AppSidebar: React.FC<AppSidebarProps> = ({ activeTab, onTabChange }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const handleNav = (id: string) => {
    onTabChange(id);
    if (isMobile) setMobileOpen(false);
  };

  // ── Sidebar desktop ────────────────────────────────────────────────────
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-premium-sm">
            S
          </div>
          <span className="font-display text-base font-bold tracking-tight">Solviss</span>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="h-8 w-8">
            <X size={18} />
          </Button>
        )}
      </div>

      {/* Nova Transação */}
      <div className="px-4 py-4">
        <Button onClick={() => handleNav('add')} className="w-full gap-2 shadow-premium-sm" size="default">
          <PlusCircle size={16} />
          <span className="font-medium">Nova Transação</span>
        </Button>
      </div>

      {/* Nav primária */}
      <nav className="px-3 space-y-0.5">
        <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Principal
        </p>
        {PRIMARY_NAV.filter(i => i.id !== 'more').map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-all',
                isActive
                  ? 'bg-accent text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground font-medium'
              )}
            >
              <item.icon size={17} strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Nav secundária (colapsável) */}
      <nav className="px-3 mt-3 space-y-0.5">
        <button
          onClick={() => setSecondaryOpen(!secondaryOpen)}
          className="flex items-center justify-between w-full px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <span>Ferramentas</span>
          <span className="text-[9px] opacity-60">{secondaryOpen ? '▲' : '▼'}</span>
        </button>
        {(secondaryOpen ? SECONDARY_NAV : SECONDARY_NAV.slice(0, 4)).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm transition-all',
                isActive
                  ? 'bg-accent text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground font-medium'
              )}
            >
              <item.icon size={16} strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-auto border-t border-border p-2 space-y-0.5">
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

  // ── Bottom nav mobile ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Overlay quando sidebar móvel aberta (via "Mais") */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Drawer lateral (só quando mobileOpen) */}
        {mobileOpen && (
          <aside className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-50 overflow-y-auto">
            {sidebarContent}
          </aside>
        )}

        {/* Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-bottom">
          <div className="flex items-stretch h-16">
            {PRIMARY_NAV.map((item) => {
              const isActive =
                activeTab === item.id ||
                (item.id === 'more' && !PRIMARY_IDS.has(activeTab) && activeTab !== 'add');

              // Botão central FAB (+)
              if (item.id === 'budgets') {
                return (
                  <React.Fragment key="fab-group">
                    {/* item normal antes do FAB */}
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        'flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors pt-1',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      <item.icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                      <span>{item.label}</span>
                    </button>

                    {/* FAB central */}
                    <div className="flex-1 flex items-center justify-center pb-1">
                      <button
                        onClick={() => onTabChange('add')}
                        className={cn(
                          'w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg -mt-4 transition-transform active:scale-95',
                          activeTab === 'add' && 'ring-2 ring-primary ring-offset-2 ring-offset-card'
                        )}
                        aria-label="Nova transação"
                      >
                        <PlusCircle size={22} />
                      </button>
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => item.id === 'more' ? setMobileOpen(true) : onTabChange(item.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors pt-1',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Espaçador para não sobrepor conteúdo com a bottom bar */}
        <div className="h-16 flex-shrink-0" />
      </>
    );
  }

  // ── Desktop sidebar ────────────────────────────────────────────────────
  return (
    <aside className="sticky top-0 h-screen w-60 bg-card border-r border-border flex-shrink-0">
      {sidebarContent}
    </aside>
  );
};
