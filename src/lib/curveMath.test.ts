import { describe, expect, it } from 'vitest'
import { parseQuadraticCurve, serializeQuadraticCurve, translateQuadraticCurve } from './curveMath'

describe('parseQuadraticCurve', () => {
  it('parseert "M sx sy Q cx cy ex ey"', () => {
    const c = parseQuadraticCurve('M 100 200 Q 400 50 700 200')
    expect(c).toEqual({
      start: { x: 100, y: 200 },
      control: { x: 400, y: 50 },
      end: { x: 700, y: 200 },
    })
  })

  it('tolerant voor extra spaties + decimalen', () => {
    const c = parseQuadraticCurve('  M  100.5  200  Q  400  50.25  700  200  ')
    expect(c?.control.y).toBeCloseTo(50.25)
  })

  it('parseert negatieve waardes', () => {
    const c = parseQuadraticCurve('M -10 20 Q 30 -40 50 60')
    expect(c?.start.x).toBe(-10)
    expect(c?.control.y).toBe(-40)
  })

  it('returnt null bij ongeldige input', () => {
    expect(parseQuadraticCurve('M 1 2 L 3 4')).toBe(null)
    expect(parseQuadraticCurve('Q 1 2 3 4 5 6')).toBe(null)
    expect(parseQuadraticCurve('garbage')).toBe(null)
  })
})

describe('serializeQuadraticCurve', () => {
  it('rondt af op gehele mm', () => {
    const s = serializeQuadraticCurve({
      start: { x: 100.7, y: 200.3 },
      control: { x: 400, y: 50 },
      end: { x: 700, y: 200 },
    })
    expect(s).toBe('M 101 200 Q 400 50 700 200')
  })

  it('round-trip met parseQuadraticCurve', () => {
    const original = 'M 100 200 Q 400 50 700 200'
    const parsed = parseQuadraticCurve(original)
    const back = serializeQuadraticCurve(parsed!)
    expect(back).toBe(original)
  })
})

describe('translateQuadraticCurve', () => {
  const c = {
    start: { x: 100, y: 200 },
    control: { x: 400, y: 50 },
    end: { x: 700, y: 200 },
  }

  it('verplaatst alle 3 punten met dx/dy', () => {
    const out = translateQuadraticCurve(c, 50, -10)
    expect(out.start).toEqual({ x: 150, y: 190 })
    expect(out.control).toEqual({ x: 450, y: 40 })
    expect(out.end).toEqual({ x: 750, y: 190 })
  })

  it('translate(0, 0) is no-op', () => {
    expect(translateQuadraticCurve(c, 0, 0)).toEqual(c)
  })
})
