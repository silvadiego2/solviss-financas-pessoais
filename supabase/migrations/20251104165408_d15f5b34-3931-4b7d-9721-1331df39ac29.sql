-- Drop e recriar função de auditoria com validações estritas
DROP FUNCTION IF EXISTS public.create_audit_log(TEXT, TEXT, JSONB, JSONB, INET, TEXT);

CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_table_name TEXT,
  p_operation TEXT,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Whitelist de tabelas permitidas
  IF p_table_name NOT IN (
    'transactions', 'accounts', 'budgets', 'goals', 
    'categories', 'automation_rules', 'bank_connections', 
    'notifications', 'synced_transactions'
  ) THEN
    RAISE EXCEPTION 'Invalid table name for audit log: %', p_table_name;
  END IF;
  
  -- 2. Validar operação
  IF p_operation NOT IN ('INSERT', 'UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'Invalid operation type: %', p_operation;
  END IF;
  
  -- 3. Limitar tamanho JSONB (50KB)
  IF pg_column_size(p_old_data) > 51200 OR pg_column_size(p_new_data) > 51200 THEN
    RAISE EXCEPTION 'Audit data exceeds maximum size (50KB)';
  END IF;
  
  -- 4. Limitar user_agent
  IF p_user_agent IS NOT NULL AND LENGTH(p_user_agent) > 500 THEN
    p_user_agent := SUBSTRING(p_user_agent, 1, 500);
  END IF;
  
  -- 5. Inserir log de auditoria
  INSERT INTO public.audit_logs (
    user_id, table_name, operation, old_data, new_data, ip_address, user_agent
  ) VALUES (
    auth.uid(), p_table_name, p_operation, p_old_data, p_new_data, p_ip_address, p_user_agent
  );
END;
$$;

COMMENT ON FUNCTION public.create_audit_log IS 
'Função segura para criar logs de auditoria com validações estritas contra injection e DoS';