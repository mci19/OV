# Supabase setup voor MY DOORS CRM

## Eenmalig: project aanmaken

1. Ga naar https://supabase.com → **New project**
2. Region: `EU West (Ireland)` (België → EU is verplicht voor klantgegevens)
3. Project naam: `mydoors-crm` (vrij)
4. Genereer een sterk database-wachtwoord en bewaar het in 1Password/etc.

## Schema laden

1. Open je project → **SQL Editor** → **New query**
2. Plak de inhoud van `supabase/migrations/0001_init.sql`
3. Klik **Run** (rechtsonder)
4. Je ziet `Success. No rows returned.` als alles klopt.

## Auth configureren

1. **Authentication → Providers**
   - **Email** aan (staat default aan); zet **Confirm email** UIT voor v1
     (anders moet elke user op een link klikken voordat ze inloggen)
   - Andere providers: uit
2. **Authentication → URL configuration**
   - Site URL: `https://<jouw-netlify-domein>.netlify.app`
   - Redirect URLs: zelfde + `http://localhost:5173` (voor lokaal testen)

## Eerste user aanmaken

1. **Authentication → Users → Add user → Create new user**
2. Email: `muharrem@mydoors.be` (of welk adres je wil)
3. Wachtwoord: kies sterk
4. Vink "Auto Confirm User" aan
5. Klik **Create user**
6. Open `profiles` tabel; pas `full_name` aan als je wil

Herhaal voor Joeri en eventuele collega's.

## Lokaal en op Netlify configureren

In de Supabase Dashboard → **Project Settings → API**, kopieer:
- **Project URL** (bv. `https://abcdefgh.supabase.co`)
- **anon public** key (mag client-side)

⚠ De **service_role** key NOOIT in client-code. Alleen anon-key.

### Lokaal

Maak `.env.local` in de root:
```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI…
```

### Netlify

Site settings → **Environment variables** → Add:
- `VITE_SUPABASE_URL` = je URL
- `VITE_SUPABASE_ANON_KEY` = je anon key

Daarna **Deploys → Trigger deploy → Clear cache and deploy site**.

## Schema-wijzigingen later

Voeg een nieuw bestand toe in `supabase/migrations/` met oplopende prefix
(bv. `0002_add_x.sql`) en draai het in de SQL editor. Pas dezelfde wijziging
toe in TypeScript-types (`src/lib/db.ts`).
