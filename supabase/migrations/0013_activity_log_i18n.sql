-- 0013: activity-log i18n
--
-- De stage-change-trigger in 0002 zette `message` direct in het
-- Nederlands:  'Stage gewijzigd: lead → meeting'. EN-gebruikers zagen
-- in hun timeline dus altijd Nederlandse system-messages.
--
-- Oplossing: de trigger schrijft enkel `kind='stage_change'` en
-- `meta={from, to}`. De client rendert de tekst op basis van `kind`
-- + huidige taal (zie src/components/ActivityTimeline.tsx). Bestaande
-- records met NL-message blijven werken: de timeline renderer valt
-- terug op het `message`-veld als kind onbekend is.

begin;

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
      '',  -- lege string: client rendert vanuit kind+meta
      jsonb_build_object('from', old.stage, 'to', new.stage),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

commit;
