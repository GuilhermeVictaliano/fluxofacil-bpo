-- Step 1: Safe preparation migration (no breaking changes)
-- This prepares the schema to support secure auth-based access without changing current behavior yet

-- 1) Ensure pgcrypto is available (for future password hashing or utilities)
create extension if not exists pgcrypto;

-- 2) Add a user_id column to profiles to map to Supabase auth.users(id)
alter table public.profiles
  add column if not exists user_id uuid;

-- 3) Add FK to auth.users with ON DELETE CASCADE (wrapped safely)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE c.conname = 'profiles_user_id_fkey' AND t.relname = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 4) Ensure CNPJ is unique at the DB level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE c.conname = 'profiles_cnpj_key' AND t.relname = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_cnpj_key UNIQUE (cnpj);
  END IF;
END $$;

-- 5) Upsert trigger function to maintain updated_at automatically
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 6) Attach triggers for updated_at on profiles and transactions
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_cnpj ON public.profiles(cnpj);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- NOTE: We intentionally DO NOT modify RLS policies or auth functions in this step
-- to avoid breaking existing login/usage. We'll tighten RLS right after the frontend
-- is migrated to Supabase Auth in the next step.