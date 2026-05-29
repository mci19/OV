import { Svg, Rect, Line, Path, G, Circle, Text, ClipPath, Defs } from '@react-pdf/renderer'
import type { OrderData, SketchArea } from '../../lib/types'
import { visualGeometry } from '../../lib/calculations'
import { computeAreaBounds } from '../../lib/areaGeometry'

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
 *
 * Bij doorConfig === 'side_panel' worden de actieve panelen (links/rechts/
 * boven) ook in de PDF gerenderd, in dezelfde indeling als de canvas-
 * preview (DoorOutline). Design-lijnen en curves worden per vlak geclipt
 * zodat ze niet doorlopen tussen deur en paneel.
 */
export function SketchPdfBlock({
  order,
  clientView = false,
  showDimensions = true,
  width = 480,
  height = 640,
}: Props) {
  const { breedte, hoogte, sketch } = order
  const baseGeo = visualGeometry(order)
  const margin = 220

  // Panelen-geometrie identiek aan DoorOutline (visuele KOZIJN_DIV = 8 mm,
  // matchend met computeAreaBounds.VISUAL_DIV).
  const isSidePanel = order.doorConfig === 'side_panel'
  const panels = isSidePanel ? order.sidePanels : []
  const KOZIJN_DIV = 8
  const lw = panels.includes('left') ? order.leftPanelWidth : 0
  const rw = panels.includes('right') ? order.rightPanelWidth : 0
  const th = panels.includes('top') ? order.topPanelHeight : 0

  const reducedBladeW = Math.max(200, baseGeo.bladeWidth
    - lw - (lw ? KOZIJN_DIV : 0)
    - rw - (rw ? KOZIJN_DIV : 0))
  const reducedBladeH = Math.max(800, baseGeo.bladeHeight
    - th - (th ? KOZIJN_DIV : 0))
  const baseBladeX = (breedte - baseGeo.bladeWidth) / 2
  const baseBladeY = (hoogte - baseGeo.bladeHeight) / 2
  const bladeX = baseBladeX + lw + (lw ? KOZIJN_DIV : 0)
  const bladeY = baseBladeY + th + (th ? KOZIJN_DIV : 0)
  const glassX = bladeX + (reducedBladeW - Math.max(0, reducedBladeW - 8)) / 2
  const glassY = bladeY + 24
  const glassW = Math.max(0, reducedBladeW - 8)
  const glassH = Math.max(0, reducedBladeH - 48)

  const areaBounds = computeAreaBounds(order)

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
  const handleCx = side === 'left' ? bladeX + 50 : bladeX + reducedBladeW - 50
  const handleCy = hoogte - order.handlePosition.heightFromBottom

  const areaList: SketchArea[] = ['door', 'left_panel', 'right_panel', 'top_panel']

  return (
    <Svg viewBox={`${-margin} ${-margin} ${vbW} ${vbH}`} style={{ width, height }}>
      <Defs>
        {areaList.map((a) => {
          const b = areaBounds[a]
          if (!b.active) return null
          return (
            <ClipPath key={`clip-${a}`} id={`pdf-area-clip-${a}`}>
              <Rect x={b.x} y={b.y} width={b.w} height={b.h} />
            </ClipPath>
          )
        })}
      </Defs>
      <G>
        {/* Outer kozijn */}
        <Rect x={0} y={0} width={breedte} height={hoogte} fill={clientView ? '#F8F6F1' : '#FFFFFF'} stroke="#000" strokeWidth={6} />

        {/* Vaste panelen — alleen bij doorConfig=side_panel */}
        {panels.includes('top') ? (
          <PdfPanel x={baseBladeX} y={baseBladeY} w={baseGeo.bladeWidth} h={th} clientView={clientView} />
        ) : null}
        {panels.includes('left') ? (
          <PdfPanel x={baseBladeX} y={bladeY} w={lw} h={reducedBladeH} clientView={clientView} />
        ) : null}
        {panels.includes('right') ? (
          <PdfPanel x={bladeX + reducedBladeW + KOZIJN_DIV} y={bladeY} w={rw} h={reducedBladeH} clientView={clientView} />
        ) : null}

        {/* Deurblad */}
        <Rect x={bladeX} y={bladeY} width={reducedBladeW} height={reducedBladeH} fill="#FFFFFF" stroke="#000" strokeWidth={4} />
        <Rect
          x={glassX}
          y={glassY}
          width={glassW}
          height={glassH}
          fill={clientView ? '#E5EEF5' : '#F2F4F7'}
          stroke={clientView ? '#9BB3C8' : '#000'}
          strokeWidth={3}
        />

        {/* Design-lijnen + curves per vlak, geclipt op de bounding-box
            zodat ze niet doorlopen tussen deur en paneel. */}
        {areaList.map((a) => {
          if (!areaBounds[a].active) return null
          const vLines = sketch.verticalLines.filter((v) => (v.area ?? 'door') === a)
          const hLines = sketch.horizontalLines.filter((h) => (h.area ?? 'door') === a)
          const aCurves = (sketch.curves ?? []).filter((c) => (c.area ?? 'door') === a)
          if (vLines.length === 0 && hLines.length === 0 && aCurves.length === 0) return null
          return (
            <G key={`area-${a}`} clipPath={`url(#pdf-area-clip-${a})`}>
              {vLines.map((v) => (
                <Line key={v.id} x1={v.x} y1={0} x2={v.x} y2={hoogte} stroke="#000" strokeWidth={5} />
              ))}
              {hLines.map((h) => {
                const y = hoogte - h.y
                return <Line key={h.id} x1={0} y1={y} x2={breedte} y2={y} stroke="#000" strokeWidth={5} />
              })}
              {aCurves.map((c) => (
                <Path key={c.id} d={c.d} stroke="#000" strokeWidth={c.width} fill="none" strokeLinecap="round" />
              ))}
            </G>
          )
        })}

        {/* Freehand strokes (geen area-binding, altijd in deur-context) */}
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

// ─── PdfPanel: vast zij- of bovenpaneel in PDF ───────────────────
function PdfPanel({ x, y, w, h, clientView }: { x: number; y: number; w: number; h: number; clientView: boolean }) {
  const inset = 12
  const gx = x + inset
  const gy = y + inset
  const gw = Math.max(0, w - inset * 2)
  const gh = Math.max(0, h - inset * 2)
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} fill="#FFFFFF" stroke="#000" strokeWidth={3} />
      <Rect
        x={gx} y={gy} width={gw} height={gh}
        fill={clientView ? '#E5EEF5' : '#F2F4F7'}
        stroke={clientView ? '#9BB3C8' : '#000'}
        strokeWidth={2}
      />
    </G>
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
