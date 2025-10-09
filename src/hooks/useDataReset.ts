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
      // Ordem de deleção respeitando foreign keys
      const deletions = [
        // 1. Transações (tem FKs para contas/categorias)
        { table: 'transactions', name: 'Transações' },
        
        // 2. Transações sincronizadas
        { table: 'synced_transactions', name: 'Transações Sincronizadas' },
        
        // 3. Orçamentos (tem FK para categorias)
        { table: 'budgets', name: 'Orçamentos' },
        
        // 4. Metas financeiras
        { table: 'goals', name: 'Metas Financeiras' },
        
        // 5. Regras de automação
        { table: 'automation_rules', name: 'Regras de Automação' },
        
        // 6. Notificações
        { table: 'notifications', name: 'Notificações' },
        
        // 7. Conexões bancárias
        { table: 'bank_connections', name: 'Conexões Bancárias' },
        
        // 8. Contas e cartões
        { table: 'accounts', name: 'Contas e Cartões' },
        
        // 9. Categorias personalizadas (mantém as padrão criadas no signup)
        { table: 'categories', name: 'Categorias Personalizadas', where: "created_at > (auth.jwt() -> 'user_metadata' ->> 'created_at')::timestamptz + interval '1 minute'" },
      ];

      for (const deletion of deletions) {
        const { error } = await supabase
          .from(deletion.table as any)
          .delete()
          .eq('user_id', user.id);

        if (error) {
          console.error(`Erro ao deletar ${deletion.name}:`, error);
          throw new Error(`Falha ao deletar ${deletion.name}`);
        }

        toast.info(`✓ ${deletion.name} removido(a)`);
      }

      // Invalidar todas as queries para forçar re-fetch
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['bank-connections'] });

      toast.success('🎉 Todos os dados foram removidos com sucesso!');
      
      return { success: true };
      
    } catch (error: any) {
      console.error('Erro ao resetar dados:', error);
      toast.error(error.message || 'Erro ao limpar dados');
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
