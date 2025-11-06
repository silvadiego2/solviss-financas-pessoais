import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useDataReset = () => {
  const [isResetting, setIsResetting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const deleteAllUserData = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return { success: false };
    }

    setIsResetting(true);

    try {
      // Usar função atômica do banco de dados
      // Fase 4: Exclusão Atômica - Todas as deleções em uma transação única
      // @ts-ignore - A função RPC será reconhecida após regeneração dos tipos
      const { data, error } = await supabase.rpc('delete_user_data_atomic', {
        p_user_id: user.id
      });

      if (error) {
        throw new Error(error.message || 'Falha ao deletar dados');
      }

      if (!data) {
        throw new Error('Nenhum dado retornado da função de deleção');
      }

      // Parse do resultado (TypeScript não reconhece os tipos até regeneração)
      const result = data as any;

      // Invalidar todas as queries para forçar re-fetch
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['bank-connections'] });

      toast.success(
        `🎉 Todos os dados foram removidos com sucesso! ${result.total_records_deleted || 0} registros deletados.`,
        { duration: 5000 }
      );
      
      return { success: true };
      
    } catch (error: any) {
      console.error('Erro ao resetar dados:', error);
      toast.error(
        error.message || 'Erro ao limpar dados', 
        { description: 'Nenhum dado foi removido (rollback automático)', duration: 5000 }
      );
      return { success: false };
      
    } finally {
      setIsResetting(false);
    }
  };

  return {
    deleteAllUserData,
    isResetting
  };
};
