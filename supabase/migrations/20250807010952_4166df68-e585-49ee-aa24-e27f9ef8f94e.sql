-- Enable the pgcrypto extension (required for digest function)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate the authentication functions with the correct extension enabled
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
  
  -- Generate new UUID and hash password using pgcrypto functions
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
  -- Hash the input password the same way as registration
  password_hashed := encode(digest(password_input || cnpj_input, 'sha256'), 'hex');
  
  RETURN QUERY
  SELECT id, cnpj, company_name
  FROM public.profiles
  WHERE cnpj = cnpj_input 
    AND password_hash = password_hashed;
END;
$$;