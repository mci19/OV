import type { OrderData } from '../../lib/types'
import { visualGeometry } from '../../lib/calculations'

interface Props {
  order: OrderData
  showGlassFill?: boolean
  clientView?: boolean
}

// ─── Visual maps ────────────────────────────────────────────
// Vertaalt order-opties naar concrete kleuren/patronen, zodat elke
// configuratie-wijziging meteen zichtbaar is in de schets.

function frameColors(order: OrderData): { fill: string; stroke: string; strokeWidth: number } {
  switch (order.colorKind) {
    case 'ral_9005': return { fill: '#1A1A1A', stroke: '#0A0A0A', strokeWidth: 2.5 }
    case 'ral_9010': return { fill: '#F8F7F2', stroke: '#7A7A72', strokeWidth: 1.6 }
    case 'other': {
      const code = order.colorOther.toLowerCase()
      if (/9006|9007/.test(code)) return { fill: '#A5A5A0', stroke: '#5A5A55', strokeWidth: 1.8 }
      if (/7016|7021/.test(code)) return { fill: '#383B40', stroke: '#1F2125', strokeWidth: 2 }
      if (/3000|3020/.test(code)) return { fill: '#A82F2F', stroke: '#6E1E1E', strokeWidth: 2 }
      if (/5010|5013/.test(code)) return { fill: '#1F4F8C', stroke: '#0F2D55', strokeWidth: 2 }
      return { fill: '#6B6B62', stroke: '#3A3A35', strokeWidth: 2 }
    }
  }
}

function glassFill(order: OrderData, clientView: boolean): { fill: string; pattern?: string } {
  if (clientView) return { fill: '#DCE7EE' }
  switch (order.glassType) {
    case 'clear': return { fill: '#EEF3F6' }
    case 'matt': return { fill: '#E0DED5' }
    case 'cathedraal_flute': return { fill: '#EAE6DA', pattern: 'cathedral' }
    case 'other': return { fill: '#E8E5DC' }
  }
}

export function DoorOutline({ order, showGlassFill = true, clientView = false }: Props) {
  const { breedte, hoogte } = order
  const geo = visualGeometry(order)
  const bladeX = (breedte - geo.bladeWidth) / 2
  const bladeY = (hoogte - geo.bladeHeight) / 2

  const frame = frameColors(order)
  const glass = showGlassFill ? glassFill(order, clientView) : { fill: 'none' as const, pattern: undefined as string | undefined }

  const isDouble = order.hingeKind === 'double' || order.variants.includes('double_door')
  const hingeOnLeft = order.handlePosition.side === 'right'

  return (
    <g>
      {/* Pattern defs voor cathedraal-flute glas */}
      {glass.pattern === 'cathedral' ? (
        <defs>
          <pattern id="glass-cathedral" patternUnits="userSpaceOnUse" width="40" height="40">
            <rect width="40" height="40" fill="#EAE6DA" />
            <line x1="0" y1="0" x2="0" y2="40" stroke="#C8C2B0" strokeWidth="3" />
            <line x1="20" y1="0" x2="20" y2="40" stroke="#D4CFBE" strokeWidth="2" />
          </pattern>
        </defs>
      ) : null}

      {/* Deuropening-context: muur-zone als doorType = door_opening */}
      {order.doorType === 'door_opening' && !clientView ? (
        <g opacity={0.55}>
          {/* gehakkelde muren links + rechts */}
          {[-150, breedte].map((mx) => (
            <rect
              key={mx}
              x={mx}
              y={0}
              width={150}
              height={hoogte}
              fill="url(#wall-hatch)"
              stroke="#888884"
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <defs>
            <pattern id="wall-hatch" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
              <rect width="14" height="14" fill="#F0EDE5" />
              <line x1="0" y1="0" x2="0" y2="14" stroke="#B8B5A8" strokeWidth="1" />
            </pattern>
          </defs>
        </g>
      ) : null}

      {/* Outer kozijn — krijgt frame-kleur */}
      <rect
        x={0}
        y={0}
        width={breedte}
        height={hoogte}
        fill={frame.fill}
        stroke={frame.stroke}
        strokeWidth={frame.strokeWidth}
        vectorEffect="non-scaling-stroke"
      />

      {/* Deurblad(en) */}
      {isDouble ? (
        <DoubleLeaves order={order} frame={frame} glass={glass} bladeX={bladeX} bladeY={bladeY} geo={geo} clientView={clientView} />
      ) : (
        <SingleLeaf order={order} frame={frame} glass={glass} bladeX={bladeX} bladeY={bladeY} geo={geo} clientView={clientView} hingeOnLeft={hingeOnLeft} />
      )}

      {/* Systeem-indicator (scharnier-markers, pivot, rail) */}
      <SystemIndicator order={order} bladeX={bladeX} bladeY={bladeY} bladeW={geo.bladeWidth} bladeH={geo.bladeHeight} clientView={clientView} />

      {/* Soft open / close badges */}
      {!clientView && (order.softOpen || order.softClose) ? (
        <SoftBadges order={order} bladeX={bladeX} bladeY={bladeY} bladeW={geo.bladeWidth} bladeH={geo.bladeHeight} />
      ) : null}
    </g>
  )
}

// ─── Single leaf ───────────────────────────────────────────
interface LeafProps {
  order: OrderData
  frame: { fill: string; stroke: string; strokeWidth: number }
  glass: { fill: string; pattern?: string }
  bladeX: number
  bladeY: number
  geo: ReturnType<typeof visualGeometry>
  clientView: boolean
  hingeOnLeft?: boolean
}

function SingleLeaf({ order, frame, glass, bladeX, bladeY, geo, clientView, hingeOnLeft }: LeafProps) {
  const glassX = bladeX + (geo.bladeWidth - geo.glassWidth) / 2
  const glassY = bladeY + 24
  return (
    <g>
      <rect
        x={bladeX}
        y={bladeY}
        width={geo.bladeWidth}
        height={geo.bladeHeight}
        fill={frame.fill}
        stroke={frame.stroke}
        strokeWidth={Math.max(1, frame.strokeWidth - 1)}
        vectorEffect="non-scaling-stroke"
      />
      <GlassPanel
        x={glassX} y={glassY} w={geo.glassWidth} h={geo.glassHeight}
        order={order} glass={glass} clientView={clientView}
      />
      {/* Lock-indicator + greep visualisatie */}
      <LockAndHandle
        order={order}
        bladeX={bladeX} bladeY={bladeY}
        bladeW={geo.bladeWidth} bladeH={geo.bladeHeight}
        hingeOnLeft={hingeOnLeft ?? true}
        clientView={clientView}
      />
    </g>
  )
}

// ─── Double leaves (dubbele deur of variant double_door) ──
function DoubleLeaves({ order, frame, glass, bladeX, bladeY, geo, clientView }: LeafProps) {
  const seamGap = 6 // mm — visuele gap tussen de twee deurbladen
  const leafW = (geo.bladeWidth - seamGap) / 2
  const leftX = bladeX
  const rightX = bladeX + leafW + seamGap

  // Glass in elk blad afzonderlijk
  const glassPad = (geo.bladeWidth - geo.glassWidth) / 2
  const glassW = leafW - glassPad
  const glassH = geo.glassHeight

  return (
    <g>
      {/* Linker blad */}
      <rect
        x={leftX} y={bladeY}
        width={leafW} height={geo.bladeHeight}
        fill={frame.fill}
        stroke={frame.stroke}
        strokeWidth={Math.max(1, frame.strokeWidth - 1)}
        vectorEffect="non-scaling-stroke"
      />
      <GlassPanel
        x={leftX + glassPad / 2} y={bladeY + 24}
        w={glassW} h={glassH}
        order={order} glass={glass} clientView={clientView}
      />

      {/* Rechter blad */}
      <rect
        x={rightX} y={bladeY}
        width={leafW} height={geo.bladeHeight}
        fill={frame.fill}
        stroke={frame.stroke}
        strokeWidth={Math.max(1, frame.strokeWidth - 1)}
        vectorEffect="non-scaling-stroke"
      />
      <GlassPanel
        x={rightX + glassPad / 2 - glassPad / 2 + 4} y={bladeY + 24}
        w={glassW} h={glassH}
        order={order} glass={glass} clientView={clientView}
      />

      {/* Center-seam (waar de twee bladen samenkomen) */}
      <line
        x1={bladeX + leafW + seamGap / 2}
        y1={bladeY}
        x2={bladeX + leafW + seamGap / 2}
        y2={bladeY + geo.bladeHeight}
        stroke={frame.stroke}
        strokeWidth={1}
        strokeDasharray="6 3"
        opacity={0.5}
        vectorEffect="non-scaling-stroke"
      />

      {/* Lock + handle op het rechter blad (actief blad) */}
      <LockAndHandle
        order={order}
        bladeX={rightX} bladeY={bladeY}
        bladeW={leafW} bladeH={geo.bladeHeight}
        hingeOnLeft={false}
        clientView={clientView}
      />
    </g>
  )
}

// ─── Glass panel + optionele effecten (matt arcering, cathedral pattern) ─
function GlassPanel({
  x, y, w, h, order, glass, clientView,
}: {
  x: number; y: number; w: number; h: number
  order: OrderData
  glass: { fill: string; pattern?: string }
  clientView: boolean
}) {
  if (w <= 0 || h <= 0) return null
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        fill={glass.pattern === 'cathedral' ? 'url(#glass-cathedral)' : glass.fill}
        stroke={clientView ? '#9BB3C8' : '#0A0A0A'}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {/* Matglas: diagonale arcering */}
      {order.glassType === 'matt' && !clientView ? (
        <g opacity={0.25} clipPath="url(#none)">
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={i}
              x1={x}
              y1={y + (i + 1) * (h / 11)}
              x2={x + w}
              y2={y + (i + 1) * (h / 11) - 30}
              stroke="#7A7A72"
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ) : null}
      {/* Finishing 15×15: dunne secundaire glaslijst-rand */}
      {order.finishing === 'glasslist_15' && !clientView ? (
        <rect
          x={x + 6} y={y + 6}
          width={Math.max(0, w - 12)} height={Math.max(0, h - 12)}
          fill="none" stroke="#5A5A55" strokeWidth={0.6}
          opacity={0.4} vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {clientView ? (
        <line
          x1={x + w * 0.15} y1={y + h * 0.05}
          x2={x + w * 0.4} y2={y + h * 0.35}
          stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.6}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </g>
  )
}

// ─── Lock + handle visualisatie ───────────────────────────
interface LockHandleProps {
  order: OrderData
  bladeX: number
  bladeY: number
  bladeW: number
  bladeH: number
  hingeOnLeft: boolean
  clientView: boolean
}

function LockAndHandle({ order, bladeX, bladeY, bladeW, bladeH, hingeOnLeft, clientView }: LockHandleProps) {
  const handleSide: 'left' | 'right' = hingeOnLeft ? 'right' : 'left'
  const handleX = handleSide === 'left'
    ? bladeX + 50
    : bladeX + bladeW - 50
  const handleYFromTop = bladeY + bladeH - order.handlePosition.heightFromBottom
  const stroke = clientView ? '#3A3A35' : '#0A0A0A'
  const fillBg = clientView ? '#1F1F1B' : '#FFFFFF'
  const dirSign = handleSide === 'left' ? 1 : -1

  // Lock visuals — verschillend per type
  function renderLock() {
    if (order.lockKind === 'no_cilinder') return null
    if (order.lockKind === 'magnetic') {
      // Magneetslot: kleine staaf op de kant van het blad
      return (
        <rect
          x={handleX - 4} y={handleYFromTop - 90}
          width={8} height={32}
          fill="#FFFFFF" stroke={stroke} strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      )
    }
    if (order.lockKind === 'electronic') {
      // Elektronisch: keypad-vierkant
      return (
        <g>
          <rect x={handleX - 14} y={handleYFromTop - 95} width={28} height={32} rx={3}
            fill="#FFFFFF" stroke={stroke} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          {[0,1,2].map((r) => [0,1,2].map((c) => (
            <circle key={`${r}-${c}`} cx={handleX - 8 + c * 8} cy={handleYFromTop - 87 + r * 8} r={1.4} fill={stroke} />
          )))}
        </g>
      )
    }
    if (order.lockKind === 'keyhole_only') {
      // Alleen sleutelgat: enkele dot zonder cilinder-disc
      return (
        <g>
          <circle cx={handleX} cy={handleYFromTop - 60} r={3.5} fill={stroke} />
          <rect x={handleX - 1} y={handleYFromTop - 59} width={2} height={9} fill={stroke} />
        </g>
      )
    }
    // cilinder_litto + other: cilinder-disc
    return (
      <g>
        <circle cx={handleX} cy={handleYFromTop - 70} r={10}
          fill="#FFFFFF" stroke={stroke} strokeWidth={1.4}
          vectorEffect="non-scaling-stroke" />
        <circle cx={handleX} cy={handleYFromTop - 72} r={2.6} fill={stroke} />
        <rect x={handleX - 1} y={handleYFromTop - 71} width={2} height={6} fill={stroke} />
      </g>
    )
  }

  // Handle visuals per type
  function renderHandle() {
    switch (order.handleKind) {
      case 'l_vertical': {
        const len = Math.max(120, order.handleVerticalMm || 700)
        return (
          <rect x={handleX - 8} y={handleYFromTop - len / 2}
            width={16} height={len}
            fill={fillBg} stroke={stroke} strokeWidth={1.2}
            vectorEffect="non-scaling-stroke" rx={4} />
        )
      }
      case 'horizontal_bar':
        // 200 mm horizontale stang, getekend vanaf 200 mm van de rand
        return (
          <g>
            <rect x={handleX - 8} y={handleYFromTop - 6}
              width={16} height={12}
              fill={fillBg} stroke={stroke} strokeWidth={1.2} rx={3}
              vectorEffect="non-scaling-stroke" />
            <line x1={handleX + dirSign * 8} y1={handleYFromTop}
              x2={handleX + dirSign * 200} y2={handleYFromTop}
              stroke={stroke} strokeWidth={8} strokeLinecap="round"
              vectorEffect="non-scaling-stroke" />
          </g>
        )
      case 'l_grip':
        // 200 mm L-vorm: horizontaal segment + neerwaartse haak
        return (
          <g>
            <circle cx={handleX} cy={handleYFromTop} r={18}
              fill={fillBg} stroke={stroke} strokeWidth={1.4}
              vectorEffect="non-scaling-stroke" />
            <line x1={handleX + dirSign * 18} y1={handleYFromTop}
              x2={handleX + dirSign * 200} y2={handleYFromTop}
              stroke={stroke} strokeWidth={5} strokeLinecap="round"
              vectorEffect="non-scaling-stroke" />
            {!clientView ? (
              <line x1={handleX + dirSign * 200} y1={handleYFromTop}
                x2={handleX + dirSign * 200} y2={handleYFromTop + 30}
                stroke={stroke} strokeWidth={5} strokeLinecap="round"
                vectorEffect="non-scaling-stroke" />
            ) : null}
          </g>
        )
      case 'other':
      default:
        return (
          <g>
            <circle cx={handleX} cy={handleYFromTop} r={18}
              fill={fillBg} stroke={stroke} strokeWidth={1.4}
              vectorEffect="non-scaling-stroke" />
            <line x1={handleX + dirSign * 18} y1={handleYFromTop}
              x2={handleX + dirSign * 100} y2={handleYFromTop}
              stroke={stroke} strokeWidth={5} strokeLinecap="round"
              vectorEffect="non-scaling-stroke" />
          </g>
        )
    }
  }

  return <g>{renderLock()}{order.handleKind === 'none' ? null : renderHandle()}</g>
}

// ─── Systeem-indicator: scharnieren / pivot / sliding ────
interface SysProps {
  order: OrderData
  bladeX: number
  bladeY: number
  bladeW: number
  bladeH: number
  clientView: boolean
}

function SystemIndicator({ order, bladeX, bladeY, bladeW, bladeH, clientView }: SysProps) {
  const hingeOnLeft = order.handlePosition.side === 'right'
  const stroke = clientView ? '#5A5A55' : '#0A0A0A'
  const opacity = clientView ? 0.6 : 1

  if (order.system === 'hinges') {
    const x = hingeOnLeft ? bladeX - 4 : bladeX + bladeW + 4
    const positions = [bladeY + 200, bladeY + bladeH / 2, bladeY + bladeH - 200]
    return (
      <g opacity={opacity}>
        {positions.map((y, i) => (
          <rect
            key={i} x={x - 6} y={y - 18}
            width={12} height={36}
            fill="#FFFFFF" stroke={stroke} strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    )
  }

  if (order.system === 'pivotica') {
    const cx = bladeX + bladeW / 2
    return (
      <g opacity={opacity}>
        <circle cx={cx} cy={bladeY - 6} r={10} fill="#FFFFFF" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <circle cx={cx} cy={bladeY - 6} r={3} fill={stroke} />
        <circle cx={cx} cy={bladeY + bladeH + 6} r={10} fill="#FFFFFF" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <circle cx={cx} cy={bladeY + bladeH + 6} r={3} fill={stroke} />
      </g>
    )
  }

  // Sliding
  const railY = bladeY - 30
  return (
    <g opacity={opacity}>
      <rect
        x={bladeX - 80} y={railY - 8}
        width={bladeW + 160} height={16}
        fill="#FFFFFF" stroke={stroke} strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      {[bladeX + 80, bladeX + bladeW - 80].map((cx, i) => (
        <g key={i}>
          <line x1={cx} y1={railY + 8} x2={cx} y2={bladeY} stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          <circle cx={cx} cy={railY} r={5} fill="#FFFFFF" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </g>
  )
}

// ─── Soft open / close badges ─────────────────────────────
interface SoftProps {
  order: OrderData
  bladeX: number
  bladeY: number
  bladeW: number
  bladeH: number
}

function SoftBadges({ order, bladeX, bladeY, bladeW }: SoftProps) {
  const items: { label: string; tint: string }[] = []
  if (order.softOpen) items.push({ label: 'SO', tint: '#DCE9E8' })
  if (order.softClose) items.push({ label: 'SC', tint: '#FFEAD9' })
  if (items.length === 0) return null
  return (
    <g>
      {items.map((it, i) => (
        <g key={it.label} transform={`translate(${bladeX + bladeW - 80 - i * 80}, ${bladeY + 40})`}>
          <rect x={-32} y={-18} width={64} height={36} rx={6} fill={it.tint} stroke="#5A5A55" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
          <text x={0} y={6} textAnchor="middle" fontSize={22} fontWeight={700} fill="#3A3A35" fontFamily="ui-monospace, monospace">
            {it.label}
          </text>
        </g>
      ))}
    </g>
  )
}
