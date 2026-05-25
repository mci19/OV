import { describe, expect, it } from 'vitest'
import { validateOrder, visualGeometry } from './calculations'
import { DEFAULT_ORDER, type OrderData } from './types'
import { TEMPLATES, applyTemplate } from './templates'
import { orderNumber } from './orderNumber'

describe('validateOrder', () => {
  it('accepteert default-order zonder errors', () => {
    const issues = validateOrder({ ...DEFAULT_ORDER, klantNaam: 'Test' })
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0)
  })

  it('weigert hoogte onder 1800', () => {
    const issues = validateOrder({ ...DEFAULT_ORDER, hoogte: 1500 })
    expect(issues.some((i) => i.field === 'hoogte' && i.severity === 'error')).toBe(true)
  })

  it('weigert hoogte boven 3500', () => {
    const issues = validateOrder({ ...DEFAULT_ORDER, hoogte: 4000 })
    expect(issues.some((i) => i.field === 'hoogte' && i.severity === 'error')).toBe(true)
  })

  it('weigert breedte buiten bereik', () => {
    expect(validateOrder({ ...DEFAULT_ORDER, breedte: 400 }).some((i) => i.severity === 'error')).toBe(true)
    expect(validateOrder({ ...DEFAULT_ORDER, breedte: 1600 }).some((i) => i.severity === 'error')).toBe(true)
  })

  it('waarschuwt voor ontbrekende klantnaam', () => {
    const issues = validateOrder({ ...DEFAULT_ORDER, klantNaam: '' })
    expect(issues.some((i) => i.field === 'klantNaam' && i.severity === 'warning')).toBe(true)
  })

  it('weigert meer dan 5 verticale lijnen', () => {
    const order: OrderData = {
      ...DEFAULT_ORDER,
      sketch: {
        ...DEFAULT_ORDER.sketch,
        verticalLines: Array.from({ length: 6 }, (_, i) => ({ id: `v${i}`, x: 100 + i * 50 })),
      },
    }
    expect(validateOrder(order).some((i) => i.field === 'sketch' && i.severity === 'error')).toBe(true)
  })
})

describe('visualGeometry', () => {
  it('berekent blade en glas correct voor 900×2300', () => {
    const geo = visualGeometry({ ...DEFAULT_ORDER, breedte: 900, hoogte: 2300 })
    expect(geo.bladeWidth).toBe(812)
    expect(geo.bladeHeight).toBe(2270)
    expect(geo.glassWidth).toBe(804)
    expect(geo.glassHeight).toBe(2222)
  })
})

describe('templates', () => {
  it('elke template produceert geldige output', () => {
    for (const t of TEMPLATES) {
      const r = t.build({ hoogte: 2300, breedte: 900 })
      expect(r.verticalLines.length).toBeLessThanOrEqual(5)
      expect(r.horizontalLines.length).toBeLessThanOrEqual(5)
      for (const v of r.verticalLines) expect(v.x).toBeGreaterThan(0)
      for (const h of r.horizontalLines) expect(h.y).toBeGreaterThan(0)
    }
  })

  it('applyTemplate slaat templateId op', () => {
    const next = applyTemplate(DEFAULT_ORDER, 'halfglas')
    expect(next.sketch.templateId).toBe('halfglas')
    expect(next.sketch.horizontalLines).toHaveLength(1)
  })
})

describe('orderNumber', () => {
  it('is deterministisch voor zelfde input', () => {
    const o = { ...DEFAULT_ORDER, klantNaam: 'Test Klant', datum: '2025-06-01' }
    expect(orderNumber(o)).toBe(orderNumber(o))
  })

  it('begint met datum yyyymmdd', () => {
    const nr = orderNumber({ ...DEFAULT_ORDER, datum: '2025-06-01' })
    expect(nr.startsWith('20250601')).toBe(true)
  })
})
