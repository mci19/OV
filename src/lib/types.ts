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

/**
 * MY DOORS productie-regels voor welke configuraties bij welke breedte
 * passen:
 *   - breedte < 1000 mm  → enkele deur (geen paneel mogelijk)
 *   - 1000-1500 mm       → enkele deur OF deur met zij-paneel
 *   - breedte > 1500 mm  → dubbele deur
 *   - pivot              → altijd toegestaan (klant-keuze)
 *
 * Top-paneel valt buiten de breedte-regel: dat is een hoogte-keuze.
 */
export function validDoorConfigsFor(breedte: number): DoorConfig[] {
  // Door-blade-type wordt door de breedte bepaald:
  //   < 1000 mm  → enkele deur
  //   1000-1500  → enkele deur (eventueel met zij-paneel)
  //   > 1500 mm  → dubbele deur
  //   pivot is altijd een geldige klant-keuze.
  // 'side_panel' is altijd selecteerbaar omdat een top-paneel (boven
  // de deur) géén breedte-afhankelijke regel heeft — die mag bij elk
  // door-blade-type. De OrderForm verbergt links/rechts in het
  // multi-select wanneer de breedte dat niet toelaat.
  if (!Number.isFinite(breedte) || breedte < 1000) {
    return ['single', 'side_panel', 'pivot']
  }
  if (breedte > 1500) {
    return ['double', 'side_panel', 'pivot']
  }
  return ['single', 'side_panel', 'pivot']
}

/**
 * Welke paneel-posities zijn toegestaan bij een gegeven breedte?
 * Top is altijd OK (verticale uitbreiding); links/rechts vereisen
 * extra horizontale ruimte naast het deurblad — alleen bij
 * 1000-1500 mm (anders blijft er geen werkbaar deurblad over).
 */
export function validSidePanelPositionsFor(breedte: number): ('left' | 'right' | 'top')[] {
  if (!Number.isFinite(breedte)) return ['top']
  if (breedte < 1000 || breedte > 1500) return ['top']
  return ['left', 'right', 'top']
}

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

/**
 * Welk vlak van het kozijn een design-lijn/curve toebehoort. Default
 * 'door' voor backwards-compat met data uit oudere versies.
 *  - 'door'        — in het deurblad (default)
 *  - 'left_panel'  — in het linker zij-paneel
 *  - 'right_panel' — in het rechter zij-paneel
 *  - 'top_panel'   — in het boven-paneel
 *
 * De coördinaten van een lijn blijven in kozijn-coords (mm vanaf links/
 * onder). Het area-veld bepaalt waar de lijn wordt gerenderd (gecliprd
 * op de bounding-box van het vlak) én aan welke kader hij meegerekend
 * wordt in de zaaglijst.
 */
export type SketchArea = 'door' | 'left_panel' | 'right_panel' | 'top_panel'

export interface VerticalLine {
  id: string
  x: number // mm vanaf links
  area?: SketchArea  // default 'door'
}
export interface HorizontalLine {
  id: string
  y: number // mm vanaf onder
  area?: SketchArea  // default 'door'
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
  area?: SketchArea  // default 'door'
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
  /** Optioneel — exacte X-positie in mm vanaf links. Wanneer gezet
   *  overschrijft dit de afgeleide 'side+offset'-positie. Wordt gebruikt
   *  wanneer de gebruiker de greep op een specifieke verticale design-
   *  lijn of een eigen X heeft gezet. */
  x?: number
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
  /** Welke vaste panelen er rond de deur zijn (alleen relevant als
   *  doorConfig === 'side_panel'). Lege array = geen panelen. */
  sidePanels: ('left' | 'right' | 'top')[]
  /** Breedte links-paneel in mm (default 400 mm). */
  leftPanelWidth: number
  /** Breedte rechts-paneel in mm (default 400 mm). */
  rightPanelWidth: number
  /** Hoogte van het bovenpaneel in mm (default 300 mm). */
  topPanelHeight: number
  /** @deprecated — gebruik left/rightPanelWidth. Hier voor backwards-
   *  compat met data uit oudere versies. */
  sidePanelWidth?: number
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
  sidePanels: [],
  leftPanelWidth: 400,
  rightPanelWidth: 400,
  topPanelHeight: 300,
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
  // én default area='door' voor legacy lijnen/curves zonder area-veld.
  if (merged.sketch) {
    merged.sketch = {
      ...merged.sketch,
      verticalLines: (merged.sketch.verticalLines ?? []).map((v) => ({
        id: v.id,
        x: v.x,
        area: v.area ?? 'door',
      })),
      horizontalLines: (merged.sketch.horizontalLines ?? []).map((h) => ({
        id: h.id,
        y: h.y,
        area: h.area ?? 'door',
      })),
      curves: (merged.sketch.curves ?? []).map((c) => ({
        ...c,
        area: c.area ?? 'door',
      })),
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

  // Measurement type ('door_opening' vs 'production') is verwijderd uit
  // het formulier — alles is voortaan 'production' (deurmaat, niet de
  // opening). Legacy 'door_opening' wordt geremaped.
  if (merged.doorType !== 'production') {
    merged.doorType = 'production'
  }

  // sidePanels: defaults voor nieuw veld toegevoegd in v5
  if (!Array.isArray(merged.sidePanels)) merged.sidePanels = []
  // Per-paneel dimensies — migreer legacy sidePanelWidth naar
  // left+right indien gezet.
  const legacyWidth = merged.sidePanelWidth
  if (!Number.isFinite(merged.leftPanelWidth) || merged.leftPanelWidth <= 0) {
    merged.leftPanelWidth = Number.isFinite(legacyWidth) && legacyWidth ? legacyWidth : 400
  }
  if (!Number.isFinite(merged.rightPanelWidth) || merged.rightPanelWidth <= 0) {
    merged.rightPanelWidth = Number.isFinite(legacyWidth) && legacyWidth ? legacyWidth : 400
  }
  if (!Number.isFinite(merged.topPanelHeight) || merged.topPanelHeight <= 0) merged.topPanelHeight = 300
  delete merged.sidePanelWidth
  // Bij side_panel-config zonder gekozen positie → default links
  if (merged.doorConfig === 'side_panel' && merged.sidePanels.length === 0) {
    // Default-positie hangt af van wat de breedte toelaat: kan geen
    // 'left' kiezen als de deur smaller dan 1000 is → val terug op top.
    const allowed = validSidePanelPositionsFor(merged.breedte)
    merged.sidePanels = [allowed.includes('left') ? 'left' : 'top']
  }
  // Wis posities die niet (meer) bij de breedte passen. Bv. user had
  // een 1200×2300 deur met left+top, en verandert de breedte naar 800;
  // 'left' moet dan weg, 'top' blijft.
  {
    const allowed = new Set(validSidePanelPositionsFor(merged.breedte))
    merged.sidePanels = merged.sidePanels.filter((p) => allowed.has(p))
  }

  // hingeSide → handlePosition.side correctie. Eerder draaide dit als
  // een useEffect in OpportunityDetailPage, wat een race veroorzaakte
  // met de load-effect (Page liet `dirty=false` terwijl `order` al
  // gewijzigd was → save-knop bleef disabled). Doen we hier in
  // sanitize, dan ziet de page altijd consistente input.
  // Voor 'double_*' hingeSides laten we de side ongemoeid (gebruiker
  // mag hem manueel kiezen op dubbele deuren).
  if (merged.handlePosition) {
    if (merged.hingeSide === 'belgisch_links' && merged.handlePosition.side !== 'right') {
      merged.handlePosition = { ...merged.handlePosition, side: 'right' }
    } else if (merged.hingeSide === 'belgisch_rechts' && merged.handlePosition.side !== 'left') {
      merged.handlePosition = { ...merged.handlePosition, side: 'left' }
    }
  }

  return merged
}
