-- 0009: nieuwe greep-types in cut_formulas
--
-- T-greep en greep-op-maat (custom) zijn toegevoegd als nieuwe greep-
-- types. Voeg hun default-lengtes toe aan de bestaande cut_formulas
-- jsonb-blob op app_settings zonder de andere keys te verstoren.
--
-- Veilig idempotent: jsonb_set met conditioneel pad.

update public.app_settings
  set cut_formulas = cut_formulas
    || jsonb_build_object(
      'greep_t_grip_lengte',
      coalesce((cut_formulas->>'greep_t_grip_lengte')::numeric, 200),
      'greep_custom_default_lengte',
      coalesce((cut_formulas->>'greep_custom_default_lengte')::numeric, 500)
    )
  where id = true;
