import type { CurveStroke } from '../../lib/types'

interface Props {
  curves: CurveStroke[]
  /** Klik op een bestaande curve → selecteer voor opties-panel. Hit-zone
   *  uit als undefined (bv. in client-view of in tekenmodus). */
  onSelectCurve?: (id: string) => void
}

/**
 * Renderer voor opgeslagen curves. De drawing-flow (3-klik bezier) zit in
 * CurveLayer; deze component tekent alleen de persistente curves +
 * eventuele wide hit-stroke voor selectie. Wordt door SketchEditor per
 * vlak in een clipPath-group gewrapped zodat curves niet doorlopen tussen
 * deur en panelen.
 */
export function CurveItems({ curves, onSelectCurve }: Props) {
  return (
    <g>
      {curves.map((c) => (
        <g key={c.id}>
          <path
            d={c.d}
            fill="none"
            stroke="#0A0A0A"
            strokeWidth={c.width}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
          {onSelectCurve ? (
            <path
              d={c.d}
              fill="none"
              stroke="transparent"
              strokeWidth={40}
              strokeLinecap="round"
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation()
                onSelectCurve(c.id)
              }}
            />
          ) : null}
        </g>
      ))}
    </g>
  )
}
