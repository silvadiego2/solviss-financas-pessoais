import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

const typeIcons = {
  budget_alert: AlertTriangle,
  bill_reminder: Calendar,
  goal_deadline: Target,
  spending_alert: DollarSign,
};

export const NotificationManager: React.FC<NotificationManagerProps> = ({ onBack }) => {
  const [rules, setRules] = useState<NotificationRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_RULES;
    } catch {
      return DEFAULT_RULES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    } catch {}
  }, [rules]);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const updateRule = (id: string, field: string, value: any) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const testNotification = (rule: NotificationRule) => {
    toast(rule.title, {
      description: 'Notificação de teste enviada com sucesso!',
      icon: '🔔',
    });
  };

  const enabledCount = rules.filter(r => r.enabled).length;

  return (
    <div className="space-y-6">
      <BackHeader
        title="Gerenciar Notificações"
        subtitle="Configure alertas e lembretes automáticos"
        icon={<Bell className="h-6 w-6" />}
        onBack={onBack}
      />

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{enabledCount} de {rules.length} notificações ativas</p>
              <p className="text-sm text-muted-foreground">Clique em uma regra para configurar</p>
            </div>
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      <div className="space-y-3">
        {rules.map(rule => {
          const Icon = typeIcons[rule.type];
          return (
            <Card key={rule.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <Icon className="h-4 w-4 mt-0.5 text-primary" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{rule.title}</Label>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRule(rule.id)}
                        />
                      </div>
                      {rule.enabled && (
                        <div className="space-y-2">
                          {rule.threshold !== undefined && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground w-20">Limite</Label>
                              <Input
                                type="number"
                                value={rule.threshold}
                                onChange={(e) => updateRule(rule.id, 'threshold', Number(e.target.value))}
                                className="h-7 text-sm"
                              />
                            </div>
                          )}
                          {rule.days !== undefined && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground w-20">Dias antes</Label>
                              <Input
                                type="number"
                                value={rule.days}
                                onChange={(e) => updateRule(rule.id, 'days', Number(e.target.value))}
                                className="h-7 text-sm"
                              />
                            </div>
                          )}
                          {rule.time !== undefined && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground w-20">Horário</Label>
                              <Input
                                type="time"
                                value={rule.time}
                                onChange={(e) => updateRule(rule.id, 'time', e.target.value)}
                                className="h-7 text-sm"
                              />
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => testNotification(rule)}
                          >
                            Testar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        As notificações dependem das permissões do dispositivo
      </p>
    </div>
  );
};
