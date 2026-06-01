import React from 'react';
import {
  Download, Upload, Tags, User, Building, ChevronRight,
  Shield, Cloud, Zap, Database, Trash2, BarChart3,
  Settings, Copy, Sparkles, Bell, CalendarRange,
  ScanLine, Brain, LogOut, Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface MoreOptionsProps {
  onNavigate: (tab: string) => void;
}

interface MenuItem {
  title: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  highlight?: boolean;
  destructive?: boolean;
  badge?: string;
  disabled?: boolean;
}

// ──────────────────────────────────────────────
// Row simples: ícone + texto + seta
// ──────────────────────────────────────────────
const Row: React.FC<MenuItem> = (item) => (
  <button
    onClick={item.disabled ? undefined : item.action}
    disabled={item.disabled}
    className={cn(
      'flex items-center gap-3 w-full rounded-xl px-4 py-3.5 text-left transition-all group',
      item.disabled && 'opacity-40 cursor-not-allowed',
      item.destructive
        ? 'hover:bg-destructive/8 active:bg-destructive/12'
        : item.highlight
        ? 'bg-primary/5 border border-primary/20 hover:bg-primary/10 active:bg-primary/15'
        : 'hover:bg-accent active:bg-accent/80'
    )}
  >
    <div className={cn(
      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
      item.destructive
        ? 'bg-destructive/10 text-destructive'
        : item.highlight
        ? 'bg-primary/15 text-primary'
        : 'bg-muted text-muted-foreground group-hover:bg-accent-foreground/10 group-hover:text-foreground'
    )}>
      <item.icon size={17} />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className={cn(
          'text-sm font-medium leading-snug',
          item.destructive ? 'text-destructive' : 'text-foreground'
        )}>
          {item.title}
        </span>
        {item.badge && (
          <span className="text-[10px] font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full leading-none">
            {item.badge}
          </span>
        )}
      </div>
      {item.description && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
      )}
    </div>

    {!item.destructive && (
      <ChevronRight size={15} className="text-muted-foreground/40 flex-shrink-0 group-hover:text-muted-foreground transition-colors" />
    )}
  </button>
);

// ──────────────────────────────────────────────
// Grupo com título de seção
// ──────────────────────────────────────────────
const Group: React.FC<{ title: string; items: MenuItem[] }> = ({ title, items }) => (
  <section>
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1 mb-1.5">
      {title}
    </p>
    <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
      {items.map((item) => (
        <Row key={item.title} {...item} />
      ))}
    </div>
  </section>
);

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────
export const MoreOptions: React.FC<MoreOptionsProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const displayEmail = user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  // ── Grupos ──────────────────────────────────

  const financeItems: MenuItem[] = [
    {
      title: 'Orçamentos Mensais',
      description: 'Limites de gasto por categoria',
      icon: CalendarRange,
      action: () => onNavigate('budgets-list'),
    },
    {
      title: 'Contas Bancárias',
      description: 'Gerenciar contas e saldos',
      icon: Building,
      action: () => onNavigate('accounts'),
    },
    {
      title: 'Categorias',
      description: 'Criar e editar categorias',
      icon: Tags,
      action: () => onNavigate('categories'),
    },
  ];

  const toolsItems: MenuItem[] = [
    {
      title: 'Analytics Avançado',
      description: 'Gráficos e indicadores detalhados',
      icon: BarChart3,
      action: () => onNavigate('analytics'),
    },
    {
      title: 'Categorização por IA',
      description: 'Classificação automática de gastos',
      icon: Sparkles,
      action: () => onNavigate('auto-categorization'),
      badge: 'IA',
    },
    {
      title: 'Automação de Regras',
      description: 'Ações automáticas em transações',
      icon: Zap,
      action: () => onNavigate('auto-rules'),
    },
    {
      title: 'Detector de Duplicatas',
      description: 'Identificar lançamentos repetidos',
      icon: Copy,
      action: () => onNavigate('duplicate-detection'),
    },
    {
      title: 'Scanner de Recibos',
      description: 'Escanear comprovantes por foto',
      icon: ScanLine,
      action: () => onNavigate('receipt-scanner'),
    },
  ];

  const dataItems: MenuItem[] = [
    {
      title: 'Importar Transações',
      description: 'CSV ou Excel',
      icon: Upload,
      action: () => onNavigate('import-transactions'),
    },
    {
      title: 'Exportar Relatórios',
      description: 'Baixar dados em planilha ou PDF',
      icon: Download,
      action: () => onNavigate('export'),
    },
    {
      title: 'Backup Automático',
      description: 'Sincronização na nuvem',
      icon: Cloud,
      action: () => onNavigate('auto-backup'),
    },
  ];

  const settingsItems: MenuItem[] = [
    {
      title: 'Configurações',
      description: 'Tema, moeda e preferências',
      icon: Settings,
      action: () => onNavigate('settings'),
    },
    {
      title: 'Notificações',
      description: 'Alertas de vencimento e orçamento',
      icon: Bell,
      action: () => onNavigate('notifications'),
    },
    {
      title: 'Segurança',
      description: 'Log de atividades e sessões ativas',
      icon: Shield,
      action: () => onNavigate('security'),
    },
    {
      title: 'Planos e Assinatura',
      description: 'Recursos premium disponíveis',
      icon: Crown,
      action: () => onNavigate('plans'),
    },
  ];

  const dangerItems: MenuItem[] = [
    {
      title: 'Dados de Demonstração',
      description: 'Preencher conta com dados de exemplo',
      icon: Database,
      action: () => onNavigate('demo-data'),
    },
    {
      title: 'Limpar Todos os Dados',
      description: 'Remove todas as transações (irreversível)',
      icon: Trash2,
      action: () => onNavigate('data-reset'),
      destructive: true,
    },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* ── Cabeçalho de perfil ── */}
      <button
        onClick={() => onNavigate('profile')}
        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:bg-accent active:bg-accent/80 transition-all text-left group"
      >
        <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-bold flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm leading-tight truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{displayEmail}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary font-medium flex-shrink-0 group-hover:underline">
          Editar perfil
          <ChevronRight size={14} />
        </div>
      </button>

      {/* ── Seções ── */}
      <Group title="Finanças" items={financeItems} />
      <Group title="Ferramentas" items={toolsItems} />
      <Group title="Dados" items={dataItems} />
      <Group title="Configurações" items={settingsItems} />
      <Group title="Avançado" items={dangerItems} />

      {/* ── Sair ── */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/8 active:bg-destructive/12 transition-all"
      >
        <LogOut size={16} />
        Sair da conta
      </button>

    </div>
  );
};
