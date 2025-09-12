-- Criar bucket para recibos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false);

-- Políticas para o bucket receipts
CREATE POLICY "Users can view their own receipts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own receipts" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipts" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Adicionar coluna receipt_image_url na tabela transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;