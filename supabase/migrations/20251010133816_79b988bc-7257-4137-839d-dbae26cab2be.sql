-- Add fields for recurring transaction processing
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster queries on recurring transactions
CREATE INDEX IF NOT EXISTS idx_transactions_recurring 
ON public.transactions(user_id, is_recurring, is_active) 
WHERE is_recurring = true AND is_active = true;

-- Add comment for documentation
COMMENT ON COLUMN public.transactions.last_processed_at IS 'Última vez que uma transação recorrente foi processada';
COMMENT ON COLUMN public.transactions.is_active IS 'Se a recorrência está ativa (permite pausar/retomar)';