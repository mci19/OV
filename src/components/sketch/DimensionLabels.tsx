import type { OrderData } from '../../lib/types'

interface Props {
  order: OrderData
  showInterior?: boolean
}

/**
 * Maatlijnen rondom + tussen schets-lijnen.
 * Coordinaten zijn user-units (mm). Strokes zijn non-scaling.
 */
export function DimensionLabels({ order, showInterior = true }: Props) {
  const { breedte, hoogte, sketch } = order
  const offsetX = 80 // mm aan linker/rechter zijde voor verticale maatlijn
  const offsetY = 80 // mm boven/onder voor horizontale maatlijn
  const fontMM = 38

  // sorteer lijnen voor tussenmaten
  const vSorted = [...sketch.verticalLines].sort((a, b) => a.x - b.x).map((v) => v.x)
  const hSorted = [...sketch.horizontalLines].sort((a, b) => a.y - b.y).map((v) => v.y)

  const horizSegments = [0, ...vSorted, breedte]
  const vertSegments = [0, ...hSorted, hoogte]

  return (
    <g fontFamily="ui-monospace, 'IBM Plex Mono', monospace" fill="#5b5b53">
      {/* TOTAAL: breedte boven */}
      <DimH x1={0} x2={breedte} y={-offsetY} label={`${breedte}`} fontMM={fontMM} bold />

      {/* TOTAAL: hoogte links */}
      <DimV y1={0} y2={hoogte} x={-offsetX} label={`${hoogte}`} fontMM={fontMM} bold />

      {/* TUSSEN: horizontale segmenten (onder de deur) */}
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

      {/* TUSSEN: verticale segmenten (rechts van de deur) */}
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
