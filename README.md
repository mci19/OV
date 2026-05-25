# MY DOORS — Bestelformulier-app v3

PWA-bestelformulier waarmee MY DOORS-verkopers (Muharrem & collega's) op de iPad
in de showroom samen met de klant een deur configureren, schetsen en als PDF
versturen naar de externe fabrikant.

**Niet voor productie**: deze app produceert geen zaaglijst of productietekening.
De fabrikant krijgt een visuele schets met exacte maatvoering die hij in zijn
eigen productiestappen vertaalt.

## Tech stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS 4 (via `@tailwindcss/vite`)
- `@react-pdf/renderer` voor PDF-output (fabrikant + klant)
- `vite-plugin-pwa` (Workbox) voor offline-installatie op iPad home screen
- Vitest voor unit-tests
- SVG + native PointerEvents voor de schets-module (geen externe canvas-lib)

iPad-first; werkt ook op desktop. Geen backend.

## Scripts

```bash
npm install
npm run dev         # dev server
npm test            # unit tests (vitest run)
npm run build       # productie-build → dist/ (inkl. PWA service worker)
npm run preview     # preview van de productie-build
npm run lint        # eslint
```

## Schets-module — drie modi

| Modus | Wie | Wat |
|-------|-----|-----|
| **Snel** | vinger | 6 voorgedefinieerde templates met thumbnail; tap-to-apply, finetuning daarna in Lijnen |
| **Lijnen** | vinger | Verticale/horizontale lijnen toevoegen, slepen, snap (10/50/100 mm of magnetisch op midden/1-3-2/3-1/4-3/4/andere lijnen). Live mm-label tijdens slepen. Long-press → exact-input dialog. Max 5+5 lijnen. |
| **Vrij** | Apple Pencil / vinger | Freehand stroke met palm-rejection (negeer touch 500 ms na laatste pen-event). Stroke-breedte schaalt met pen-pressure. |

Apple Pencil schakelt automatisch naar Vrij-modus bij eerste pen-event.

"Klant-zicht" toggle verbergt grid + maatvoering, toont glas-tint + handle filled
voor wow-factor in showroom.

## Outputs

| Doel | Inhoud |
|------|--------|
| **Fabrikant-PDF** | p.1 specificatie-tabel · p.2 schets met exacte maten · p.3 (optioneel) freehand-laag |
| **Klant-PDF** | klant-zicht schets · keuzes in begrijpelijke NL taal · geen prijzen |
| **Verstuur** | Web Share API (WhatsApp, Email, AirDrop op iOS) — fallback download als share niet beschikbaar |

Order-nummer = `YYYYMMDD-XXX` (deterministisch hash van klantnaam).

## iPad-specifieke maatregelen

- `touch-action: none` op het schets-vlak voorkomt pinch-zoom van pagina; lijnen
  slepen blijft soepel.
- `option-chip` knoppen ≥ 44pt (Apple HIG).
- `haptic feedback` via `navigator.vibrate` bij snap.
- Landscape primary, portrait fallback met tabs (Schets / Formulier).
- PWA-manifest: `display: standalone`, `orientation: landscape`, custom icon.
- Service worker (Workbox) — werkt offline, concept-bestellingen blijven bewaard.

## Architectuur

```
src/
├── App.tsx                                   # iPad split-screen + portrait tabs
├── components/
│   ├── OrderForm.tsx                         # Alle formulier-secties
│   ├── ActionBar.tsx                         # PDF-acties + Web Share
│   ├── Field.tsx                             # Form primitives (Field, Chips, MultiChips)
│   ├── sketch/
│   │   ├── SketchEditor.tsx                  # State container voor de schets
│   │   ├── DoorOutline.tsx                   # Kozijn + blad + glas-uitsparing
│   │   ├── DraggableLine.tsx                 # Touch drag + snap + mm-label
│   │   ├── FreehandLayer.tsx                 # Apple Pencil / vinger
│   │   ├── TemplateGallery.tsx               # 6 verdelingen
│   │   ├── DimensionLabels.tsx               # Auto-maatvoering
│   │   ├── HandleIndicator.tsx
│   │   └── SnapHelper.ts                     # Snap-logica (magnetisch + grid)
│   └── pdf/
│       ├── FabricantOrderPDF.tsx             # @react-pdf Document
│       ├── ClientConfirmPDF.tsx
│       └── SketchPdfBlock.tsx                # Gedeelde schets als @react-pdf <Svg>
└── lib/
    ├── types.ts                              # OrderData + SketchData
    ├── calculations.ts                       # validatie + label helpers + visualGeometry
    ├── templates.ts                          # 6 verdelingen
    ├── storage.ts                            # localStorage + concept-flow
    └── orderNumber.ts                        # YYYYMMDD-XXX
```

## Acceptatiecriteria v1

- [x] Muharrem kan complete bestelling invullen + schetsen op iPad (landscape + portrait)
- [x] Schets-update soepel (vector SVG met `vector-effect="non-scaling-stroke"`)
- [x] Fabrikant-PDF: 2 pagina's met specs + sketch met alle maatvoering
- [x] PWA: manifest + service worker (Workbox) — installeerbaar op iPad home screen
- [x] Apple Pencil-detectie → auto naar Vrij-modus, palm-rejection
- [x] Volledig in het Nederlands
- [x] localStorage: huidige order persisteert + concept-snapshots

## Open vragen voor Muharrem (TODO in code)

1. iPad-opstelling: vast standaard of mobiel rondlopen? Bepaalt landscape vs portrait primary.
2. Welke templates daadwerkelijk populair zijn in het showroom-archief — huidige selectie is een gok op basis van Joeri's deur.
3. Greep-hoogte 1050 mm als default — bevestigen of variabel.
4. Vaste fabrikant-lijst nodig of variabel?
5. Klant-PDF handteken-veld — komt later in offerte?
6. MY DOORS-huisstijl: logo SVG + font + kleur-palette aanleveren.

## Niet in v1 (per brief)

- Backend / multi-device sync
- Auth
- Offerteberekening / prijzen
- 3D klant-rendering
- Automatische freehand → lijnen conversie
- Voice-input
