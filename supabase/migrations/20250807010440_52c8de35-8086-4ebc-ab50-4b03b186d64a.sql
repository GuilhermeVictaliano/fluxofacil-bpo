-- Ensure transactions table is correctly configured
DROP TABLE IF EXISTS public.transactions CASCADE;
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('receita', 'despesa')),
  category text NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  due_date date NOT NULL,
  installments integer DEFAULT 1,
  current_installment integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transactions that work with our custom auth
CREATE POLICY "Users can view their own transactions" 
ON public.transactions 
FOR SELECT 
USING (user_id IN (SELECT id FROM public.profiles));

CREATE POLICY "Users can create their own transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM public.profiles));

CREATE POLICY "Users can update their own transactions" 
ON public.transactions 
FOR UPDATE 
USING (user_id IN (SELECT id FROM public.profiles));

CREATE POLICY "Users can delete their own transactions" 
ON public.transactions 
FOR DELETE 
USING (user_id IN (SELECT id FROM public.profiles));

-- Grant permissions for transactions
GRANT ALL ON public.transactions TO anon, authenticated;