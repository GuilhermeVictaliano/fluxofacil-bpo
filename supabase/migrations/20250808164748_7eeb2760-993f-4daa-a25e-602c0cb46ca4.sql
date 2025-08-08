-- Harden functions and fix linter warning by setting search_path; add bcrypt with legacy MD5 compatibility

-- 1) Ensure update_updated_at_column has fixed search_path and runs as security definer
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2) Recreate register_user to use bcrypt (pgcrypto) while keeping same signature and messages
CREATE OR REPLACE FUNCTION public.register_user(cnpj_input text, company_name_input text, password_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_user_id uuid;
  password_hashed text;
BEGIN
  -- Check if CNPJ already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE cnpj = cnpj_input) THEN
    RAISE EXCEPTION 'CNPJ já cadastrado';
  END IF;

  -- Generate new UUID and hash password using bcrypt (stronger than MD5)
  new_user_id := gen_random_uuid();
  password_hashed := crypt(password_input || cnpj_input || 'bpo_salt', gen_salt('bf', 10));
  
  -- Insert new profile
  INSERT INTO profiles (id, cnpj, company_name, password_hash)
  VALUES (new_user_id, cnpj_input, company_name_input, password_hashed);
  
  RETURN new_user_id;
END;
$function$;

-- 3) Recreate authenticate_user to verify bcrypt first, then legacy MD5, and upgrade to bcrypt when legacy matches
CREATE OR REPLACE FUNCTION public.authenticate_user(cnpj_input text, password_input text)
RETURNS TABLE(profile_id uuid, profile_cnpj text, profile_company_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  prof RECORD;
  legacy_hash text;
BEGIN
  SELECT id, cnpj, company_name, password_hash
  INTO prof
  FROM profiles
  WHERE cnpj = cnpj_input
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN; -- no rows
  END IF;

  -- If hash looks like bcrypt ($2a$ / $2b$ / etc), verify with crypt
  IF prof.password_hash LIKE '$%' THEN
    IF crypt(password_input || cnpj_input || 'bpo_salt', prof.password_hash) = prof.password_hash THEN
      RETURN QUERY SELECT prof.id, prof.cnpj, prof.company_name;
      RETURN; 
    ELSE
      RETURN; -- wrong password
    END IF;
  ELSE
    -- Legacy MD5 path for backward compatibility
    legacy_hash := md5(password_input || cnpj_input || 'bpo_salt');
    IF legacy_hash = prof.password_hash THEN
      -- Upgrade to bcrypt transparently on successful login
      UPDATE profiles
      SET password_hash = crypt(password_input || cnpj_input || 'bpo_salt', gen_salt('bf', 10)), updated_at = now()
      WHERE id = prof.id;
      RETURN QUERY SELECT prof.id, prof.cnpj, prof.company_name;
      RETURN;
    ELSE
      RETURN; -- wrong password
    END IF;
  END IF;
END;
$function$;