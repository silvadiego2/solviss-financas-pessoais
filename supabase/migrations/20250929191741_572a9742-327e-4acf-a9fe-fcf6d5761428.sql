-- Corrigir função de validação financeira para funcionar com todas as tabelas
CREATE OR REPLACE FUNCTION public.validate_financial_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validar valores monetários específicos por tabela
  IF TG_TABLE_NAME = 'transactions' THEN
    -- Validar valor da transação
    IF NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Valor da transação deve ser positivo';
    END IF;
    IF NEW.amount > 999999999.99 THEN
      RAISE EXCEPTION 'Valor muito alto (máximo: 999.999.999,99)';
    END IF;
    -- Validar data da transação
    IF NEW.date > CURRENT_DATE + INTERVAL '1 year' THEN
      RAISE EXCEPTION 'Data da transação não pode ser mais de 1 ano no futuro';
    END IF;
    
  ELSIF TG_TABLE_NAME = 'accounts' THEN
    -- Validar saldo da conta
    IF NEW.balance IS NOT NULL AND NEW.balance > 999999999.99 THEN
      RAISE EXCEPTION 'Saldo muito alto (máximo: 999.999.999,99)';
    END IF;
    
  ELSIF TG_TABLE_NAME = 'budgets' THEN
    -- Validar valor do orçamento
    IF NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Valor do orçamento deve ser positivo';
    END IF;
    IF NEW.amount > 999999999.99 THEN
      RAISE EXCEPTION 'Valor muito alto (máximo: 999.999.999,99)';
    END IF;
    
  ELSIF TG_TABLE_NAME = 'goals' THEN
    -- Validar valores da meta
    IF NEW.target_amount IS NOT NULL AND NEW.target_amount <= 0 THEN
      RAISE EXCEPTION 'Valor da meta deve ser positivo';
    END IF;
    IF NEW.target_amount IS NOT NULL AND NEW.target_amount > 999999999.99 THEN
      RAISE EXCEPTION 'Valor muito alto (máximo: 999.999.999,99)';
    END IF;
    IF NEW.current_amount IS NOT NULL AND NEW.current_amount < 0 THEN
      RAISE EXCEPTION 'Valor atual não pode ser negativo';
    END IF;
    IF NEW.current_amount IS NOT NULL AND NEW.current_amount > 999999999.99 THEN
      RAISE EXCEPTION 'Valor muito alto (máximo: 999.999.999,99)';
    END IF;
  END IF;

  -- Validar e sanitizar campo description (apenas se existir)
  IF TG_TABLE_NAME IN ('transactions', 'goals') THEN
    IF NEW.description IS NOT NULL THEN
      NEW.description = TRIM(NEW.description);
      IF LENGTH(NEW.description) = 0 THEN
        NEW.description = NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;