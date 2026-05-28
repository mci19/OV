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
    case 'ral_9005': return { fill: '#1A1A1A', stroke: '#0A0A0A', strokeWidth: 2.5 } // zwart
    case 'ral_9010': return { fill: '#F8F7F2', stroke: '#7A7A72', strokeWidth: 1.6 } // wit (zachte stroke)
    case 'other': {
      // probeer 'RAL 7016' (antraciet) etc; voor v1 gebruik een muted grijs
      const code = order.colorOther.toLowerCase()
      if (/9006|9007/.test(code)) return { fill: '#A5A5A0', stroke: '#5A5A55', strokeWidth: 1.8 } // aluminium
      if (/7016|7021/.test(code)) return { fill: '#383B40', stroke: '#1F2125', strokeWidth: 2 } // antraciet
      if (/3000|3020/.test(code)) return { fill: '#A82F2F', stroke: '#6E1E1E', strokeWidth: 2 } // rood
      if (/5010|5013/.test(code)) return { fill: '#1F4F8C', stroke: '#0F2D55', strokeWidth: 2 } // blauw
      return { fill: '#6B6B62', stroke: '#3A3A35', strokeWidth: 2 } // generic grijs
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

  const glassX = bladeX + (geo.bladeWidth - geo.glassWidth) / 2
  const glassY = bladeY + 24

  const frame = frameColors(order)
  const glass = showGlassFill ? glassFill(order, clientView) : { fill: 'none' as const }

  return (
    <g>
      {/* Pattern defs voor cathedraal-flute glas */}
      {glass.pattern === 'cathedral' ? (
        <defs>
          <pattern id="glass-cathedral" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(0)">
            <rect width="40" height="40" fill="#EAE6DA" />
            <line x1="0" y1="0" x2="0" y2="40" stroke="#C8C2B0" strokeWidth="3" />
            <line x1="20" y1="0" x2="20" y2="40" stroke="#D4CFBE" strokeWidth="2" />
          </pattern>
        </defs>
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

      {/* Deurblad (binnen kozijn) — zelfde kleur */}
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

      {/* Glas-uitsparing met soort-afhankelijke fill */}
      <rect
        x={glassX}
        y={glassY}
        width={geo.glassWidth}
        height={geo.glassHeight}
        fill={glass.pattern === 'cathedral' ? 'url(#glass-cathedral)' : glass.fill}
        stroke={clientView ? '#9BB3C8' : '#0A0A0A'}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />

      {/* Matglas: subtiele schuine arcering op het glas voor visuele indicatie */}
      {order.glassType === 'matt' && !clientView ? (
        <g opacity={0.25}>
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={i}
              x1={glassX}
              y1={glassY + (i + 1) * (geo.glassHeight / 11)}
              x2={glassX + geo.glassWidth}
              y2={glassY + (i + 1) * (geo.glassHeight / 11) - 30}
              stroke="#7A7A72"
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ) : null}

      {/* Systeem-indicator: scharnier-markers / pivot-punten / sliding-track */}
      <SystemIndicator order={order} bladeX={bladeX} bladeY={bladeY} bladeW={geo.bladeWidth} bladeH={geo.bladeHeight} clientView={clientView} />

      {/* Glasslijst dikte-indicator: dubbele lijn bij 15×15, enkel bij 10×10 */}
      {order.finishing === 'glasslist_15' && !clientView ? (
        <rect
          x={glassX + 6}
          y={glassY + 6}
          width={geo.glassWidth - 12}
          height={geo.glassHeight - 12}
          fill="none"
          stroke={frame.stroke}
          strokeWidth={0.6}
          strokeDasharray="0"
          opacity={0.3}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {clientView ? (
        <line
          x1={glassX + geo.glassWidth * 0.15}
          y1={glassY + geo.glassHeight * 0.05}
          x2={glassX + geo.glassWidth * 0.4}
          y2={glassY + geo.glassHeight * 0.35}
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.6}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </g>
  )
}

interface SysProps {
  order: OrderData
  bladeX: number
  bladeY: number
  bladeW: number
  bladeH: number
  clientView: boolean
}

function SystemIndicator({ order, bladeX, bladeY, bladeW, bladeH, clientView }: SysProps) {
  const hingeOnLeft = order.handlePosition.side === 'right' // greep rechts → scharnier links
  const stroke = clientView ? '#5A5A55' : '#0A0A0A'
  const opacity = clientView ? 0.6 : 1

  if (order.system === 'hinges') {
    // 3 scharnier-streepjes op scharnier-zijde
    const x = hingeOnLeft ? bladeX - 4 : bladeX + bladeW + 4
    const positions = [bladeY + 200, bladeY + bladeH / 2, bladeY + bladeH - 200]
    return (
      <g opacity={opacity}>
        {positions.map((y, i) => (
          <rect
            key={i}
            x={x - 6}
            y={y - 18}
            width={12}
            height={36}
            fill="#FFFFFF"
            stroke={stroke}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    )
  }

  if (order.system === 'pivotica') {
    // Twee pivot-punten: midden bovenaan, midden onderaan
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

  // Sliding: rail boven het deurblad + 2 hangers
  const railY = bladeY - 30
  return (
    <g opacity={opacity}>
      <rect
        x={bladeX - 80}
        y={railY - 8}
        width={bladeW + 160}
        height={16}
        fill="#FFFFFF"
        stroke={stroke}
        strokeWidth={1.5}
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
