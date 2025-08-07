-- Fix security issues by setting search_path for functions
CREATE OR REPLACE FUNCTION public.authenticate_user(cnpj_input text, password_input text)
RETURNS TABLE(profile_id uuid, profile_cnpj text, profile_company_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT id, cnpj, company_name
  FROM public.profiles
  WHERE cnpj = cnpj_input 
    AND password_hash = crypt(password_input, password_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.register_user(cnpj_input text, company_name_input text, password_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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