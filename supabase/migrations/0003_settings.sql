-- 0003: app-brede settings + configureerbare optie-lijsten
-- Run dit ná 0001 en 0002 in de Supabase SQL editor.

-- ─── App-settings (single-row) ────────────────────────────
-- Bedrijfsgegevens + standaardwaarden voor offertes + orders.
create table public.app_settings (
  id                       boolean primary key default true,
  -- Bedrijf
  company_name             text    not null default 'MY DOORS',
  company_address_line1    text,
  company_address_postal   text,
  company_address_city     text,
  company_email            text,
  company_phone            text,
  company_website          text,
  company_btw              text,
  company_iban             text,
  -- Offerte-defaults
  quote_vat_rate           numeric(5,2) not null default 21.00,
  quote_validity_days      integer not null default 30,
  quote_footer_note        text,
  quote_reference_prefix   text    not null default 'Q',
  -- Order-defaults
  order_number_prefix      text    not null default '',
  default_door_width       integer not null default 900,
  default_door_height      integer not null default 2300,
  default_handle_height    integer not null default 1050,
  -- Behaviour
  default_vat_rate         numeric(5,2) not null default 21.00,
  -- Meta
  updated_at               timestamptz not null default now(),
  constraint app_settings_single check (id = true)
);

-- Default row — wordt door de UI geupsert maar handig voor migrations.
insert into public.app_settings (id) values (true) on conflict do nothing;

create trigger app_settings_touch
  before update on public.app_settings
  for each row execute function public.touch_updated_at();

-- ─── Option lists (key/value met items[]) ─────────────────
-- Voor lijsten waar de waarden vrij zijn: verkopers, RAL-kleuren,
-- glas-types, lock-types, handle-types. Items als jsonb-array:
--   [{ "value": "...", "label": "...", "sort_order": 10, "active": true,
--      "meta": { ... optional extra fields ... } }]
create table public.option_lists (
  id           uuid primary key default gen_random_uuid(),
  list_key     text unique not null,         -- bv. 'verkopers', 'ral_colors'
  description  text,
  items        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger option_lists_touch
  before update on public.option_lists
  for each row execute function public.touch_updated_at();

-- Seed: verkopers (uitbreidbaar via Settings UI)
insert into public.option_lists (list_key, description, items) values
  ('verkopers',
   'Lijst met verkopers die op een opportunity kunnen staan',
   '[
     {"value":"Muharrem","label":"Muharrem","sort_order":10,"active":true},
     {"value":"Joeri","label":"Joeri","sort_order":20,"active":true}
   ]'::jsonb)
  on conflict (list_key) do nothing;

-- Seed: extra RAL-kleuren (naast de hardcoded 9005/9010/other).
-- 'meta.color' = visuele hex voor weergave op de schets.
insert into public.option_lists (list_key, description, items) values
  ('ral_extras',
   'Extra RAL-kleuren beschikbaar als "Other" optie',
   '[
     {"value":"ral_7016","label":"RAL 7016 Antraciet","sort_order":10,"active":true,"meta":{"color":"#383B40"}},
     {"value":"ral_7021","label":"RAL 7021 Zwartgrijs","sort_order":20,"active":true,"meta":{"color":"#2F3134"}},
     {"value":"ral_9006","label":"RAL 9006 Wit aluminium","sort_order":30,"active":true,"meta":{"color":"#A5A5A0"}},
     {"value":"ral_5010","label":"RAL 5010 Gentiaanblauw","sort_order":40,"active":false,"meta":{"color":"#1F4F8C"}}
   ]'::jsonb)
  on conflict (list_key) do nothing;

-- ─── RLS ──────────────────────────────────────────────────
alter table public.app_settings enable row level security;
alter table public.option_lists enable row level security;

create policy "app_settings: read"  on public.app_settings for select to authenticated using (true);
create policy "app_settings: write" on public.app_settings for update to authenticated using (true) with check (true);
-- Geen insert nodig (single row bestaat al via seed).

create policy "option_lists: rw" on public.option_lists for all to authenticated using (true) with check (true);
