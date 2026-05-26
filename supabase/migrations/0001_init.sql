-- MY DOORS CRM — initial schema
-- Run dit in de Supabase SQL editor (Dashboard → SQL → New Query).
-- Of via supabase CLI: `supabase db push`.

-- ─── Extensies ─────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Profiles (1-op-1 met auth.users) ─────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default '',
  role         text not null default 'sales',  -- 'sales' | 'admin'
  created_at   timestamptz not null default now()
);

-- Bij elke nieuwe auth user → maak profiel
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Customers ─────────────────────────────────────────────────
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text,
  phone         text,
  address_line1 text,
  address_city  text,
  address_postal text,
  notes         text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index customers_name_idx on public.customers (lower(name));
create index customers_created_by_idx on public.customers (created_by);

-- ─── Opportunities ────────────────────────────────────────────
create type opportunity_stage as enum ('lead', 'meeting', 'quote_sent', 'won', 'lost');

create table public.opportunities (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.customers(id) on delete cascade,
  title               text not null,
  stage               opportunity_stage not null default 'lead',
  expected_value_cents integer not null default 0,
  owner_id            uuid references auth.users(id) on delete set null,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index opportunities_customer_idx on public.opportunities (customer_id);
create index opportunities_stage_idx on public.opportunities (stage);

-- ─── Orders (de schets + formulier-data) ─────────────────────
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  data           jsonb not null,  -- volledige OrderData (sketch + formulier)
  version        integer not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index orders_opportunity_idx on public.orders (opportunity_id);

-- ─── Quotes ───────────────────────────────────────────────────
create type quote_status as enum ('draft', 'sent', 'accepted', 'declined');

create table public.quotes (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  order_id       uuid references public.orders(id) on delete set null,
  reference      text not null,                          -- bv. Q-20260525-001
  line_items     jsonb not null default '[]'::jsonb,     -- [{description, qty, unit_cents, ...}]
  subtotal_cents integer not null default 0,
  vat_rate       numeric(5,2) not null default 21.00,
  vat_cents      integer not null default 0,
  total_cents    integer not null default 0,
  valid_until    date,
  status         quote_status not null default 'draft',
  sent_at        timestamptz,
  accepted_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index quotes_opportunity_idx on public.quotes (opportunity_id);
create unique index quotes_reference_idx on public.quotes (reference);

-- ─── updated_at trigger ──────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_touch
  before update on public.customers
  for each row execute function public.touch_updated_at();

create trigger opportunities_touch
  before update on public.opportunities
  for each row execute function public.touch_updated_at();

create trigger orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();

create trigger quotes_touch
  before update on public.quotes
  for each row execute function public.touch_updated_at();

-- ─── Row Level Security ──────────────────────────────────────
-- v1: single-organisatie. Iedere ingelogde user mag alles zien
-- en bewerken. Later kunnen we org_id toevoegen + scope per org.

alter table public.profiles      enable row level security;
alter table public.customers     enable row level security;
alter table public.opportunities enable row level security;
alter table public.orders        enable row level security;
alter table public.quotes        enable row level security;

create policy "profiles: read all"     on public.profiles      for select to authenticated using (true);
create policy "profiles: update self"  on public.profiles      for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "customers: rw"          on public.customers     for all    to authenticated using (true) with check (true);
create policy "opportunities: rw"      on public.opportunities for all    to authenticated using (true) with check (true);
create policy "orders: rw"             on public.orders        for all    to authenticated using (true) with check (true);
create policy "quotes: rw"             on public.quotes        for all    to authenticated using (true) with check (true);

-- ─── Helpful views ────────────────────────────────────────────
create or replace view public.opportunities_with_customer as
select
  o.*,
  c.name  as customer_name,
  c.email as customer_email,
  c.phone as customer_phone
from public.opportunities o
left join public.customers c on c.id = o.customer_id;

grant select on public.opportunities_with_customer to authenticated;
