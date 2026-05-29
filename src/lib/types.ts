// ─── enums ──────────────────────────────────────────────────────

export type DoorType = 'door_opening' | 'production'

export type HingeKind = 'single' | 'double'
export type HingeSide =
  | 'belgisch_links'
  | 'belgisch_rechts'
  | 'double_1'
  | 'double_2'
  | 'double_3'
  | 'double_4'

export type GlassType =
  | 'clear'            // Transparant
  | 'matt'             // Mat
  | 'flute'            // Flute
  | 'cathedraal'       // Kathedraal
  | 'smoke'            // Smoke
  | 'absolut_black'    // Absolut black
  | 'chinchilla'       // Chinchilla
  | 'crepi'            // Crepi
  | 'cathedraal_flute' // legacy — gemigreerd naar 'cathedraal' via sanitize
  | 'other'

export type System = 'hinges' | 'pivotica' | 'sliding'
export type Variant = 'panel_door' | 'double_door' | 'fritsjurgens_3'

/**
 * Configuratie van de hele deur(opstelling). Vervangt in v5 de oude
 * variants[]-multi-chip. Bestaande data wordt geremaped via
 * sanitizeOrderData.
 */
export type DoorConfig =
  | 'single'      // Enkele deur
  | 'double'      // Dubbele deur
  | 'side_panel'  // Deur met vast zij- of bovenpaneel
  | 'pivot'       // Pivot deur

export type Finishing = 'glasslist_10' | 'glasslist_15' | 'soudal_mastiek'

export type HandleKind =
  | 'none'
  | 'l_grip'         // altijd 200 mm L-profiel verticaal
  | 'l_vertical'    // volle deurhoogte, U-vorm, 200 mm van openingsrand
  | 'horizontal_bar' // altijd 200 mm horizontaal
  | 't_grip'         // T-vorm: korte verticale bar + horizontale top, 200 mm
  | 'custom'         // greep op maat — verticale bar, default 500 mm, lengte instelbaar via handleVerticalMm
  | 'veerklink'      // klassieke horizontale klink-deurkruk (separate hardware, geen Kampas)
  | 'other'

export type LockKind =
  | 'cilinder_litto'
  | 'magnetic'
  | 'electronic'
  | 'keyhole_only'
  | 'no_cilinder'
  | 'other'
export type ColorKind = 'ral_9005' | 'ral_9010' | 'other'

// ─── sketch ─────────────────────────────────────────────────────

export type SketchMode = 'snel' | 'lijnen' | 'vrij' | 'curve'

export interface VerticalLine {
  id: string
  x: number // mm vanaf links
}
export interface HorizontalLine {
  id: string
  y: number // mm vanaf onder
}

export interface FreehandStroke {
  id: string
  d: string // SVG path 'd' attribute, in mm coordinates
  width: number // pen breedte in mm
}

/** Gebogen lijn als kwadratische of kubische bezier. Bewaard als SVG-
 *  path-data (M x y Q cx cy x2 y2) in mm-coordinaten zodat ze direct
 *  gerenderd kunnen worden in canvas én PDF. */
export interface CurveStroke {
  id: string
  d: string
  width: number // lijn-dikte in mm; default 15 = glaslijst-look
}

export interface SketchData {
  templateId?: string
  verticalLines: VerticalLine[]
  horizontalLines: HorizontalLine[]
  freehand: FreehandStroke[]
  curves?: CurveStroke[]
}

export interface HandlePosition {
  side: 'left' | 'right' // afgeleid van scharnier; overridebaar
  heightFromBottom: number // mm, default 1050
}

// ─── order ──────────────────────────────────────────────────────

export interface OrderData {
  // header
  referentie: string
  klantNaam: string
  datum: string // ISO yyyy-mm-dd
  verkoper: string
  // dimensies
  doorType: DoorType
  hoogte: number
  breedte: number
  aantalDeuren: number
  // scharnier
  hingeKind: HingeKind
  hingeSide: HingeSide
  // glas
  glassType: GlassType
  glassOther: string
  // systeem
  system: System
  variants: Variant[]      // legacy — wordt door sanitize geremaped naar doorConfig
  doorConfig: DoorConfig
  softOpen: boolean
  softClose: boolean
  // finishing
  finishing: Finishing
  // greep
  handleKind: HandleKind
  handleVerticalMm: number
  handleOther: string
  handlePosition: HandlePosition
  // slot
  lockKind: LockKind
  lockOther: string
  // kleur
  colorKind: ColorKind
  colorOther: string
  // extra
  opmerkingen: string
  plaatsingInbegrepen: boolean
  // schets
  sketch: SketchData
  // optionele handmatige zaaglijst-override (geldt boven de berekende
  // versie als hij gezet is)
  cutListOverride?: import('./cutListTypes').CutListOverride
}

export const DEFAULT_ORDER: OrderData = {
  referentie: '',
  klantNaam: '',
  datum: new Date().toISOString().slice(0, 10),
  verkoper: 'Muharrem',

  doorType: 'production',
  hoogte: 2300,
  breedte: 900,
  aantalDeuren: 1,

  hingeKind: 'single',
  hingeSide: 'belgisch_links',

  glassType: 'clear',
  glassOther: '',

  system: 'hinges',
  variants: ['panel_door'],
  doorConfig: 'single',
  softOpen: false,
  softClose: false,

  finishing: 'glasslist_15',

  handleKind: 'other',
  handleVerticalMm: 0,
  handleOther: 'long handle',
  handlePosition: { side: 'right', heightFromBottom: 1050 },

  lockKind: 'cilinder_litto',
  lockOther: '',

  colorKind: 'ral_9005',
  colorOther: '',

  opmerkingen: '',
  plaatsingInbegrepen: false,

  sketch: {
    templateId: undefined,
    verticalLines: [],
    horizontalLines: [],
    freehand: [],
    curves: [],
  },
}

export interface ValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Migrate-on-read voor orders die nog data gebruiken uit een vorige versie
 * van het type-schema (verwijderde HandleKinds, asHandle op design-lijnen).
 * Wordt aangeroepen bij het laden van een bestelling uit Supabase zodat
 * de rest van de app altijd geldige data ziet.
 */
const LEGACY_HANDLE_KINDS = new Set(['pull_bar', 'round_knob', 'recessed_pull'])
const VALID_HANDLE_KINDS: HandleKind[] = ['none', 'l_grip', 'l_vertical', 'horizontal_bar', 't_grip', 'custom', 'veerklink', 'other']

export function sanitizeOrderData(raw: Partial<OrderData>): OrderData {
  const merged = { ...DEFAULT_ORDER, ...raw }

  // HandleKind: onbekende of verwijderde waardes → 'other' + label-fallback
  if (!VALID_HANDLE_KINDS.includes(merged.handleKind as HandleKind)) {
    const legacy = String(merged.handleKind)
    const label = LEGACY_HANDLE_KINDS.has(legacy)
      ? legacy.replace('_', ' ')
      : 'Greep'
    merged.handleKind = 'other'
    merged.handleOther = merged.handleOther?.trim() || label
  }

  // Sketch: strip de oude asHandle/handleLengthMm velden uit verticalLines
  if (merged.sketch?.verticalLines) {
    merged.sketch = {
      ...merged.sketch,
      verticalLines: merged.sketch.verticalLines.map((v) => {
        const { id, x } = v
        return { id, x }
      }),
    }
  }

  // doorConfig: afleiden uit legacy variants[] + system als nog niet gezet
  if (!(['single', 'double', 'side_panel', 'pivot'] as DoorConfig[]).includes(merged.doorConfig)) {
    if (merged.system === 'pivotica') {
      merged.doorConfig = 'pivot'
    } else if (merged.variants?.includes('double_door') || merged.hingeKind === 'double') {
      merged.doorConfig = 'double'
    } else if (merged.variants?.includes('fritsjurgens_3')) {
      merged.doorConfig = 'pivot'
    } else {
      merged.doorConfig = 'single'
    }
  }

  // GlassType: legacy 'cathedraal_flute' splitst nu in 'cathedraal' + 'flute'
  // — default naar 'cathedraal' (meest voorkomend in de praktijk).
  if (merged.glassType === 'cathedraal_flute' as GlassType) {
    merged.glassType = 'cathedraal'
  }

  return merged
}
