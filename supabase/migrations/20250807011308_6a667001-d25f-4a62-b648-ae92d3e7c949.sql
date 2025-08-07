-- Remove the problematic functions and create simple ones that work without extensions
DROP FUNCTION IF EXISTS public.authenticate_user;
DROP FUNCTION IF EXISTS public.register_user;

-- Create simple authentication functions using MD5 (always available in PostgreSQL)
CREATE OR REPLACE FUNCTION public.register_user(cnpj_input text, company_name_input text, password_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  password_hashed text;
BEGIN
  -- Check if CNPJ already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE cnpj = cnpj_input) THEN
    RAISE EXCEPTION 'CNPJ já cadastrado';
  END IF;
  
  -- Generate new UUID and hash password using MD5 (always available)
  new_user_id := gen_random_uuid();
  password_hashed := md5(password_input || cnpj_input || 'bpo_salt');
  
  -- Insert new profile
  INSERT INTO profiles (id, cnpj, company_name, password_hash)
  VALUES (new_user_id, cnpj_input, company_name_input, password_hashed);
  
  RETURN new_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.authenticate_user(cnpj_input text, password_input text)
RETURNS TABLE(profile_id uuid, profile_cnpj text, profile_company_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  password_hashed text;
BEGIN
  -- Hash the input password the same way as registration
  password_hashed := md5(password_input || cnpj_input || 'bpo_salt');
  
  RETURN QUERY
  SELECT id, cnpj, company_name
  FROM profiles
  WHERE cnpj = cnpj_input 
    AND password_hash = password_hashed;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.authenticate_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_user TO anon, authenticated;