import { describe, expect, it } from 'vitest'
import { DEFAULT_ORDER } from './types'
import { generateCutList } from './cutList'

/**
 * Referentie uit MY DOORS productie-documentatie (Deur bvb 877×2446):
 *   Frame:        2×2446, 1×837
 *   Deurblad:     2×2416, 2×789
 *   Glaslijst kader gelaste:    2×2376 + 2×759
 *   Glaslijst kader poederlak:  2×2374 + 2×757
 *   Design dwarslat gelaste segments:    544 + 200
 *   Design dwarslat poederlak segments:  543 + 199
 *   Design verticaal:  1×2346 (gelaste) + 1×2344 (poederlak)
 *   Extras: Kampas 700×2, Juosta 2446×2, Juosta 807×1
 *
 * Conversion: v4 sketch x is in door-coords vanaf kozijn-links.
 * Glaslijst-kader-links (poederlak) = (877-757)/2 = 60.
 * Dus om 543 in kader-coords te krijgen, moet door-x = 543+60 = 603.
 * Idem horizontaal: kader-bottom = (2446-2374)/2 + 24 = 60. Voor 200 in
 * kader-coords-vanaf-onder: door-y = 200+60 = 260.
 */
const REFERENCE_ORDER = {
  ...DEFAULT_ORDER,
  breedte: 877,
  hoogte: 2446,
  colorKind: 'ral_9005' as const,
  sketch: {
    ...DEFAULT_ORDER.sketch,
    verticalLines: [{ id: 'v1', x: 603 }],     // → kader-poederlak 543
    horizontalLines: [{ id: 'h1', y: 260 }],   // → kader-poederlak 200
  },
}

describe('generateCutList — referentie 877×2446', () => {
  const result = generateCutList(REFERENCE_ORDER)

  it('header line', () => {
    expect(result.headerLine).toBe('877-2446')
    expect(result.ralLine).toBe('RAL 9005')
  })

  it('kozijn-frame: 2× 2446 + 1× 837', () => {
    const item1 = result.items.find((i) => i.nr === 1)
    expect(item1).toMatchObject({ profiel: '20*40*2', lengte: 2446, aantal: 2 })
    const item2 = result.items.find((i) => i.nr === 2)
    expect(item2).toMatchObject({ profiel: '20*40*2', lengte: 837, aantal: 1 })
  })

  it('deurbladkader: 2× 2416 + 2× 789', () => {
    expect(result.items.find((i) => i.nr === 3)).toMatchObject({ lengte: 2416, aantal: 2 })
    expect(result.items.find((i) => i.nr === 4)).toMatchObject({ lengte: 789, aantal: 2 })
  })

  it('glaslijst kader gelaste: 2× 2376 + 2× 759', () => {
    expect(result.items.find((i) => i.nr === 5)).toMatchObject({ lengte: 2376, aantal: 2 })
    expect(result.items.find((i) => i.nr === 6)).toMatchObject({ lengte: 759, aantal: 2 })
  })

  it('dwarslat-segmenten gelaste: 544 + 200', () => {
    const lengtes = result.items.filter((i) => i.profiel === '15*15*1.5').map((i) => i.lengte)
    expect(lengtes).toContain(544)
    expect(lengtes).toContain(200)
  })

  it('design verticaal gelaste: 2346', () => {
    const lengtes = result.items.filter((i) => i.profiel === '15*15*1.5').map((i) => i.lengte)
    expect(lengtes).toContain(2346)
  })

  it('glaslijst kader poederlak: 2374 + 757', () => {
    const lengtes = result.items.filter((i) => i.profiel === '15*15*1.5').map((i) => i.lengte)
    expect(lengtes).toContain(2374)
    expect(lengtes).toContain(757)
  })

  it('dwarslat-segmenten poederlak: 543 + 199', () => {
    const lengtes = result.items.filter((i) => i.profiel === '15*15*1.5').map((i) => i.lengte)
    expect(lengtes).toContain(543)
    expect(lengtes).toContain(199)
  })

  it('design verticaal poederlak: 2344', () => {
    const lengtes = result.items.filter((i) => i.profiel === '15*15*1.5').map((i) => i.lengte)
    expect(lengtes).toContain(2344)
  })

  it('extras: Kampas 700×2, Juosta 2446×2 + 807×1', () => {
    const extras = result.items.filter((i) => i.nr === null)
    expect(extras).toHaveLength(3)
    expect(extras[0]).toMatchObject({ profiel: 'Kampas 30*30', lengte: 700, aantal: 2 })
    expect(extras[1]).toMatchObject({ profiel: 'Juosta-35*4', lengte: 2446, aantal: 2 })
    expect(extras[2]).toMatchObject({ profiel: 'Juosta-35*4', lengte: 807, aantal: 1 })
  })
})

describe('generateCutList — geen design-lijnen', () => {
  it('produceert alleen kader-pieces + extras', () => {
    const result = generateCutList({
      ...DEFAULT_ORDER,
      breedte: 900,
      hoogte: 2300,
      sketch: { ...DEFAULT_ORDER.sketch, verticalLines: [], horizontalLines: [] },
    })
    const designItems = result.items.filter((i) => i.nr && i.lengte > 1000 && i.profiel === '15*15*1.5' && (i.lengte === 2300 - 30 - 40 - 30))
    // Geen design verticalen
    expect(designItems).toHaveLength(0)
    // Wel 6 standaard genummerde items (1-6) + 2 (kader poederlak) = 8
    const numbered = result.items.filter((i) => i.nr !== null)
    expect(numbered.length).toBe(8)
  })
})
