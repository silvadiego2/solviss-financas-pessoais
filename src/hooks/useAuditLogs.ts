import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface AuditLog {
  id: string;
  user_id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

const isSchemaError = (err: any) =>
  err?.message?.includes('does not exist') ||
  err?.message?.includes('relation') ||
  err?.code === '42P01';

export const useAuditLogs = () => {
  const { user } = useAuth();

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', user?.id],
    queryFn: async (): Promise<AuditLog[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        // Tabela pode não existir — retorna vazio silenciosamente
        if (isSchemaError(error)) return [];
        console.error('Erro ao buscar audit logs:', error);
        return [];
      }
      return (data ?? []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        table_name: log.table_name,
        operation: log.operation as AuditLog['operation'],
        old_data: log.old_data,
        new_data: log.new_data,
        ip_address: log.ip_address as string | undefined,
        user_agent: log.user_agent as string | undefined,
        created_at: log.created_at,
      }));
    },
    enabled: !!user,
    retry: (count, err: any) => !isSchemaError(err) && count < 2,
    staleTime: 2 * 60 * 1000,
  });

  return { auditLogs, loading: isLoading };
};
