import type { OrderData } from './types'

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
 *  - Deurbladkader: 2× 20×40×2 op hoogte-30; 2× 20×40×2 op breedte-88
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
export function generateCutList(order: OrderData): CutListResult {
  const items: CutListItem[] = []
  let nr = 1

  const { breedte, hoogte, sketch } = order

  // ─── Geometrie ──────────────────────────────────────────
  const bladeVert = hoogte - 30
  const bladeHoriz = breedte - 88
  const glassKaderVertGelaste = bladeVert - 40
  const glassKaderHorizGelaste = bladeHoriz - 30
  const glassKaderVertPoederlak = bladeVert - 42
  const glassKaderHorizPoederlak = bladeHoriz - 32

  // Converteer v4 sketch-posities (vanaf kozijn-links) naar kader-coords
  const poederlakKaderLeftX = (breedte - glassKaderHorizPoederlak) / 2
  const poederlakKaderBottomY = (hoogte - glassKaderVertPoederlak) / 2 + 24
  // 24 mm = visuele bovenoffset glas; voor de cuts gebruiken we kader-coords

  const verticalsK: { x: number }[] = sketch.verticalLines
    .map((v) => ({ x: v.x - poederlakKaderLeftX }))
    .filter((v) => v.x > 5 && v.x < glassKaderHorizPoederlak - 5)
    .sort((a, b) => a.x - b.x)
  const verticalsKaderP = verticalsK.map((v) => v.x)
  const horizontalsKaderP = sketch.horizontalLines
    .map((h) => h.y - poederlakKaderBottomY)
    .filter((y) => y > 5 && y < glassKaderVertPoederlak - 5)
    .sort((a, b) => a - b)

  const Nglas = verticalsK.length  // 15×15-design-lijnen
  const M = horizontalsKaderP.length // aantal horizontalen

  // ─── Buitenframe (kozijn) ───────────────────────────────
  items.push({ nr: nr++, profiel: '20*40*2', lengte: hoogte, aantal: 2 })
  items.push({ nr: nr++, profiel: '20*40*2', lengte: breedte - 40, aantal: 1 })

  // ─── Deurbladkader ──────────────────────────────────────
  items.push({ nr: nr++, profiel: '20*40*2', lengte: bladeVert, aantal: 2 })
  items.push({ nr: nr++, profiel: '20*40*2', lengte: bladeHoriz, aantal: 2 })

  // ─── Glaslijst kader gelaste ────────────────────────────
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: glassKaderVertGelaste, aantal: 2 })
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: glassKaderHorizGelaste, aantal: 2 })

  // ─── Dwarslat-segmenten gelaste ─────────────────────────
  // M dwarslatten worden door N verticalen in (N+1) segmenten gesplitst.
  // asHandle verticals zijn 30mm dik i.p.v. 15mm.
  if (M > 0) {
    const segmentsG = computeSegments(verticalsK, glassKaderHorizGelaste, 'gelaste')
    for (const seg of segmentsG) {
      if (seg >= 30) {
        items.push({ nr: nr++, profiel: '15*15*1.5', lengte: seg, aantal: M })
      }
    }
  }

  // ─── Design verticaal gelaste (doorlopend) ──────────────
  // Alleen 15×15-glaslijsten — Kampas-bars (asHandle) komen apart bij extras
  if (Nglas > 0) {
    items.push({
      nr: nr++,
      profiel: '15*15*1.5',
      lengte: glassKaderVertGelaste - 30,
      aantal: Nglas,
    })
  }

  // ─── Glaslijst kader poederlak ──────────────────────────
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: glassKaderVertPoederlak, aantal: 2 })
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: glassKaderHorizPoederlak, aantal: 2 })

  // ─── Dwarslat-segmenten poederlak ───────────────────────
  if (M > 0) {
    const segmentsP = computeSegments(verticalsK, glassKaderHorizPoederlak, 'poederlak')
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
      lengte: glassKaderVertGelaste - 32,
      aantal: Nglas,
    })
  }

  // ─── Extras ─────────────────────────────────────────────
  // Greep — vorm bepaalt profiel en lengte
  if (order.handleKind === 'l_grip') {
    items.push({ nr: null, profiel: 'Kampas 30*30', lengte: 200, aantal: 2, bewerking: 'L-greep 200 mm' })
  } else if (order.handleKind === 'horizontal_bar') {
    items.push({ nr: null, profiel: 'Kampas 30*30', lengte: 200, aantal: 2, bewerking: 'horizontale stang 200 mm' })
  } else if (order.handleKind === 'l_vertical') {
    const len = Math.max(1, Math.round(order.handleVerticalMm || 700))
    items.push({ nr: null, profiel: 'Kampas 30*30', lengte: len, aantal: 2, bewerking: `L-verticaal ${len} mm` })
  } else if (order.handleKind === 'other') {
    items.push({ nr: null, profiel: 'Kampas 30*30', lengte: 700, aantal: 2, bewerking: order.handleOther.trim() || 'greep' })
  }
  items.push({ nr: null, profiel: 'Juosta-35*4', lengte: hoogte, aantal: 2 })
  items.push({ nr: null, profiel: 'Juosta-35*4', lengte: breedte - 70, aantal: 1 })

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
): number[] {
  const N = verticals.length
  if (N === 0) return [horizLen - 30]
  const adj = kind === 'gelaste' ? 1 : 0
  const out: number[] = []
  // Linker segment (kop van glaskader tot eerste verticaal)
  out.push(Math.round(verticals[0].x + adj))
  // Middelsegmenten — verticaal is 15 mm dik
  for (let i = 1; i < N; i++) {
    out.push(Math.round(verticals[i].x - verticals[i - 1].x - 15))
  }
  // Rechter segment
  out.push(Math.round(horizLen - verticals[N - 1].x - 15 - adj))
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
