-- 0006: gebruikersbeheer + role-scoping
--
-- Voegt admin-only policies toe op `profiles` zodat:
--   - Sales-users hun eigen profiel kunnen lezen + updaten (al via 0001)
--   - Admins kunnen alle profielen LEZEN en UPDATEN (incl. role)
-- Verbiedt sales-users om hun eigen role te promoveren naar admin.
--
-- Voegt ook beveiliging voor app_settings: enkel admins mogen wijzigen.
--
-- Run na 0001-0005.

-- ─── Helper: forceer role-check via is_admin() ────────────────
-- is_admin() bestaat al sinds 0005.

-- ─── Profiles: admin kan alle profielen lezen ─────────────────
drop policy if exists "profiles: read all" on public.profiles;

create policy "profiles: read self"  on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles: read admin" on public.profiles for select to authenticated
  using (public.is_admin());

-- ─── Profiles: admin kan andermans full_name + role bewerken ──
-- Sales kunnen alleen hun eigen full_name updaten, NIET hun role
-- (de WITH CHECK met OLD-vergelijking blokkeert role-zelf-promotie).
drop policy if exists "profiles: update self" on public.profiles;

-- Trigger om te voorkomen dat een niet-admin zijn eigen role wijzigt.
-- Voorheen kon iemand met UPDATE-rechten in theorie een PATCH sturen met
-- role='admin'. Deze trigger faalt zo'n update voordat ze persisteert.
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Als de role daadwerkelijk verandert én de uitvoerder geen admin is → blokkeren
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change user roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role_change on public.profiles;
create trigger profiles_guard_role_change
  before update on public.profiles
  for each row execute function public.guard_role_change();

create policy "profiles: update self" on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: update admin" on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── app_settings: write/update enkel voor admins ─────────────
-- 0005 voegde een admin-only INSERT-policy toe; de bestaande UPDATE-policy
-- uit 0003 stond echter elke ingelogde user toe. Vervangen.
drop policy if exists "app_settings: write" on public.app_settings;
drop policy if exists "app_settings: update" on public.app_settings;

create policy "app_settings: update admin" on public.app_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── option_lists: ook admin-only voor wijzigingen ────────────
drop policy if exists "option_lists: rw" on public.option_lists;

create policy "option_lists: read"   on public.option_lists for select to authenticated using (true);
create policy "option_lists: insert" on public.option_lists for insert to authenticated with check (public.is_admin());
create policy "option_lists: update" on public.option_lists for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "option_lists: delete" on public.option_lists for delete to authenticated using (public.is_admin());

-- ─── Helper view: profielen met email uit auth.users ──────────
-- Admins zien op de user-management tab graag het mail-adres ernaast.
-- View bevat enkel auth-velden die de uitvoerder mag lezen (security_invoker).
create or replace view public.profiles_with_email
  with (security_invoker = true) as
select
  p.id,
  p.full_name,
  p.role,
  p.created_at,
  u.email
from public.profiles p
left join auth.users u on u.id = p.id;

grant select on public.profiles_with_email to authenticated;
