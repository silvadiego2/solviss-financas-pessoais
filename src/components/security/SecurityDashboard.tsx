import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BackHeader } from '@/components/layout/BackHeader';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Shield, Activity, User, Clock, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SecurityDashboardProps {
  onBack?: () => void;
}

const operationConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  INSERT: { label: 'Criado', icon: Plus, color: 'text-green-600' },
  UPDATE: { label: 'Atualizado', icon: Edit, color: 'text-blue-600' },
  DELETE: { label: 'Removido', icon: Trash2, color: 'text-red-600' },
  SELECT: { label: 'Consultado', icon: Eye, color: 'text-muted-foreground' },
};

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { auditLogs, loading } = useAuditLogs();

  const recentLogs = auditLogs.slice(0, 10);
  const todayLogs = auditLogs.filter(log => {
    const logDate = new Date(log.created_at);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  const operationCounts = auditLogs.reduce((acc, log) => {
    acc[log.operation] = (acc[log.operation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lastActivity = auditLogs[0]?.created_at;

  return (
    <div className="space-y-6">
      <BackHeader
        title="Dashboard de Segurança"
        subtitle="Monitoramento de atividades e logs de auditoria"
        icon={<Shield className="h-6 w-6" />}
        onBack={onBack}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{todayLogs.length}</p>
                <p className="text-xs text-muted-foreground">Ações hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{auditLogs.length}</p>
                <p className="text-xs text-muted-foreground">Total de logs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="default" className="text-xs">Ativo</Badge>
          </div>
          {lastActivity && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Última atividade</span>
              <span className="font-medium">
                {format(new Date(lastActivity), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operation Summary */}
      {Object.keys(operationCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo de Operações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(operationCounts).map(([op, count]) => {
              const config = operationConfig[op];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <div key={op} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className="text-sm">{config.label}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => {
                const config = operationConfig[log.operation];
                const Icon = config?.icon || Activity;
                return (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${config?.color || 'text-muted-foreground'}`} />
                      <div>
                        <p className="text-sm font-medium capitalize">{log.table_name}</p>
                        <p className="text-xs text-muted-foreground">{config?.label || log.operation}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
