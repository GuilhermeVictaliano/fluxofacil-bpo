-- Create function to update user password
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
  -- Get current profile data
  SELECT id, cnpj, password_hash
  INTO prof
  FROM profiles
  WHERE user_id = user_id_input AND cnpj = cnpj_input
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE; -- User not found
  END IF;

  -- Verify current password
  IF prof.password_hash LIKE '$%' THEN
    -- bcrypt hash
    IF crypt(current_password_input || cnpj_input || 'bpo_salt', prof.password_hash) != prof.password_hash THEN
      RETURN FALSE; -- Wrong current password
    END IF;
  ELSE
    -- Legacy MD5 hash
    IF md5(current_password_input || cnpj_input || 'bpo_salt') != prof.password_hash THEN
      RETURN FALSE; -- Wrong current password
    END IF;
  END IF;

  -- Update to new bcrypt password
  UPDATE profiles
  SET password_hash = crypt(new_password_input || cnpj_input || 'bpo_salt', gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = prof.id;
  
  RETURN TRUE; -- Success
END;
$$;