import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BackHeader } from '@/components/layout/BackHeader';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Bell, Calendar, DollarSign, Target, AlertTriangle } from 'lucide-react';
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

export const NotificationManager: React.FC<NotificationManagerProps> = ({ onBack }) => {
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([
    {
      id: '1',
      type: 'budget_alert',
      title: 'Alerta de Orçamento (80%)',
      enabled: true,
      threshold: 80,
    },
    {
      id: '2',
      type: 'bill_reminder',
      title: 'Lembrete de Contas',
      enabled: true,
      days: 3,
      time: '09:00',
    },
    {
      id: '3',
      type: 'goal_deadline',
      title: 'Prazo de Metas',
      enabled: false,
      days: 7,
    },
    {
      id: '4',
      type: 'spending_alert',
      title: 'Gastos Excessivos',
      enabled: true,
      threshold: 500,
    },
  ]);

  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    try {
      const permission = await LocalNotifications.checkPermissions();
      setPermissionGranted(permission.display === 'granted');
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };

  const requestPermission = async () => {
    try {
      const permission = await LocalNotifications.requestPermissions();
      setPermissionGranted(permission.display === 'granted');
      
      if (permission.display === 'granted') {
        toast.success('Permissões de notificação concedidas!');
      } else {
        toast.error('Permissões de notificação negadas');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast.error('Erro ao solicitar permissões');
    }
  };

  const toggleRule = (ruleId: string) => {
    setNotificationRules(rules =>
      rules.map(rule =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  const updateRuleThreshold = (ruleId: string, threshold: number) => {
    setNotificationRules(rules =>
      rules.map(rule =>
        rule.id === ruleId ? { ...rule, threshold } : rule
      )
    );
  };

  const updateRuleDays = (ruleId: string, days: number) => {
    setNotificationRules(rules =>
      rules.map(rule =>
        rule.id === ruleId ? { ...rule, days } : rule
      )
    );
  };

  const updateRuleTime = (ruleId: string, time: string) => {
    setNotificationRules(rules =>
      rules.map(rule =>
        rule.id === ruleId ? { ...rule, time } : rule
      )
    );
  };

  const sendTestNotification = async () => {
    if (!permissionGranted) {
      toast.error('Permissões de notificação necessárias');
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'ExpensePilot Go',
            body: 'Esta é uma notificação de teste!',
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 2000) },
          },
        ],
      });
      toast.success('Notificação de teste enviada!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Erro ao enviar notificação de teste');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'budget_alert':
        return <DollarSign className="w-4 h-4" />;
      case 'bill_reminder':
        return <Calendar className="w-4 h-4" />;
      case 'goal_deadline':
        return <Target className="w-4 h-4" />;
      case 'spending_alert':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'budget_alert':
        return 'Orçamento';
      case 'bill_reminder':
        return 'Contas';
      case 'goal_deadline':
        return 'Metas';
      case 'spending_alert':
        return 'Gastos';
      default:
        return 'Geral';
    }
  };

  return (
    <div className="space-y-4">
      {onBack && <BackHeader title="Gerenciar Notificações" onBack={onBack} />}
      
      {!onBack && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground">Configure alertas e lembretes inteligentes</p>
        </div>
      )}

      {/* Permission Status */}
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
              <p className="font-medium">Notificações Push</p>
              <p className="text-sm text-muted-foreground">
                {permissionGranted ? 'Ativadas' : 'Desativadas'}
              </p>
            </div>
            <Badge variant={permissionGranted ? 'default' : 'secondary'}>
              {permissionGranted ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          
          {!permissionGranted && (
            <Button onClick={requestPermission} className="w-full">
              Ativar Notificações
            </Button>
          )}
          
          {permissionGranted && (
            <Button variant="outline" onClick={sendTestNotification} className="w-full">
              Enviar Teste
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Notification Rules */}
      <div className="space-y-4">
        {notificationRules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getIcon(rule.type)}
                  <div>
                    <CardTitle className="text-base">{rule.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(rule.type)}
                    </Badge>
                  </div>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => toggleRule(rule.id)}
                />
              </div>
            </CardHeader>
            
            {rule.enabled && (
              <CardContent className="space-y-4 pt-0">
                {rule.threshold !== undefined && (
                  <div className="space-y-2">
                    <Label htmlFor={`threshold-${rule.id}`}>
                      Limite ({rule.type === 'budget_alert' ? '%' : 'R$'})
                    </Label>
                    <Input
                      id={`threshold-${rule.id}`}
                      type="number"
                      value={rule.threshold}
                      onChange={(e) => updateRuleThreshold(rule.id, Number(e.target.value))}
                      placeholder="Digite o valor limite"
                    />
                  </div>
                )}
                
                {rule.days !== undefined && (
                  <div className="space-y-2">
                    <Label htmlFor={`days-${rule.id}`}>Dias de Antecedência</Label>
                    <Input
                      id={`days-${rule.id}`}
                      type="number"
                      value={rule.days}
                      onChange={(e) => updateRuleDays(rule.id, Number(e.target.value))}
                      placeholder="Número de dias"
                    />
                  </div>
                )}
                
                {rule.time !== undefined && (
                  <div className="space-y-2">
                    <Label htmlFor={`time-${rule.id}`}>Horário</Label>
                    <Input
                      id={`time-${rule.id}`}
                      type="time"
                      value={rule.time}
                      onChange={(e) => updateRuleTime(rule.id, e.target.value)}
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