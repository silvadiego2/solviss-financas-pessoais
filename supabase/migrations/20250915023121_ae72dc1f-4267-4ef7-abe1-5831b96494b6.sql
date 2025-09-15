-- Create credit_cards table (using accounts table with type credit_card)
-- The accounts table already supports credit cards, but let's ensure proper indexes and constraints

-- Add indexes for better performance on credit card queries
CREATE INDEX IF NOT EXISTS idx_accounts_type_user_credit ON accounts(user_id, type) WHERE type = 'credit_card';
CREATE INDEX IF NOT EXISTS idx_accounts_closing_day ON accounts(closing_day) WHERE closing_day IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_due_day ON accounts(due_day) WHERE due_day IS NOT NULL;

-- Create notifications trigger for budget alerts and goals
CREATE OR REPLACE FUNCTION public.check_budget_notifications()
RETURNS TRIGGER AS $$
DECLARE
  budget_record RECORD;
  goal_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Check for budget alerts when transaction is inserted or updated
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Check if any budget is exceeded
    FOR budget_record IN 
      SELECT b.*, c.name as category_name 
      FROM budgets b 
      JOIN categories c ON b.category_id = c.id 
      WHERE b.user_id = NEW.user_id 
        AND b.month = EXTRACT(MONTH FROM NEW.date)
        AND b.year = EXTRACT(YEAR FROM NEW.date)
        AND NEW.category_id = b.category_id
        AND NEW.type = 'expense'
    LOOP
      -- Calculate current spent amount for this budget
      DECLARE
        current_spent NUMERIC;
      BEGIN
        SELECT COALESCE(SUM(amount), 0) INTO current_spent
        FROM transactions 
        WHERE user_id = NEW.user_id 
          AND category_id = budget_record.category_id
          AND type = 'expense'
          AND EXTRACT(MONTH FROM date) = budget_record.month
          AND EXTRACT(YEAR FROM date) = budget_record.year;
        
        -- If budget exceeded, create notification
        IF current_spent > budget_record.amount THEN
          notification_title := 'Orçamento Ultrapassado!';
          notification_message := 'Você ultrapassou o orçamento de ' || budget_record.category_name || 
                                ' em R$ ' || (current_spent - budget_record.amount)::TEXT;
          
          INSERT INTO notifications (user_id, type, title, message, related_id)
          VALUES (NEW.user_id, 'budget_exceeded', notification_title, notification_message, budget_record.id);
        END IF;
      END;
    END LOOP;
    
    -- Check for goal achievements
    FOR goal_record IN 
      SELECT * FROM goals 
      WHERE user_id = NEW.user_id 
        AND NOT is_completed
        AND current_amount >= target_amount
    LOOP
      notification_title := 'Meta Atingida! 🎉';
      notification_message := 'Parabéns! Você atingiu sua meta: ' || goal_record.name;
      
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (NEW.user_id, 'goal_achieved', notification_title, notification_message, goal_record.id);
      
      -- Mark goal as completed
      UPDATE goals SET is_completed = true WHERE id = goal_record.id;
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic notifications
DROP TRIGGER IF EXISTS trigger_check_budget_notifications ON transactions;
CREATE TRIGGER trigger_check_budget_notifications
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_budget_notifications();

-- Insert example data for demonstration
DO $$
DECLARE
  demo_user_id UUID;
  checking_account_id UUID;
  savings_account_id UUID;
  credit_card_id UUID;
  food_category_id UUID;
  transport_category_id UUID;
  income_category_id UUID;
  shopping_category_id UUID;
BEGIN
  -- Check if we already have users (don't create demo data if real users exist)
  SELECT id INTO demo_user_id FROM auth.users LIMIT 1;
  
  IF demo_user_id IS NULL THEN
    -- Create a demo user ID (this won't actually create an auth user, just for demo data)
    demo_user_id := gen_random_uuid();
    
    -- Insert demo profile
    INSERT INTO profiles (id, full_name, email, currency)
    VALUES (demo_user_id, 'Usuário Demonstração', 'demo@example.com', 'BRL');
    
    -- Create demo accounts
    INSERT INTO accounts (id, user_id, name, type, balance, bank_name) VALUES
    (gen_random_uuid(), demo_user_id, 'Conta Corrente', 'checking', 2500.00, 'Banco do Brasil'),
    (gen_random_uuid(), demo_user_id, 'Poupança', 'savings', 15000.00, 'Caixa Econômica');
    
    SELECT id INTO checking_account_id FROM accounts WHERE user_id = demo_user_id AND type = 'checking' LIMIT 1;
    SELECT id INTO savings_account_id FROM accounts WHERE user_id = demo_user_id AND type = 'savings' LIMIT 1;
    
    -- Create demo credit card
    INSERT INTO accounts (id, user_id, name, type, balance, credit_limit, closing_day, due_day, bank_name) 
    VALUES (gen_random_uuid(), demo_user_id, 'Cartão de Crédito', 'credit_card', 1500.00, 3000.00, 15, 10, 'Nubank');
    
    SELECT id INTO credit_card_id FROM accounts WHERE user_id = demo_user_id AND type = 'credit_card' LIMIT 1;
    
    -- Get category IDs
    SELECT id INTO food_category_id FROM categories WHERE user_id = demo_user_id AND name = 'Alimentação' LIMIT 1;
    SELECT id INTO transport_category_id FROM categories WHERE user_id = demo_user_id AND name = 'Transporte' LIMIT 1;
    SELECT id INTO income_category_id FROM categories WHERE user_id = demo_user_id AND name = 'Salário' LIMIT 1;
    SELECT id INTO shopping_category_id FROM categories WHERE user_id = demo_user_id AND name = 'Compras' LIMIT 1;
    
    -- Create demo transactions
    INSERT INTO transactions (user_id, account_id, category_id, type, amount, date, description) VALUES
    (demo_user_id, checking_account_id, income_category_id, 'income', 5000.00, CURRENT_DATE - INTERVAL '5 days', 'Salário'),
    (demo_user_id, checking_account_id, food_category_id, 'expense', 85.50, CURRENT_DATE - INTERVAL '2 days', 'Supermercado'),
    (demo_user_id, credit_card_id, shopping_category_id, 'expense', 299.90, CURRENT_DATE - INTERVAL '1 day', 'Compras Online'),
    (demo_user_id, checking_account_id, transport_category_id, 'expense', 45.00, CURRENT_DATE, 'Combustível');
    
    -- Create demo budgets
    INSERT INTO budgets (user_id, category_id, amount, month, year) VALUES
    (demo_user_id, food_category_id, 800.00, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
    (demo_user_id, transport_category_id, 500.00, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
    
    -- Create demo goals
    INSERT INTO goals (user_id, name, description, target_amount, current_amount, target_date) VALUES
    (demo_user_id, 'Emergência', 'Reserva de emergência', 10000.00, 15000.00, CURRENT_DATE + INTERVAL '6 months'),
    (demo_user_id, 'Viagem', 'Férias na Europa', 8000.00, 2500.00, CURRENT_DATE + INTERVAL '12 months');
    
    -- Create demo automation rules
    INSERT INTO automation_rules (user_id, name, rule_type, conditions, actions, enabled) VALUES
    (demo_user_id, 'Categorizar Supermercado', 'transaction_categorization', 
     '[{"field": "description", "operator": "contains", "value": "supermercado"}]'::jsonb,
     '[{"type": "set_category", "category_name": "Alimentação"}]'::jsonb, true),
    (demo_user_id, 'Alerta Gastos Altos', 'budget_alert',
     '[{"field": "amount", "operator": "greater_than", "value": "500"}]'::jsonb,
     '[{"type": "send_notification", "message": "Gasto alto detectado!"}]'::jsonb, true);
  END IF;
END $$;