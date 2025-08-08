-- 0) Make legacy password optional to support Supabase Auth (no duplicate hash storage)
ALTER TABLE public.profiles ALTER COLUMN password_hash DROP NOT NULL;

-- 1) Ensure one profile per auth user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='profiles_user_id_unique'
  ) THEN
    CREATE UNIQUE INDEX profiles_user_id_unique ON public.profiles(user_id) WHERE user_id IS NOT NULL;
  END IF;
END $$;

-- 2) Create profile auto-insert trigger on auth.users using metadata (expects data.cnpj, data.company_name)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _cnpj text;
  _company text;
BEGIN
  _cnpj := NEW.raw_user_meta_data ->> 'cnpj';
  _company := NEW.raw_user_meta_data ->> 'company_name';

  IF _cnpj IS NULL OR _company IS NULL THEN
    -- If metadata missing, just skip creating profile to avoid bad rows
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id, cnpj, company_name)
  VALUES (NEW.id, _cnpj, _company)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Migrate legacy data: link profile to current auth user and move transactions ownership
CREATE OR REPLACE FUNCTION public.migrate_legacy_to_auth(cnpj_input text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  prof RECORD;
BEGIN
  -- Find legacy profile by CNPJ
  SELECT * INTO prof FROM public.profiles WHERE cnpj = cnpj_input LIMIT 1;

  IF NOT FOUND THEN
    RETURN; -- nothing to migrate
  END IF;

  -- If profile is not linked, link it to current auth user
  IF prof.user_id IS NULL THEN
    UPDATE public.profiles
    SET user_id = auth.uid(), updated_at = now()
    WHERE id = prof.id AND user_id IS NULL;
  END IF;

  -- Refresh local record
  SELECT * INTO prof FROM public.profiles WHERE cnpj = cnpj_input LIMIT 1;

  -- Move transactions from legacy profile.id to auth.uid (idempotent)
  UPDATE public.transactions t
  SET user_id = auth.uid(), updated_at = now()
  WHERE t.user_id = prof.id;
END;
$$;

-- 4) Tighten RLS policies (drop permissive ones and add strict policies)
-- PROFILES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Allow user registration') THEN
    DROP POLICY "Allow user registration" ON public.profiles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update their own profile') THEN
    DROP POLICY "Users can update their own profile" ON public.profiles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can view their own profile') THEN
    DROP POLICY "Users can view their own profile" ON public.profiles;
  END IF;
END $$;

CREATE POLICY "Profiles: select own" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Profiles: update own" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Profiles: insert own" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='Allow delete for authenticated users') THEN
    DROP POLICY "Allow delete for authenticated users" ON public.transactions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='Allow insert for authenticated users') THEN
    DROP POLICY "Allow insert for authenticated users" ON public.transactions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='Allow select for authenticated users') THEN
    DROP POLICY "Allow select for authenticated users" ON public.transactions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='Allow update for authenticated users') THEN
    DROP POLICY "Allow update for authenticated users" ON public.transactions;
  END IF;
END $$;

CREATE POLICY "Transactions: select own" ON public.transactions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Transactions: insert own" ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Transactions: update own" ON public.transactions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Transactions: delete own" ON public.transactions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);
