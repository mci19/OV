import { describe, expect, it } from 'vitest'
import { generateDrawing } from './drawingGenerator'
import { DEFAULT_CONFIG } from './types'

describe('generateDrawing', () => {
  it('produces valid svg root for full variant', () => {
    const svg = generateDrawing(DEFAULT_CONFIG)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('viewBox=')
    expect(svg).toContain('</svg>')
  })

  it('contains breedte and hoogte dimension labels', () => {
    const svg = generateDrawing(DEFAULT_CONFIG)
    expect(svg).toContain(`>${DEFAULT_CONFIG.hoogte}<`)
    expect(svg).toContain(`>${DEFAULT_CONFIG.breedte}<`)
  })

  it('produces shorter output for glass-frame-only variant', () => {
    const full = generateDrawing(DEFAULT_CONFIG, { variant: 'full' })
    const glass = generateDrawing(DEFAULT_CONFIG, { variant: 'glass-frame-only' })
    expect(glass.length).toBeLessThan(full.length)
  })

  it('omits design lines when designEnabled = false', () => {
    const off = generateDrawing({ ...DEFAULT_CONFIG, designEnabled: false })
    const on = generateDrawing(DEFAULT_CONFIG)
    // crude check: with design off, fewer <line> elements
    const linesOn = (on.match(/<line/g) || []).length
    const linesOff = (off.match(/<line/g) || []).length
    expect(linesOff).toBeLessThan(linesOn)
  })

  it('escapes xml in user-provided strings', () => {
    const cfg = { ...DEFAULT_CONFIG, referentie: 'A & <B>' }
    const svg = generateDrawing(cfg)
    expect(svg).not.toContain('A & <B>')
    expect(svg).toContain('A &amp; &lt;B&gt;')
  })
})
