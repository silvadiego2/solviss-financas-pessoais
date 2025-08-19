import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Shield, Eye, Plus, Edit, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getOperationIcon = (operation: string) => {
  switch (operation) {
    case 'INSERT':
      return <Plus className="h-4 w-4" />;
    case 'UPDATE':
      return <Edit className="h-4 w-4" />;
    case 'DELETE':
      return <Trash className="h-4 w-4" />;
    default:
      return <Eye className="h-4 w-4" />;
  }
};

const getOperationColor = (operation: string) => {
  switch (operation) {
    case 'INSERT':
      return 'bg-success text-success-foreground';
    case 'UPDATE':
      return 'bg-warning text-warning-foreground';
    case 'DELETE':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getTableDisplayName = (tableName: string) => {
  const tableNames: Record<string, string> = {
    transactions: 'Transações',
    accounts: 'Contas',
    budgets: 'Orçamentos',
    goals: 'Metas',
    categories: 'Categorias',
  };
  return tableNames[tableName] || tableName;
};

export const AuditLogViewer = () => {
  const { auditLogs, loading } = useAuditLogs();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Log de Auditoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Log de Auditoria
          <Badge variant="secondary" className="ml-auto">
            {auditLogs.length} registros
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log de auditoria encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className={`p-2 rounded-full ${getOperationColor(log.operation)}`}>
                    {getOperationIcon(log.operation)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {getTableDisplayName(log.table_name)}
                      </Badge>
                      <Badge className={`text-xs ${getOperationColor(log.operation)}`}>
                        {log.operation}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {format(new Date(log.created_at), "dd 'de' MMMM 'às' HH:mm", { 
                        locale: ptBR 
                      })}
                    </p>
                    {log.ip_address && (
                      <p className="text-xs text-muted-foreground">
                        IP: {log.ip_address}
                      </p>
                    )}
                    {log.new_data && log.operation === 'INSERT' && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Ver dados inseridos
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(log.new_data, null, 2)}
                        </pre>
                      </details>
                    )}
                    {log.old_data && log.new_data && log.operation === 'UPDATE' && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Ver alterações
                        </summary>
                        <div className="text-xs bg-muted p-2 rounded mt-1 space-y-2">
                          <div>
                            <span className="font-medium">Antes:</span>
                            <pre className="overflow-auto">{JSON.stringify(log.old_data, null, 2)}</pre>
                          </div>
                          <div>
                            <span className="font-medium">Depois:</span>
                            <pre className="overflow-auto">{JSON.stringify(log.new_data, null, 2)}</pre>
                          </div>
                        </div>
                      </details>
                    )}
                    {log.old_data && log.operation === 'DELETE' && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Ver dados removidos
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(log.old_data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};