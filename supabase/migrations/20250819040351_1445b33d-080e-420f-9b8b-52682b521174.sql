-- Ensure pgcrypto is available (provides crypt, gen_salt, gen_random_uuid)
create extension if not exists pgcrypto with schema public;

-- Recreate authenticate_user to align with login verification
create or replace function public.authenticate_user(cnpj_input text, password_input text)
returns table(profile_id uuid, profile_cnpj text, profile_company_name text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  prof record;
  legacy_hash text;
begin
  select id, cnpj, company_name, password_hash
  into prof
  from profiles
  where cnpj = cnpj_input
  limit 1;
  
  if not found then
    return; -- no rows
  end if;

  -- If hash looks like bcrypt ($2a$ / $2b$ / etc), verify with crypt
  if prof.password_hash like '$%' then
    if crypt(password_input || cnpj_input || 'bpo_salt', prof.password_hash) = prof.password_hash then
      return query select prof.id, prof.cnpj, prof.company_name;
      return; 
    else
      return; -- wrong password
    end if;
  else
    -- Legacy MD5 path for backward compatibility
    legacy_hash := md5(password_input || cnpj_input || 'bpo_salt');
    if legacy_hash = prof.password_hash then
      -- Upgrade to bcrypt transparently on successful login
      update profiles
      set password_hash = crypt(password_input || cnpj_input || 'bpo_salt', gen_salt('bf', 10)), updated_at = now()
      where id = prof.id;
      return query select prof.id, prof.cnpj, prof.company_name;
      return;
    else
      return; -- wrong password
    end if;
  end if;
end;
$$;

-- Recreate update_user_password to verify using same logic and upgrade to bcrypt
create or replace function public.update_user_password(
  user_id_input uuid,
  current_password_input text,
  new_password_input text,
  cnpj_input text
)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  prof record;
begin
  -- Find profile strictly by CNPJ (same as login path)
  select id, cnpj, password_hash, user_id
  into prof
  from profiles
  where cnpj = cnpj_input
  limit 1;
  
  if not found then
    return false; -- Profile not found for this CNPJ
  end if;

  -- Verify current password (supports bcrypt or legacy md5)
  if prof.password_hash like '$%' then
    if crypt(current_password_input || cnpj_input || 'bpo_salt', prof.password_hash) != prof.password_hash then
      return false; -- Wrong current password
    end if;
  else
    if md5(current_password_input || cnpj_input || 'bpo_salt') != prof.password_hash then
      return false; -- Wrong current password
    end if;
  end if;

  -- Update to new bcrypt password and link user if missing
  update profiles
  set password_hash = crypt(new_password_input || cnpj_input || 'bpo_salt', gen_salt('bf', 10)),
      updated_at = now(),
      user_id = coalesce(user_id, user_id_input)
  where id = prof.id;
  
  return true;
end;
$$;

-- Optional verify function used in some flows
create or replace function public.verify_user_password(
  user_id_input uuid,
  password_input text,
  cnpj_input text
)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  prof record;
begin
  select id, cnpj, password_hash, user_id
  into prof
  from profiles
  where cnpj = cnpj_input
  limit 1;
  
  if not found then
    return false;
  end if;

  if prof.password_hash like '$%' then
    return crypt(password_input || cnpj_input || 'bpo_salt', prof.password_hash) = prof.password_hash;
  else
    return md5(password_input || cnpj_input || 'bpo_salt') = prof.password_hash;
  end if;
end;
$$;