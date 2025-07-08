
-- Create table for bank connections
CREATE TABLE public.bank_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  provider TEXT NOT NULL, -- 'pluggy', 'belvo', 'direct_bank', etc.
  bank_name TEXT NOT NULL,
  account_external_id TEXT NOT NULL,
  connection_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'error'
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for synced transactions
CREATE TABLE public.synced_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  bank_connection_id UUID REFERENCES public.bank_connections(id) NOT NULL,
  external_transaction_id TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  category_suggestion TEXT,
  transaction_type TEXT NOT NULL, -- 'income', 'expense'
  is_matched BOOLEAN DEFAULT FALSE, -- if matched with manual transaction
  matched_transaction_id UUID REFERENCES public.transactions(id),
  raw_data JSONB, -- store original API response
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better performance
CREATE INDEX idx_synced_transactions_user_id ON public.synced_transactions(user_id);
CREATE INDEX idx_synced_transactions_bank_connection ON public.synced_transactions(bank_connection_id);
CREATE INDEX idx_synced_transactions_external_id ON public.synced_transactions(external_transaction_id);
CREATE INDEX idx_bank_connections_user_id ON public.bank_connections(user_id);

-- Add unique constraint to prevent duplicate external transactions
ALTER TABLE public.synced_transactions ADD CONSTRAINT unique_external_transaction 
UNIQUE (bank_connection_id, external_transaction_id);

-- Enable RLS
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bank_connections
CREATE POLICY "Users can view their own bank connections" 
  ON public.bank_connections 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bank connections" 
  ON public.bank_connections 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank connections" 
  ON public.bank_connections 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank connections" 
  ON public.bank_connections 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for synced_transactions
CREATE POLICY "Users can view their own synced transactions" 
  ON public.synced_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own synced transactions" 
  ON public.synced_transactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own synced transactions" 
  ON public.synced_transactions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own synced transactions" 
  ON public.synced_transactions 
  FOR DELETE 
  USING (auth.uid() = user_id);
