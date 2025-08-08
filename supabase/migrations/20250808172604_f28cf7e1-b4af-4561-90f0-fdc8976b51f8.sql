-- Ensure unique or exclusion constraint exists for ON CONFLICT (user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END$$;
