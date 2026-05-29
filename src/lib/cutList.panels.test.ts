import { describe, expect, it } from 'vitest'
import { DEFAULT_ORDER } from './types'
import { generateCutList } from './cutList'

/**
 * Tests voor panel-aware zaaglijst (v5).
 *
 * Productie-regels:
 *  - Divider tussen deur en paneel = 20×40×2 (zelfde als kozijn)
 *  - Glaslijst in paneel = 15×15 met zelfde aftrek-formules als deurblad
 *  - Geen apart paneel-blade-kader (glaslijst direct tegen kozijn/divider)
 */

// Helper: vind alle 20×40×2 items met gegeven lengte
function find2040(items: ReturnType<typeof generateCutList>['items'], lengte: number) {
  return items.filter((i) => i.profiel === '20*40*2' && i.lengte === lengte)
}

describe('cutList — rechter zij-paneel 400 mm', () => {
  const order = {
    ...DEFAULT_ORDER,
    breedte: 1200,
    hoogte: 2300,
    doorConfig: 'side_panel' as const,
    sidePanels: ['right' as const],
    rightPanelWidth: 400,
    sketch: { ...DEFAULT_ORDER.sketch, verticalLines: [], horizontalLines: [] },
  }
  const result = generateCutList(order)

  it('header bevat oorspronkelijke totaal-afmetingen', () => {
    expect(result.headerLine).toBe('1200-2300')
  })

  it('outer kozijn ongewijzigd: 2× 2300 + 1× 1160', () => {
    expect(find2040(result.items, 2300).find((i) => i.aantal === 2)).toBeDefined()
    expect(find2040(result.items, 1160).find((i) => i.aantal === 1)).toBeDefined()
  })

  it('1× verticale divider 20×40 op 2300 mm', () => {
    const dividers = result.items.filter((i) =>
      i.profiel === '20*40*2' && i.lengte === 2300 && i.bewerking?.includes('paneel-divider'),
    )
    expect(dividers).toHaveLength(1)
    expect(dividers[0].aantal).toBe(1)
  })

  it('deurblad-horiz = 1200 - 88 - 400 - 40 = 672', () => {
    // 2× 20×40 op bladeHoriz=672 (aantal 2 = top + bottom van blade)
    const blade = find2040(result.items, 672)
    expect(blade.find((i) => i.aantal === 2)).toBeDefined()
  })

  it('deurblad-vert blijft 2270 (geen top-paneel)', () => {
    expect(find2040(result.items, 2270).find((i) => i.aantal === 2)).toBeDefined()
  })

  it('paneel-glaslijst gelaste: 2× 2230 (vert) + 2× 370 (horiz)', () => {
    // panelVert = bladeVert = 2270 → glaslijst = 2270 - 40 = 2230
    // panelHoriz = 400 → glaslijst = 400 - 30 = 370
    const vGel = result.items.filter((i) =>
      i.profiel === '15*15*1.5' && i.lengte === 2230 && i.bewerking?.includes('zij-paneel rechts gelaste'),
    )
    expect(vGel.find((i) => i.aantal === 2)).toBeDefined()
    const hGel = result.items.filter((i) =>
      i.profiel === '15*15*1.5' && i.lengte === 370 && i.bewerking?.includes('zij-paneel rechts gelaste'),
    )
    expect(hGel.find((i) => i.aantal === 2)).toBeDefined()
  })

  it('paneel-glaslijst poederlak: 2 mm korter dan gelaste', () => {
    const vPdr = result.items.filter((i) =>
      i.profiel === '15*15*1.5' && i.lengte === 2228 && i.bewerking?.includes('zij-paneel rechts poederlak'),
    )
    expect(vPdr.find((i) => i.aantal === 2)).toBeDefined()
    const hPdr = result.items.filter((i) =>
      i.profiel === '15*15*1.5' && i.lengte === 368 && i.bewerking?.includes('zij-paneel rechts poederlak'),
    )
    expect(hPdr.find((i) => i.aantal === 2)).toBeDefined()
  })
})

describe('cutList — links + rechts paneel 400 + 350', () => {
  const order = {
    ...DEFAULT_ORDER,
    breedte: 1400,
    hoogte: 2300,
    doorConfig: 'side_panel' as const,
    sidePanels: ['left' as const, 'right' as const],
    leftPanelWidth: 400,
    rightPanelWidth: 350,
    sketch: { ...DEFAULT_ORDER.sketch, verticalLines: [], horizontalLines: [] },
  }
  const result = generateCutList(order)

  it('2× verticale divider op 2300 mm', () => {
    const dividers = result.items.filter((i) =>
      i.profiel === '20*40*2' && i.lengte === 2300 && i.bewerking?.includes('paneel-divider'),
    )
    expect(dividers).toHaveLength(1)
    expect(dividers[0].aantal).toBe(2)
  })

  it('deurblad-horiz = 1400 - 88 - 400 - 350 - 80 = 482', () => {
    expect(find2040(result.items, 482).find((i) => i.aantal === 2)).toBeDefined()
  })

  it('links-paneel glaslijst gelaste-horiz = 400 - 30 = 370', () => {
    const items = result.items.filter((i) =>
      i.lengte === 370 && i.bewerking?.includes('zij-paneel links gelaste'),
    )
    expect(items.length).toBeGreaterThan(0)
  })

  it('rechts-paneel glaslijst gelaste-horiz = 350 - 30 = 320', () => {
    const items = result.items.filter((i) =>
      i.lengte === 320 && i.bewerking?.includes('zij-paneel rechts gelaste'),
    )
    expect(items.length).toBeGreaterThan(0)
  })
})

describe('cutList — top-paneel 300 mm', () => {
  const order = {
    ...DEFAULT_ORDER,
    breedte: 1200,
    hoogte: 2700,
    doorConfig: 'side_panel' as const,
    sidePanels: ['top' as const],
    topPanelHeight: 300,
    sketch: { ...DEFAULT_ORDER.sketch, verticalLines: [], horizontalLines: [] },
  }
  const result = generateCutList(order)

  it('horizontale top-divider 20×40 op (breedte − 80) = 1120 mm', () => {
    const dividers = result.items.filter((i) =>
      i.profiel === '20*40*2' && i.lengte === 1120 && i.bewerking?.includes('top-paneel-divider'),
    )
    expect(dividers).toHaveLength(1)
    expect(dividers[0].aantal).toBe(1)
  })

  it('deurblad-vert = 2700 - 30 - 300 - 40 = 2330', () => {
    expect(find2040(result.items, 2330).find((i) => i.aantal === 2)).toBeDefined()
  })

  it('deurblad-horiz onveranderd: 1200 - 88 = 1112', () => {
    expect(find2040(result.items, 1112).find((i) => i.aantal === 2)).toBeDefined()
  })

  it('top-paneel glaslijst gelaste-vert = 300 - 40 = 260', () => {
    const items = result.items.filter((i) =>
      i.lengte === 260 && i.bewerking?.includes('top-paneel gelaste'),
    )
    expect(items.length).toBeGreaterThan(0)
  })

  it('top-paneel glaslijst gelaste-horiz = 1120 - 30 = 1090', () => {
    const items = result.items.filter((i) =>
      i.lengte === 1090 && i.bewerking?.includes('top-paneel gelaste'),
    )
    expect(items.length).toBeGreaterThan(0)
  })
})

describe('cutList — area-bound design-lijnen', () => {
  it('verticale lijn in paneel-area telt niet mee voor deurblad-segmenten', () => {
    // 1200 mm deur met rechter-paneel van 400 mm. We zetten 1 verticale
    // lijn die in de paneel-x-range zou vallen, maar markeren hem als
    // area='right_panel'. De deurblad-glaskader moet dan GEEN extra
    // 'design verticaal' item bevatten.
    const result = generateCutList({
      ...DEFAULT_ORDER,
      breedte: 1200,
      hoogte: 2300,
      doorConfig: 'side_panel',
      sidePanels: ['right'],
      rightPanelWidth: 400,
      sketch: {
        ...DEFAULT_ORDER.sketch,
        verticalLines: [
          // x in linker deurblad-helft, gemarkeerd als paneel
          { id: 'v-panel', x: 950, area: 'right_panel' },
        ],
        horizontalLines: [],
      },
    })
    const designVerticals = result.items.filter(
      (i) => i.profiel === '15*15*1.5' && i.aantal === 1 && i.lengte === result.geometry.glassKaderVertGelaste - 30,
    )
    expect(designVerticals).toHaveLength(0)
    expect(result.geometry.verticalsKaderP).toEqual([])
  })

  it('verticale lijn in deur-area (default area) telt wel mee', () => {
    const result = generateCutList({
      ...DEFAULT_ORDER,
      breedte: 1200,
      hoogte: 2300,
      doorConfig: 'single',
      sidePanels: [],
      sketch: {
        ...DEFAULT_ORDER.sketch,
        // geen area → default 'door'
        verticalLines: [{ id: 'v1', x: 600 }],
        horizontalLines: [],
      },
    })
    expect(result.geometry.verticalsKaderP.length).toBe(1)
  })
})

describe('cutList — geen panelen (regressie-check)', () => {
  it('877×2446 zonder panels: outer kozijn + deurblad-cuts ongewijzigd', () => {
    const result = generateCutList({
      ...DEFAULT_ORDER,
      breedte: 877,
      hoogte: 2446,
      doorConfig: 'single',
      sidePanels: [],
      sketch: { ...DEFAULT_ORDER.sketch, verticalLines: [], horizontalLines: [] },
    })
    // Sanity: geen panel-divider items
    const panelDividers = result.items.filter((i) => i.bewerking?.includes('paneel-divider'))
    expect(panelDividers).toHaveLength(0)
    // Sanity: geen panel-glaslijst items
    const panelGlas = result.items.filter((i) => i.bewerking?.includes('paneel') && i.bewerking?.includes('gelaste'))
    expect(panelGlas).toHaveLength(0)
  })
})
