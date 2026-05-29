import { useEffect, useState } from 'react'
import type { CurveStroke } from '../../lib/types'

interface Props {
  curves: CurveStroke[]
  doorWidth: number
  doorHeight: number
  /** Klikken accepteren en nieuwe curves bouwen */
  active: boolean
  onAddCurve: (c: CurveStroke) => void
  toUserX: (clientX: number) => number
  toUserY: (clientY: number) => number
}

type Phase = 'idle' | 'awaitControl' | 'awaitEnd'

/**
 * Gebogen lijnen tekenen via 3 klikken:
 *  1) startpunt   →  pin
 *  2) controlpunt → bezier-bulge richting
 *  3) eindpunt    → curve persisteert
 *
 * Tussentijds wordt een preview-curve getoond die op de muis volgt.
 * ESC annuleert de huidige curve.
 *
 * Gebruikt kwadratische bezier (Q) — eenvoudig genoeg voor de meeste
 * deur-designs (een halfboog, een S-curve = 2 segmenten naast elkaar).
 */
export function CurveLayer({
  curves,
  doorWidth,
  doorHeight,
  active,
  onAddCurve,
  toUserX,
  toUserY,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [control, setControl] = useState<{ x: number; y: number } | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)

  // ESC = annuleer huidige curve
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPhase('idle')
        setStart(null)
        setControl(null)
        setHover(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  // Bij wissel van mode: reset state
  useEffect(() => {
    if (!active) {
      setPhase('idle')
      setStart(null)
      setControl(null)
      setHover(null)
    }
  }, [active])

  function onClick(e: React.PointerEvent<SVGRectElement>) {
    const x = Math.round(toUserX(e.clientX))
    const y = Math.round(toUserY(e.clientY))
    if (phase === 'idle') {
      setStart({ x, y })
      setPhase('awaitControl')
    } else if (phase === 'awaitControl') {
      setControl({ x, y })
      setPhase('awaitEnd')
    } else if (phase === 'awaitEnd' && start && control) {
      const d = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${x} ${y}`
      onAddCurve({
        id: `c-${Date.now().toString(36)}`,
        d,
        width: 15,
      })
      // Reset voor volgende curve
      setStart(null)
      setControl(null)
      setHover(null)
      setPhase('idle')
    }
  }

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    if (phase === 'idle') return
    setHover({ x: Math.round(toUserX(e.clientX)), y: Math.round(toUserY(e.clientY)) })
  }

  // Live preview path
  let previewD: string | null = null
  if (start && hover && phase === 'awaitControl') {
    // Recht lijntje tot we het controlpunt kennen
    previewD = `M ${start.x} ${start.y} L ${hover.x} ${hover.y}`
  } else if (start && control && hover && phase === 'awaitEnd') {
    previewD = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${hover.x} ${hover.y}`
  }

  return (
    <g>
      {/* Bestaande curves */}
      {curves.map((c) => (
        <path
          key={c.id}
          d={c.d}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={c.width}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      ))}

      {/* Live preview */}
      {previewD ? (
        <path
          d={previewD}
          fill="none"
          stroke="#FF5C00"
          strokeWidth={3}
          strokeDasharray="6 4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      ) : null}

      {/* Pinpoints */}
      {start ? (
        <circle cx={start.x} cy={start.y} r={8} fill="#FF5C00" stroke="#FFFFFF" strokeWidth={2} pointerEvents="none" />
      ) : null}
      {control ? (
        <circle cx={control.x} cy={control.y} r={6} fill="#FFFFFF" stroke="#FF5C00" strokeWidth={2} strokeDasharray="3 2" pointerEvents="none" />
      ) : null}

      {/* Hit-rect */}
      {active ? (
        <rect
          x={0}
          y={0}
          width={doorWidth}
          height={doorHeight}
          fill="transparent"
          onPointerDown={onClick}
          onPointerMove={onMove}
          style={{ touchAction: 'none', cursor: 'crosshair' }}
        />
      ) : null}
    </g>
  )
}
