import type { OrderData } from './types'
import { DEFAULT_CUT_FORMULAS, type CutFormulas } from './db'

export interface CutListItem {
  nr: number | null // null voor extras (kampas/juosta)
  profiel: string
  lengte: number   // mm
  aantal: number
  bewerking?: string
}

export interface CutListResult {
  items: CutListItem[]
  text: string
  headerLine: string
  ralLine: string
  geometry: {
    bladeVert: number
    bladeHoriz: number
    glassKaderVertGelaste: number
    glassKaderHorizGelaste: number
    glassKaderVertPoederlak: number
    glassKaderHorizPoederlak: number
    verticalsKaderP: number[]  // verticale lijnen in poederlak-kader-coords
    horizontalsKaderP: number[] // horizontale lijnen in poederlak-kader-coords
  }
}

/**
 * Genereer de zaaglijst voor de fabrikant.
 *
 * Formules (uit MY DOORS productie-documentatie):
 *  - Buitenframe kozijn: 2× 20×40×2 op hoogte; 1× 20×40×2 op breedte-40
 *  - Vast-paneel uitbreidingen (sinds v5):
 *    · Bij zij-paneel(en): 1× 20×40×2 op hoogte per paneel (verticale
 *      divider); deurblad-horiz wordt verminderd met paneel-breedtes +
 *      40 mm per divider
 *    · Bij top-paneel: 1× 20×40×2 op breedte-80 (horizontale divider),
 *      deurblad-vert verminderd met topPanelHeight + 40 mm
 *    · Per paneel: eigen glaslijst-kader (4× 15×15 gelaste + 4× poederlak)
 *      met zelfde aftrek-formules als deurblad
 *  - Deurbladkader: 2× 20×40×2 op (hoogte-30-eventueel top); 2× 20×40×2 op
 *    (breedte-88-paneelbreedtes-dividers)
 *    (88 = 2×40 mm profielbreedte + 2×4 mm speling)
 *  - Glaslijst kader gelaste kant: lengtes = blade_vert-40, breedtes = blade_horiz-30
 *    (=2× 15 mm aftrek per zijde)
 *  - Glaslijst kader poederlak kant: lengtes = blade_vert-42, breedtes = blade_horiz-32
 *    (gelaste is 2 mm langer dan poederlak, 1 mm per uiteinde)
 *  - Design verticaal (doorlopend over volle glaskader-hoogte):
 *    1× per verticaal, gelaste = glasskader_vert_gelaste-30, poederlak = -32
 *  - Design dwarslat (gesplitst door verticalen) in glaskader-coords vanaf links:
 *      v_kader_poederlak = door_x - (breedte - glassKaderHorizPoederlak)/2
 *    Segmenten (per dwarslat, per kant):
 *      gelaste: links_seg = v_kader_poederlak[0]+1
 *                 midden_seg[i] = v[i+1] - v[i] - 15
 *                 rechts_seg = glassKaderHorizGelaste - v[N-1] - 16
 *      poederlak: links_seg = v_kader_poederlak[0]
 *                 midden_seg[i] = v[i+1] - v[i] - 15
 *                 rechts_seg = glassKaderHorizPoederlak - v[N-1] - 15
 *  - Greep Kampas 30×30: standaard L=700 mm, 2 stuks
 *  - Juosta-35×4 (afdekstrip): 2× hoogte, 1× breedte-70
 */
export function generateCutList(order: OrderData, formulas: CutFormulas = DEFAULT_CUT_FORMULAS): CutListResult {
  const items: CutListItem[] = []
  let nr = 1

  const { breedte, hoogte, sketch } = order
  const f = formulas
  // "andere zijde 2 mm korter" = 1 mm per uiteinde × 2 uiteinden
  const poederlakTotalMarge = f.poederlak_marge_per_zijde * 2

  // ─── Vast-paneel geometrie ──────────────────────────────
  // Een divider tussen deur en paneel is een 20×40×2 profiel (zelfde
  // als het outer kozijn, bevestigd door productie-foto's).
  const DIVIDER_W = 40
  const isSidePanel = order.doorConfig === 'side_panel'
  const panelsActive = isSidePanel ? order.sidePanels : []
  const hasLeft = panelsActive.includes('left')
  const hasRight = panelsActive.includes('right')
  const hasTop = panelsActive.includes('top')
  const lw = hasLeft ? order.leftPanelWidth : 0
  const rw = hasRight ? order.rightPanelWidth : 0
  const th = hasTop ? order.topPanelHeight : 0
  const nSideDividers = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0)

  // ─── Geometrie deurblad (verkleind voor panelen) ────────
  // bladeHoriz wordt verminderd met paneel-breedtes + 1× divider per
  // side panel. bladeVert wordt verminderd bij top-paneel. We klampen
  // beide op 0 als de panelen breder zijn dan het kozijn toelaat —
  // anders propageren negatieve waardes naar de glaslijst-segmenten en
  // krijg je negatieve "lengte" rows in de PDF. validateOrder waarschuwt
  // los van deze clamp.
  const bladeVert = Math.max(0, hoogte - f.blade_vert_aftrek - (hasTop ? th + DIVIDER_W : 0))
  const bladeHoriz = Math.max(0, breedte - f.blade_horiz_aftrek - lw - rw - nSideDividers * DIVIDER_W)
  const glassKaderVertGelaste = Math.max(0, bladeVert - f.glaslijst_vert_aftrek)
  const glassKaderHorizGelaste = Math.max(0, bladeHoriz - f.glaslijst_horiz_aftrek)
  const glassKaderVertPoederlak = Math.max(0, glassKaderVertGelaste - poederlakTotalMarge)
  const glassKaderHorizPoederlak = Math.max(0, glassKaderHorizGelaste - poederlakTotalMarge)

  // Door-blade glas-zone in door-coords (voor sketch-line filtering).
  // Het deurblad zit IN het kozijn, met links de outer kozijn (40mm) +
  // eventueel paneel + divider. Rechts idem.
  const doorBladeXStart = (breedte - bladeHoriz) / 2  // gecentreerd voor het no-panel-geval
    + (hasLeft ? (lw + DIVIDER_W) / 2 : 0) - (hasRight ? (rw + DIVIDER_W) / 2 : 0)
  const doorBladeXEnd = doorBladeXStart + bladeHoriz

  // Converteer v4 sketch-posities (vanaf kozijn-links) naar kader-coords
  // van het deurblad (rekening houdend met de positie binnen het kozijn).
  const poederlakKaderLeftX = doorBladeXStart + (bladeHoriz - glassKaderHorizPoederlak) / 2
  const poederlakKaderBottomY = (hoogte - glassKaderVertPoederlak) / 2 + 24 + (hasTop ? -((th + DIVIDER_W) / 2) : 0)
  // 24 mm = visuele bovenoffset glas; voor de cuts gebruiken we kader-coords

  // Filter design-lijnen op area=='door' (default voor legacy data zonder
  // area). Lijnen in paneel-area krijgen hun eigen segmenten via
  // addPanelGlaslijst hieronder.
  const doorVerticals = sketch.verticalLines.filter((v) => (v.area ?? 'door') === 'door')
  const doorHorizontals = sketch.horizontalLines.filter((h) => (h.area ?? 'door') === 'door')
  const verticalsK: { x: number }[] = doorVerticals
    .filter((v) => v.x >= doorBladeXStart && v.x <= doorBladeXEnd)
    .map((v) => ({ x: v.x - poederlakKaderLeftX }))
    .filter((v) => v.x > 5 && v.x < glassKaderHorizPoederlak - 5)
    .sort((a, b) => a.x - b.x)
  const verticalsKaderP = verticalsK.map((v) => v.x)
  const horizontalsKaderP = doorHorizontals
    .map((h) => h.y - poederlakKaderBottomY)
    .filter((y) => y > 5 && y < glassKaderVertPoederlak - 5)
    .sort((a, b) => a - b)

  const Nglas = verticalsK.length  // 15×15-design-lijnen
  const M = horizontalsKaderP.length // aantal horizontalen

  // ─── Buitenframe (kozijn) ───────────────────────────────
  items.push({ nr: nr++, profiel: '20*40*2', lengte: hoogte, aantal: 2 })
  items.push({ nr: nr++, profiel: '20*40*2', lengte: breedte - f.kozijn_horiz_aftrek, aantal: 1 })

  // ─── Panel-dividers (NIEUW bij side_panel) ──────────────
  if (nSideDividers > 0) {
    items.push({
      nr: nr++, profiel: '20*40*2', lengte: hoogte, aantal: nSideDividers,
      bewerking: 'verticale paneel-divider',
    })
  }
  if (hasTop) {
    // Horizontale divider tussen top-paneel en alles eronder. Spant de
    // inner-kozijn-breedte (= breedte - 2× 40 mm outer kozijn).
    items.push({
      nr: nr++, profiel: '20*40*2', lengte: breedte - 2 * DIVIDER_W, aantal: 1,
      bewerking: 'horizontale top-paneel-divider',
    })
  }

  // ─── Deurbladkader ──────────────────────────────────────
  items.push({ nr: nr++, profiel: '20*40*2', lengte: bladeVert, aantal: 2 })
  items.push({ nr: nr++, profiel: '20*40*2', lengte: bladeHoriz, aantal: 2 })

  // ─── Glaslijst kader gelaste ────────────────────────────
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: glassKaderVertGelaste, aantal: 2 })
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: glassKaderHorizGelaste, aantal: 2 })

  // ─── Dwarslat-segmenten gelaste ─────────────────────────
  // M dwarslatten worden door N verticalen in (N+1) segmenten gesplitst.
  if (M > 0) {
    const segmentsG = computeSegments(verticalsK, glassKaderHorizGelaste, 'gelaste', f)
    for (const seg of segmentsG) {
      if (seg >= 30) {
        items.push({ nr: nr++, profiel: '15*15*1.5', lengte: seg, aantal: M })
      }
    }
  }

  // ─── Design verticaal gelaste (doorlopend) ──────────────
  if (Nglas > 0) {
    items.push({
      nr: nr++,
      profiel: '15*15*1.5',
      lengte: glassKaderVertGelaste - f.design_vert_gelaste_aftrek,
      aantal: Nglas,
    })
  }

  // ─── Glaslijst kader poederlak ──────────────────────────
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: glassKaderVertPoederlak, aantal: 2 })
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: glassKaderHorizPoederlak, aantal: 2 })

  // ─── Dwarslat-segmenten poederlak ───────────────────────
  if (M > 0) {
    const segmentsP = computeSegments(verticalsK, glassKaderHorizPoederlak, 'poederlak', f)
    for (const seg of segmentsP) {
      if (seg >= 30) {
        items.push({ nr: nr++, profiel: '15*15*1.5', lengte: seg, aantal: M })
      }
    }
  }

  // ─── Design verticaal poederlak (doorlopend) ────────────
  if (Nglas > 0) {
    items.push({
      nr: nr++,
      profiel: '15*15*1.5',
      lengte: glassKaderVertGelaste - f.design_vert_poederlak_aftrek,
      aantal: Nglas,
    })
  }

  // ─── Per-paneel glaslijst-kader (NIEUW) ─────────────────
  // Elk paneel heeft zijn eigen 4-zijdige 15×15 glaslijst, in beide
  // finishes (gelaste + poederlak). Zelfde aftrek-formules als de
  // deurblad-glaslijsten.
  function addPanelGlaslijst(panelVert: number, panelHoriz: number, label: string) {
    const vGel = panelVert - f.glaslijst_vert_aftrek
    const hGel = panelHoriz - f.glaslijst_horiz_aftrek
    const vPdr = vGel - poederlakTotalMarge
    const hPdr = hGel - poederlakTotalMarge
    items.push({ nr: nr++, profiel: '15*15*1.5', lengte: vGel, aantal: 2, bewerking: `${label} gelaste` })
    items.push({ nr: nr++, profiel: '15*15*1.5', lengte: hGel, aantal: 2, bewerking: `${label} gelaste` })
    items.push({ nr: nr++, profiel: '15*15*1.5', lengte: vPdr, aantal: 2, bewerking: `${label} poederlak` })
    items.push({ nr: nr++, profiel: '15*15*1.5', lengte: hPdr, aantal: 2, bewerking: `${label} poederlak` })
  }
  // Voor zij-panelen: vertical = bladeVert (zelfde verticale extent als
  // het deurblad), horizontal = paneel-breedte.
  if (hasLeft) addPanelGlaslijst(bladeVert, lw, 'zij-paneel links')
  if (hasRight) addPanelGlaslijst(bladeVert, rw, 'zij-paneel rechts')
  // Top-paneel: vertical = topPanelHeight, horizontal = volle inner-
  // kozijn-breedte (= breedte - 2× 40 mm).
  if (hasTop) addPanelGlaslijst(th, breedte - 2 * DIVIDER_W, 'top-paneel')

  // ─── Extras ─────────────────────────────────────────────
  // Greep — vorm bepaalt profiel en lengte. Adjustable types (l_grip,
  // horizontal_bar, t_grip, custom) gebruiken handleVerticalMm als > 0,
  // anders het CutFormulas-default. l_vertical = volle bladeVert hoogte.
  // veerklink = aparte hardware-line, geen Kampas.
  const overrideMm = order.handleVerticalMm && order.handleVerticalMm > 0
    ? Math.max(1, Math.round(order.handleVerticalMm))
    : 0

  if (order.handleKind === 'l_grip') {
    const len = overrideMm || f.greep_l_grip_lengte
    items.push({ nr: null, profiel: 'Kampas 30*30', lengte: len, aantal: 2, bewerking: `L-greep ${len} mm` })
  } else if (order.handleKind === 'horizontal_bar') {
    const len = overrideMm || f.greep_horizontal_bar_lengte
    items.push({ nr: null, profiel: 'Kampas 30*30', lengte: len, aantal: 2, bewerking: `horizontale stang ${len} mm` })
  } else if (order.handleKind === 't_grip') {
    const len = overrideMm || f.greep_t_grip_lengte
    items.push({ nr: null, profiel: 'Kampas 30*30', lengte: len, aantal: 2, bewerking: `T-greep ${len} mm` })
  } else if (order.handleKind === 'l_vertical') {
    // Volle deurhoogte = bladeVert, 200 mm vanaf openingsrand
    items.push({
      nr: null, profiel: 'Kampas 30*30', lengte: bladeVert, aantal: 1,
      bewerking: `L-verticaal volle hoogte ${bladeVert} mm, 200 mm van openingsrand, gelast top+bottom`,
    })
  } else if (order.handleKind === 'custom') {
    const len = overrideMm || f.greep_custom_default_lengte
    items.push({ nr: null, profiel: 'Kampas 30*30', lengte: len, aantal: 2, bewerking: `Greep op maat ${len} mm` })
  } else if (order.handleKind === 'veerklink') {
    // Geen Kampas — aparte hardware. Wel een line-item zodat fabriek weet
    // dat hij een veerklink-unit moet voorzien.
    items.push({ nr: null, profiel: 'Veerklink', lengte: 0, aantal: 1, bewerking: 'horizontale klink-deurkruk (lever + rozet)' })
  } else if (order.handleKind === 'other') {
    const len = overrideMm || f.greep_other_default_lengte
    items.push({ nr: null, profiel: 'Kampas 30*30', lengte: len, aantal: 2, bewerking: order.handleOther?.trim() || 'greep' })
  }
  items.push({ nr: null, profiel: 'Juosta-35*4', lengte: hoogte, aantal: 2 })
  items.push({ nr: null, profiel: 'Juosta-35*4', lengte: breedte - f.juosta_horiz_aftrek, aantal: 1 })

  const ralLine = ralLabel(order)
  const headerLine = `${breedte}-${hoogte}`
  const text = formatText(items, headerLine, ralLine)

  return {
    items,
    text,
    headerLine,
    ralLine,
    geometry: {
      bladeVert, bladeHoriz,
      glassKaderVertGelaste, glassKaderHorizGelaste,
      glassKaderVertPoederlak, glassKaderHorizPoederlak,
      verticalsKaderP, horizontalsKaderP,
    },
  }
}

/**
 * Bereken de N+1 segmenten van een dwarslat die door N verticalen
 * wordt opgesplitst. Posities in kader-coords vanaf links (poederlak),
 * gesorteerd. Retourneert lengtes in juiste gelaste/poederlak units.
 *
 * Voor gelaste: links_seg = v[0] + 1, rechts_seg = horiz_gelaste - v[N-1] - 16
 * Voor poederlak: links_seg = v[0], rechts_seg = horiz_poederlak - v[N-1] - 15
 * Midden segmenten zijn gelijk voor beide finishes: v[i+1] - v[i] - 15
 */
function computeSegments(
  verticals: { x: number }[],
  horizLen: number,
  kind: 'gelaste' | 'poederlak',
  formulas: CutFormulas,
): number[] {
  const N = verticals.length
  const w = formulas.verticaal_breedte
  if (N === 0) return [horizLen - 2 * w]
  // gelaste-zijde is per uiteinde poederlak_marge_per_zijde mm langer
  const adj = kind === 'gelaste' ? formulas.poederlak_marge_per_zijde : 0
  const out: number[] = []
  // Linker segment (kop van glaskader tot eerste verticaal)
  out.push(Math.round(verticals[0].x + adj))
  // Middelsegmenten — verticaal-profiel breedte
  for (let i = 1; i < N; i++) {
    out.push(Math.round(verticals[i].x - verticals[i - 1].x - w))
  }
  // Rechter segment
  out.push(Math.round(horizLen - verticals[N - 1].x - w - adj))
  return out
}

function ralLabel(order: OrderData): string {
  if (order.colorKind === 'ral_9005') return 'RAL 9005'
  if (order.colorKind === 'ral_9010') return 'RAL 9010'
  return order.colorOther.trim() || 'RAL ?'
}

function formatText(items: CutListItem[], header: string, ralLine: string): string {
  const numbered = items.filter((i) => i.nr !== null)
  const extras = items.filter((i) => i.nr === null)

  const numberedLines = numbered.map((item) => {
    const nrStr = String(item.nr).padStart(2, ' ') + '.'
    const profiel = item.profiel
    const sep = profiel === '15*15*1.5' ? '-' : ' -'
    const lengteStr = `${item.lengte}mm.`
    const aantalStr = `${item.aantal}vnt.`
    return `${nrStr}  ${profiel}${sep}${lengteStr.padEnd(8, ' ')}${aantalStr}`
  })

  const extraLines = extras.map((item) => {
    const prefix = item.profiel.startsWith('Kampas')
      ? `Kampas 30*30 L-${item.lengte}mm.`
      : `Juosta-35*4-${item.lengte}mm.`
    return `${prefix.padEnd(23, ' ')}${item.aantal}vnt.`
  })

  return [header, ralLine, ...numberedLines, ...extraLines].join('\n')
}

export function cutListToCsv(items: CutListItem[]): string {
  const head = 'Nr;Profiel;Lengte_mm;Aantal;Bewerking'
  const rows = items.map((i) =>
    [i.nr ?? '', i.profiel, i.lengte, i.aantal, i.bewerking ?? ''].join(';'),
  )
  return [head, ...rows].join('\n')
}
