import { describe, expect, it } from 'vitest'
import { resolveHandleLength, stageLabel, quoteStatusLabel, tFor } from './i18n'
import { DEFAULT_CUT_FORMULAS } from './db'

describe('tFor — translation helper', () => {
  it('returns NL by default', () => {
    expect(tFor('nl', 'common.save')).toBe('Bewaar')
  })

  it('returns EN when lang=en', () => {
    expect(tFor('en', 'common.save')).toBe('Save')
  })

  it('interpolates variables', () => {
    const out = tFor('nl', 'labels.handle.lGrip', { mm: 200 })
    expect(out).toBe('L-greep 200 mm')
  })

  it('falls back to NL when EN key missing (none missing, sanity)', () => {
    // beide talen hebben deze key, dus dit is een sanity-check op de pure-fallback path
    expect(tFor('en', 'stage.lead')).toBe('Lead')
  })
})

describe('stageLabel — opportunity pipeline', () => {
  it('NL stages', () => {
    expect(stageLabel('lead', 'nl')).toBe('Lead')
    expect(stageLabel('meeting', 'nl')).toBe('Showroom-afspraak')
    expect(stageLabel('won', 'nl')).toBe('Akkoord')
  })

  it('EN stages', () => {
    expect(stageLabel('quote_sent', 'en')).toBe('Quote sent')
    expect(stageLabel('lost', 'en')).toBe('Lost')
  })
})

describe('quoteStatusLabel', () => {
  it('NL statuses', () => {
    expect(quoteStatusLabel('draft', 'nl')).toBe('Concept')
    expect(quoteStatusLabel('accepted', 'nl')).toBe('Geaccepteerd')
  })
  it('EN statuses', () => {
    expect(quoteStatusLabel('sent', 'en')).toBe('Sent')
    expect(quoteStatusLabel('declined', 'en')).toBe('Declined')
  })
})

describe('resolveHandleLength — greep-lengte berekening', () => {
  const f = DEFAULT_CUT_FORMULAS

  it('handleVerticalMm > 0 wint boven default', () => {
    expect(resolveHandleLength('l_grip', 350, f)).toBe(350)
    expect(resolveHandleLength('horizontal_bar', 250, f)).toBe(250)
    expect(resolveHandleLength('t_grip', 180, f)).toBe(180)
    expect(resolveHandleLength('custom', 600, f)).toBe(600)
  })

  it('handleVerticalMm = 0 → default uit CutFormulas', () => {
    expect(resolveHandleLength('l_grip', 0, f)).toBe(f.greep_l_grip_lengte)
    expect(resolveHandleLength('horizontal_bar', 0, f)).toBe(f.greep_horizontal_bar_lengte)
    expect(resolveHandleLength('t_grip', 0, f)).toBe(f.greep_t_grip_lengte)
    expect(resolveHandleLength('custom', 0, f)).toBe(f.greep_custom_default_lengte)
  })

  it('non-adjustable types retourneren 0', () => {
    expect(resolveHandleLength('none', 200, f)).toBe(0)
    expect(resolveHandleLength('l_vertical', 200, f)).toBe(0)
    expect(resolveHandleLength('veerklink', 200, f)).toBe(0)
    expect(resolveHandleLength('other', 200, f)).toBe(0)
  })

  it('NaN/negatieve handleVerticalMm → default', () => {
    expect(resolveHandleLength('l_grip', NaN, f)).toBe(f.greep_l_grip_lengte)
    expect(resolveHandleLength('l_grip', -50, f)).toBe(f.greep_l_grip_lengte)
  })

  it('rondt fractionele override af', () => {
    expect(resolveHandleLength('l_grip', 199.7, f)).toBe(200)
  })
})
