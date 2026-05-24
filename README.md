# MY DOORS — Deur Configurator

Web-app voor MY DOORS waarmee een medewerker een digitaal bestelformulier invult
en automatisch productietekening, zaaglijst en orderbon/offerte genereert.

Vervangt het handmatige papieren proces. Vermindert verkeerd-gezaagde profielen.

## Tech stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS 4 (via `@tailwindcss/vite`)
- Vitest voor unit-tests
- Native browser print (`@media print`) — geen PDF-libs
- Handgeschreven SVG-generator (geen Canvas) → scherp printbaar + schaalbaar

Single-page app, geen backend. Werkt offline.

## Scripts

```bash
npm install
npm run dev         # dev server
npm test            # unit tests (vitest run)
npm run test:watch  # watch-mode
npm run build       # productie-build naar dist/
npm run preview     # preview van de productie-build
npm run lint        # eslint
```

## Acceptance criteria (uit brief)

- [x] Referentie-input (h=2446, w=877, vert=543, horiz=200) produceert de exacte
  zaaglijst zoals in de PDF-spec. Verified met 31 unit tests in
  `src/lib/calculations.test.ts`.
- [x] Productietekening past op A4 portrait.
- [x] Live preview update bij elk veld-change (React re-render, geen debounce).
- [x] Drie outputs afzonderlijk printbaar (`@media print` met `.print-target`).
- [x] Validatie blokkeert onmogelijke configs (hoogte < 1800, lijn buiten kader, …).
- [x] Interface in het Nederlands.
- [x] Werkt offline — alleen localStorage.

## Architectuur

```
src/
├── App.tsx                          # Split-screen layout + tab-navigatie
├── components/
│   ├── OrderForm.tsx                # Het invulformulier (links)
│   ├── DrawingPreview.tsx           # Live SVG preview (rechts)
│   ├── CutListView.tsx              # Zaaglijst tabel + tekst + exports
│   ├── QuoteSheet.tsx               # Printbare offerte (A4)
│   └── Field.tsx                    # Form primitives (Field, Chips, MultiChips)
├── lib/
│   ├── types.ts                     # DoorConfig type + DEFAULT_CONFIG
│   ├── calculations.ts              # computeGeometry() + validateConfig()
│   ├── cutListGenerator.ts          # generateCutList() + formatText()/csv
│   ├── drawingGenerator.ts          # generateDrawing() — SVG-string output
│   ├── calculations.test.ts         # 31 tests, locked to 877×2446 ref
│   └── drawingGenerator.test.ts     # smoke tests + xml-escape
├── styles/print.css                 # @media print regels
└── index.css                        # Tailwind v4 + tokens
```

Alle formules zijn pure functies in `lib/`. UI-componenten consumeren pure
output. Geen externe state-lib.

## Domain-formules (verifieerbaar in `calculations.ts`)

| Item | Formule | Voorbeeld (877×2446) |
|------|---------|----------------------|
| Buitenframe verticaal | `hoogte` | 2446 |
| Buitenframe horizontaal | `breedte − 40` | 837 |
| Deurbladkader verticaal | `hoogte − 30` | 2416 |
| Deurbladkader horizontaal | `breedte − 88` | 789 |
| Glaslijst kader vert (gelaste) | `blade_vert − 40` | 2376 |
| Glaslijst kader horiz (gelaste) | `blade_horiz − 30` | 759 |
| Glaslijst kader vert (poederlak) | `blade_vert − 42` | 2374 |
| Glaslijst kader horiz (poederlak) | `blade_horiz − 32` | 757 |
| Design vert volledig (gelaste) | `glass_kader_vert − 30` | 2346 |
| Design vert volledig (poederlak) | `glass_kader_vert − 32` | 2344 |
| Dwarslat-segment links (gelaste) | `vert_lijn + 1` | 544 |
| Dwarslat-segment links (poederlak) | `vert_lijn` | 543 |
| Dwarslat-segment rechts (gelaste) | `glass_kader_horiz_gelaste − segm_links_gelaste − 15` | 200 |
| Dwarslat-segment rechts (poederlak) | `glass_kader_horiz_poederlak − segm_links_poederlak − 15` | 199 |
| Glas-afmetingen | `blade_horiz − 8` × `blade_vert − 48` | 781 × 2368 |
| Juosta-35×4 verticaal | `hoogte` | 2446 |
| Juosta-35×4 horizontaal | `breedte − 70` | 807 |
| Kampas 30×30 lengte | vast 700 mm | 700 |

## Open TODOs voor MUCA / klant

1. Bedrijfsgegevens MY DOORS verifiëren (postcode/plaats voor Lindemstraat 200 unit C4).
2. BTW-nummer voor de offerte aanvullen.
3. Greep-lengte 700mm: altijd vast of variabel met deurhoogte?
4. Glas-formule blade × (blade_horiz − 8) × (blade_vert − 48) bevestigen voor andere maten.
5. De `−88` speling is voor 40×20 frame; bij ander profiel moet dit een variabele worden.

Zoek `// TODO:` in de code om de exacte plaatsen te vinden.
