import { describe, expect, it } from 'vitest'
import { DEFAULT_ORDER } from './types'
import { areaLabel, computeAreaBounds } from './areaGeometry'

describe('computeAreaBounds — vlak-bounding-boxen', () => {
  it('geen panelen → alleen "door" is actief, panelen breedte 0', () => {
    const b = computeAreaBounds({ ...DEFAULT_ORDER, breedte: 900, hoogte: 2300 })
    expect(b.door.active).toBe(true)
    expect(b.left_panel.active).toBe(false)
    expect(b.right_panel.active).toBe(false)
    expect(b.top_panel.active).toBe(false)
    expect(b.left_panel.w).toBe(0)
    expect(b.right_panel.w).toBe(0)
    expect(b.top_panel.h).toBe(0)
  })

  it('rechter zij-paneel → right_panel actief met correcte breedte', () => {
    const b = computeAreaBounds({
      ...DEFAULT_ORDER,
      breedte: 1200,
      hoogte: 2300,
      doorConfig: 'side_panel',
      sidePanels: ['right'],
      rightPanelWidth: 400,
    })
    expect(b.right_panel.active).toBe(true)
    expect(b.right_panel.w).toBe(400)
    expect(b.left_panel.active).toBe(false)
    expect(b.top_panel.active).toBe(false)
    // Deur-area bestaat nog steeds, met verkleinde breedte
    expect(b.door.active).toBe(true)
    expect(b.door.w).toBeLessThan(1200)
  })

  it('top-paneel actief → top_panel hoogte = topPanelHeight', () => {
    const b = computeAreaBounds({
      ...DEFAULT_ORDER,
      breedte: 1200,
      hoogte: 2700,
      doorConfig: 'side_panel',
      sidePanels: ['top'],
      topPanelHeight: 300,
    })
    expect(b.top_panel.active).toBe(true)
    expect(b.top_panel.h).toBe(300)
    // Top-paneel spant het inner-deurblad (= breedte − 2×40 − 2×4 speling
    // = 1200 − 88 = 1112) in canvas-rendering.
    expect(b.top_panel.w).toBe(1112)
  })
})

describe('areaLabel — i18n-strings', () => {
  it('NL-labels', () => {
    expect(areaLabel('door', 'nl')).toBe('Deur')
    expect(areaLabel('left_panel', 'nl')).toBe('Links paneel')
    expect(areaLabel('right_panel', 'nl')).toBe('Rechts paneel')
    expect(areaLabel('top_panel', 'nl')).toBe('Boven paneel')
  })
  it('EN-labels', () => {
    expect(areaLabel('door', 'en')).toBe('Door')
    expect(areaLabel('left_panel', 'en')).toBe('Left panel')
    expect(areaLabel('right_panel', 'en')).toBe('Right panel')
    expect(areaLabel('top_panel', 'en')).toBe('Top panel')
  })
})
