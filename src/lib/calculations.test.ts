import { describe, expect, it } from 'vitest'
import { computeGeometry, validateConfig } from './calculations'
import { generateCutList } from './cutListGenerator'
import { DEFAULT_CONFIG } from './types'

const REF = {
  ...DEFAULT_CONFIG,
  hoogte: 2446,
  breedte: 877,
  designEnabled: true,
  verticaleLijnVanafLinks: 543,
  horizontaleDwarslatVanafOnder: 200,
  colorKind: 'ral_9005' as const,
}

describe('computeGeometry (referentie 877×2446)', () => {
  const geo = computeGeometry(REF)

  it('outer frame', () => {
    expect(geo.outerVerticalLength).toBe(2446)
    expect(geo.outerHorizontalLength).toBe(837)
  })

  it('blade frame', () => {
    expect(geo.bladeVertical).toBe(2416)
    expect(geo.bladeHorizontal).toBe(789)
  })

  it('glass list kader gelaste', () => {
    expect(geo.glassKaderVertGelaste).toBe(2376)
    expect(geo.glassKaderHorizGelaste).toBe(759)
  })

  it('glass list kader poederlak', () => {
    expect(geo.glassKaderVertPoederlak).toBe(2374)
    expect(geo.glassKaderHorizPoederlak).toBe(757)
  })

  it('design vertical (full height)', () => {
    expect(geo.designVertGelaste).toBe(2346)
    expect(geo.designVertPoederlak).toBe(2344)
  })

  it('crossbar segments gelaste', () => {
    expect(geo.crossbarLeftGelaste).toBe(544)
    expect(geo.crossbarRightGelaste).toBe(200)
  })

  it('crossbar segments poederlak', () => {
    expect(geo.crossbarLeftPoederlak).toBe(543)
    expect(geo.crossbarRightPoederlak).toBe(199)
  })

  it('glas maat', () => {
    expect(geo.glassWidth).toBe(781)
    expect(geo.glassHeight).toBe(2368)
  })

  it('extras', () => {
    expect(geo.juostaVertical).toBe(2446)
    expect(geo.juostaHorizontal).toBe(807)
    expect(geo.kampasLength).toBe(700)
  })
})

describe('generateCutList (referentie 877×2446)', () => {
  const result = generateCutList(REF)
  const numbered = result.items.filter((i) => i.nr !== null)

  it('produces exactly 14 numbered items', () => {
    expect(numbered).toHaveLength(14)
  })

  it.each([
    [1, '20*40*2', 2446, 2],
    [2, '20*40*2', 837, 1],
    [3, '20*40*2', 2416, 2],
    [4, '20*40*2', 789, 2],
    [5, '15*15*1.5', 2376, 2],
    [6, '15*15*1.5', 759, 2],
    [7, '15*15*1.5', 200, 1],
    [8, '15*15*1.5', 544, 1],
    [9, '15*15*1.5', 2346, 1],
    [10, '15*15*1.5', 2374, 2],
    [11, '15*15*1.5', 757, 2],
    [12, '15*15*1.5', 199, 1],
    [13, '15*15*1.5', 543, 1],
    [14, '15*15*1.5', 2344, 1],
  ])('item %i is %s %imm × %i', (nr, profiel, lengte, aantal) => {
    const item = numbered.find((i) => i.nr === nr)
    expect(item).toBeDefined()
    expect(item!.profiel).toBe(profiel)
    expect(item!.lengte).toBe(lengte)
    expect(item!.aantal).toBe(aantal)
  })

  it('includes Kampas + Juosta extras', () => {
    const extras = result.items.filter((i) => i.nr === null)
    expect(extras).toHaveLength(3)
    expect(extras[0]).toMatchObject({ profiel: 'Kampas 30*30', lengte: 700, aantal: 2 })
    expect(extras[1]).toMatchObject({ profiel: 'Juosta-35*4', lengte: 2446, aantal: 2 })
    expect(extras[2]).toMatchObject({ profiel: 'Juosta-35*4', lengte: 807, aantal: 1 })
  })

  it('header en RAL', () => {
    expect(result.headerLine).toBe('877-2446')
    expect(result.ralLine).toBe('RAL 9005')
  })

  it('text format reproduceert PDF voorbeeld', () => {
    const expected = [
      '877-2446',
      'RAL 9005',
      ' 1.  20*40*2 -2446mm. 2vnt.',
      ' 2.  20*40*2 -837mm.  1vnt.',
      ' 3.  20*40*2 -2416mm. 2vnt.',
      ' 4.  20*40*2 -789mm.  2vnt.',
      ' 5.  15*15*1.5-2376mm. 2vnt.',
      ' 6.  15*15*1.5-759mm.  2vnt.',
      ' 7.  15*15*1.5-200mm.  1vnt.',
      ' 8.  15*15*1.5-544mm.  1vnt.',
      ' 9.  15*15*1.5-2346mm. 1vnt.',
      '10.  15*15*1.5-2374mm. 2vnt.',
      '11.  15*15*1.5-757mm.  2vnt.',
      '12.  15*15*1.5-199mm.  1vnt.',
      '13.  15*15*1.5-543mm.  1vnt.',
      '14.  15*15*1.5-2344mm. 1vnt.',
      'Kampas 30*30 L-700mm.  2vnt.',
      'Juosta-35*4-2446mm.    2vnt.',
      'Juosta-35*4-807mm.     1vnt.',
    ].join('\n')
    expect(result.text).toBe(expected)
  })
})

describe('validateConfig', () => {
  it('accepts referentie', () => {
    const issues = validateConfig(REF)
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0)
  })

  it('rejects hoogte te klein', () => {
    const issues = validateConfig({ ...REF, hoogte: 1500 })
    expect(issues.some((i) => i.field === 'hoogte' && i.severity === 'error')).toBe(true)
  })

  it('rejects breedte te klein', () => {
    const issues = validateConfig({ ...REF, breedte: 400 })
    expect(issues.some((i) => i.field === 'breedte' && i.severity === 'error')).toBe(true)
  })

  it('rejects verticale lijn buiten kader', () => {
    const issues = validateConfig({ ...REF, verticaleLijnVanafLinks: 5 })
    expect(issues.some((i) => i.field === 'verticaleLijnVanafLinks' && i.severity === 'error')).toBe(true)
  })
})
