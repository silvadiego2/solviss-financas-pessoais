ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_debt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS interest_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_payment NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_transactions_is_debt ON public.transactions(user_id, is_debt) WHERE is_debt = true;