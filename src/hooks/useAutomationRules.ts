import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface RuleCondition {
  field: 'description' | 'amount' | 'merchant' | 'day_of_month' | 'category';
  operator: 'contains' | 'equals' | 'greater_than' | 'less_than' | 'starts_with' | 'ends_with';
  value: string | number;
}

export interface RuleAction {
  type: 'set_category' | 'set_recurring' | 'send_alert' | 'apply_tag';
  value: string;
}

export interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  enabled: boolean;
  rule_type: 'categorization' | 'recurring' | 'budget' | 'alert';
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  times_triggered: number;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRuleInput {
  name: string;
  rule_type: 'categorization' | 'recurring' | 'budget' | 'alert';
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority?: number;
  enabled?: boolean;
}

const TABLE = 'automation_rules';

const isSchemaError = (err: any) =>
  err?.message?.includes('does not exist') ||
  err?.message?.includes('relation') ||
  err?.code === '42P01';

export const useAutomationRules = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: [TABLE, user?.id],
    queryFn: async (): Promise<AutomationRule[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true });
      // Tabela pode não existir ainda — retorna vazio silenciosamente
      if (error) {
        if (isSchemaError(error)) return [];
        console.error('Erro ao buscar regras:', error);
        throw error;
      }
      return (data ?? []).map(r => ({
        ...r,
        conditions: r.conditions as unknown as RuleCondition[],
        actions: r.actions as unknown as RuleAction[],
        rule_type: r.rule_type as AutomationRule['rule_type'],
      }));
    },
    enabled: !!user,
    retry: (count, err: any) => !isSchemaError(err) && count < 2,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: CreateRuleInput) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          ...ruleData,
          user_id: user.id,
          enabled: ruleData.enabled ?? true,
          priority: ruleData.priority ?? 1,
          conditions: ruleData.conditions as any,
          actions: ruleData.actions as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast.success('Regra criada com sucesso!');
    },
    onError: (err: any) => {
      if (isSchemaError(err)) {
        toast.error('Funcionalidade de automação ainda não disponível.');
      } else {
        toast.error('Erro ao criar regra');
      }
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AutomationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update({ ...updates, conditions: updates.conditions as any, actions: updates.actions as any })
        .eq('id', id)
        .eq('user_id', user?.id ?? '')
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast.success('Regra atualizada!');
    },
    onError: (err: any) => toast.error(isSchemaError(err) ? 'Funcionalidade indisponível.' : 'Erro ao atualizar regra'),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id ?? '');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast.success('Regra excluída!');
    },
    onError: (err: any) => toast.error(isSchemaError(err) ? 'Funcionalidade indisponível.' : 'Erro ao excluir regra'),
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const rule = rules.find(r => r.id === id);
      if (!rule) throw new Error('Regra não encontrada');
      const { data, error } = await supabase
        .from(TABLE)
        .update({ enabled: !rule.enabled })
        .eq('id', id)
        .eq('user_id', user?.id ?? '')
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast.success('Regra atualizada!');
    },
    onError: (err: any) => toast.error(isSchemaError(err) ? 'Funcionalidade indisponível.' : 'Erro ao alterar regra'),
  });

  return {
    rules,
    loading: isLoading,
    error: isSchemaError(error) ? null : error, // não expõe erro de schema
    tableExists: !isSchemaError(error),
    createRule: createRuleMutation.mutate,
    updateRule: updateRuleMutation.mutate,
    deleteRule: deleteRuleMutation.mutate,
    toggleRule: toggleRuleMutation.mutate,
    isCreating: createRuleMutation.isPending,
    isUpdating: updateRuleMutation.isPending,
    isDeleting: deleteRuleMutation.isPending,
    isToggling: toggleRuleMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: [TABLE] }),
  };
};
