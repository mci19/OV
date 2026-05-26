# MY DOORS — CRM v4

Showroom-CRM voor MY DOORS-verkopers met klanten, opportunities,
interactieve deur-schets en offerte-generatie. Auth + cloud-data via Supabase.

## Functionaliteit

| | |
|---|---|
| **Auth** | E-mail + wachtwoord via Supabase Auth |
| **Klanten** | CRUD met zoeken, adres, notities |
| **Opportunities** | Pipeline-stages (Lead → Afspraak → Offerte → Akkoord/Verloren) |
| **Schets-module** | iPad-vriendelijk: templates, draggable lijnen met snap, Apple Pencil freehand, klant-zicht |
| **Bestellings-PDF** | Voor fabrikant (specs + schets met maten) |
| **Klant-PDF** | Klant-zicht schets + keuzes in NL |
| **Offertes** | Line items + BTW + totalen + PDF met handtekenvelden |
| **Mobile** | Responsive met drawer-nav |
| **PWA** | Installeerbaar op iPad home screen |

## Tech stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS 4
- React Router 7 (SPA routing)
- TanStack Query (server state)
- Supabase (Auth + Postgres + RLS)
- `@react-pdf/renderer` voor PDFs
- `vite-plugin-pwa` (Workbox)
- Vitest

## Eerste keer opzetten

### 1. Supabase project + schema

Zie `supabase/README.md` voor stap-voor-stap. Kort:
- Maak een nieuw project op supabase.com (EU-Ireland)
- SQL Editor → plak `supabase/migrations/0001_init.sql` → Run
- Authentication → Providers → Email aan, "Confirm email" UIT
- Authentication → Users → "Add user" (maak eerste verkoper-account)

### 2. Env vars

Kopieer `.env.example` naar `.env.local` en vul in:
```
VITE_SUPABASE_URL=https://<jouw>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...   # of anon key uit project settings
```

### 3. Lokaal draaien

```bash
npm install
npm run dev
```
Open http://localhost:5173 → login.

### 4. Netlify

Site settings → **Environment variables** → voeg de twee `VITE_*` vars toe.
Daarna **Deploys → Trigger deploy → Clear cache and deploy site**.

`netlify.toml` regelt build + SPA-fallback + PWA cache-headers automatisch.

## Scripts

```bash
npm run dev          # dev server
npm test             # unit tests (11 cases)
npm run build        # prod build → dist/
npm run preview      # preview prod build lokaal
```

## Architectuur

```
src/
├── App.tsx                              # router + auth gate
├── main.tsx                             # providers: QueryClient + Auth + Router
├── lib/
│   ├── supabase.ts                      # client init
│   ├── auth.tsx                         # AuthProvider + useAuth
│   ├── db.ts                            # types matching supabase/migrations
│   ├── queries.ts                       # react-query hooks (CRUD per tabel)
│   ├── types.ts                         # OrderData + SketchData
│   ├── calculations.ts                  # validatie + label helpers
│   ├── templates.ts                     # schets-templates
│   ├── storage.ts                       # localStorage fallback (concepts)
│   └── orderNumber.ts
├── components/
│   ├── Layout.tsx                       # sidebar + mobile drawer
│   ├── Field.tsx                        # form primitives
│   ├── Dialog.tsx                       # modal
│   ├── Toast.tsx
│   ├── OrderForm.tsx                    # alle door-specs secties
│   ├── ActionBar.tsx                    # PDF + share (binnen opportunity)
│   ├── sketch/                          # iPad schets-module (SVG + touch)
│   └── pdf/
│       ├── FabricantOrderPDF.tsx        # bestel-PDF
│       ├── ClientConfirmPDF.tsx         # klant-bevestiging
│       ├── QuotePDF.tsx                 # offerte met line items
│       └── SketchPdfBlock.tsx           # gedeelde schets-rendering
└── pages/
    ├── LoginPage.tsx
    ├── HomePage.tsx                     # dashboard / overview
    ├── CustomersPage.tsx                # list + detail + editor dialog
    ├── OpportunitiesPage.tsx            # list met stage-filter + editor dialog
    ├── OpportunityDetailPage.tsx        # tabs: Bestelling (schets+form) / Offertes
    └── QuoteEditorPage.tsx              # line items + PDF download

supabase/
├── README.md                            # setup-instructies
└── migrations/
    └── 0001_init.sql                    # tables, triggers, RLS, view
```

## Data model

```
customers ─┐
           ├→ opportunities ─┬→ orders   (sketch + form data, jsonb)
           │                 └→ quotes   (line items, totals, status)
profiles ──┘
```

RLS-policies: v1 is single-org — iedere authenticated user heeft volledige
read+write op alle records. Later kan `organization_id` worden toegevoegd
om scope per organisatie te beperken.

## Open punten / volgende iteraties

- Customer detail page met edit (basis bestaat)
- Opportunity edit-dialog (alleen new bestaat nu)
- Product catalogus om quote-regels uit te kiezen i.p.v. handmatig
- Email-notificatie bij stage-wijziging
- Activity log / timeline per opportunity
- Multi-org via Supabase RLS + invitations
- Realtime updates via Supabase channels (handig als meerdere reps tegelijk werken)
