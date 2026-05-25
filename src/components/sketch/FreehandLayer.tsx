import { useEffect, useRef, useState } from 'react'
import type { FreehandStroke } from '../../lib/types'

interface Props {
  strokes: FreehandStroke[]
  doorWidth: number
  doorHeight: number
  active: boolean // accept new strokes?
  onAddStroke: (s: FreehandStroke) => void
  toUserX: (clientX: number) => number
  toUserY: (clientY: number) => number
}

/**
 * Freehand laag — accepteert pointer events. Pen heeft prioriteit;
 * vinger-input wordt geignoreerd 500ms na laatste pen-event (palm-rejection).
 */
export function FreehandLayer({
  strokes,
  doorWidth,
  doorHeight,
  active,
  onAddStroke,
  toUserX,
  toUserY,
}: Props) {
  const [drawing, setDrawing] = useState<{ d: string; width: number } | null>(null)
  const lastPenAt = useRef<number>(0)

  useEffect(() => {
    if (!active) setDrawing(null)
  }, [active])

  function shouldAccept(e: React.PointerEvent): boolean {
    if (!active) return false
    if (e.pointerType === 'pen') return true
    if (e.pointerType === 'mouse') return true
    // touch
    const since = Date.now() - lastPenAt.current
    return since > 500
  }

  function onPointerDown(e: React.PointerEvent<SVGRectElement>) {
    if (!shouldAccept(e)) return
    if (e.pointerType === 'pen') lastPenAt.current = Date.now()
    e.currentTarget.setPointerCapture(e.pointerId)
    const x = toUserX(e.clientX)
    const y = toUserY(e.clientY)
    const width = e.pointerType === 'pen' && e.pressure > 0 ? 2 + e.pressure * 6 : 4
    setDrawing({ d: `M ${x.toFixed(1)} ${y.toFixed(1)}`, width })
  }

  function onPointerMove(e: React.PointerEvent<SVGRectElement>) {
    if (!drawing) return
    if (!shouldAccept(e)) return
    if (e.pointerType === 'pen') lastPenAt.current = Date.now()
    const x = toUserX(e.clientX)
    const y = toUserY(e.clientY)
    setDrawing((prev) => prev ? { ...prev, d: `${prev.d} L ${x.toFixed(1)} ${y.toFixed(1)}` } : prev)
  }

  function onPointerUp(e: React.PointerEvent<SVGRectElement>) {
    if (!drawing) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    const s: FreehandStroke = {
      id: `s-${Date.now().toString(36)}`,
      d: drawing.d,
      width: drawing.width,
    }
    onAddStroke(s)
    setDrawing(null)
  }

  return (
    <g>
      {/* opslag van bestaande strokes */}
      {strokes.map((s) => (
        <path
          key={s.id}
          d={s.d}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      ))}
      {/* huidige stroke */}
      {drawing ? (
        <path
          d={drawing.d}
          fill="none"
          stroke="#FF5C00"
          strokeWidth={drawing.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      ) : null}
      {/* hit-rect (vangt pointer-events) — alleen actief als layer actief is */}
      {active ? (
        <rect
          x={0}
          y={0}
          width={doorWidth}
          height={doorHeight}
          fill="transparent"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: 'none', cursor: 'crosshair' }}
        />
      ) : null}
    </g>
  )
}
