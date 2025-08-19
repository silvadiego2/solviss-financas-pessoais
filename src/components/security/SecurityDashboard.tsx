import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuditLogViewer } from './AuditLogViewer';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Shield, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const SecurityDashboard = () => {
  const { user } = useAuth();
  const { auditLogs, loading } = useAuditLogs();

  // Estatísticas de segurança
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
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Dashboard de Segurança</h1>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Todas as atividades registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Atividades de hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Atividade</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {lastActivity ? format(new Date(lastActivity), 'HH:mm', { locale: ptBR }) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastActivity ? format(new Date(lastActivity), "dd/MM", { locale: ptBR }) : 'Nenhuma atividade'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Shield className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-success">Seguro</div>
            <p className="text-xs text-muted-foreground">
              Sistema monitorado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumo de Operações */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Operações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(operationCounts).map(([operation, count]) => (
              <Badge key={operation} variant="outline" className="flex items-center gap-1">
                {operation}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Informações do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Sessão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">ID do Usuário:</span>
              <span className="text-sm font-mono">{user?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status da Conta:</span>
              <Badge variant="outline" className="text-success">
                Ativo
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log de Auditoria */}
      <AuditLogViewer />
    </div>
  );
};