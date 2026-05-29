-- 0007: NULL-owner safety net + admin-bootstrap
--
-- 0005 scopet data per eigenaar. Voor data die pre-0005 zonder eigenaar
-- bestond én geen admin gevonden werd in de backfill, blijft owner_id
-- NULL → niemand ziet ze meer. Deze migratie:
--
--   (A) Maakt SELECT-policies tolerant voor NULL-eigenaar zodat
--       "weeskinderen" zichtbaar zijn voor élke ingelogde user totdat
--       ze geclaimd worden.
--   (B) Schrijft de weeskinderen toe aan de eerste admin (of, bij gebrek
--       aan een admin, aan de oudste auth.user — die wordt eerst auto-
--       gepromoveerd tot admin).
--
-- Veilig om meerdere keren te draaien (idempotent waar mogelijk).
--
-- Run na 0001-0006.

-- ─── (B) Bootstrap admin + claim NULL-rijen ───────────────────
do $$
declare
  first_admin uuid;
  oldest_user uuid;
begin
  -- 1) Probeer een bestaande admin te vinden
  select id into first_admin from public.profiles where role = 'admin' limit 1;

  -- 2) Geen admin? Promoveer de oudste auth.user.
  if first_admin is null then
    select id into oldest_user from auth.users order by created_at asc limit 1;
    if oldest_user is not null then
      update public.profiles set role = 'admin' where id = oldest_user;
      first_admin := oldest_user;
    end if;
  end if;

  -- 3) Wijs NULL-eigenaar-rijen toe aan die admin (idempotent)
  if first_admin is not null then
    update public.customers     set created_by = first_admin where created_by is null;
    update public.opportunities set owner_id   = first_admin where owner_id   is null;
    update public.orders        set owner_id   = first_admin where owner_id   is null;
    update public.quotes        set owner_id   = first_admin where owner_id   is null;
  end if;
end $$;

-- ─── (A) NULL-tolerante SELECT-policies ───────────────────────
-- Als een rij ondanks (B) toch NULL houdt (race, nieuwe insert via SQL
-- editor zonder auth-context, ...), is die voor iedereen leesbaar.
-- Niet ideaal voor strikte multi-tenant, maar veilig bij dataloss-risico.

drop policy if exists "customers: read" on public.customers;
create policy "customers: read" on public.customers for select to authenticated
  using (created_by = auth.uid() or created_by is null or public.is_admin());

drop policy if exists "opportunities: read" on public.opportunities;
create policy "opportunities: read" on public.opportunities for select to authenticated
  using (owner_id = auth.uid() or owner_id is null or public.is_admin());

drop policy if exists "orders: read" on public.orders;
create policy "orders: read" on public.orders for select to authenticated
  using (owner_id = auth.uid() or owner_id is null or public.is_admin());

drop policy if exists "quotes: read" on public.quotes;
create policy "quotes: read" on public.quotes for select to authenticated
  using (owner_id = auth.uid() or owner_id is null or public.is_admin());
