-- 0014: AI usage tracking + per-user rate limit
--
-- De ai-sketch Netlify function laat élke ingelogde gebruiker
-- onbeperkt Anthropic-credits verbruiken. Voor de pilot is het
-- voldoende om een SOFT quota af te dwingen op basis van een per-user
-- per-dag teller.
--
-- Server-side telt op (security definer functie); client krijgt 429
-- bij overschrijden van AI_DAILY_LIMIT (default 50/dag, instelbaar via
-- Netlify env-var).
--
-- ai_usage rij = 1 per user per dag. PRIMARY KEY (user_id, day) zorgt
-- dat we niet steeds nieuwe rows aanmaken — de teller wordt geupsert.

begin;

create table if not exists public.ai_usage (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null default current_date,
  count    integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

-- Eigen tellers lezen (handig voor "x van Y vandaag" UI). Admins
-- mogen alles zien. Niemand mag direct schrijven — de increment loopt
-- via de increment_ai_usage() functie hieronder (security definer).
drop policy if exists "ai_usage: read" on public.ai_usage;
create policy "ai_usage: read" on public.ai_usage
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Geen INSERT/UPDATE/DELETE policies = alleen security-definer
-- functies kunnen schrijven (in praktijk: de increment-functie die
-- aangeroepen wordt vanuit de Netlify function via service-role).

-- Increment-helper: atomisch +1 + return de NIEUWE telling.
-- Wordt door de ai-sketch Netlify function aangeroepen via REST RPC
-- (met service-role key). Retourneert de count na increment, plus de
-- limiet die de caller kan vergelijken.
create or replace function public.increment_ai_usage(p_user_id uuid)
returns table(new_count integer, day date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_day   date := current_date;
begin
  insert into public.ai_usage (user_id, day, count, updated_at)
  values (p_user_id, v_day, 1, now())
  on conflict (user_id, day) do update
    set count = public.ai_usage.count + 1,
        updated_at = now()
  returning count into v_count;
  return query select v_count, v_day;
end;
$$;

-- Alleen service-role roept dit aan; we exposeren de functie expliciet
-- naar service_role en blokkeren voor authenticated (de client mag
-- niet zomaar de teller bumpen).
revoke all on function public.increment_ai_usage(uuid) from public, authenticated;
grant execute on function public.increment_ai_usage(uuid) to service_role;

commit;
