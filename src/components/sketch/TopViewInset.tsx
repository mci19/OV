import type { OrderData } from '../../lib/types'

interface Props {
  order: OrderData
  /** Plaats in user-mm coördinaten (linkerbovenhoek van de inset) */
  x: number
  y: number
  /** Schaal-factor — inset is "schematisch", niet op-schaal */
  width?: number
  height?: number
}

/**
 * Mini top-view van de deur, geplaatst in de margin van het hoofd-canvas.
 * Toont scharnier/pivot/sliding-positie + scharnierrichting (open-zwaai).
 * Wijzigingen aan systeem of scharnierzijde reflecteren direct hier.
 */
export function TopViewInset({ order, x, y, width = 700, height = 220 }: Props) {
  const hingeOnLeft = order.handlePosition.side === 'right'
  const isDouble = order.hingeKind === 'double' || order.variants.includes('double_door')

  // Door-balk binnen de inset (centraal, met label-strook eronder)
  const pad = 8
  const labelH = 30
  const railY = y + pad + 14
  const doorY = railY + 8
  const doorH = 12
  const doorX = x + 60
  const doorW = width - 120

  const stroke = '#3A3A35'

  return (
    <g fontFamily="ui-monospace, 'IBM Plex Mono', monospace">
      {/* container */}
      <rect x={x} y={y} width={width} height={height} rx={6} fill="#FFFFFF" stroke="#C8C5B8" strokeWidth={1} vectorEffect="non-scaling-stroke" />

      {/* label */}
      <text x={x + 12} y={y + 24} fontSize={20} fontWeight={700} fill="#1F4F4D">TOP VIEW</text>
      <text x={x + width - 12} y={y + 24} textAnchor="end" fontSize={14} fill="#6B6B62">
        {order.system === 'hinges' ? 'Scharnier' : order.system === 'pivotica' ? 'Pivotica' : 'Sliding'}
      </text>

      {/* Sliding: rail boven de deur */}
      {order.system === 'sliding' ? (
        <g>
          <rect x={doorX - 30} y={railY} width={doorW + 60} height={8} fill="#EFEDE5" stroke={stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text x={doorX + doorW + 40} y={railY + 7} fontSize={12} fill="#6B6B62">rail</text>
        </g>
      ) : null}

      {/* Deur-balk(en) van bovenaf */}
      {isDouble ? (
        <g>
          <DoorTopBar x={doorX} y={doorY} w={doorW / 2 - 4} h={doorH} stroke={stroke} />
          <DoorTopBar x={doorX + doorW / 2 + 4} y={doorY} w={doorW / 2 - 4} h={doorH} stroke={stroke} />
          {/* Scharnier-symbolen op buitenkanten van beide bladen */}
          <HingeDot cx={doorX + 6} cy={doorY + doorH / 2} stroke={stroke} />
          <HingeDot cx={doorX + doorW - 6} cy={doorY + doorH / 2} stroke={stroke} />
          {/* Zwaai-bogen naar binnen toe */}
          <SwingArc cx={doorX + 6} cy={doorY + doorH / 2} r={doorW / 2 - 30} angle={hingeOnLeft ? 'right' : 'right'} stroke={stroke} />
          <SwingArc cx={doorX + doorW - 6} cy={doorY + doorH / 2} r={doorW / 2 - 30} angle="left" stroke={stroke} />
        </g>
      ) : (
        <g>
          <DoorTopBar x={doorX} y={doorY} w={doorW} h={doorH} stroke={stroke} />

          {/* Scharnier of pivot */}
          {order.system === 'hinges' ? (
            <>
              {[0.15, 0.5, 0.85].map((t) => (
                <HingeDot
                  key={t}
                  cx={hingeOnLeft ? doorX + 6 : doorX + doorW - 6}
                  cy={doorY + doorH / 2 + (t - 0.5) * 4}
                  stroke={stroke}
                />
              ))}
              <SwingArc
                cx={hingeOnLeft ? doorX + 6 : doorX + doorW - 6}
                cy={doorY + doorH / 2}
                r={doorW - 60}
                angle={hingeOnLeft ? 'right' : 'left'}
                stroke={stroke}
              />
            </>
          ) : order.system === 'pivotica' ? (
            <g>
              <circle cx={doorX + doorW * (hingeOnLeft ? 0.2 : 0.8)} cy={doorY + doorH / 2} r={6} fill="#FFFFFF" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              <circle cx={doorX + doorW * (hingeOnLeft ? 0.2 : 0.8)} cy={doorY + doorH / 2} r={2.5} fill={stroke} />
              <SwingArc
                cx={doorX + doorW * (hingeOnLeft ? 0.2 : 0.8)}
                cy={doorY + doorH / 2}
                r={doorW * 0.45}
                angle={hingeOnLeft ? 'right' : 'left'}
                stroke={stroke}
              />
              <text x={doorX + doorW * (hingeOnLeft ? 0.2 : 0.8)} y={doorY + doorH + 22} fontSize={11} fill="#6B6B62" textAnchor="middle">pivot</text>
            </g>
          ) : (
            <text x={doorX + doorW / 2} y={doorY + doorH + 22} fontSize={11} fill="#6B6B62" textAnchor="middle">→ schuift</text>
          )}
        </g>
      )}

      {/* Greep-kant indicator-label onderaan */}
      <g transform={`translate(${x + width / 2}, ${y + height - 10})`}>
        <text textAnchor="middle" fontSize={14} fill="#6B6B62">
          {order.hingeKind === 'single'
            ? (order.hingeSide === 'belgisch_links' ? 'Belgisch Links · DIN R' : 'Belgisch Rechts · DIN L')
            : 'Dubbel'}
        </text>
      </g>

      {/* divider boven label-strook */}
      <line x1={x + pad} y1={y + height - labelH} x2={x + width - pad} y2={y + height - labelH} stroke="#E0DED5" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </g>
  )
}

function DoorTopBar({ x, y, w, h, stroke }: { x: number; y: number; w: number; h: number; stroke: string }) {
  return <rect x={x} y={y} width={w} height={h} fill="#5A5A55" stroke={stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
}

function HingeDot({ cx, cy, stroke }: { cx: number; cy: number; stroke: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="#FFFFFF" stroke={stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <circle cx={cx} cy={cy} r={1.5} fill={stroke} />
    </g>
  )
}

function SwingArc({ cx, cy, r, angle, stroke }: { cx: number; cy: number; r: number; angle: 'left' | 'right'; stroke: string }) {
  // Kwart-cirkel van scharnier naar dichte-positie (90° boog vanaf openstaande positie)
  const start = angle === 'right' ? { x: cx + r, y: cy } : { x: cx - r, y: cy }
  const end   = angle === 'right' ? { x: cx, y: cy - r } : { x: cx, y: cy - r }
  const sweep = angle === 'right' ? 0 : 1
  return (
    <path
      d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 ${sweep} ${end.x} ${end.y}`}
      fill="none"
      stroke={stroke}
      strokeWidth={1}
      strokeDasharray="4 3"
      opacity={0.6}
      vectorEffect="non-scaling-stroke"
    />
  )
}
