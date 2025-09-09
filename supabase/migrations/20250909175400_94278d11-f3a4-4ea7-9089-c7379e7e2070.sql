-- Remove the existing foreign key constraint
ALTER TABLE public.synced_transactions 
DROP CONSTRAINT IF EXISTS synced_transactions_bank_connection_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE public.synced_transactions 
ADD CONSTRAINT synced_transactions_bank_connection_id_fkey 
FOREIGN KEY (bank_connection_id) 
REFERENCES public.bank_connections(id) 
ON DELETE CASCADE;