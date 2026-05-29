import type { OrderData } from '../../lib/types'
import { visualGeometry } from '../../lib/calculations'

interface Props {
  order: OrderData
  showInterior?: boolean
}

/**
 * Maatlijnen rondom + tussen schets-lijnen.
 * Coordinaten zijn user-units (mm). Strokes zijn non-scaling.
 *
 * Wanneer vast paneel(en) aanwezig zijn, toont een 2e rij maatlijnen
 * de individuele paneel-/deurblad-breedtes en -hoogtes.
 */
export function DimensionLabels({ order, showInterior = true }: Props) {
  const { breedte, hoogte, sketch } = order
  const offsetX = 80
  const offsetY = 80
  const fontMM = 38

  // sorteer lijnen voor tussenmaten
  const vSorted = [...sketch.verticalLines].sort((a, b) => a.x - b.x).map((v) => v.x)
  const hSorted = [...sketch.horizontalLines].sort((a, b) => a.y - b.y).map((v) => v.y)

  const horizSegments = [0, ...vSorted, breedte]
  const vertSegments = [0, ...hSorted, hoogte]

  // ─── Vast-paneel geometrie (gelijk aan DoorOutline) ──────────
  const baseGeo = visualGeometry(order)
  const isSidePanel = order.doorConfig === 'side_panel'
  const panels = isSidePanel ? order.sidePanels : []
  const KOZIJN_DIV = 8
  const leftPanelWidth = panels.includes('left') ? order.leftPanelWidth : 0
  const rightPanelWidth = panels.includes('right') ? order.rightPanelWidth : 0
  const topPanelHeight = panels.includes('top') ? order.topPanelHeight : 0
  const baseBladeX = (breedte - baseGeo.bladeWidth) / 2
  const baseBladeY = (hoogte - baseGeo.bladeHeight) / 2
  const reducedBladeW = Math.max(200, baseGeo.bladeWidth
    - leftPanelWidth - (leftPanelWidth ? KOZIJN_DIV : 0)
    - rightPanelWidth - (rightPanelWidth ? KOZIJN_DIV : 0))
  const reducedBladeH = Math.max(800, baseGeo.bladeHeight
    - topPanelHeight - (topPanelHeight ? KOZIJN_DIV : 0))
  const bladeX = baseBladeX + leftPanelWidth + (leftPanelWidth ? KOZIJN_DIV : 0)
  const bladeY = baseBladeY + topPanelHeight + (topPanelHeight ? KOZIJN_DIV : 0)

  // Per-element horizontale segmenten — alleen wanneer er panels zijn
  const hasHorizPanels = leftPanelWidth > 0 || rightPanelWidth > 0
  const horizElements: { x1: number; x2: number; label: string }[] = []
  if (hasHorizPanels) {
    if (leftPanelWidth > 0) horizElements.push({ x1: baseBladeX, x2: baseBladeX + leftPanelWidth, label: `${leftPanelWidth}` })
    horizElements.push({ x1: bladeX, x2: bladeX + reducedBladeW, label: `${reducedBladeW}` })
    if (rightPanelWidth > 0) horizElements.push({ x1: bladeX + reducedBladeW + KOZIJN_DIV, x2: bladeX + reducedBladeW + KOZIJN_DIV + rightPanelWidth, label: `${rightPanelWidth}` })
  }

  // Per-element verticale segmenten — alleen wanneer top-panel
  const vertElements: { y1: number; y2: number; label: string }[] = []
  if (topPanelHeight > 0) {
    vertElements.push({ y1: baseBladeY, y2: baseBladeY + topPanelHeight, label: `${topPanelHeight}` })
    vertElements.push({ y1: bladeY, y2: bladeY + reducedBladeH, label: `${reducedBladeH}` })
  }

  return (
    <g fontFamily="ui-monospace, 'IBM Plex Mono', monospace" fill="#5b5b53">
      {/* TOTAAL: breedte boven (bold) */}
      <DimH x1={0} x2={breedte} y={-offsetY * 1.6} label={`${breedte}`} fontMM={fontMM} bold />

      {/* TOTAAL: hoogte links (bold) */}
      <DimV y1={0} y2={hoogte} x={-offsetX * 1.6} label={`${hoogte}`} fontMM={fontMM} bold />

      {/* PER-ELEMENT widths — net boven de deur, onder de totaal-breedte */}
      {horizElements.map((seg, i) => (
        <DimH
          key={`elem-h-${i}`}
          x1={seg.x1}
          x2={seg.x2}
          y={-offsetY * 0.55}
          label={seg.label}
          fontMM={fontMM * 0.7}
        />
      ))}

      {/* PER-ELEMENT heights — links van de deur, naast totaal-hoogte */}
      {vertElements.map((seg, i) => (
        <DimV
          key={`elem-v-${i}`}
          y1={seg.y1}
          y2={seg.y2}
          x={-offsetX * 0.55}
          label={seg.label}
          fontMM={fontMM * 0.7}
        />
      ))}

      {/* TUSSEN: horizontale segmenten van design-lijnen (onder de deur) */}
      {showInterior && horizSegments.length > 2
        ? horizSegments.slice(0, -1).map((start, i) => {
            const end = horizSegments[i + 1]
            const w = end - start
            if (w < 30) return null
            return (
              <DimH
                key={`hseg-${i}`}
                x1={start}
                x2={end}
                y={hoogte + offsetY * 0.6}
                label={`${w}`}
                fontMM={fontMM * 0.75}
              />
            )
          })
        : null}

      {/* TUSSEN: verticale segmenten van design-lijnen (rechts van de deur) */}
      {showInterior && vertSegments.length > 2
        ? vertSegments.slice(0, -1).map((start, i) => {
            const end = vertSegments[i + 1]
            const h = end - start
            if (h < 30) return null
            return (
              <DimV
                key={`vseg-${i}`}
                y1={start}
                y2={end}
                x={breedte + offsetX * 0.6}
                label={`${h}`}
                fontMM={fontMM * 0.75}
              />
            )
          })
        : null}
    </g>
  )
}

interface DimHProps { x1: number; x2: number; y: number; label: string; fontMM: number; bold?: boolean }

function DimH({ x1, x2, y, label, fontMM, bold }: DimHProps) {
  const tick = fontMM * 0.35
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#5b5b53" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <line x1={x1} y1={y - tick} x2={x1} y2={y + tick} stroke="#5b5b53" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <line x1={x2} y1={y - tick} x2={x2} y2={y + tick} stroke="#5b5b53" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <text
        x={(x1 + x2) / 2}
        y={y - fontMM * 0.4}
        textAnchor="middle"
        fontSize={fontMM}
        fontWeight={bold ? 'bold' : 'normal'}
        fill="#2A2A26"
      >
        {label}
      </text>
    </g>
  )
}

interface DimVProps { y1: number; y2: number; x: number; label: string; fontMM: number; bold?: boolean }

function DimV({ y1, y2, x, label, fontMM, bold }: DimVProps) {
  const tick = fontMM * 0.35
  const cy = (y1 + y2) / 2
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke="#5b5b53" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <line x1={x - tick} y1={y1} x2={x + tick} y2={y1} stroke="#5b5b53" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <line x1={x - tick} y1={y2} x2={x + tick} y2={y2} stroke="#5b5b53" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <text
        x={x - fontMM * 0.5}
        y={cy}
        textAnchor="middle"
        fontSize={fontMM}
        fontWeight={bold ? 'bold' : 'normal'}
        fill="#2A2A26"
        transform={`rotate(-90 ${x - fontMM * 0.5} ${cy})`}
      >
        {label}
      </text>
    </g>
  )
}
