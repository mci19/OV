import { useEffect, useRef, useState } from 'react'
import { buzz } from './SnapHelper'

interface Props {
  /** Greep-positie vanaf onder, in mm */
  heightFromBottom: number
  /** Optionele X-positie in door-coords (mm vanaf links). Wanneer
   *  undefined wordt de standaard 'side+50mm offset' gebruikt. */
  x?: number
  /** Deur-afmetingen — voor begrenzing en hit-area */
  doorWidth: number
  doorHeight: number
  /** 'left' of 'right' — bepaalt visuele default-positie op het blad */
  side: 'left' | 'right'
  /** Snap-targets uit de design-lijnen (in mm). Greep snapt naar deze
   *  posities + naar de deur-randen. */
  snapXTargets?: number[]   // verticale design-lijnen
  snapYTargets?: number[]   // horizontale design-lijnen (y vanaf onder)
  onChange: (next: { heightFromBottom: number; x?: number }) => void
  onRequestExact?: () => void
  onDragStart?: () => void
  onDragMove?: (pos: { x: number; y: number }) => void
  onDragEnd?: () => void
  toUserX: (clientX: number) => number
  toUserY: (clientY: number) => number
}

const SNAP_MM = 5         // standaard snap stap (5 mm)
const SNAP_FINE_MM = 1    // fine mode = 1 mm
const SNAP_TARGET_MM = 12 // magneet-snap binnen 12 mm naar lijn/rand
const HIT_RADIUS = 90     // mm — wide hit zone voor touch

/**
 * Drag-zone over de greep. Sleep om greep te verzetten in zowel X als Y.
 * Standaard snap 5 mm; ingedrukt houden + langzaam slepen = 1 mm fine-
 * mode. Snapt magnetisch naar deur-randen en design-lijn-posities.
 * Long-press → exact-input dialog.
 */
export function DraggableHandle({
  heightFromBottom, x, doorWidth, doorHeight, side,
  snapXTargets = [], snapYTargets = [],
  onChange, onRequestExact, onDragStart, onDragMove, onDragEnd, toUserX, toUserY,
}: Props) {
  const [dragging, setDragging] = useState(false)
  const [fineMode, setFineMode] = useState(false)
  const longPressTimer = useRef<number | null>(null)
  const lastSnapped = useRef<string | null>(null)
  const dragStartTime = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    }
  }, [])

  // Greep-positie in canvas-coords
  // Default = blade-rand (= 44 mm vanaf deur-rand: 40mm kozijn + 4mm
  // speling). Komt overeen met bladeX/bladeX+bladeW in DoorOutline.
  const defaultX = side === 'left' ? 44 : doorWidth - 44
  const cx = x ?? defaultX
  const cy = doorHeight - heightFromBottom

  // X-snap-targets = deur-randen (op handle-side) + verticale design-lijnen
  const xTargets = [defaultX, ...snapXTargets]
  // Y-snap-targets = horizontale design-lijnen
  const yTargets = snapYTargets

  function snapTo(value: number, targets: number[], step: number): { value: number; tag: string | null } {
    // 1) Magneet-snap naar targets
    for (const t of targets) {
      if (Math.abs(value - t) <= SNAP_TARGET_MM) {
        return { value: Math.round(t), tag: `target-${Math.round(t)}` }
      }
    }
    // 2) Grid-snap
    const snapped = Math.round(value / step) * step
    return { value: snapped, tag: null }
  }

  function onPointerDown(e: React.PointerEvent<SVGCircleElement>) {
    if (e.pointerType === 'pen') return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    setFineMode(false)
    dragStartTime.current = Date.now()
    onDragStart?.()
    longPressTimer.current = window.setTimeout(() => {
      if (onRequestExact) {
        setDragging(false)
        onRequestExact()
      }
    }, 650)
  }

  function onPointerMove(e: React.PointerEvent<SVGCircleElement>) {
    if (!dragging) return
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    const elapsed = Date.now() - dragStartTime.current
    if (elapsed > 800 && !fineMode) setFineMode(true)

    const step = fineMode ? SNAP_FINE_MM : SNAP_MM

    const rawX = toUserX(e.clientX)
    const rawY = toUserY(e.clientY)
    const rawFromBottom = doorHeight - rawY

    const ySnap = snapTo(rawFromBottom, yTargets, step)
    const xSnap = snapTo(rawX, xTargets, step)

    const clampedY = Math.max(50, Math.min(doorHeight - 50, ySnap.value))
    const clampedX = Math.max(20, Math.min(doorWidth - 20, xSnap.value))

    const tag = `${xSnap.tag ?? ''}|${ySnap.tag ?? ''}`
    if (tag !== lastSnapped.current && (xSnap.tag || ySnap.tag)) {
      lastSnapped.current = tag
      buzz(fineMode ? 3 : 6)
    } else if (!xSnap.tag && !ySnap.tag) {
      lastSnapped.current = null
    }

    onChange({ heightFromBottom: clampedY, x: clampedX })
    onDragMove?.({ x: clampedX, y: doorHeight - clampedY })
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
      onDragEnd?.()
    }
  }

  return (
    <g style={{ touchAction: 'none' }}>
      <circle
        cx={cx}
        cy={cy}
        r={HIT_RADIUS}
        fill="transparent"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: 'move' }}
      />

      {dragging ? (
        <g pointerEvents="none">
          {/* Snap-target hints (deur-randen + design-lijnen) */}
          {xTargets.map((tx) => (
            <line key={`xt-${tx}`} x1={tx} y1={0} x2={tx} y2={doorHeight}
              stroke="#FF5C00" strokeWidth={1} strokeDasharray="3 3" opacity={0.4}
              vectorEffect="non-scaling-stroke" />
          ))}
          {yTargets.map((ty) => {
            const yCanvas = doorHeight - ty
            return (
              <line key={`yt-${ty}`} x1={0} y1={yCanvas} x2={doorWidth} y2={yCanvas}
                stroke="#FF5C00" strokeWidth={1} strokeDasharray="3 3" opacity={0.4}
                vectorEffect="non-scaling-stroke" />
            )
          })}
          <circle cx={cx} cy={cy} r={36} fill="rgba(255,92,4,0.15)" stroke="#FF5C00"
            strokeWidth={1.5} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          {/* Crosshair-lijnen vanaf de greep */}
          <line x1={0} y1={cy} x2={doorWidth} y2={cy}
            stroke="#FF5C00" strokeWidth={1} opacity={0.6} vectorEffect="non-scaling-stroke" />
          <line x1={cx} y1={0} x2={cx} y2={doorHeight}
            stroke="#FF5C00" strokeWidth={1} opacity={0.6} vectorEffect="non-scaling-stroke" />
          {/* mm-label */}
          <rect
            x={cx + (cx < doorWidth / 2 ? 50 : -210)}
            y={cy - 40}
            width={160}
            height={80}
            rx={8}
            fill="#0A0A0A"
          />
          <text
            x={cx + (cx < doorWidth / 2 ? 130 : -130)}
            y={cy - 14}
            textAnchor="middle"
            fontSize={22}
            fill="#FFFFFF"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="bold"
          >
            x: {Math.round(cx)} mm
          </text>
          <text
            x={cx + (cx < doorWidth / 2 ? 130 : -130)}
            y={cy + 12}
            textAnchor="middle"
            fontSize={22}
            fill="#FFFFFF"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="bold"
          >
            y: {heightFromBottom} mm
          </text>
          <text
            x={cx + (cx < doorWidth / 2 ? 130 : -130)}
            y={cy + 32}
            textAnchor="middle"
            fontSize={14}
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
