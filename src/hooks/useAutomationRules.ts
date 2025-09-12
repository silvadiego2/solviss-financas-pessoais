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

export const useAutomationRules = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchRules = async (): Promise<AutomationRule[]> => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Erro ao buscar regras:', error);
      throw error;
    }
    
    // Type cast to ensure compatibility
    return (data || []).map(rule => ({
      ...rule,
      conditions: rule.conditions as unknown as RuleCondition[],
      actions: rule.actions as unknown as RuleAction[],
      rule_type: rule.rule_type as 'categorization' | 'recurring' | 'budget' | 'alert'
    }));
  };

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ['automation_rules', user?.id],
    queryFn: fetchRules,
    enabled: !!user,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: CreateRuleInput) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('automation_rules')
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
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Regra criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar regra:', error);
      toast.error('Erro ao criar regra');
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AutomationRule> & { id: string }) => {
      const updateData = {
        ...updates,
        conditions: updates.conditions as any,
        actions: updates.actions as any,
      };

      const { data, error } = await supabase
        .from('automation_rules')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Regra atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar regra:', error);
      toast.error('Erro ao atualizar regra');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Regra excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar regra:', error);
      toast.error('Erro ao deletar regra');
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const rule = rules.find(r => r.id === id);
      if (!rule) throw new Error('Regra não encontrada');

      const { data, error } = await supabase
        .from('automation_rules')
        .update({ enabled: !rule.enabled })
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Regra atualizada!');
    },
    onError: (error) => {
      console.error('Erro ao alterar regra:', error);
      toast.error('Erro ao alterar regra');
    },
  });

  return {
    rules,
    loading: isLoading,
    createRule: createRuleMutation.mutate,
    updateRule: updateRuleMutation.mutate,
    deleteRule: deleteRuleMutation.mutate,
    toggleRule: toggleRuleMutation.mutate,
    isCreating: createRuleMutation.isPending,
    isUpdating: updateRuleMutation.isPending,
    isDeleting: deleteRuleMutation.isPending,
    isToggling: toggleRuleMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['automation_rules'] }),
  };
};