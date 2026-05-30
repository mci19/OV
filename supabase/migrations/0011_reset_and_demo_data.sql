-- 0011: reset business data + complete catalog + demo data
--
-- Doel:
--   1. Volledig wissen van klant-/opportunity-/quote-/order-/activity-data
--      zodat we vanaf nul beginnen voor de pilot-launch.
--   2. profiles + auth.users + app_settings + option_lists BLIJVEN STAAN
--      (anders verliezen we ingelogde gebruikers en hun rollen).
--   3. Catalogus opnieuw vullen met de COMPLETE set producten uit de v5
--      type-definitie (incl. items die nog ontbraken: greep 'andere',
--      slot 'geen cilinder', alle afwerkings-types, alle RAL-opties).
--   4. Demo-data: 5 Belgische klanten, opportunities op alle stages,
--      offertes in alle statussen.
--
-- Bilinguale catalogus: 'name' staat in NL (primaire taal). De
-- 'description' bevat NL + EN gescheiden door " · " zodat EN-gebruikers
-- direct de vertaling zien.
--
-- Idempotent: kan opnieuw gedraaid worden — de wipe-stap wist altijd
-- eerst alles voordat we opnieuw seedjes.

begin;

-- ─── Wipe business-data ──────────────────────────────────────
-- Volgorde: respecteer foreign keys. Activities + orders + quotes
-- cascade via opportunities, maar we doen het expliciet voor de
-- duidelijkheid.
delete from public.activities;
delete from public.quotes;
delete from public.orders;
delete from public.opportunities;
delete from public.customers;
delete from public.products;

-- ─── Catalogus ───────────────────────────────────────────────
-- Volgorde-conventie (sort_order):
--    10-19  Deurtypes
--    100-199 Glas
--    200-299 Greep
--    300-399 Slot
--    400-499 Afwerking + opties
--    500-599 Kleur
--    600+   Plaatsing + logistiek

insert into public.products (name, description, category, unit, default_price_cents, sort_order, active) values
  -- ── Deurtypes (4) ──────────────────────────────────────────
  ('Deur — Enkele deur',
   'Stalen binnendeur op maat, enkel paneel · Custom steel single door',
   'Deur', 'stuk', 0, 10, true),
  ('Deur — Dubbele deur',
   'Stalen binnendeur op maat, dubbele uitvoering · Custom steel double door',
   'Deur', 'stuk', 0, 11, true),
  ('Deur — Met vast zij- of bovenpaneel',
   'Enkele deur met vast paneel ernaast of erboven · Single door with fixed side or top panel',
   'Deur', 'stuk', 0, 12, true),
  ('Deur — Pivot',
   'Pivot-gemonteerde deur (Pivotica-systeem inbegrepen) · Pivot-hinged door (Pivotica system included)',
   'Deur', 'stuk', 0, 13, true),

  -- ── Glas (8) ───────────────────────────────────────────────
  ('Glas — Transparant',
   'Helder veiligheidsglas · Clear safety glass',
   'Glas', 'm²', 0, 100, true),
  ('Glas — Mat',
   'Matglas, zandgestraald · Frosted (sandblasted) glass',
   'Glas', 'm²', 0, 101, true),
  ('Glas — Flute',
   'Fluteglas met verticale ribbels · Fluted glass, vertical reeded pattern',
   'Glas', 'm²', 0, 102, true),
  ('Glas — Kathedraal',
   'Kathedraal-glas, klassiek patroon · Cathedral glass, classic textured pattern',
   'Glas', 'm²', 0, 103, true),
  ('Glas — Smoke',
   'Rookglas, gedimd doorzicht · Smoke (tinted) glass',
   'Glas', 'm²', 0, 104, true),
  ('Glas — Absolut black',
   'Volledig zwart glas, niet doorzichtig · Fully opaque black glass',
   'Glas', 'm²', 0, 105, true),
  ('Glas — Chinchilla',
   'Chinchilla-glas met decoratief patroon · Chinchilla glass with decorative pattern',
   'Glas', 'm²', 0, 106, true),
  ('Glas — Crepi',
   'Crepi-glas met onregelmatige textuur · Crepi glass with irregular textured finish',
   'Glas', 'm²', 0, 107, true),

  -- ── Greep (7) ──────────────────────────────────────────────
  ('Greep — L-greep 200 mm',
   'L-profiel verticale greep, default 200 mm · L-profile vertical handle, default 200 mm',
   'Greep', 'stuk', 0, 200, true),
  ('Greep — L-verticaal volle hoogte',
   'Verticale greep over volle deurhoogte (U-vorm) · Vertical handle, full door height (U-shape)',
   'Greep', 'stuk', 0, 201, true),
  ('Greep — Horizontale stang 200 mm',
   'Horizontale stang-greep, default 200 mm · Horizontal bar handle, default 200 mm',
   'Greep', 'stuk', 0, 202, true),
  ('Greep — T-greep 200 mm',
   'T-vormige greep, default 200 mm · T-shape handle, default 200 mm',
   'Greep', 'stuk', 0, 203, true),
  ('Greep — Op maat',
   'Greep op maat — vermeld de lengte in mm · Custom handle — specify length in mm',
   'Greep', 'stuk', 0, 204, true),
  ('Greep — Veerklink',
   'Klassieke horizontale klink-deurkruk · Classic horizontal lever-style door handle',
   'Greep', 'stuk', 0, 205, true),
  ('Greep — Andere uitvoering',
   'Andere greep-uitvoering — vermeld details in opmerkingen · Other handle type — specify details in remarks',
   'Greep', 'stuk', 0, 206, true),

  -- ── Slot (6) ───────────────────────────────────────────────
  ('Slot — Cilinder Litto 30/30',
   'Cilinderslot Litto 30/30 · Litto 30/30 cylinder lock',
   'Slot', 'stuk', 0, 300, true),
  ('Slot — Magneetslot',
   'Magnetisch insteekslot · Magnetic mortise lock',
   'Slot', 'stuk', 0, 301, true),
  ('Slot — Elektronisch / smart',
   'Elektronisch slot met code of badge · Electronic / smart lock (code or badge)',
   'Slot', 'stuk', 0, 302, true),
  ('Slot — Sleutelgat alleen',
   'Voorbereiding sleutelgat zonder cilinder · Keyhole preparation without cylinder',
   'Slot', 'stuk', 0, 303, true),
  ('Slot — Zonder cilinder',
   'Geen cilinder voorzien · No cylinder included',
   'Slot', 'stuk', 0, 304, true),
  ('Slot — Andere uitvoering',
   'Ander slot — vermeld details in opmerkingen · Other lock type — specify details in remarks',
   'Slot', 'stuk', 0, 305, true),

  -- ── Afwerking (3) ──────────────────────────────────────────
  ('Afwerking — Glaslijst 10×10',
   'Glaslijst-profiel 10×10 mm · 10×10 mm glazing bead profile',
   'Afwerking', 'stuk', 0, 400, true),
  ('Afwerking — Glaslijst 15×15',
   'Glaslijst-profiel 15×15 mm (MY DOORS standaard) · 15×15 mm glazing bead profile (MY DOORS standard)',
   'Afwerking', 'stuk', 0, 401, true),
  ('Afwerking — Soudal-mastiek',
   'Glas-afdichting met Soudal mastiek · Glass sealing with Soudal mastic',
   'Afwerking', 'stuk', 0, 402, true),

  -- ── Opties (2) ─────────────────────────────────────────────
  ('Optie — Soft open',
   'Soft open mechanisme · Soft-open mechanism',
   'Optie', 'stuk', 0, 410, true),
  ('Optie — Soft close',
   'Soft close mechanisme · Soft-close mechanism',
   'Optie', 'stuk', 0, 411, true),

  -- ── Kleur (3) ──────────────────────────────────────────────
  ('Kleur — RAL 9005 (zwart)',
   'Poederlak RAL 9005 mat zwart · Powder coat RAL 9005 matte black',
   'Kleur', 'stuk', 0, 500, true),
  ('Kleur — RAL 9010 (wit)',
   'Poederlak RAL 9010 mat wit · Powder coat RAL 9010 matte white',
   'Kleur', 'stuk', 0, 501, true),
  ('Kleur — Andere RAL',
   'Andere RAL-code op aanvraag · Other RAL code on request',
   'Kleur', 'stuk', 0, 502, true),

  -- ── Plaatsing + transport ──────────────────────────────────
  ('Plaatsing — Standaard',
   'Plaatsing inclusief afregeling · Installation including adjustment',
   'Plaatsing', 'u', 0, 600, true),
  ('Plaatsing — Buiten Brussels Gewest',
   'Toeslag voor plaatsing buiten Brussels Gewest · Surcharge for installation outside Brussels region',
   'Plaatsing', 'stuk', 0, 601, true),
  ('Transport',
   'Transportkosten naar werf · Transport costs to job site',
   'Logistiek', 'stuk', 0, 700, true);

-- ─── Demo data: customers ────────────────────────────────────
-- Vijf Belgische klanten over verschillende segmenten (particulier,
-- BVBA, architect, NV). Adressen zijn fictief maar realistisch
-- Belgisch geformatteerd.

with new_customers as (
  insert into public.customers (id, name, email, phone, address_line1, address_city, address_postal, notes) values
    (gen_random_uuid(), 'Familie De Vos',
     'devos.familie@example.be', '+32 470 12 34 56',
     'Vlasmarkt 14', 'Antwerpen', '2000',
     'Renovatie ouderlijk woonhuis · Renovation of family home — referral'),
    (gen_random_uuid(), 'BVBA Architectenbureau Janssens',
     'info@janssens-architecten.be', '+32 9 233 45 67',
     'Korenmarkt 8', 'Gent', '9000',
     'Architect partner sinds 2024 · Architect partner since 2024 — multi-project'),
    (gen_random_uuid(), 'Sarah Goossens',
     'sarah.goossens@example.be', '+32 475 98 76 54',
     'Tiensestraat 102', 'Leuven', '3000',
     'Eerste contact via website · First contact via website form'),
    (gen_random_uuid(), 'The Loft Studio NV',
     'projects@theloftstudio.be', '+32 2 514 22 33',
     'Avenue Louise 250', 'Brussel', '1050',
     'Commercial interior studio — English-speaking contact preferred'),
    (gen_random_uuid(), 'Renovatie Demo BVBA',
     'demo@renovatie-demo.be', '+32 11 28 67 89',
     'Maastrichterstraat 45', 'Hasselt', '3500',
     'Aannemer · Building contractor — repeat customer')
  returning id, name
)

-- ─── Demo opportunities ──────────────────────────────────────
-- Eén opportunity per stage zodat de pipeline-board direct mooi
-- gevuld is voor de pilot-demo. expected_value_cents in EUR-cents.
,
opps as (
  insert into public.opportunities (id, customer_id, title, stage, expected_value_cents, notes)
  select
    gen_random_uuid(), c.id, t.title, t.stage::opportunity_stage, t.value, t.notes
  from new_customers c
  cross join lateral (values
    ('Familie De Vos',                       'Stalen scheidingsdeur woonkamer',           'lead',       180000,  'Inkomende lead via Instagram-advertentie · Inbound lead via Instagram ad'),
    ('BVBA Architectenbureau Janssens',      'Project Penthouse Zuid — 3 deuren',         'meeting',    920000,  'Meeting ingepland 12 juni · Meeting scheduled June 12'),
    ('Sarah Goossens',                       'Keukendeur pivot 1100×2400',                'quote_sent', 285000,  'Offerte verzonden, wacht op antwoord · Quote sent, awaiting reply'),
    ('The Loft Studio NV',                   'Loft-renovatie — 5 deuren + 2 panelen',     'won',        4250000, 'Order bevestigd · Order confirmed — start week 24'),
    ('Renovatie Demo BVBA',                  'Showroom-deur 1800×2700 dubbel',            'lost',       360000,  'Klant koos voor hout · Customer chose wood instead')
  ) as t(cust_name, title, stage, value, notes)
  where c.name = t.cust_name
  returning id, customer_id, title, stage
)

-- ─── Demo orders ─────────────────────────────────────────────
-- Eén minimal order (jsonb data) voor de "won" opportunity zodat de
-- order-koppeling van quotes werkt. Andere opps krijgen geen order
-- (de gebruiker maakt die zelf via de UI).
,
demo_orders as (
  insert into public.orders (id, opportunity_id, data, version)
  select
    gen_random_uuid(),
    o.id,
    jsonb_build_object(
      'referentie',       'DEMO-LOFT-01',
      'klantNaam',        'The Loft Studio NV',
      'datum',            to_char(current_date, 'YYYY-MM-DD'),
      'verkoper',         'Demo verkoper',
      'doorType',         'production',
      'hoogte',           2400,
      'breedte',          1100,
      'aantalDeuren',     1,
      'hingeKind',        'single',
      'hingeSide',        'belgisch_links',
      'glassType',        'clear',
      'glassOther',       '',
      'system',           'pivotica',
      'variants',         '[]'::jsonb,
      'doorConfig',       'pivot',
      'sidePanels',       '[]'::jsonb,
      'leftPanelWidth',   400,
      'rightPanelWidth',  400,
      'topPanelHeight',   300,
      'softOpen',         false,
      'softClose',        true,
      'finishing',        'glasslist_15',
      'handleKind',       'l_vertical',
      'handleVerticalMm', 0,
      'handleOther',      '',
      'handlePosition',   jsonb_build_object('side','right','heightFromBottom',1050),
      'lockKind',         'cilinder_litto',
      'lockOther',        '',
      'colorKind',        'ral_9005',
      'colorOther',       '',
      'opmerkingen',      'Demo-order voor pilot · Demo order for pilot',
      'plaatsingInbegrepen', true,
      'sketch',           jsonb_build_object(
                            'verticalLines', '[]'::jsonb,
                            'horizontalLines', '[]'::jsonb,
                            'freehand', '[]'::jsonb,
                            'curves', '[]'::jsonb
                          )
    ),
    1
  from opps o
  where o.stage = 'won'
  returning id, opportunity_id
)

-- ─── Demo quotes ─────────────────────────────────────────────
-- Drie offertes: één verstuurd (quote_sent stage), één geaccepteerd
-- (won stage met order-link), één draft (lead stage).
insert into public.quotes (
  opportunity_id, order_id, reference,
  line_items,
  subtotal_cents, vat_rate, vat_cents, total_cents,
  valid_until, status, sent_at, accepted_at
)
select
  o.id,
  do_.id,                          -- alleen voor 'won', anders NULL
  q.reference,
  q.line_items::jsonb,
  q.subtotal,
  21.00,
  round(q.subtotal * 0.21)::int,
  q.subtotal + round(q.subtotal * 0.21)::int,
  q.valid_until::date,
  q.status::quote_status,
  q.sent_at::timestamptz,
  q.accepted_at::timestamptz
from opps o
left join demo_orders do_ on do_.opportunity_id = o.id
join lateral (values
  ('quote_sent',
   'Q-2026-001',
   '[
      {"id":"li-1","description":"Stalen pivot-deur 1100×2400 · Steel pivot door 1100×2400","quantity":1,"unit_cents":215000},
      {"id":"li-2","description":"Glas helder veiligheid · Clear safety glass","quantity":1,"unit_cents":48000},
      {"id":"li-3","description":"Greep L-verticaal volle hoogte · Full-height L handle","quantity":1,"unit_cents":18000},
      {"id":"li-4","description":"Plaatsing inclusief afregeling · Installation incl. adjustment","quantity":4,"unit_cents":7500}
    ]',
   311000, '2026-06-30', 'sent',     (now() - interval '5 days')::text, null),
  ('won',
   'Q-2026-002',
   '[
      {"id":"li-1","description":"5× stalen binnendeur op maat · 5× custom steel interior door","quantity":5,"unit_cents":225000},
      {"id":"li-2","description":"2× vast zijpaneel 400 mm · 2× fixed side panel 400 mm","quantity":2,"unit_cents":85000},
      {"id":"li-3","description":"Glas Flute (alle deuren) · Flute glass (all doors)","quantity":7,"unit_cents":52000},
      {"id":"li-4","description":"Slot magneet (5×) · Magnetic lock (5×)","quantity":5,"unit_cents":18000},
      {"id":"li-5","description":"Plaatsing showroom · Showroom installation","quantity":12,"unit_cents":7500},
      {"id":"li-6","description":"Transport Brussel · Transport Brussels","quantity":1,"unit_cents":15000}
    ]',
   1854000, '2026-07-15', 'accepted', (now() - interval '20 days')::text, (now() - interval '8 days')::text),
  ('lead',
   'Q-2026-003',
   '[
      {"id":"li-1","description":"Stalen scheidingsdeur woonkamer · Steel room-divider door","quantity":1,"unit_cents":175000},
      {"id":"li-2","description":"Plaatsing · Installation","quantity":3,"unit_cents":7500}
    ]',
   197500, '2026-06-15', 'draft',    null, null)
) as q(stage, reference, line_items, subtotal, valid_until, status, sent_at, accepted_at)
  on o.stage::text = q.stage;

commit;

-- ─── Sanity-check (informatie, geen failure) ─────────────────
do $$
declare
  n_products integer;
  n_customers integer;
  n_opps integer;
  n_quotes integer;
begin
  select count(*) into n_products  from public.products  where active;
  select count(*) into n_customers from public.customers;
  select count(*) into n_opps      from public.opportunities;
  select count(*) into n_quotes    from public.quotes;
  raise notice 'Seed klaar: % producten (active), % klanten, % opportunities, % offertes',
    n_products, n_customers, n_opps, n_quotes;
end $$;
