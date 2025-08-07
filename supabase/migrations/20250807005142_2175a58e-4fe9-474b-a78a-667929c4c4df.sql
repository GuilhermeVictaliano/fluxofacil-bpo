-- First, let's create a custom authentication system since email signups are disabled
-- Add password field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN password_hash text;

-- Create a function to handle custom authentication
CREATE OR REPLACE FUNCTION public.authenticate_user(cnpj_input text, password_input text)
RETURNS TABLE(profile_id uuid, profile_cnpj text, profile_company_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT id, cnpj, company_name
  FROM public.profiles
  WHERE cnpj = cnpj_input 
    AND password_hash = crypt(password_input, password_hash);
END;
$$;

-- Create a function to register new users
CREATE OR REPLACE FUNCTION public.register_user(cnpj_input text, company_name_input text, password_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if CNPJ already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE cnpj = cnpj_input) THEN
    RAISE EXCEPTION 'CNPJ já cadastrado';
  END IF;
  
  -- Generate new UUID
  new_user_id := gen_random_uuid();
  
  -- Insert new profile with hashed password
  INSERT INTO public.profiles (id, cnpj, company_name, password_hash)
  VALUES (new_user_id, cnpj_input, company_name_input, crypt(password_input, gen_salt('bf')));
  
  RETURN new_user_id;
END;
$$;

-- Update RLS policies to allow inserts for registration
CREATE POLICY "Allow user registration" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- Allow the authentication function to be called by anyone
GRANT EXECUTE ON FUNCTION public.authenticate_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_user TO anon, authenticated;