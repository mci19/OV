import { Svg, Rect, Line, Path, G, Circle, Text } from '@react-pdf/renderer'
import type { OrderData } from '../../lib/types'
import { visualGeometry } from '../../lib/calculations'

interface Props {
  order: OrderData
  clientView?: boolean
  showDimensions?: boolean
  width?: number // pdf points
  height?: number
}

/**
 * Schets rendering binnen een @react-pdf Document. Gebruikt mm-coordinaten
 * via viewBox; React-PDF schaalt automatisch naar width/height in pt.
 */
export function SketchPdfBlock({
  order,
  clientView = false,
  showDimensions = true,
  width = 480,
  height = 640,
}: Props) {
  const { breedte, hoogte, sketch } = order
  const geo = visualGeometry(order)
  const margin = 220
  const bladeX = (breedte - geo.bladeWidth) / 2
  const bladeY = (hoogte - geo.bladeHeight) / 2
  const glassX = bladeX + (geo.bladeWidth - geo.glassWidth) / 2
  const glassY = bladeY + 24

  const vbW = breedte + 2 * margin
  const vbH = hoogte + 2 * margin
  const vSorted = [...sketch.verticalLines.map((v) => v.x)].sort((a, b) => a - b)
  const hSorted = [...sketch.horizontalLines.map((h) => h.y)].sort((a, b) => a - b)
  const horizSeg = [0, ...vSorted, breedte]
  const vertSeg = [0, ...hSorted, hoogte]

  const fontMM = 48
  const offX = 100
  const offY = 100

  const side = order.handlePosition.side
  const handleCx = side === 'left' ? 50 : breedte - 50
  const handleCy = hoogte - order.handlePosition.heightFromBottom

  return (
    <Svg viewBox={`${-margin} ${-margin} ${vbW} ${vbH}`} style={{ width, height }}>
      <G>
        <Rect x={0} y={0} width={breedte} height={hoogte} fill={clientView ? '#F8F6F1' : '#FFFFFF'} stroke="#000" strokeWidth={6} />
        <Rect x={bladeX} y={bladeY} width={geo.bladeWidth} height={geo.bladeHeight} fill="#FFFFFF" stroke="#000" strokeWidth={4} />
        <Rect
          x={glassX}
          y={glassY}
          width={geo.glassWidth}
          height={geo.glassHeight}
          fill={clientView ? '#E5EEF5' : '#F2F4F7'}
          stroke={clientView ? '#9BB3C8' : '#000'}
          strokeWidth={3}
        />

        {sketch.verticalLines.map((v) => (
          <Line key={v.id} x1={v.x} y1={0} x2={v.x} y2={hoogte} stroke="#000" strokeWidth={5} />
        ))}
        {sketch.horizontalLines.map((h) => {
          const y = hoogte - h.y
          return <Line key={h.id} x1={0} y1={y} x2={breedte} y2={y} stroke="#000" strokeWidth={5} />
        })}

        {sketch.freehand.map((s) => (
          <Path key={s.id} d={s.d} stroke="#000" strokeWidth={s.width} fill="none" strokeLinecap="round" />
        ))}

        <Circle cx={handleCx} cy={handleCy} r={32} fill="#FFFFFF" stroke="#000" strokeWidth={4} />
        <Line
          x1={handleCx + (side === 'left' ? 32 : -32)}
          y1={handleCy}
          x2={handleCx + (side === 'left' ? 140 : -140)}
          y2={handleCy}
          stroke="#000"
          strokeWidth={14}
          strokeLinecap="round"
        />

        {showDimensions && !clientView ? (
          <>
            <DimensionH x1={0} x2={breedte} y={-offY} label={`${breedte}`} fontMM={fontMM} bold />
            <DimensionV y1={0} y2={hoogte} x={-offX} label={`${hoogte}`} fontMM={fontMM} bold />

            {horizSeg.length > 2 &&
              horizSeg.slice(0, -1).map((start, i) => {
                const end = horizSeg[i + 1]
                const w = end - start
                if (w < 30) return null
                return (
                  <DimensionH
                    key={`hseg-${i}`}
                    x1={start}
                    x2={end}
                    y={hoogte + offY * 0.7}
                    label={`${w}`}
                    fontMM={fontMM * 0.7}
                  />
                )
              })}
            {vertSeg.length > 2 &&
              vertSeg.slice(0, -1).map((start, i) => {
                const end = vertSeg[i + 1]
                const h = end - start
                if (h < 30) return null
                return (
                  <DimensionV
                    key={`vseg-${i}`}
                    y1={start}
                    y2={end}
                    x={breedte + offX * 0.7}
                    label={`${h}`}
                    fontMM={fontMM * 0.7}
                  />
                )
              })}
          </>
        ) : null}
      </G>
    </Svg>
  )
}

function DimensionH({
  x1,
  x2,
  y,
  label,
  fontMM,
  bold,
}: { x1: number; x2: number; y: number; label: string; fontMM: number; bold?: boolean }) {
  const tick = fontMM * 0.4
  return (
    <G>
      <Line x1={x1} y1={y} x2={x2} y2={y} stroke="#444" strokeWidth={2} />
      <Line x1={x1} y1={y - tick} x2={x1} y2={y + tick} stroke="#444" strokeWidth={2} />
      <Line x1={x2} y1={y - tick} x2={x2} y2={y + tick} stroke="#444" strokeWidth={2} />
      <Text x={(x1 + x2) / 2} y={y - fontMM * 0.4} style={{ fontSize: fontMM, fontFamily: 'Helvetica', fontWeight: bold ? 'bold' : 'normal', textAnchor: 'middle' }}>
        {label}
      </Text>
    </G>
  )
}

function DimensionV({
  y1,
  y2,
  x,
  label,
  fontMM,
  bold,
}: { y1: number; y2: number; x: number; label: string; fontMM: number; bold?: boolean }) {
  const tick = fontMM * 0.4
  const cy = (y1 + y2) / 2
  return (
    <G>
      <Line x1={x} y1={y1} x2={x} y2={y2} stroke="#444" strokeWidth={2} />
      <Line x1={x - tick} y1={y1} x2={x + tick} y2={y1} stroke="#444" strokeWidth={2} />
      <Line x1={x - tick} y1={y2} x2={x + tick} y2={y2} stroke="#444" strokeWidth={2} />
      <Text
        x={x - fontMM * 0.5}
        y={cy}
        style={{ fontSize: fontMM, fontFamily: 'Helvetica', fontWeight: bold ? 'bold' : 'normal', textAnchor: 'middle' }}
        transform={`rotate(-90 ${x - fontMM * 0.5} ${cy})`}
      >
        {label}
      </Text>
    </G>
  )
}
