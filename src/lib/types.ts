export type DoorType = 'door_opening' | 'production'

export type HingeSide =
  | 'belgisch_links'
  | 'belgisch_rechts'
  | 'double_1'
  | 'double_2'
  | 'double_3'
  | 'double_4'

export type HingeKind = 'single' | 'double'

export type GlassType = 'clear' | 'matt' | 'cathedraal_flute' | 'other'

export type System = 'hinges' | 'pivotica' | 'sliding'

export type Variant = 'panel_door' | 'double_door' | 'fritsjurgens_3'

export type Finishing = 'glasslist_10' | 'glasslist_15' | 'soudal_mastiek'

export type HandleKind = 'l_grip' | 'l_vertical' | 'other'

export type LockKind = 'cilinder_litto' | 'no_cilinder' | 'other'

export type ColorKind = 'ral_9005' | 'ral_9010' | 'other'

export interface DoorConfig {
  // hoofd
  referentie: string
  datum: string // ISO yyyy-mm-dd
  doorType: DoorType

  // dimensies
  hoogte: number // mm
  breedte: number // mm

  // top view / scharnier
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

  // afwerking
  finishing: Finishing

  // greep
  handleKind: HandleKind
  handleVerticalMm: number
  handleOther: string

  // slot
  lockKind: LockKind
  lockOther: string

  // kleur
  colorKind: ColorKind
  colorOther: string

  // design verdeling
  designEnabled: boolean
  verticaleLijnVanafLinks: number // mm vanaf links
  horizontaleDwarslatVanafOnder: number // mm vanaf onder
}

export const DEFAULT_CONFIG: DoorConfig = {
  referentie: 'Joeri Van Pee',
  datum: new Date().toISOString().slice(0, 10),
  doorType: 'production',

  hoogte: 2446,
  breedte: 877,

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

  lockKind: 'cilinder_litto',
  lockOther: '',

  colorKind: 'ral_9005',
  colorOther: '',

  designEnabled: true,
  verticaleLijnVanafLinks: 543,
  horizontaleDwarslatVanafOnder: 200,
}

export interface CutListItem {
  nr: number | null // null voor extra-onderdelen onder de hoofdlijst
  profiel: string
  lengte: number // mm
  aantal: number
  bewerking?: string
}

export interface DoorGeometry {
  // buitenframe
  outerVerticalLength: number // = hoogte
  outerHorizontalLength: number // = breedte - 40
  // deurbladkader
  bladeVertical: number // = hoogte - 30
  bladeHorizontal: number // = breedte - 88
  // glaslijst kader
  glassKaderVertGelaste: number // = bladeVertical - 40
  glassKaderHorizGelaste: number // = bladeHorizontal - 30
  glassKaderVertPoederlak: number // = bladeVertical - 42
  glassKaderHorizPoederlak: number // = bladeHorizontal - 32
  // design pieces
  designVertGelaste: number // = glassKaderVertGelaste - 30
  designVertPoederlak: number // = glassKaderVertGelaste - 32
  crossbarLeftGelaste: number // = verticaleLijn + 1
  crossbarLeftPoederlak: number // = verticaleLijn
  crossbarRightGelaste: number // = glassKaderHorizGelaste - crossbarLeftGelaste - 15
  crossbarRightPoederlak: number // = glassKaderHorizPoederlak - crossbarLeftPoederlak - 15
  // glas
  glassWidth: number // = bladeHorizontal - 8
  glassHeight: number // = bladeVertical - 48
  // afdekstrips
  juostaVertical: number // = hoogte
  juostaHorizontal: number // = breedte - 70
  // greep
  kampasLength: number // 700 (default)
  kampasCount: number // 2
}

export interface ValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}
