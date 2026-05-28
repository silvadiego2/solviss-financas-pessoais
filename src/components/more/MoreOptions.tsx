import React from 'react';
import {
  Download, Upload, Tags, User, Building, ChevronRight,
  Shield, Cloud, TrendingUp, Zap, Database, Trash2, BarChart3,
  Settings, Copy, Sparkles, CalendarClock, Bell, CalendarRange,
  ScanLine, Brain, CreditCard, Target, Repeat, TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoreOptionsProps {
  onNavigate: (tab: string) => void;
}

interface MenuItem {
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  highlight?: boolean;
  destructive?: boolean;
  badge?: string;
}

const Section: React.FC<{ title: string; items: MenuItem[] }> = ({ title, items }) => (
  <section className="space-y-1">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-1 mb-2">
      {title}
    </p>
    <div className="grid grid-cols-1 gap-1">
      {items.map((item) => (
        <button
          key={item.title}
          onClick={item.action}
          className={cn(
            'flex items-center gap-3 w-full rounded-xl px-4 py-3 text-left transition-all group',
            item.destructive
              ? 'hover:bg-destructive/8 text-destructive'
              : item.highlight
              ? 'bg-primary/5 border border-primary/20 hover:bg-primary/10'
              : 'hover:bg-accent'
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
                'text-sm font-medium',
                item.destructive ? 'text-destructive' : 'text-foreground'
              )}>
                {item.title}
              </span>
              {item.badge && (
                <span className="text-[10px] font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
          </div>
          <ChevronRight size={15} className="text-muted-foreground/50 flex-shrink-0 group-hover:text-muted-foreground transition-colors" />
        </button>
      ))}
    </div>
  </section>
);

export const MoreOptions: React.FC<MoreOptionsProps> = ({ onNavigate }) => {
  const financeItems: MenuItem[] = [
    {
      title: 'Agenda Financeira',
      description: 'Contas a pagar e a receber',
      icon: CalendarClock,
      action: () => onNavigate('agenda'),
      highlight: true,
    },
    {
      title: 'Orçamentos Mensais',
      description: 'Limites de gasto por categoria',
      icon: CalendarRange,
      action: () => onNavigate('budgets-list'),
    },
    {
      title: 'Cartões de Crédito',
      description: 'Faturas e limites',
      icon: CreditCard,
      action: () => onNavigate('cards'),
    },
    {
      title: 'Metas Financeiras',
      description: 'Acompanhar objetivos de poupança',
      icon: Target,
      action: () => onNavigate('goals'),
    },
    {
      title: 'Transações Recorrentes',
      description: 'Assinaturas e cobranças fixas',
      icon: Repeat,
      action: () => onNavigate('recurring-transactions'),
    },
    {
      title: 'Fluxo de Caixa',
      description: 'Projeção de entradas e saídas',
      icon: TrendingUp,
      action: () => onNavigate('cash-flow'),
    },
  ];

  const analyticItems: MenuItem[] = [
    {
      title: 'Inteligência Financeira',
      description: 'Insights e previsões por IA',
      icon: Brain,
      action: () => onNavigate('intelligence'),
      badge: 'IA',
    },
    {
      title: 'Central de Analytics',
      description: 'Analytics avançados',
      icon: BarChart3,
      action: () => onNavigate('analytics'),
    },
    {
      title: 'Categorização Automática',
      description: 'Classificação por IA',
      icon: Sparkles,
      action: () => onNavigate('auto-categorization'),
      badge: 'IA',
    },
    {
      title: 'Automação Financeira',
      description: 'Regras automáticas',
      icon: Zap,
      action: () => onNavigate('auto-rules'),
    },
    {
      title: 'Detector de Duplicatas',
      description: 'Identificar lançamentos repetidos',
      icon: Copy,
      action: () => onNavigate('duplicate-detection'),
    },
  ];

  const dataItems: MenuItem[] = [
    {
      title: 'Contas Bancárias',
      description: 'Gerenciar contas e saldos',
      icon: Building,
      action: () => onNavigate('accounts'),
    },
    {
      title: 'Gerenciar Categorias',
      description: 'Criar e editar categorias',
      icon: Tags,
      action: () => onNavigate('categories'),
    },
    {
      title: 'Scanner de Recibos',
      description: 'Escanear comprovantes',
      icon: ScanLine,
      action: () => onNavigate('receipt-scanner'),
    },
    {
      title: 'Importar Transações',
      description: 'Importar de CSV ou Excel',
      icon: Upload,
      action: () => onNavigate('import-transactions'),
    },
    {
      title: 'Exportar Relatórios',
      description: 'Baixar dados financeiros',
      icon: Download,
      action: () => onNavigate('export'),
    },
    {
      title: 'Backup Automático',
      description: 'Configurar backup na nuvem',
      icon: Cloud,
      action: () => onNavigate('auto-backup'),
    },
  ];

  const accountItems: MenuItem[] = [
    {
      title: 'Perfil do Usuário',
      description: 'Editar informações pessoais',
      icon: User,
      action: () => onNavigate('profile'),
    },
    {
      title: 'Configurações',
      description: 'Tema, moeda, notificações',
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
      title: 'Segurança e Auditoria',
      description: 'Log de atividades e sessões',
      icon: Shield,
      action: () => onNavigate('security'),
    },
    {
      title: 'Planos e Assinatura',
      description: 'Ver planos premium disponíveis',
      icon: TrendingDown,
      action: () => onNavigate('plans'),
    },
    {
      title: 'Dados de Demonstração',
      description: 'Criar dados de exemplo',
      icon: Database,
      action: () => onNavigate('demo-data'),
    },
    {
      title: 'Limpar Todos os Dados',
      description: 'Remover todos os dados (irreversível)',
      icon: Trash2,
      action: () => onNavigate('data-reset'),
      destructive: true,
    },
  ];

  return (
    <div className="space-y-8 pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mais opções</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie todas as funções do Solviss</p>
      </div>

      <Section title="Finanças" items={financeItems} />
      <Section title="Análise & Automação" items={analyticItems} />
      <Section title="Dados & Importação" items={dataItems} />
      <Section title="Conta" items={accountItems} />
    </div>
  );
};
