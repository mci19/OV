-- 0004: zaag-formules instelbaar via Settings
-- Voegt een jsonb-blob toe aan app_settings met alle "magic numbers"
-- die de zaag-lijst berekening aansturen. Default-waarden komen exact
-- overeen met de oorspronkelijke hardcoded constanten zodat bestaande
-- bestellingen identieke lijsten geven na de migratie.

alter table public.app_settings
  add column if not exists cut_formulas jsonb not null default '{
    "kozijn_horiz_aftrek": 40,
    "blade_vert_aftrek": 30,
    "blade_horiz_aftrek": 88,
    "glaslijst_vert_aftrek": 40,
    "glaslijst_horiz_aftrek": 30,
    "poederlak_marge_per_zijde": 1,
    "design_vert_gelaste_aftrek": 30,
    "design_vert_poederlak_aftrek": 32,
    "verticaal_breedte": 15,
    "juosta_horiz_aftrek": 70,
    "greep_l_grip_lengte": 200,
    "greep_horizontal_bar_lengte": 200,
    "greep_other_default_lengte": 700
  }'::jsonb;

-- Ensure de bestaande single-row krijgt de defaults
update public.app_settings
  set cut_formulas = coalesce(cut_formulas, '{
    "kozijn_horiz_aftrek": 40,
    "blade_vert_aftrek": 30,
    "blade_horiz_aftrek": 88,
    "glaslijst_vert_aftrek": 40,
    "glaslijst_horiz_aftrek": 30,
    "poederlak_marge_per_zijde": 1,
    "design_vert_gelaste_aftrek": 30,
    "design_vert_poederlak_aftrek": 32,
    "verticaal_breedte": 15,
    "juosta_horiz_aftrek": 70,
    "greep_l_grip_lengte": 200,
    "greep_horizontal_bar_lengte": 200,
    "greep_other_default_lengte": 700
  }'::jsonb)
  where id = true;
