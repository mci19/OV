import { computeGeometry, glassLabel, ralLabel } from './calculations'
import type { DoorConfig, DoorGeometry } from './types'

export interface DrawingOptions {
  showDimensions?: boolean
  showHandle?: boolean
  showTitleBlock?: boolean
  variant?: 'full' | 'glass-frame-only'
  width?: number // svg viewport mm
}

// Maatvoering: tekent altijd in millimeters in user space.
// viewBox berekent de bounding box met marges voor maatlijnen.
export function generateDrawing(config: DoorConfig, opts: DrawingOptions = {}): string {
  const {
    showDimensions = true,
    showHandle = true,
    showTitleBlock = true,
    variant = 'full',
  } = opts

  const geo = computeGeometry(config)

  if (variant === 'glass-frame-only') {
    return generateGlassFrameDrawing(config, geo, { showDimensions, showTitleBlock })
  }
  return generateFullDrawing(config, geo, { showDimensions, showHandle, showTitleBlock })
}

function generateFullDrawing(
  config: DoorConfig,
  geo: DoorGeometry,
  opts: { showDimensions: boolean; showHandle: boolean; showTitleBlock: boolean },
): string {
  const W = config.breedte
  const H = config.hoogte

  // marges in user-units (mm) voor maatvoering en handvat
  const marginL = 180
  const marginR = 260 // ruimte voor handvat
  const marginT = 180
  const marginB = 240

  const viewW = W + marginL + marginR
  const viewH = H + marginT + marginB

  // origin van de deur (linksboven van outer frame)
  const ox = marginL
  const oy = marginT

  // outer frame coords
  const frameStroke = 4
  const innerStroke = 2
  const detailStroke = 1.2

  // blade frame inside outer frame, centered horizontally with 4mm gap each side
  const bladeOffsetX = 44 // (W - blade_horizontal)/2 = (88)/2 = 44
  const bladeOffsetY = 22 // ~ centered approx; visually fine for drawing
  const bladeX = ox + bladeOffsetX
  const bladeY = oy + bladeOffsetY
  const bladeW = geo.bladeHorizontal
  const bladeH = geo.bladeVertical

  // glass area inside blade frame (offset = profile width 20 + small)
  const glassListMargin = 15
  const glassX = bladeX + glassListMargin
  const glassY = bladeY + glassListMargin
  const glassW = geo.glassKaderHorizGelaste // 759 - approx
  const glassH = geo.glassKaderVertGelaste

  // design lines (in glass area coords; verticaleLijnVanafLinks is measured from
  // left edge of glass-list-area = glassX)
  const designOn = config.designEnabled
  const vLineX = glassX + config.verticaleLijnVanafLinks
  // horizontale dwarslat vanaf onder
  const crossbarY = glassY + glassH - config.horizontaleDwarslatVanafOnder

  const parts: string[] = []

  // ── outer frame ─────────────────────────────────────────────
  parts.push(rect(ox, oy, W, H, { stroke: '#000', strokeWidth: frameStroke, fill: 'none' }))

  // ── blade frame ─────────────────────────────────────────────
  parts.push(rect(bladeX, bladeY, bladeW, bladeH, { stroke: '#000', strokeWidth: innerStroke, fill: 'none' }))

  // ── glass list kader ────────────────────────────────────────
  parts.push(rect(glassX, glassY, glassW, glassH, { stroke: '#000', strokeWidth: detailStroke, fill: '#FAFAF7' }))

  // ── design lines ────────────────────────────────────────────
  if (designOn) {
    // verticale design lijn (volledige glashoogte)
    parts.push(
      line(vLineX, glassY, vLineX, glassY + glassH, { stroke: '#000', strokeWidth: detailStroke }),
    )
    // horizontale dwarslat (volledige glasbreedte)
    parts.push(
      line(glassX, crossbarY, glassX + glassW, crossbarY, { stroke: '#000', strokeWidth: detailStroke }),
    )
  }

  // ── glass label ─────────────────────────────────────────────
  const glassLabelText = [
    ralLabel(config),
    glassLabel(config),
    `${geo.glassWidth}*${geo.glassHeight}-1vnt.`,
  ]
  const glassLabelX = glassX + glassW / 2
  const glassLabelY = glassY + glassH / 2 - 40
  parts.push(
    multilineText(glassLabelX, glassLabelY, glassLabelText, {
      anchor: 'middle',
      fontSize: 36,
      lineHeight: 44,
    }),
  )

  // ── nummerlabels op profielen ───────────────────────────────
  const nrFont = 32
  // outer
  parts.push(numLabel(ox + W / 2, oy + 20, '2', nrFont))
  parts.push(numLabel(ox + 22, oy + H / 2, '1', nrFont))
  // blade
  parts.push(numLabel(bladeX + bladeW / 2, bladeY + 20, '4', nrFont))
  parts.push(numLabel(bladeX + 22, bladeY + bladeH / 2, '3', nrFont))
  // glass list kader
  parts.push(numLabel(glassX + glassW / 2, glassY + 22, '6/11', nrFont))
  parts.push(numLabel(glassX + 22, glassY + glassH / 2 + 200, '5/10', nrFont))
  // design
  if (designOn) {
    parts.push(numLabel(vLineX + 18, glassY + glassH / 2, '9/14', nrFont))
    parts.push(numLabel(glassX + 70, crossbarY - 18, '8/13', nrFont))
    parts.push(numLabel(glassX + glassW - 70, crossbarY - 18, '7/12', nrFont))
  }

  // ── boormaat-labels op buitenframe ──────────────────────────
  parts.push(holeLabel(ox + W / 2 - 60, oy + H / 4, 'Ø12'))
  parts.push(holeLabel(ox + W / 2 - 60, oy + (3 * H) / 4, 'Ø12'))
  parts.push(holeLabel(ox + W / 2 + 80, oy + H / 4, 'Ø9'))

  // ── handvat (rechts buiten frame) ──────────────────────────
  if (opts.showHandle) {
    const handleX = ox + W + 30
    const handleY = oy + H / 2
    const handleLen = geo.kampasLength
    parts.push(
      rect(handleX, handleY - handleLen / 2, 30, handleLen, {
        stroke: '#000',
        strokeWidth: detailStroke,
        fill: '#FFF',
      }),
    )
    parts.push(
      text(handleX + 50, handleY, handleLabel(config), {
        fontSize: 28,
        anchor: 'start',
        rotate: 90,
        cx: handleX + 50,
        cy: handleY,
      }),
    )
  }

  // ── maatvoering ─────────────────────────────────────────────
  if (opts.showDimensions) {
    // breedte boven
    parts.push(dimHorizontal(ox, ox + W, oy - 60, `${W}`))
    // hoogte links
    parts.push(dimVertical(ox - 80, oy, oy + H, `${H}`))
    // blade frame breedte
    parts.push(dimHorizontal(bladeX, bladeX + bladeW, oy + H + 60, `${geo.bladeHorizontal}`))
    // glass kader hoogte rechts (binnen)
    parts.push(
      dimVertical(ox + W + 200, glassY, glassY + glassH, `${geo.glassKaderVertGelaste}`),
    )
    if (designOn) {
      // dwarslat vanaf onder
      parts.push(
        dimVertical(glassX - 80, crossbarY, glassY + glassH, `${config.horizontaleDwarslatVanafOnder}`),
      )
      // verticale lijn vanaf links
      parts.push(dimHorizontal(glassX, vLineX, oy + H + 130, `${config.verticaleLijnVanafLinks}`))
    }
  }

  // ── titelblok ──────────────────────────────────────────────
  if (opts.showTitleBlock) {
    parts.push(
      text(ox, oy - 110, `MY DOORS — ${config.referentie}`, { fontSize: 36, weight: 'bold' }),
    )
    parts.push(text(ox, oy - 70, `${W} × ${H}`, { fontSize: 32 }))
    parts.push(text(ox + viewW - marginL - marginR, oy - 70, config.datum, { fontSize: 28, anchor: 'end' }))
  }

  // ── scharnier pijl onderaan ────────────────────────────────
  const arrowY = oy + H + 180
  const arrowDir = config.hingeSide === 'belgisch_rechts' ? -1 : 1
  parts.push(hingeArrow(ox + W / 2, arrowY, 80 * arrowDir))

  return wrap(parts.join('\n'), 0, 0, viewW, viewH)
}

function generateGlassFrameDrawing(
  config: DoorConfig,
  geo: DoorGeometry,
  opts: { showDimensions: boolean; showTitleBlock: boolean },
): string {
  const W = geo.bladeHorizontal
  const H = geo.bladeVertical

  const marginL = 200
  const marginR = 200
  const marginT = 180
  const marginB = 200

  const viewW = W + marginL + marginR
  const viewH = H + marginT + marginB

  const ox = marginL
  const oy = marginT

  const glassListMargin = 15
  const glassX = ox + glassListMargin
  const glassY = oy + glassListMargin
  const glassW = geo.glassKaderHorizGelaste
  const glassH = geo.glassKaderVertGelaste

  const designOn = config.designEnabled
  const vLineX = glassX + config.verticaleLijnVanafLinks
  const crossbarY = glassY + glassH - config.horizontaleDwarslatVanafOnder

  const parts: string[] = []

  // blade frame
  parts.push(rect(ox, oy, W, H, { stroke: '#000', strokeWidth: 2, fill: 'none' }))
  // glass kader
  parts.push(rect(glassX, glassY, glassW, glassH, { stroke: '#000', strokeWidth: 1.2, fill: '#FAFAF7' }))

  if (designOn) {
    parts.push(line(vLineX, glassY, vLineX, glassY + glassH, { stroke: '#000', strokeWidth: 1.2 }))
    parts.push(line(glassX, crossbarY, glassX + glassW, crossbarY, { stroke: '#000', strokeWidth: 1.2 }))
  }

  parts.push(
    multilineText(glassX + glassW / 2, glassY + glassH / 2, [
      'Glass frame',
      `${geo.bladeHorizontal} × ${geo.bladeVertical}`,
      '1VNT.',
    ], { anchor: 'middle', fontSize: 36, lineHeight: 44 }),
  )

  if (opts.showDimensions) {
    parts.push(dimHorizontal(ox, ox + W, oy - 60, `${W}`))
    parts.push(dimVertical(ox - 80, oy, oy + H, `${H}`))
    if (designOn) {
      parts.push(dimHorizontal(glassX, vLineX, oy + H + 60, `${config.verticaleLijnVanafLinks}`))
      parts.push(
        dimVertical(ox + W + 80, crossbarY, glassY + glassH, `${config.horizontaleDwarslatVanafOnder}`),
      )
    }
  }

  if (opts.showTitleBlock) {
    parts.push(text(ox, oy - 110, `MY DOORS — Glass frame ${config.referentie}`, { fontSize: 32, weight: 'bold' }))
    parts.push(text(ox, oy - 70, `${W} × ${H}`, { fontSize: 28 }))
  }

  return wrap(parts.join('\n'), 0, 0, viewW, viewH)
}

// ─── primitives ──────────────────────────────────────────────

function wrap(inner: string, x: number, y: number, w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-width:100%;max-height:100%;"><g font-family="ui-monospace, 'IBM Plex Mono', 'Space Mono', monospace" fill="#000">${inner}</g></svg>`
}

interface StrokeOpts { stroke?: string; strokeWidth?: number; fill?: string }

function rect(x: number, y: number, w: number, h: number, o: StrokeOpts = {}): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.fill ?? 'none'}" stroke="${o.stroke ?? '#000'}" stroke-width="${o.strokeWidth ?? 1}" vector-effect="non-scaling-stroke" />`
}

function line(x1: number, y1: number, x2: number, y2: number, o: StrokeOpts = {}): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke ?? '#000'}" stroke-width="${o.strokeWidth ?? 1}" vector-effect="non-scaling-stroke" />`
}

interface TextOpts {
  fontSize?: number
  anchor?: 'start' | 'middle' | 'end'
  weight?: string | number
  rotate?: number
  cx?: number
  cy?: number
}

function text(x: number, y: number, content: string, o: TextOpts = {}): string {
  const tr = o.rotate ? ` transform="rotate(${o.rotate} ${o.cx ?? x} ${o.cy ?? y})"` : ''
  const weight = o.weight ? ` font-weight="${o.weight}"` : ''
  return `<text x="${x}" y="${y}" font-size="${o.fontSize ?? 16}" text-anchor="${o.anchor ?? 'start'}"${weight}${tr}>${escapeXml(content)}</text>`
}

function multilineText(x: number, y: number, lines: string[], o: TextOpts & { lineHeight?: number } = {}): string {
  const lh = o.lineHeight ?? 22
  return lines
    .map((ln, i) => text(x, y + i * lh, ln, o))
    .join('')
}

function numLabel(x: number, y: number, label: string, fontSize: number): string {
  const r = fontSize * 0.9
  return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" stroke="#000" stroke-width="1.5"/>${text(x, y + fontSize * 0.35, label, { fontSize, anchor: 'middle', weight: 'bold' })}</g>`
}

function holeLabel(x: number, y: number, label: string): string {
  return text(x, y, label, { fontSize: 22, anchor: 'middle' })
}

function dimHorizontal(x1: number, x2: number, y: number, label: string): string {
  const tickH = 12
  return [
    line(x1, y, x2, y, { strokeWidth: 1 }),
    line(x1, y - tickH, x1, y + tickH, { strokeWidth: 1 }),
    line(x2, y - tickH, x2, y + tickH, { strokeWidth: 1 }),
    text((x1 + x2) / 2, y - 14, label, { fontSize: 28, anchor: 'middle' }),
  ].join('')
}

function dimVertical(x: number, y1: number, y2: number, label: string): string {
  const tickW = 12
  return [
    line(x, y1, x, y2, { strokeWidth: 1 }),
    line(x - tickW, y1, x + tickW, y1, { strokeWidth: 1 }),
    line(x - tickW, y2, x + tickW, y2, { strokeWidth: 1 }),
    text(x - 16, (y1 + y2) / 2, label, {
      fontSize: 28,
      anchor: 'middle',
      rotate: -90,
      cx: x - 16,
      cy: (y1 + y2) / 2,
    }),
  ].join('')
}

function hingeArrow(cx: number, cy: number, dx: number): string {
  const arrow = `M ${cx} ${cy} l ${dx} 0 l ${-Math.sign(dx) * 12} -8 m ${Math.sign(dx) * 12} 8 l ${-Math.sign(dx) * 12} 8`
  return `<path d="${arrow}" stroke="#000" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"/>`
}

function handleLabel(config: DoorConfig): string {
  if (config.handleKind === 'l_grip') return 'L shape handle'
  if (config.handleKind === 'l_vertical') return `L vertical ${config.handleVerticalMm}mm`
  return config.handleOther.trim() || 'handle'
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!)
}
