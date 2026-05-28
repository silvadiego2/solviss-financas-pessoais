import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BackHeader } from '@/components/layout/BackHeader';
import { Bell, Calendar, DollarSign, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationRule {
  id: string;
  type: 'budget_alert' | 'bill_reminder' | 'goal_deadline' | 'spending_alert';
  title: string;
  enabled: boolean;
  threshold?: number;
  days?: number;
  time?: string;
}

interface NotificationManagerProps {
  onBack?: () => void;
}

const STORAGE_KEY = 'solviss_notification_rules';

const DEFAULT_RULES: NotificationRule[] = [
  { id: '1', type: 'budget_alert', title: 'Alerta de Orçamento (80%)', enabled: true, threshold: 80 },
  { id: '2', type: 'bill_reminder', title: 'Lembrete de Contas', enabled: true, days: 3, time: '09:00' },
  { id: '3', type: 'goal_deadline', title: 'Prazo de Metas', enabled: false, days: 7 },
  { id: '4', type: 'spending_alert', title: 'Gastos Excessivos', enabled: true, threshold: 500 },
];

export const NotificationManager: React.FC<NotificationManagerProps> = ({ onBack }) => {
  const [rules, setRules] = useState<NotificationRule[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_RULES;
    } catch {
      return DEFAULT_RULES;
    }
  });
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rules)); } catch {}
  }, [rules]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Seu navegador não suporta notificações');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      toast.success('Notificações ativadas!');
    } else {
      toast.error('Permissão de notificação negada');
    }
  };

  const sendTestNotification = () => {
    if (permission !== 'granted') {
      toast.error('Ative as notificações primeiro');
      return;
    }
    new Notification('Solviss Finanças', {
      body: 'Notificações funcionando corretamente! 🎉',
      icon: '/favicon.ico',
    });
    toast.success('Notificação de teste enviada!');
  };

  const sendBudgetAlert = useCallback((categoryName: string, percent: number) => {
    if (permission !== 'granted') return;
    new Notification('⚠️ Alerta de Orçamento — Solviss', {
      body: `${categoryName}: ${percent.toFixed(0)}% do orçamento utilizado.`,
      icon: '/favicon.ico',
    });
  }, [permission]);

  const sendBillReminder = useCallback((description: string, dueDate: string) => {
    if (permission !== 'granted') return;
    new Notification('📅 Conta a Vencer — Solviss', {
      body: `${description} vence em ${dueDate}.`,
      icon: '/favicon.ico',
    });
  }, [permission]);

  const toggleRule = (id: string) =>
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));

  const updateRule = (id: string, patch: Partial<NotificationRule>) =>
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const getIcon = (type: string) => {
    switch (type) {
      case 'budget_alert': return <DollarSign className="w-4 h-4" />;
      case 'bill_reminder': return <Calendar className="w-4 h-4" />;
      case 'goal_deadline': return <Target className="w-4 h-4" />;
      case 'spending_alert': return <AlertTriangle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const permissionGranted = permission === 'granted';

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Gerenciar Notificações" onBack={onBack} />}

      {!onBack && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground">Configure alertas e lembretes inteligentes</p>
        </div>
      )}

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Status das Permissões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificações do Navegador</p>
              <p className="text-sm text-muted-foreground">
                {permissionGranted ? 'Ativadas e funcionando' : permission === 'denied' ? 'Bloqueadas pelo navegador' : 'Aguardando permissão'}
              </p>
            </div>
            <Badge variant={permissionGranted ? 'default' : 'secondary'} className="flex items-center gap-1">
              {permissionGranted && <CheckCircle2 className="w-3 h-3" />}
              {permissionGranted ? 'Ativo' : permission === 'denied' ? 'Bloqueado' : 'Inativo'}
            </Badge>
          </div>

          {!permissionGranted && permission !== 'denied' && (
            <Button onClick={requestPermission} className="w-full">
              <Bell className="w-4 h-4 mr-2" /> Ativar Notificações
            </Button>
          )}

          {permission === 'denied' && (
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              As notificações estão bloqueadas. Para ativar, vá nas configurações do seu navegador e permita notificações para este site.
            </p>
          )}

          {permissionGranted && (
            <Button variant="outline" onClick={sendTestNotification} className="w-full">
              Enviar Notificação de Teste
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Regras */}
      <div className="space-y-3">
        {rules.map(rule => (
          <Card key={rule.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getIcon(rule.type)}
                  <div>
                    <p className="text-sm font-medium">{rule.title}</p>
                  </div>
                </div>
                <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
              </div>
            </CardHeader>

            {rule.enabled && (
              <CardContent className="space-y-3 pt-0">
                {rule.threshold !== undefined && (
                  <div className="space-y-1">
                    <Label className="text-xs">Limite ({rule.type === 'budget_alert' ? '%' : 'R$'})</Label>
                    <Input
                      type="number"
                      value={rule.threshold}
                      onChange={e => updateRule(rule.id, { threshold: Number(e.target.value) })}
                    />
                  </div>
                )}
                {rule.days !== undefined && (
                  <div className="space-y-1">
                    <Label className="text-xs">Dias de antecedência</Label>
                    <Input
                      type="number"
                      value={rule.days}
                      onChange={e => updateRule(rule.id, { days: Number(e.target.value) })}
                    />
                  </div>
                )}
                {rule.time !== undefined && (
                  <div className="space-y-1">
                    <Label className="text-xs">Horário</Label>
                    <Input
                      type="time"
                      value={rule.time}
                      onChange={e => updateRule(rule.id, { time: e.target.value })}
                    />
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
