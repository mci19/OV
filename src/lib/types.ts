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

export type GlassType = 'clear' | 'matt' | 'cathedraal_flute' | 'other'

export type System = 'hinges' | 'pivotica' | 'sliding'
export type Variant = 'panel_door' | 'double_door' | 'fritsjurgens_3'

export type Finishing = 'glasslist_10' | 'glasslist_15' | 'soudal_mastiek'

export type HandleKind =
  | 'none'
  | 'l_grip'         // altijd 200 mm L-vorm
  | 'l_vertical'    // handmatige lengte via handleVerticalMm
  | 'horizontal_bar' // altijd 200 mm horizontaal
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

export type SketchMode = 'snel' | 'lijnen' | 'vrij'

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

export interface SketchData {
  templateId?: string
  verticalLines: VerticalLine[]
  horizontalLines: HorizontalLine[]
  freehand: FreehandStroke[]
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
  variants: Variant[]
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
  },
}

export interface ValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}
