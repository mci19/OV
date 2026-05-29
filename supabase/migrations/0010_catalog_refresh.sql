-- 0010: catalogus-refresh voor de nieuwe greep/glas/deur-types
--
-- Voegt seed-producten toe voor:
--   - 8 glassoorten (transparant, mat, flute, kathedraal, smoke,
--     absolut black, chinchilla, crepi)
--   - 7 greep-types (L-greep 200, L-verticaal volle hoogte, T-greep,
--     Horizontale stang, Greep op maat 500, Veerklink, custom)
--   - 4 deurtypes (enkel, dubbel, met zij/bovenpaneel, pivot)
--
-- Bestaande verouderde entries worden gedeactiveerd (active=false) i.p.v.
-- verwijderd, om bestaande quote-history intact te laten.
--
-- ON CONFLICT op (name): re-runs zijn idempotent zolang de naam uniek is.
-- Daarom voegen we eerst een unique-index toe als die nog niet bestaat.

create unique index if not exists products_name_unique on public.products (name);

-- ─── Verouderde entries deactiveren ──────────────────────────
update public.products
  set active = false,
      description = coalesce(description, '') || ' (verouderd — vervangen door nieuwe varianten in v5)'
  where name in (
    'Glas cathedraal-flute',  -- gesplitst in flute + kathedraal
    'Greep — long handle',    -- vervangen door greep-op-maat
    'Pivotica-systeem',       -- nu deel van deurtype 'pivot'
    'Afwerking poederlak'     -- finishing-sectie weg
  );

-- ─── Glassoorten ─────────────────────────────────────────────
insert into public.products (name, description, category, unit, default_price_cents, sort_order, active) values
  ('Glas — Transparant',     'Helder veiligheidsglas',          'Glas', 'm²', 0, 100, true),
  ('Glas — Mat',             'Matglas (zandgestraald)',         'Glas', 'm²', 0, 101, true),
  ('Glas — Flute',           'Flute-glas met verticale ribbels','Glas', 'm²', 0, 102, true),
  ('Glas — Kathedraal',      'Kathedraal-glas, klassiek patroon','Glas', 'm²', 0, 103, true),
  ('Glas — Smoke',           'Rookglas, gedimd doorzicht',      'Glas', 'm²', 0, 104, true),
  ('Glas — Absolut black',   'Volledig zwart glas, niet doorzichtig','Glas', 'm²', 0, 105, true),
  ('Glas — Chinchilla',      'Chinchilla-glas met decoratief patroon','Glas', 'm²', 0, 106, true),
  ('Glas — Crepi',           'Crepi-glas met onregelmatige textuur','Glas', 'm²', 0, 107, true)
  on conflict (name) do update set
    category    = excluded.category,
    unit        = excluded.unit,
    sort_order  = excluded.sort_order,
    active      = true,
    description = excluded.description;

-- ─── Grepen ───────────────────────────────────────────────────
insert into public.products (name, description, category, unit, default_price_cents, sort_order, active) values
  ('Greep — L-greep 200 mm',         'L-profiel verticale greep, default 200 mm', 'Greep', 'stuk', 0, 200, true),
  ('Greep — L-verticaal volle hoogte','Verticale greep over volle deurhoogte (U-vorm)', 'Greep', 'stuk', 0, 201, true),
  ('Greep — Horizontale stang 200 mm','Horizontale stang-greep, default 200 mm',   'Greep', 'stuk', 0, 202, true),
  ('Greep — T-greep 200 mm',         'T-vormige greep, default 200 mm',           'Greep', 'stuk', 0, 203, true),
  ('Greep — Op maat (per stuk)',     'Greep op maat — vermeld de lengte in mm bij bestelling', 'Greep', 'stuk', 0, 204, true),
  ('Greep — Veerklink',              'Klassieke horizontale klink-deurkruk (lever + rozet)', 'Greep', 'stuk', 0, 205, true)
  on conflict (name) do update set
    category    = excluded.category,
    unit        = excluded.unit,
    sort_order  = excluded.sort_order,
    active      = true,
    description = excluded.description;

-- ─── Deurtypes (basis) ───────────────────────────────────────
insert into public.products (name, description, category, unit, default_price_cents, sort_order, active) values
  ('Deur — Enkele deur',                    'Stalen binnendeur op maat, enkel paneel', 'Deur', 'stuk', 0, 10, true),
  ('Deur — Dubbele deur',                   'Stalen binnendeur op maat, dubbele uitvoering', 'Deur', 'stuk', 0, 11, true),
  ('Deur — Met vast zij- of bovenpaneel',   'Enkele deur met vast paneel ernaast of erboven', 'Deur', 'stuk', 0, 12, true),
  ('Deur — Pivot',                          'Pivot-gemonteerde deur (Pivotica-systeem inbegrepen)', 'Deur', 'stuk', 0, 13, true)
  on conflict (name) do update set
    category    = excluded.category,
    unit        = excluded.unit,
    sort_order  = excluded.sort_order,
    active      = true,
    description = excluded.description;

-- ─── Slot-types (compleet) ───────────────────────────────────
insert into public.products (name, description, category, unit, default_price_cents, sort_order, active) values
  ('Slot — Cilinder Litto 30/30', 'Cilinderslot Litto 30/30',          'Slot', 'stuk', 0, 300, true),
  ('Slot — Magneetslot',          'Magnetisch insteekslot',            'Slot', 'stuk', 0, 301, true),
  ('Slot — Elektronisch / smart', 'Elektronisch slot met code/badge',  'Slot', 'stuk', 0, 302, true),
  ('Slot — Sleutelgat alleen',    'Voorbereiding sleutelgat zonder cilinder', 'Slot', 'stuk', 0, 303, true)
  on conflict (name) do update set
    category    = excluded.category,
    unit        = excluded.unit,
    sort_order  = excluded.sort_order,
    active      = true,
    description = excluded.description;

-- ─── Opties + afwerking ──────────────────────────────────────
insert into public.products (name, description, category, unit, default_price_cents, sort_order, active) values
  ('Optie — Soft open',  'Soft open mechanisme',  'Optie', 'stuk', 0, 400, true),
  ('Optie — Soft close', 'Soft close mechanisme', 'Optie', 'stuk', 0, 401, true),
  ('Plaatsing standaard','Plaatsing inclusief afregeling',  'Plaatsing', 'u', 0, 500, true),
  ('Transport',          'Transportkosten naar werf',       'Logistiek', 'stuk', 0, 600, true)
  on conflict (name) do update set
    category    = excluded.category,
    unit        = excluded.unit,
    sort_order  = excluded.sort_order,
    active      = true,
    description = excluded.description;
