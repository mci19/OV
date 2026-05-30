-- 0012: RLS-hardening voor pilot
--
-- 1. products + activities mochten tot nu toe door élke ingelogde
--    gebruiker geschreven worden (`for all to authenticated using
--    (true)` in 0002). Dat is een productielek: sales-users kunnen
--    de catalogus wissen of nep-activiteiten op opportunities loggen.
--    Hierna gelden:
--      - products:   SELECT iedereen; INSERT/UPDATE/DELETE alleen admin
--      - activities: SELECT iedereen die de bijhorende opportunity
--                    kan zien (RLS van opportunities); INSERT alleen
--                    op opportunities die je zelf "ziet"; UPDATE/DELETE
--                    alleen admin (timeline-records mogen niet stilletjes
--                    door sales-users herschreven worden).
--
-- 2. De `or <owner> is null` clausules uit 0007 verbergen geen data
--    meer: alle bestaande NULL-rijen werden in 0007 al ge-backfilled
--    naar de eerste admin. Toekomstige server-side inserts (incl.
--    migration 0011 demo-seed) moeten expliciet een owner zetten.
--    We strippen de `is null`-clauses zodat alleen admins NULL-owner
--    rijen kunnen zien (gewone sales-users zien ze niet meer).

begin;

-- ─── products: alleen admin mag muteren ─────────────────────
drop policy if exists "products: rw" on public.products;

create policy "products: read" on public.products
  for select to authenticated using (true);

create policy "products: insert admin" on public.products
  for insert to authenticated with check (public.is_admin());

create policy "products: update admin" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "products: delete admin" on public.products
  for delete to authenticated using (public.is_admin());

-- ─── activities: read = zelfde scope als opportunities ───────
-- We laten sales-users alleen activities zien voor opportunities die
-- ze zelf zien (= hun eigen opportunities + die van anderen indien
-- admin). INSERT mag op opportunities die zichtbaar zijn (de stage-
-- change-trigger doet dit security-definer, dus die wordt niet
-- geblokkeerd). UPDATE/DELETE alleen admin.
drop policy if exists "activities: rw" on public.activities;

create policy "activities: read" on public.activities
  for select to authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = activities.opportunity_id
        and (o.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "activities: insert" on public.activities
  for insert to authenticated
  with check (
    exists (
      select 1 from public.opportunities o
      where o.id = activities.opportunity_id
        and (o.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "activities: update admin" on public.activities
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "activities: delete admin" on public.activities
  for delete to authenticated using (public.is_admin());

-- ─── Strip de `is null`-bypass uit 0007 ──────────────────────
-- Alleen admins zien nog NULL-owner rijen. Reden: NULL-owner ontstaat
-- enkel via server-side inserts (migrations, SQL editor); die data
-- mag niet automatisch tussen tenants/users gedeeld worden.
drop policy if exists "customers: read" on public.customers;
create policy "customers: read" on public.customers
  for select to authenticated
  using (created_by = auth.uid() or public.is_admin());

drop policy if exists "opportunities: read" on public.opportunities;
create policy "opportunities: read" on public.opportunities
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "orders: read" on public.orders;
create policy "orders: read" on public.orders
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "quotes: read" on public.quotes;
create policy "quotes: read" on public.quotes
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

commit;
