import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BackHeader } from '@/components/layout/BackHeader';
import {
  Bell, Palette, Shield, FileText, Trash2,
  AlertTriangle, ChevronRight, Moon, Sun,
  Download, Globe, Loader2,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface SettingsScreenProps {
  onBack?: () => void;
}

/* ─── Row primitives ───────────────────────────────────────────────────────── */

interface RowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

const Row: React.FC<RowProps> = ({ icon, label, description, right, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick && !right}
    className={[
      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
      onClick ? 'hover:bg-muted/50 active:bg-muted cursor-pointer' : 'cursor-default',
      danger ? 'text-destructive' : '',
    ].join(' ')}
  >
    <span className={`shrink-0 ${danger ? 'text-destructive' : 'text-muted-foreground'}`}>
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-medium leading-snug">{label}</span>
      {description && (
        <span className="block text-xs text-muted-foreground leading-snug mt-0.5">
          {description}
        </span>
      )}
    </span>
    {right ?? (onClick && <ChevronRight size={16} className="shrink-0 text-muted-foreground" />)}
  </button>
);

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <p className="px-4 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </p>
    <div className="rounded-xl border bg-card overflow-hidden divide-y divide-border">
      {children}
    </div>
  </section>
);

/* ─── Main component ───────────────────────────────────────────────────────── */

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const {
    prefs,
    loading,
    setCurrency,
    setNotifications,
    setBillReminders,
  } = useUserPreferences();

  const handleExport = () => {
    toast.info('Exportação iniciada — o arquivo será baixado em instantes.');
    // TODO: wire to real CSV export logic
  };

  return (
    <div className="space-y-1 pb-8">
      {onBack && <BackHeader title="Configurações" onBack={onBack} />}

      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Carregando preferências…</span>
        </div>
      )}

      {!loading && (
        <>
          {/* ── APARÊNCIA ──────────────────────────────────────────────────── */}
          <Group title="Aparência">
            <Row
              icon={theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              label="Tema"
              description={theme === 'dark' ? 'Escuro' : 'Claro'}
              right={
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                  aria-label="Alternar tema"
                />
              }
            />
            <Row
              icon={<Globe size={18} />}
              label="Moeda"
              description="Salvo no seu perfil"
              right={
                <Select value={prefs.currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-8 w-28 border-none shadow-none pr-1 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">R$ Real</SelectItem>
                    <SelectItem value="USD">$ Dólar</SelectItem>
                    <SelectItem value="EUR">€ Euro</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </Group>

          {/* ── NOTIFICAÇÕES ────────────────────────────────────────────────── */}
          <Group title="Notificações">
            <Row
              icon={<Bell size={18} />}
              label="Notificações gerais"
              description="Resumos e alertas do app"
              right={
                <Switch
                  checked={prefs.notifications}
                  onCheckedChange={setNotifications}
                  aria-label="Notificações gerais"
                />
              }
            />
            <Row
              icon={<Bell size={18} />}
              label="Lembrete de contas"
              description="Aviso 1 dia antes do vencimento"
              right={
                <Switch
                  checked={prefs.billReminders}
                  onCheckedChange={setBillReminders}
                  disabled={!prefs.notifications}
                  aria-label="Lembrete de contas"
                />
              }
            />
          </Group>

          {/* ── DADOS ───────────────────────────────────────────────────────── */}
          <Group title="Dados">
            <Row
              icon={<Download size={18} />}
              label="Exportar dados"
              description="Baixar transações em CSV"
              onClick={handleExport}
            />
          </Group>

          {/* ── SOBRE ───────────────────────────────────────────────────────── */}
          <Group title="Sobre">
            <Row
              icon={<Shield size={18} />}
              label="Segurança"
              description="Autenticação e sessões ativas"
              onClick={() => toast.info('Em breve: painel de segurança')}
            />
            <Row
              icon={<FileText size={18} />}
              label="Política de privacidade"
              onClick={() => toast.info('Abrindo política de privacidade…')}
            />
            <Row
              icon={<Palette size={18} />}
              label="Versão do app"
              right={<span className="text-xs text-muted-foreground">1.0.0</span>}
            />
          </Group>

          {/* ── ZONA DE PERIGO ───────────────────────────────────────────────── */}
          <Group title="Zona de perigo">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <span>
                  <Row
                    icon={<Trash2 size={18} />}
                    label="Excluir conta"
                    description="Remove todos os dados permanentemente"
                    danger
                    onClick={() => {}}
                  />
                </span>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle size={20} />
                    Excluir conta permanentemente?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos os seus dados serão removidos: contas, transações, orçamentos e objetivos.
                    <strong className="block mt-2 text-destructive">Esta ação não pode ser desfeita.</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() => toast.error('Conta excluída.')}
                  >
                    Excluir minha conta
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Group>
        </>
      )}
    </div>
  );
};
