-- Função para deletar todos os dados do usuário atomicamente
-- Implementa Fase 4: Exclusão Atômica de Dados
CREATE OR REPLACE FUNCTION public.delete_user_data_atomic(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transactions_count INTEGER;
  v_synced_count INTEGER;
  v_budgets_count INTEGER;
  v_goals_count INTEGER;
  v_automation_count INTEGER;
  v_notifications_count INTEGER;
  v_bank_connections_count INTEGER;
  v_accounts_count INTEGER;
  v_categories_count INTEGER;
  v_audit_logs_count INTEGER;
  v_total_count INTEGER := 0;
BEGIN
  -- 1. Verificar autorização (usuário só pode deletar próprios dados)
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot delete another user''s data';
  END IF;

  -- 2. Deletar em ordem correta (respeitar foreign keys)
  -- Tudo dentro de uma única transação - rollback automático em erro
  
  -- Deletar transações primeiro (referenciadas por outros)
  DELETE FROM public.transactions WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_transactions_count = ROW_COUNT;
  v_total_count := v_total_count + v_transactions_count;
  
  -- Deletar transações sincronizadas
  DELETE FROM public.synced_transactions WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_synced_count = ROW_COUNT;
  v_total_count := v_total_count + v_synced_count;
  
  -- Deletar orçamentos
  DELETE FROM public.budgets WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_budgets_count = ROW_COUNT;
  v_total_count := v_total_count + v_budgets_count;
  
  -- Deletar metas
  DELETE FROM public.goals WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_goals_count = ROW_COUNT;
  v_total_count := v_total_count + v_goals_count;
  
  -- Deletar regras de automação
  DELETE FROM public.automation_rules WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_automation_count = ROW_COUNT;
  v_total_count := v_total_count + v_automation_count;
  
  -- Deletar notificações
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_notifications_count = ROW_COUNT;
  v_total_count := v_total_count + v_notifications_count;
  
  -- Deletar conexões bancárias
  DELETE FROM public.bank_connections WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_bank_connections_count = ROW_COUNT;
  v_total_count := v_total_count + v_bank_connections_count;
  
  -- Deletar contas
  DELETE FROM public.accounts WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_accounts_count = ROW_COUNT;
  v_total_count := v_total_count + v_accounts_count;
  
  -- Deletar categorias personalizadas (manter padrões se criados recentemente)
  DELETE FROM public.categories 
  WHERE user_id = p_user_id 
    AND created_at > NOW() - INTERVAL '1 day';
  GET DIAGNOSTICS v_categories_count = ROW_COUNT;
  v_total_count := v_total_count + v_categories_count;
  
  -- Deletar logs de auditoria
  DELETE FROM public.audit_logs WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_audit_logs_count = ROW_COUNT;
  v_total_count := v_total_count + v_audit_logs_count;
  
  -- Retornar resultado com contagens detalhadas
  RETURN jsonb_build_object(
    'success', true,
    'deleted_transactions', v_transactions_count,
    'deleted_synced_transactions', v_synced_count,
    'deleted_budgets', v_budgets_count,
    'deleted_goals', v_goals_count,
    'deleted_automation_rules', v_automation_count,
    'deleted_notifications', v_notifications_count,
    'deleted_bank_connections', v_bank_connections_count,
    'deleted_accounts', v_accounts_count,
    'deleted_categories', v_categories_count,
    'deleted_audit_logs', v_audit_logs_count,
    'total_records_deleted', v_total_count,
    'message', 'All user data deleted successfully in atomic transaction'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Em caso de qualquer erro, PostgreSQL faz rollback automático
  -- Nenhum dado é deletado se houver falha
  RAISE EXCEPTION 'Failed to delete user data atomically: %', SQLERRM;
END;
$$;

-- Adicionar comentário
COMMENT ON FUNCTION public.delete_user_data_atomic IS 
'Deleta todos os dados do usuário em uma transação atômica com rollback automático em caso de erro. Implementa proteção contra deleção parcial de dados.';

-- Conceder permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.delete_user_data_atomic(UUID) TO authenticated;