-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS check_account_deletion ON accounts;
DROP TRIGGER IF EXISTS check_category_deletion ON categories;
DROP TRIGGER IF EXISTS check_credit_limit ON transactions;
DROP TRIGGER IF EXISTS check_transaction_amount ON transactions;

DROP FUNCTION IF EXISTS prevent_account_deletion_with_transactions();
DROP FUNCTION IF EXISTS prevent_category_deletion_with_transactions();
DROP FUNCTION IF EXISTS validate_credit_limit();
DROP FUNCTION IF EXISTS validate_transaction_amount();

-- ============================================================
-- BUSINESS LOGIC VALIDATION - DATABASE LAYER SECURITY
-- ============================================================

-- 1. Prevent account deletion if transactions exist
CREATE OR REPLACE FUNCTION prevent_account_deletion_with_transactions()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM transactions WHERE account_id = OLD.id LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot delete account with existing transactions. Please delete or reassign transactions first.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE TRIGGER check_account_deletion
BEFORE DELETE ON accounts
FOR EACH ROW EXECUTE FUNCTION prevent_account_deletion_with_transactions();

-- 2. Prevent category deletion if transactions exist
CREATE OR REPLACE FUNCTION prevent_category_deletion_with_transactions()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM transactions WHERE category_id = OLD.id LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot delete category with existing transactions. Please reassign transactions to another category first.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE TRIGGER check_category_deletion
BEFORE DELETE ON categories
FOR EACH ROW EXECUTE FUNCTION prevent_category_deletion_with_transactions();

-- 3. Validate credit limit for credit card transactions
CREATE OR REPLACE FUNCTION validate_credit_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_account RECORD;
  v_used_credit NUMERIC;
  v_available_credit NUMERIC;
BEGIN
  IF NEW.type = 'expense' THEN
    SELECT type, credit_limit, balance INTO v_account
    FROM accounts 
    WHERE id = NEW.account_id;
    
    IF v_account.type = 'credit_card' AND v_account.credit_limit IS NOT NULL THEN
      v_used_credit := ABS(COALESCE(v_account.balance, 0));
      v_available_credit := v_account.credit_limit - v_used_credit;
      
      IF (v_used_credit + NEW.amount) > v_account.credit_limit THEN
        RAISE EXCEPTION 'Credit limit exceeded. Available credit: R$ %, Transaction amount: R$ %', 
          v_available_credit, NEW.amount;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE TRIGGER check_credit_limit
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION validate_credit_limit();

-- 4. Validate transaction amounts are positive
CREATE OR REPLACE FUNCTION validate_transaction_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be positive. Received: R$ %', NEW.amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE TRIGGER check_transaction_amount
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION validate_transaction_amount();