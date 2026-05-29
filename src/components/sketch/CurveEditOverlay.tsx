import { useRef, useState } from 'react'
import type { CurveStroke } from '../../lib/types'
import { parseQuadraticCurve, serializeQuadraticCurve, translateQuadraticCurve, type Point } from '../../lib/curveMath'

interface Props {
  curve: CurveStroke
  doorWidth: number
  doorHeight: number
  toUserX: (clientX: number) => number
  toUserY: (clientY: number) => number
  onChange: (next: CurveStroke) => void
}

type Handle = 'start' | 'control' | 'end' | 'body'

/**
 * Overlay die over een geselecteerde curve wordt gerenderd. Toont:
 *  - 3 draggable control-points (start, controlpunt, eind)
 *  - Stippellijnen tussen start↔control en control↔end (Bezier-frame)
 *  - Onzichtbare brede hit-zone op het curve-pad → drag = translate
 *    de volledige curve (start + control + end samen)
 *
 * Verandert de curve direct via onChange tijdens drag (live preview).
 */
export function CurveEditOverlay({ curve, doorWidth, doorHeight, toUserX, toUserY, onChange }: Props) {
  const parsed = parseQuadraticCurve(curve.d)
  const [active, setActive] = useState<Handle | null>(null)
  const dragOrigin = useRef<{ clientX: number; clientY: number; curve: { start: Point; control: Point; end: Point } } | null>(null)

  if (!parsed) return null
  const { start, control, end } = parsed

  function clamp(p: Point): Point {
    return {
      x: Math.max(0, Math.min(doorWidth, Math.round(p.x))),
      y: Math.max(0, Math.min(doorHeight, Math.round(p.y))),
    }
  }

  function onDown(which: Handle, e: React.PointerEvent<SVGElement>) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setActive(which)
    dragOrigin.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      curve: { start: { ...start }, control: { ...control }, end: { ...end } },
    }
  }

  function onMove(e: React.PointerEvent<SVGElement>) {
    if (!active || !dragOrigin.current || !parsed) return
    const userX = toUserX(e.clientX)
    const userY = toUserY(e.clientY)
    if (active === 'body') {
      // Translate alle 3 punten
      const dxClient = e.clientX - dragOrigin.current.clientX
      const dyClient = e.clientY - dragOrigin.current.clientY
      const dxUser = toUserX(dragOrigin.current.clientX + dxClient) - toUserX(dragOrigin.current.clientX)
      const dyUser = toUserY(dragOrigin.current.clientY + dyClient) - toUserY(dragOrigin.current.clientY)
      const next = translateQuadraticCurve(dragOrigin.current.curve, dxUser, dyUser)
      onChange({ ...curve, d: serializeQuadraticCurve({
        start: clamp(next.start),
        control: clamp(next.control),
        end: clamp(next.end),
      }) })
    } else {
      // Per-punt drag
      const newCurve = {
        start: { ...start },
        control: { ...control },
        end: { ...end },
        [active]: clamp({ x: userX, y: userY }),
      }
      onChange({ ...curve, d: serializeQuadraticCurve(newCurve) })
    }
  }

  function onUp(e: React.PointerEvent<SVGElement>) {
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    setActive(null)
    dragOrigin.current = null
  }

  return (
    <g style={{ touchAction: 'none' }}>
      {/* Stippellijnen tussen punten (bezier-frame) */}
      <line x1={start.x} y1={start.y} x2={control.x} y2={control.y}
        stroke="#FF5C00" strokeWidth={1} strokeDasharray="4 3" opacity={0.5}
        vectorEffect="non-scaling-stroke" pointerEvents="none" />
      <line x1={control.x} y1={control.y} x2={end.x} y2={end.y}
        stroke="#FF5C00" strokeWidth={1} strokeDasharray="4 3" opacity={0.5}
        vectorEffect="non-scaling-stroke" pointerEvents="none" />

      {/* Hit-stroke op het bezier-pad voor "drag-to-move" */}
      <path
        d={curve.d}
        fill="none"
        stroke="transparent"
        strokeWidth={40}
        strokeLinecap="round"
        style={{ cursor: 'move' }}
        onPointerDown={(e) => onDown('body', e)}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />

      {/* 3 control-point handles */}
      {(['start', 'control', 'end'] as const).map((which) => {
        const p = which === 'start' ? start : which === 'control' ? control : end
        const isControl = which === 'control'
        return (
          <g key={which}>
            {/* Visueel: cirkel + label */}
            <circle
              cx={p.x} cy={p.y} r={14}
              fill={active === which ? '#FF5C00' : '#FFFFFF'}
              stroke="#FF5C00"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeDasharray={isControl ? '3 2' : undefined}
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => onDown(which, e)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            />
            <circle cx={p.x} cy={p.y} r={3} fill="#FF5C00" pointerEvents="none" />
            {/* mm-label tijdens active drag */}
            {active === which ? (
              <g pointerEvents="none">
                <rect
                  x={p.x + 18}
                  y={p.y - 16}
                  width={130}
                  height={32}
                  rx={6}
                  fill="#0A0A0A"
                />
                <text
                  x={p.x + 83}
                  y={p.y + 5}
                  textAnchor="middle"
                  fontSize={14}
                  fill="#FFFFFF"
                  fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
                  fontWeight="bold"
                >
                  {Math.round(p.x)} · {Math.round(p.y)} mm
                </text>
              </g>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
