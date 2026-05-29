import { describe, expect, it } from 'vitest'
import { DEFAULT_ORDER } from './types'
import { glassLabel, handleLabel, hingeLabel, lockLabel, ralLabel, systemLabel, variantLabel } from './calculations'

const o = DEFAULT_ORDER

describe('handleLabel — alle 7 types in NL + EN', () => {
  it('none', () => {
    expect(handleLabel({ ...o, handleKind: 'none' }, 'nl')).toBe('Geen greep')
    expect(handleLabel({ ...o, handleKind: 'none' }, 'en')).toBe('No handle')
  })

  it('l_grip met default 200 mm', () => {
    expect(handleLabel({ ...o, handleKind: 'l_grip', handleVerticalMm: 0 }, 'nl')).toBe('L-greep 200 mm')
  })

  it('l_grip met custom mm', () => {
    expect(handleLabel({ ...o, handleKind: 'l_grip', handleVerticalMm: 350 }, 'nl')).toBe('L-greep 350 mm')
  })

  it('l_vertical (volle hoogte)', () => {
    expect(handleLabel({ ...o, handleKind: 'l_vertical' }, 'nl')).toBe('L-verticaal (volle hoogte)')
    expect(handleLabel({ ...o, handleKind: 'l_vertical' }, 'en')).toBe('L-vertical (full height)')
  })

  it('horizontal_bar met custom mm', () => {
    expect(handleLabel({ ...o, handleKind: 'horizontal_bar', handleVerticalMm: 250 }, 'nl')).toBe('Horizontale stang 250 mm')
  })

  it('t_grip default', () => {
    expect(handleLabel({ ...o, handleKind: 't_grip', handleVerticalMm: 0 }, 'nl')).toBe('T-greep 200 mm')
  })

  it('custom met override', () => {
    expect(handleLabel({ ...o, handleKind: 'custom', handleVerticalMm: 600 }, 'nl')).toBe('Greep op maat 600 mm')
  })

  it('veerklink', () => {
    expect(handleLabel({ ...o, handleKind: 'veerklink' }, 'nl')).toBe('Veerklink (horizontale klink)')
  })

  it('other met handleOther', () => {
    expect(handleLabel({ ...o, handleKind: 'other', handleOther: 'Lariam knop' }, 'nl')).toBe('Lariam knop')
  })

  it('other zonder handleOther → fallback', () => {
    expect(handleLabel({ ...o, handleKind: 'other', handleOther: '' }, 'nl')).toBe('Greep — vrij')
  })

  it('onbekend handleKind → default-case', () => {
    const out = handleLabel({ ...o, handleKind: 'banaan' as unknown as 'other', handleOther: '' }, 'nl')
    expect(out).toBe('Greep — onbekend type')
  })
})

describe('glassLabel — 9 types + legacy', () => {
  it('alle nieuwe types in NL', () => {
    expect(glassLabel({ ...o, glassType: 'clear' }, 'nl')).toBe('Transparant glas')
    expect(glassLabel({ ...o, glassType: 'matt' }, 'nl')).toBe('Mat glas')
    expect(glassLabel({ ...o, glassType: 'flute' }, 'nl')).toBe('Flute glas')
    expect(glassLabel({ ...o, glassType: 'cathedraal' }, 'nl')).toBe('Kathedraal glas')
    expect(glassLabel({ ...o, glassType: 'smoke' }, 'nl')).toBe('Smoke glas')
    expect(glassLabel({ ...o, glassType: 'absolut_black' }, 'nl')).toBe('Absolut black glas')
    expect(glassLabel({ ...o, glassType: 'chinchilla' }, 'nl')).toBe('Chinchilla glas')
    expect(glassLabel({ ...o, glassType: 'crepi' }, 'nl')).toBe('Crepi glas')
  })

  it('legacy cathedraal_flute valt terug op kathedraal', () => {
    expect(glassLabel({ ...o, glassType: 'cathedraal_flute' }, 'nl')).toBe('Kathedraal glas')
  })

  it('other met label', () => {
    expect(glassLabel({ ...o, glassType: 'other', glassOther: 'Speciaal' }, 'nl')).toBe('Speciaal')
  })
})

describe('lockLabel + ralLabel + systemLabel + variantLabel + hingeLabel', () => {
  it('lockLabel cilinder_litto', () => {
    expect(lockLabel({ ...o, lockKind: 'cilinder_litto' }, 'nl')).toMatch(/Cilinder Litto/)
  })

  it('ralLabel 9005', () => {
    expect(ralLabel({ ...o, colorKind: 'ral_9005' }, 'nl')).toMatch(/RAL 9005/)
  })

  it('systemLabel hinges', () => {
    expect(systemLabel({ ...o, system: 'hinges' }, 'nl')).toBe('Scharnieren')
    expect(systemLabel({ ...o, system: 'pivotica' }, 'nl')).toBe('Pivotica')
  })

  it('hingeLabel single belgisch_links', () => {
    expect(hingeLabel({ ...o, hingeKind: 'single', hingeSide: 'belgisch_links' }, 'nl')).toMatch(/DIN R/)
  })

  it('variantLabel single panel_door', () => {
    const out = variantLabel({ ...o, variants: ['panel_door'] }, 'nl')
    expect(out).toContain('Panel')
  })

  it('variantLabel lege array', () => {
    expect(variantLabel({ ...o, variants: [] }, 'nl')).toBe('—')
  })
})
