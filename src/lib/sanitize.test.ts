import { describe, expect, it } from 'vitest'
import { DEFAULT_ORDER, sanitizeOrderData, validDoorConfigsFor } from './types'

describe('validDoorConfigsFor — MY DOORS productie-regels', () => {
  it('< 1000 mm → enkele deur of pivot', () => {
    expect(validDoorConfigsFor(900)).toEqual(['single', 'pivot'])
    expect(validDoorConfigsFor(600)).toEqual(['single', 'pivot'])
  })

  it('1000-1500 mm → enkele deur, paneel of pivot', () => {
    expect(validDoorConfigsFor(1000)).toEqual(['single', 'side_panel', 'pivot'])
    expect(validDoorConfigsFor(1200)).toEqual(['single', 'side_panel', 'pivot'])
    expect(validDoorConfigsFor(1500)).toEqual(['single', 'side_panel', 'pivot'])
  })

  it('> 1500 mm → dubbele deur of pivot', () => {
    expect(validDoorConfigsFor(1501)).toEqual(['double', 'pivot'])
    expect(validDoorConfigsFor(2000)).toEqual(['double', 'pivot'])
  })

  it('NaN/ongeldig → behandelt als <1000', () => {
    expect(validDoorConfigsFor(NaN)).toEqual(['single', 'pivot'])
  })
})

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
      { id: 'v1', x: 400, area: 'door' },
      { id: 'v2', x: 500, area: 'door' },
    ])
  })

  it('corrigeert handlePosition.side bij belgisch_links → right', () => {
    const out = sanitizeOrderData({
      ...DEFAULT_ORDER,
      hingeSide: 'belgisch_links',
      handlePosition: { side: 'left', heightFromBottom: 1050 },
    })
    expect(out.handlePosition.side).toBe('right')
  })

  it('corrigeert handlePosition.side bij belgisch_rechts → left', () => {
    const out = sanitizeOrderData({
      ...DEFAULT_ORDER,
      hingeSide: 'belgisch_rechts',
      handlePosition: { side: 'right', heightFromBottom: 1050 },
    })
    expect(out.handlePosition.side).toBe('left')
  })

  it('laat handlePosition.side ongemoeid voor dubbele deur hingeSide', () => {
    const out = sanitizeOrderData({
      ...DEFAULT_ORDER,
      hingeSide: 'double_1',
      handlePosition: { side: 'left', heightFromBottom: 1050 },
    })
    expect(out.handlePosition.side).toBe('left')
  })

  it('laat geldige orders ongemoeid (behalve area-default voor lijnen)', () => {
    const out = sanitizeOrderData({
      ...DEFAULT_ORDER,
      handleKind: 'l_grip',
      sketch: {
        ...DEFAULT_ORDER.sketch,
        verticalLines: [{ id: 'v1', x: 450 }],
      },
    })
    expect(out.handleKind).toBe('l_grip')
    // Sanitize voegt area='door' als default toe voor legacy lijnen
    expect(out.sketch.verticalLines).toEqual([{ id: 'v1', x: 450, area: 'door' }])
  })
})
