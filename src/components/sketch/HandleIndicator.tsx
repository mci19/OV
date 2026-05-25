import type { OrderData } from '../../lib/types'

interface Props {
  order: OrderData
  clientView?: boolean
}

export function HandleIndicator({ order, clientView = false }: Props) {
  const { breedte, hoogte, handlePosition, handleKind, handleVerticalMm } = order
  const margin = 50 // mm vanaf rand
  const side: 'left' | 'right' = handlePosition.side
  const cx = side === 'left' ? margin : breedte - margin
  const yFromTop = hoogte - handlePosition.heightFromBottom

  if (handleKind === 'l_vertical' && handleVerticalMm > 100) {
    const len = handleVerticalMm
    return (
      <g>
        <rect
          x={cx - 12}
          y={yFromTop - len / 2}
          width={24}
          height={len}
          fill={clientView ? '#1F1F1B' : '#FFFFFF'}
          stroke="#0A0A0A"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
          rx={6}
        />
      </g>
    )
  }

  // default: small L-grip dot
  return (
    <g>
      <circle
        cx={cx}
        cy={yFromTop}
        r={28}
        fill={clientView ? '#1F1F1B' : '#FFFFFF'}
        stroke="#0A0A0A"
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={cx + (side === 'left' ? 28 : -28)}
        y1={yFromTop}
        x2={cx + (side === 'left' ? 120 : -120)}
        y2={yFromTop}
        stroke="#0A0A0A"
        strokeWidth={6}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
}
