-- 0005: productie-RLS-scope + integriteits-constraints
--
-- Lost de "iedereen ziet alles"-RLS uit 0001 op door data per gebruiker
-- te scopen. Admins (profiles.role = 'admin') zien alles. Verkopers zien
-- alleen klanten/opportunities/orders/quotes die ze zelf hebben gemaakt
-- of waar ze owner van zijn.
--
-- Bijkomende fixes:
--  - unique constraint op orders.opportunity_id (1 order per opportunity)
--  - opportunities_with_customer view met security_invoker=on (anders
--    bypassed view de RLS van de onderliggende tabellen)
--  - app_settings: insert-policy + upsert-vriendelijke check
--
-- Run dit na 0001-0004 in de Supabase SQL editor.

-- ─── Helper: is_admin() ───────────────────────────────────────
-- Centraal punt om de admin-rol te checken. Zo blijven de policies
-- leesbaar en kunnen we de definitie van "admin" later eenvoudig
-- aanpassen zonder elke policy te herschrijven.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ─── Backfill bestaande data ──────────────────────────────────
-- Rijen zonder eigenaar krijgen de eerste admin (of NULL als geen admin).
-- Dat is veilig: admins blijven ze zien, verkopers niet.
do $$
declare
  first_admin uuid;
begin
  select id into first_admin from public.profiles where role = 'admin' limit 1;
  if first_admin is not null then
    update public.customers     set created_by = first_admin where created_by is null;
    update public.opportunities set owner_id   = first_admin where owner_id   is null;
  end if;
end $$;

-- ─── Orders + Quotes: owner_id kolom ──────────────────────────
-- Inheriten via subselect uit opportunity zou werken maar kost
-- index-lookups; expliciete kolom is sneller en duidelijker.
alter table public.orders
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.quotes
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

-- Backfill orders/quotes: kopieer owner_id van de bijbehorende opportunity
update public.orders o
  set owner_id = opp.owner_id
  from public.opportunities opp
  where o.opportunity_id = opp.id and o.owner_id is null;

update public.quotes q
  set owner_id = opp.owner_id
  from public.opportunities opp
  where q.opportunity_id = opp.id and q.owner_id is null;

-- Triggers: stel owner_id automatisch in op auth.uid() bij INSERT
create or replace function public.set_owner_on_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.set_created_by_on_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists customers_set_created_by on public.customers;
create trigger customers_set_created_by
  before insert on public.customers
  for each row execute function public.set_created_by_on_insert();

drop trigger if exists opportunities_set_owner on public.opportunities;
create trigger opportunities_set_owner
  before insert on public.opportunities
  for each row execute function public.set_owner_on_insert();

drop trigger if exists orders_set_owner on public.orders;
create trigger orders_set_owner
  before insert on public.orders
  for each row execute function public.set_owner_on_insert();

drop trigger if exists quotes_set_owner on public.quotes;
create trigger quotes_set_owner
  before insert on public.quotes
  for each row execute function public.set_owner_on_insert();

create index if not exists orders_owner_idx on public.orders (owner_id);
create index if not exists quotes_owner_idx on public.quotes (owner_id);

-- ─── Unique constraint: 1 order per opportunity ──────────────
-- De UI verwacht maximaal één order per opportunity (queries.ts doet
-- .limit(1)); zonder constraint kunnen twee gelijktijdige tabs een
-- dubbele rij maken die stille dataloss veroorzaakt.
--
-- Eerst de duplicaten opruimen: behoud per opportunity_id de meest
-- recent geupdatete order, verwijder de rest.
delete from public.orders o1
using public.orders o2
where o1.opportunity_id = o2.opportunity_id
  and o1.id <> o2.id
  and o1.updated_at < o2.updated_at;

alter table public.orders
  add constraint orders_opportunity_unique unique (opportunity_id);

-- ─── Vervang permissieve policies door scoped policies ───────

-- Customers: zien wat je zelf hebt aangemaakt; admin ziet alles.
drop policy if exists "customers: rw" on public.customers;

create policy "customers: read"   on public.customers for select to authenticated
  using (created_by = auth.uid() or public.is_admin());
create policy "customers: insert" on public.customers for insert to authenticated
  with check (created_by = auth.uid() or public.is_admin());
create policy "customers: update" on public.customers for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy "customers: delete" on public.customers for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- Opportunities: owner ziet eigen opportunities; admin ziet alles.
drop policy if exists "opportunities: rw" on public.opportunities;

create policy "opportunities: read"   on public.opportunities for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());
create policy "opportunities: insert" on public.opportunities for insert to authenticated
  with check (owner_id = auth.uid() or public.is_admin());
create policy "opportunities: update" on public.opportunities for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "opportunities: delete" on public.opportunities for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- Orders: identiek aan opportunities (via owner_id kolom).
drop policy if exists "orders: rw" on public.orders;

create policy "orders: read"   on public.orders for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());
create policy "orders: insert" on public.orders for insert to authenticated
  with check (owner_id = auth.uid() or public.is_admin());
create policy "orders: update" on public.orders for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "orders: delete" on public.orders for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- Quotes: idem.
drop policy if exists "quotes: rw" on public.quotes;

create policy "quotes: read"   on public.quotes for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());
create policy "quotes: insert" on public.quotes for insert to authenticated
  with check (owner_id = auth.uid() or public.is_admin());
create policy "quotes: update" on public.quotes for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "quotes: delete" on public.quotes for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- ─── View met security_invoker ────────────────────────────────
-- Zonder security_invoker draait de view-query als view-owner en
-- bypasst hij de RLS van opportunities/customers volledig.
drop view if exists public.opportunities_with_customer;

create view public.opportunities_with_customer
  with (security_invoker = true) as
select
  o.*,
  c.name  as customer_name,
  c.email as customer_email,
  c.phone as customer_phone
from public.opportunities o
left join public.customers c on c.id = o.customer_id;

grant select on public.opportunities_with_customer to authenticated;

-- ─── app_settings: insert-policy ──────────────────────────────
-- Was alleen update — bij verse projecten zonder seed-row, of na een
-- per ongeluk verwijderde rij, kon de UI de single-row niet aanmaken.
-- Insert beperken tot admins voorkomt rommel.
create policy "app_settings: insert" on public.app_settings for insert to authenticated
  with check (id = true and public.is_admin());
