-- 0002: product-catalogus + activity log
-- Run in Supabase SQL Editor na 0001_init.sql.

-- ─── Products ─────────────────────────────────────────────────
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  category        text,                                 -- bv. 'Frame', 'Glas', 'Plaatsing'
  unit            text not null default 'stuk',         -- 'stuk', 'm', 'm²', 'u'
  default_price_cents integer not null default 0,
  active          boolean not null default true,
  sort_order      integer not null default 100,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_active_idx on public.products (active, sort_order);
create index if not exists products_category_idx on public.products (category);

drop trigger if exists products_touch on public.products;
create trigger products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;
drop policy if exists "products: rw" on public.products;
create policy "products: rw" on public.products for all to authenticated using (true) with check (true);

-- Wat seed-data zodat verkopers direct iets hebben om uit te kiezen.
-- LET OP: 0010 deactiveert deze items en 0011 wist + reseedt; deze
-- waarden zijn alleen relevant als je 0002 standalone op een lege DB
-- draait. Idempotent gemaakt via WHERE NOT EXISTS zodat re-run niet
-- dupliceert (products heeft pas in 0010 een unique-index op name).
insert into public.products (name, description, category, unit, default_price_cents, sort_order)
select * from (values
  ('Staal frame 40×20', 'Stalen kozijn op maat, RAL standaard', 'Frame', 'stuk', 0, 10),
  ('Glas helder', 'Helder veiligheidsglas, conform schets', 'Glas', 'stuk', 0, 20),
  ('Glas mat',    'Matglas, conform schets',                 'Glas', 'stuk', 0, 21),
  ('Glas cathedraal-flute', 'Cathedraal / fluteglas', 'Glas', 'stuk', 0, 22),
  ('Greep — long handle', 'Stalen long handle, RAL identiek aan frame', 'Greep', 'stuk', 0, 30),
  ('Greep — L-grip', 'L-vormige greep', 'Greep', 'stuk', 0, 31),
  ('Slot Litto 30/30',   'Cilinderslot Litto 30/30',         'Slot', 'stuk', 0, 40),
  ('Pivotica-systeem',   'Pivotica scharnier voor zware deuren', 'Systeem', 'stuk', 0, 50),
  ('Soft close',         'Soft close optie', 'Systeem', 'stuk', 0, 51),
  ('Plaatsing standaard','Plaatsing inclusief afregeling',    'Plaatsing', 'u', 0, 90),
  ('Afwerking poederlak','Poederlak in gekozen RAL',          'Afwerking', 'stuk', 0, 60),
  ('Transport',          'Transportkosten naar werf',          'Logistiek', 'stuk', 0, 80)
) as v(name, description, category, unit, default_price_cents, sort_order)
where not exists (select 1 from public.products);

-- ─── Activities (timeline per opportunity) ────────────────────
create table if not exists public.activities (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  kind            text not null,                    -- 'stage_change', 'note', 'order_saved', 'quote_sent', etc.
  message         text not null,
  meta            jsonb,                            -- vrij blok met details
  actor_id        uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists activities_opp_idx on public.activities (opportunity_id, created_at desc);

alter table public.activities enable row level security;
drop policy if exists "activities: rw" on public.activities;
create policy "activities: rw" on public.activities for all to authenticated using (true) with check (true);

-- Auto-log stage change op opportunities
create or replace function public.log_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'UPDATE' and old.stage is distinct from new.stage) then
    insert into public.activities (opportunity_id, kind, message, meta, actor_id)
    values (
      new.id,
      'stage_change',
      'Stage gewijzigd: ' || old.stage::text || ' → ' || new.stage::text,
      jsonb_build_object('from', old.stage, 'to', new.stage),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists opportunities_stage_log on public.opportunities;
create trigger opportunities_stage_log
  after update on public.opportunities
  for each row execute function public.log_stage_change();
