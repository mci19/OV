import { useEffect, useRef, useState } from 'react'
import { buzz } from './SnapHelper'

interface Props {
  /** Greep-positie vanaf onder, in mm */
  heightFromBottom: number
  /** Deur-afmetingen — voor begrenzing en hit-area */
  doorWidth: number
  doorHeight: number
  /** 'left' of 'right' — bepaalt visuele positie op het blad */
  side: 'left' | 'right'
  onChange: (heightFromBottom: number) => void
  onRequestExact?: () => void
  toUserY: (clientY: number) => number
}

const SNAP_MM = 5         // standaard snap stap (5 mm) — schakelbaar
const SNAP_FINE_MM = 1    // fine mode = 1 mm
const HIT_RADIUS = 90     // mm — wide hit zone voor touch

/**
 * Een onzichtbare drag-zone over de greep-positie. Door erop te slepen
 * verzet je de greep met mm-precisie (default snap 5 mm; ingedrukt
 * houden + langzaam slepen = 1 mm fine-mode).
 *
 * Long-press → exact-input dialog voor handmatige mm-waarde.
 */
export function DraggableHandle({
  heightFromBottom, doorWidth, doorHeight, side, onChange, onRequestExact, toUserY,
}: Props) {
  const [dragging, setDragging] = useState(false)
  const [fineMode, setFineMode] = useState(false)
  const longPressTimer = useRef<number | null>(null)
  const lastSnapped = useRef<number | null>(null)
  const dragStartTime = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    }
  }, [])

  // Greep-positie in canvas-coords
  const cx = side === 'left' ? 50 : doorWidth - 50
  const cy = doorHeight - heightFromBottom

  function onPointerDown(e: React.PointerEvent<SVGCircleElement>) {
    if (e.pointerType === 'pen') return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    setFineMode(false)
    dragStartTime.current = Date.now()
    longPressTimer.current = window.setTimeout(() => {
      if (onRequestExact) {
        setDragging(false)
        onRequestExact()
      }
    }, 650)
  }

  function onPointerMove(e: React.PointerEvent<SVGCircleElement>) {
    if (!dragging) return
    // Cancel long-press zodra er beweging is
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    // Fine mode na 800ms vasthouden + langzaam slepen
    const elapsed = Date.now() - dragStartTime.current
    if (elapsed > 800 && !fineMode) setFineMode(true)

    const yUser = toUserY(e.clientY)  // 0 = top, doorHeight = bottom
    const rawFromBottom = doorHeight - yUser
    const step = fineMode ? SNAP_FINE_MM : SNAP_MM
    const snapped = Math.round(rawFromBottom / step) * step
    const clamped = Math.max(50, Math.min(doorHeight - 50, snapped))
    if (clamped !== lastSnapped.current) {
      lastSnapped.current = clamped
      buzz(fineMode ? 3 : 6)
    }
    onChange(clamped)
  }

  function onPointerUp(e: React.PointerEvent<SVGCircleElement>) {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (dragging) {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
      setDragging(false)
      setFineMode(false)
      lastSnapped.current = null
    }
  }

  return (
    <g style={{ touchAction: 'none' }}>
      {/* Drag hit zone — onzichtbaar transparant, brede cirkel */}
      <circle
        cx={cx}
        cy={cy}
        r={HIT_RADIUS}
        fill="transparent"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: 'ns-resize' }}
      />

      {/* Visuele drag-affordance — alleen tijdens dragging zichtbaar */}
      {dragging ? (
        <g pointerEvents="none">
          <circle cx={cx} cy={cy} r={36} fill="rgba(255,92,4,0.15)" stroke="#FF5C00" strokeWidth={1.5} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          {/* mm-label */}
          <rect
            x={cx + (side === 'left' ? 50 : -190)}
            y={cy - 30}
            width={140}
            height={60}
            rx={8}
            fill="#0A0A0A"
          />
          <text
            x={cx + (side === 'left' ? 120 : -120)}
            y={cy - 4}
            textAnchor="middle"
            fontSize={26}
            fill="#FFFFFF"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="bold"
          >
            {heightFromBottom} mm
          </text>
          <text
            x={cx + (side === 'left' ? 120 : -120)}
            y={cy + 22}
            textAnchor="middle"
            fontSize={16}
            fill={fineMode ? '#FF5C00' : '#AAAAAA'}
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          >
            {fineMode ? '± 1 mm (fijn)' : `± ${SNAP_MM} mm`}
          </text>
        </g>
      ) : null}
    </g>
  )
}
