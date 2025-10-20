import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BackHeader } from '@/components/layout/BackHeader';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, Settings, Shield, Lock, Cloud, 
  Trash2, Globe, Palette, AlertTriangle
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

interface SettingsScreenProps {
  onBack?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const [currency, setCurrency] = useState('BRL');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      '⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\n' +
      'Todos os seus dados serão permanentemente excluídos:\n' +
      '- Contas e cartões\n' +
      '- Transações\n' +
      '- Orçamentos e objetivos\n' +
      '- Configurações\n\n' +
      'Tem certeza que deseja excluir sua conta?'
    );
    
    if (confirmed) {
      // Lógica de exclusão aqui
      toast.error('Conta excluída com sucesso');
    }
  };

  return (
    <div className="space-y-6">
      {onBack && <BackHeader title="Configurações" onBack={onBack} />}
      
      {/* SEÇÃO: NOTIFICAÇÕES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell size={20} />
            Notificações Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications">Ativar notificações</Label>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
          <Button variant="outline" className="w-full">
            Gerenciar Notificações
          </Button>
        </CardContent>
      </Card>

      {/* SEÇÃO: PREFERÊNCIAS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings size={20} />
            Preferências
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Moeda Corrente</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Real Brasileiro (R$)</SelectItem>
                <SelectItem value="USD">Dólar Americano ($)</SelectItem>
                <SelectItem value="EUR">Euro (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Tema da Interface</Label>
              <p className="text-xs text-muted-foreground">
                {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
              </p>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              <Palette size={16} className="mr-2" />
              Alterar Tema
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO: SEGURANÇA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield size={20} />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {/* navegar para security dashboard */}}
          >
            <Shield size={16} className="mr-2" />
            Segurança e Auditoria
          </Button>
        </CardContent>
      </Card>

      {/* SEÇÃO: PRIVACIDADE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock size={20} />
            Privacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Seus dados são protegidos e criptografados.
          </p>
          <Button variant="outline" className="w-full">
            Ver Política de Privacidade
          </Button>
        </CardContent>
      </Card>

      {/* SEÇÃO: BACKUP */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud size={20} />
            Backup Automático
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {/* navegar para auto-backup */}}
          >
            Configurar Backup
          </Button>
        </CardContent>
      </Card>

      {/* SEÇÃO: EXCLUIR CONTA (PERIGOSO) */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleDeleteAccount}
          >
            <Trash2 size={16} className="mr-2" />
            Excluir Conta Permanentemente
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Esta ação não pode ser desfeita
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
