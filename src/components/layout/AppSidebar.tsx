import React, { useState } from 'react';
import {
  Home, Receipt, CalendarRange, TrendingUp,
  CreditCard, Target, BarChart3, Crown,
  Settings, Moon, Sun, User, LogOut,
  X, PlusCircle, MoreHorizontal,
  Brain, Repeat, Plus, CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAddSheet: () => void;
}

// ── Navegação principal (sidebar desktop + "Principal" label) ──────────────
const PRIMARY_NAV = [
  { id: 'dashboard',    icon: Home,          label: 'Início'       },
  { id: 'transactions', icon: Receipt,       label: 'Transações'   },
  { id: 'cards',        icon: CreditCard,    label: 'Cartões'      },
  { id: 'agenda',       icon: CalendarClock, label: 'Agenda'       },
  { id: 'budgets',      icon: CalendarRange, label: 'Planejamento' },
];

// ── Navegação secundária (Ferramentas) ─────────────────────────────────────
const SECONDARY_NAV = [
  { id: 'cash-flow',              icon: TrendingUp, label: 'Fluxo de Caixa' },
  { id: 'recurring-transactions', icon: Repeat,     label: 'Recorrentes'    },
  { id: 'goals',                  icon: Target,     label: 'Metas'          },
  { id: 'reports',                icon: BarChart3,  label: 'Relatórios'     },
  { id: 'intelligence',           icon: Brain,      label: 'Inteligência'   },
];

const PRIMARY_IDS = new Set(PRIMARY_NAV.map(n => n.id));

export const AppSidebar: React.FC<AppSidebarProps> = ({ activeTab, onTabChange, onOpenAddSheet }) => {
  const { user, signOut }          = useAuth();
  const { theme, toggleTheme }     = useTheme();
  const isMobile                   = useIsMobile();
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const handleNav = (id: string) => {
    onTabChange(id);
    if (isMobile) setMobileOpen(false);
  };

  // ── Conteúdo compartilhado sidebar/drawer ─────────────────────────────────
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

      {/* Botão Nova Transação */}
      <div className="px-4 py-4">
        <Button
          onClick={onOpenAddSheet}
          className="w-full gap-2 shadow-premium-sm"
          size="default"
        >
          <PlusCircle size={16} />
          <span className="font-medium">Nova Transação</span>
        </Button>
      </div>

      {/* Nav principal */}
      <nav className="px-3 space-y-0.5">
        <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Principal
        </p>
        {PRIMARY_NAV.map((item) => {
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

      {/* Nav ferramentas */}
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

      {/* Rodapé */}
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

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
        )}
        {mobileOpen && (
          <aside className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-50 overflow-y-auto">
            {sidebarContent}
          </aside>
        )}

        {/* Bottom Tab Bar: Início · Transações · [+] · Cartões · Mais */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border">
          <div className="flex items-end h-16 max-w-md mx-auto">
            <MobileTab id="dashboard" activeTab={activeTab} label="Início" onClick={() => handleNav('dashboard')}>
              <Home size={22} strokeWidth={activeTab === 'dashboard' ? 2.25 : 1.75} />
            </MobileTab>

            <MobileTab id="transactions" activeTab={activeTab} label="Transações" onClick={() => handleNav('transactions')}>
              <Receipt size={22} strokeWidth={activeTab === 'transactions' ? 2.25 : 1.75} />
            </MobileTab>

            {/* FAB central */}
            <div className="flex-1 flex flex-col items-center pb-1">
              <button
                onClick={onOpenAddSheet}
                aria-label="Nova transação"
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 -mt-4 active:scale-95 transition-transform"
              >
                <Plus size={22} strokeWidth={2.5} />
              </button>
              <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Adicionar</span>
            </div>

            {/* Cartões */}
            <MobileTab id="cards" activeTab={activeTab} label="Cartões" onClick={() => handleNav('cards')}>
              <CreditCard size={22} strokeWidth={activeTab === 'cards' ? 2.25 : 1.75} />
            </MobileTab>

            {/* Mais — abre drawer */}
            <MobileTab
              id="more"
              activeTab={activeTab}
              label="Mais"
              onClick={() => setMobileOpen(true)}
              forceActive={!PRIMARY_IDS.has(activeTab) && activeTab !== 'add'}
            >
              <MoreHorizontal size={22} strokeWidth={1.75} />
            </MobileTab>
          </div>
        </nav>

        {/* Espaçador */}
        <div className="h-16 flex-shrink-0" />
      </>
    );
  }

  // ── Desktop sidebar ────────────────────────────────────────────────────────
  return (
    <aside className="sticky top-0 h-screen w-60 bg-card border-r border-border flex-shrink-0">
      {sidebarContent}
    </aside>
  );
};

// ─ Sub-componente tab mobile ─────────────────────────────────────────────────
const MobileTab: React.FC<{
  id: string;
  activeTab: string;
  label: string;
  onClick: () => void;
  forceActive?: boolean;
  children: React.ReactNode;
}> = ({ id, activeTab, label, onClick, forceActive, children }) => {
  const isActive = forceActive ?? activeTab === id;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex flex-col items-center justify-center gap-0.5 pt-1 pb-1 text-[10px] font-medium transition-colors',
        isActive ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      {children}
      <span className={cn('font-medium', isActive && 'font-semibold')}>{label}</span>
    </button>
  );
};
