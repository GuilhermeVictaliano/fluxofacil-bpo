-- Add creation_date column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN creation_date TIMESTAMP WITH TIME ZONE DEFAULT now();