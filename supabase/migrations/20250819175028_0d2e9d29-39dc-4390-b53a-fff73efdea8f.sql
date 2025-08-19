-- Corrigir search_path nas funções existentes para segurança
ALTER FUNCTION public.update_account_balance() SET search_path = public;
ALTER FUNCTION public.create_default_categories() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Criar tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS na tabela de audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para audit_logs - apenas o próprio usuário pode ver seus logs
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Função para criar logs de auditoria (SECURITY DEFINER para permitir inserção)
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
  INSERT INTO public.audit_logs (
    user_id, table_name, operation, old_data, new_data, ip_address, user_agent
  ) VALUES (
    auth.uid(), p_table_name, p_operation, p_old_data, p_new_data, p_ip_address, p_user_agent
  );
END;
$$;

-- Criar função para validar dados de entrada
CREATE OR REPLACE FUNCTION public.validate_financial_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Validar valores monetários
  IF TG_TABLE_NAME IN ('transactions', 'accounts', 'budgets', 'goals') THEN
    -- Verificar se valor é positivo onde necessário
    IF (TG_TABLE_NAME = 'transactions' AND NEW.amount <= 0) THEN
      RAISE EXCEPTION 'Valor da transação deve ser positivo';
    END IF;
    
    -- Limitar valores máximos para prevenir overflow
    IF (NEW.amount > 999999999.99) THEN
      RAISE EXCEPTION 'Valor muito alto (máximo: 999.999.999,99)';
    END IF;
  END IF;

  -- Validar datas
  IF TG_TABLE_NAME = 'transactions' AND NEW.date > CURRENT_DATE + INTERVAL '1 year' THEN
    RAISE EXCEPTION 'Data da transação não pode ser mais de 1 ano no futuro';
  END IF;

  -- Validar strings (sanitização básica)
  IF NEW.description IS NOT NULL THEN
    NEW.description = TRIM(NEW.description);
    IF LENGTH(NEW.description) = 0 THEN
      NEW.description = NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Aplicar trigger de validação nas tabelas principais
CREATE TRIGGER validate_transactions_trigger
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_data();

CREATE TRIGGER validate_accounts_trigger
  BEFORE INSERT OR UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_data();

CREATE TRIGGER validate_budgets_trigger
  BEFORE INSERT OR UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_data();

CREATE TRIGGER validate_goals_trigger
  BEFORE INSERT OR UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_data();

-- Criar função para auditoria automática
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_audit_log(TG_TABLE_NAME, 'INSERT', NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.create_audit_log(TG_TABLE_NAME, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.create_audit_log(TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Aplicar auditoria nas tabelas sensíveis
CREATE TRIGGER audit_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_accounts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_budgets_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_goals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();