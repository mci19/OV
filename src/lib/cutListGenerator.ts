import { computeGeometry, ralLabel } from './calculations'
import type { CutListItem, DoorConfig } from './types'

export interface CutListResult {
  items: CutListItem[]
  text: string
  headerLine: string
  ralLine: string
}

export function generateCutList(config: DoorConfig): CutListResult {
  const geo = computeGeometry(config)
  const designOn = config.designEnabled

  const items: CutListItem[] = []
  let nr = 1

  // 1. buitenframe verticaal
  items.push({ nr: nr++, profiel: '20*40*2', lengte: geo.outerVerticalLength, aantal: 2 })
  // 2. buitenframe kopstuk
  items.push({ nr: nr++, profiel: '20*40*2', lengte: geo.outerHorizontalLength, aantal: 1 })
  // 3. deurbladkader verticaal
  items.push({ nr: nr++, profiel: '20*40*2', lengte: geo.bladeVertical, aantal: 2 })
  // 4. deurbladkader kop+voet
  items.push({ nr: nr++, profiel: '20*40*2', lengte: geo.bladeHorizontal, aantal: 2 })

  // 5. glaslijst kader verticaal gelaste
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: geo.glassKaderVertGelaste, aantal: 2 })
  // 6. glaslijst kader horizontaal gelaste
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: geo.glassKaderHorizGelaste, aantal: 2 })

  if (designOn) {
    // 7. dwarslat-segment rechts gelaste
    items.push({ nr: nr++, profiel: '15*15*1.5', lengte: geo.crossbarRightGelaste, aantal: 1 })
    // 8. dwarslat-segment links gelaste
    items.push({ nr: nr++, profiel: '15*15*1.5', lengte: geo.crossbarLeftGelaste, aantal: 1 })
    // 9. verticale design-lijn gelaste
    items.push({ nr: nr++, profiel: '15*15*1.5', lengte: geo.designVertGelaste, aantal: 1 })
  }

  // 10. glaslijst kader verticaal poederlak
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: geo.glassKaderVertPoederlak, aantal: 2 })
  // 11. glaslijst kader horizontaal poederlak
  items.push({ nr: nr++, profiel: '15*15*1.5', lengte: geo.glassKaderHorizPoederlak, aantal: 2 })

  if (designOn) {
    // 12. dwarslat-segment rechts poederlak
    items.push({ nr: nr++, profiel: '15*15*1.5', lengte: geo.crossbarRightPoederlak, aantal: 1 })
    // 13. dwarslat-segment links poederlak
    items.push({ nr: nr++, profiel: '15*15*1.5', lengte: geo.crossbarLeftPoederlak, aantal: 1 })
    // 14. verticale design-lijn poederlak
    items.push({ nr: nr++, profiel: '15*15*1.5', lengte: geo.designVertPoederlak, aantal: 1 })
  }

  // extras (geen nummer)
  items.push({ nr: null, profiel: 'Kampas 30*30', lengte: geo.kampasLength, aantal: geo.kampasCount, bewerking: 'L-greep' })
  items.push({ nr: null, profiel: 'Juosta-35*4', lengte: geo.juostaVertical, aantal: 2 })
  items.push({ nr: null, profiel: 'Juosta-35*4', lengte: geo.juostaHorizontal, aantal: 1 })

  const headerLine = `${config.breedte}-${config.hoogte}`
  const ralLine = ralLabel(config)
  const text = formatText(items, headerLine, ralLine)

  return { items, text, headerLine, ralLine }
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
