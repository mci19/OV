import { describe, expect, it } from 'vitest'
import { DEFAULT_ORDER, sanitizeOrderData } from './types'

describe('sanitizeOrderData — legacy migrations', () => {
  it('mapt verwijderde handleKinds naar "other" en zet handleOther', () => {
    const out = sanitizeOrderData({
      ...DEFAULT_ORDER,
      handleKind: 'pull_bar' as unknown as 'other',
      handleOther: '',
    })
    expect(out.handleKind).toBe('other')
    expect(out.handleOther).toBe('pull bar')
  })

  it('respecteert bestaande handleOther label boven legacy mapping', () => {
    const out = sanitizeOrderData({
      ...DEFAULT_ORDER,
      handleKind: 'round_knob' as unknown as 'other',
      handleOther: 'Custom Vintage Knob',
    })
    expect(out.handleKind).toBe('other')
    expect(out.handleOther).toBe('Custom Vintage Knob')
  })

  it('valt onbekende handleKinds (typo, future) terug op "other"', () => {
    const out = sanitizeOrderData({
      ...DEFAULT_ORDER,
      handleKind: 'banaan' as unknown as 'other',
    })
    expect(out.handleKind).toBe('other')
  })

  it('strip asHandle + handleLengthMm uit verticalLines', () => {
    const out = sanitizeOrderData({
      ...DEFAULT_ORDER,
      sketch: {
        ...DEFAULT_ORDER.sketch,
        verticalLines: [
          { id: 'v1', x: 400, asHandle: true, handleLengthMm: 1200 } as { id: string; x: number },
          { id: 'v2', x: 500 },
        ],
      },
    })
    expect(out.sketch.verticalLines).toEqual([
      { id: 'v1', x: 400 },
      { id: 'v2', x: 500 },
    ])
  })

  it('laat geldige orders ongemoeid', () => {
    const out = sanitizeOrderData({
      ...DEFAULT_ORDER,
      handleKind: 'l_grip',
      sketch: {
        ...DEFAULT_ORDER.sketch,
        verticalLines: [{ id: 'v1', x: 450 }],
      },
    })
    expect(out.handleKind).toBe('l_grip')
    expect(out.sketch.verticalLines).toEqual([{ id: 'v1', x: 450 }])
  })
})
