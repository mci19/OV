-- 0008: email rechtstreeks in profiles (fix 403 op profiles_with_email)
--
-- De view `profiles_with_email` uit 0006 joinde profiles met auth.users.
-- Met security_invoker krijgt elke ingelogde user een 403 omdat Supabase
-- direct lezen van auth.users blokkeert. Oplossing: email als kolom op
-- profiles, ingevuld via de signup-trigger + backfilled voor bestaande
-- accounts. View wordt verwijderd; de UI queryt profiles direct.

-- ─── Kolom + backfill ─────────────────────────────────────────
alter table public.profiles
  add column if not exists email text;

update public.profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id and p.email is null;

create index if not exists profiles_email_idx on public.profiles (email);

-- ─── Update signup-trigger: nu ook email vastleggen ──────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- ─── View weg (consumer queryt profiles direct) ──────────────
drop view if exists public.profiles_with_email;
