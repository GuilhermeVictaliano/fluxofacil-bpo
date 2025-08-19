-- Align password verification with login logic and remove strict user_id dependency
CREATE OR REPLACE FUNCTION public.update_user_password(
  user_id_input uuid,
  current_password_input text,
  new_password_input text,
  cnpj_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  prof RECORD;
BEGIN
  -- Find profile strictly by CNPJ (same as login path)
  SELECT id, cnpj, password_hash, user_id
  INTO prof
  FROM profiles
  WHERE cnpj = cnpj_input
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE; -- Profile not found for this CNPJ
  END IF;

  -- Verify current password (supports bcrypt or legacy md5)
  IF prof.password_hash LIKE '$%' THEN
    IF crypt(current_password_input || cnpj_input || 'bpo_salt', prof.password_hash) != prof.password_hash THEN
      RETURN FALSE; -- Wrong current password
    END IF;
  ELSE
    IF md5(current_password_input || cnpj_input || 'bpo_salt') != prof.password_hash THEN
      RETURN FALSE; -- Wrong current password
    END IF;
  END IF;

  -- Update to new bcrypt password and link user if missing
  UPDATE profiles
  SET password_hash = crypt(new_password_input || cnpj_input || 'bpo_salt', gen_salt('bf', 10)),
      updated_at = now(),
      user_id = COALESCE(user_id, user_id_input)
  WHERE id = prof.id;
  
  RETURN TRUE;
END;
$$;

-- Make verify_user_password resilient: match by CNPJ only (ignore user link), same as login
CREATE OR REPLACE FUNCTION public.verify_user_password(
  user_id_input uuid,
  password_input text,
  cnpj_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  prof RECORD;
BEGIN
  SELECT id, cnpj, password_hash, user_id
  INTO prof
  FROM profiles
  WHERE cnpj = cnpj_input
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF prof.password_hash LIKE '$%' THEN
    RETURN crypt(password_input || cnpj_input || 'bpo_salt', prof.password_hash) = prof.password_hash;
  ELSE
    RETURN md5(password_input || cnpj_input || 'bpo_salt') = prof.password_hash;
  END IF;
END;
$$;