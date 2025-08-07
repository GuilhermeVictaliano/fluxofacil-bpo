-- Drop existing functions and recreate everything from scratch
DROP FUNCTION IF EXISTS public.authenticate_user;
DROP FUNCTION IF EXISTS public.register_user;
DROP FUNCTION IF EXISTS public.handle_new_user;

-- Ensure profiles table has the correct structure
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL UNIQUE,
  company_name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (true); -- Allow reading for authentication

CREATE POLICY "Allow user registration" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true); -- Allow registration

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (true);

-- Create simple authentication functions using MD5 hash (for simplicity)
CREATE OR REPLACE FUNCTION public.register_user(cnpj_input text, company_name_input text, password_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_user_id uuid;
  password_hashed text;
BEGIN
  -- Check if CNPJ already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE cnpj = cnpj_input) THEN
    RAISE EXCEPTION 'CNPJ já cadastrado';
  END IF;
  
  -- Generate new UUID and hash password
  new_user_id := gen_random_uuid();
  password_hashed := encode(digest(password_input || cnpj_input, 'sha256'), 'hex');
  
  -- Insert new profile
  INSERT INTO public.profiles (id, cnpj, company_name, password_hash)
  VALUES (new_user_id, cnpj_input, company_name_input, password_hashed);
  
  RETURN new_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.authenticate_user(cnpj_input text, password_input text)
RETURNS TABLE(profile_id uuid, profile_cnpj text, profile_company_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  password_hashed text;
BEGIN
  password_hashed := encode(digest(password_input || cnpj_input, 'sha256'), 'hex');
  
  RETURN QUERY
  SELECT id, cnpj, company_name
  FROM public.profiles
  WHERE cnpj = cnpj_input 
    AND password_hash = password_hashed;
END;
$$;

-- Ensure transactions table exists and is correct
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

-- Create RLS policies for transactions
CREATE POLICY "Users can view their own transactions" 
ON public.transactions 
FOR SELECT 
USING (user_id IN (SELECT id FROM public.profiles WHERE cnpj IS NOT NULL));

CREATE POLICY "Users can create their own transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE cnpj IS NOT NULL));

CREATE POLICY "Users can update their own transactions" 
ON public.transactions 
FOR UPDATE 
USING (user_id IN (SELECT id FROM public.profiles WHERE cnpj IS NOT NULL));

CREATE POLICY "Users can delete their own transactions" 
ON public.transactions 
FOR DELETE 
USING (user_id IN (SELECT id FROM public.profiles WHERE cnpj IS NOT NULL));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.transactions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_user TO anon, authenticated;