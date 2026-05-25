import { useEffect, useRef, useState } from 'react'
import { buzz, snap, type SnapMode } from './SnapHelper'

type Orientation = 'vertical' | 'horizontal'

interface Props {
  orientation: Orientation
  value: number // mm
  doorWidth: number
  doorHeight: number
  others: number[]
  snapMode: SnapMode
  onChange: (v: number) => void
  onCommit: (v: number) => void
  onRequestDelete?: () => void
  onRequestExact?: () => void
  toUserX: (clientX: number) => number
  toUserY: (clientY: number) => number
}

const HIT_THICKNESS = 60 // mm — hit area
const HANDLE_R = 28

export function DraggableLine({
  orientation,
  value,
  doorWidth,
  doorHeight,
  others,
  snapMode,
  onChange,
  onCommit,
  onRequestDelete,
  onRequestExact,
  toUserX,
  toUserY,
}: Props) {
  const [dragging, setDragging] = useState(false)
  const [snapLabel, setSnapLabel] = useState<string | null>(null)
  const lastSnapped = useRef<string | null>(null)
  const longPressTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    }
  }, [])

  function onPointerDown(e: React.PointerEvent<SVGElement>) {
    if (e.pointerType === 'pen') return // laat pen-events naar freehand-layer gaan
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    longPressTimer.current = window.setTimeout(() => {
      if (onRequestExact) onRequestExact()
      setDragging(false)
    }, 650)
  }

  function onPointerMove(e: React.PointerEvent<SVGElement>) {
    if (!dragging) return
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    const raw =
      orientation === 'vertical' ? toUserX(e.clientX) : toUserY(e.clientY)
    const r = snap(raw, {
      min: 50,
      max: orientation === 'vertical' ? doorWidth - 50 : doorHeight - 50,
      total: orientation === 'vertical' ? doorWidth : doorHeight,
      others,
      mode: snapMode,
    })
    if (r.snappedTo && r.snappedTo !== lastSnapped.current) {
      lastSnapped.current = r.snappedTo
      buzz(8)
    } else if (!r.snappedTo) {
      lastSnapped.current = null
    }
    setSnapLabel(r.snappedTo)
    onChange(r.value)
  }

  function onPointerUp(e: React.PointerEvent<SVGElement>) {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (dragging) {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
      setDragging(false)
      setSnapLabel(null)
      onCommit(value)
    }
  }

  const isVert = orientation === 'vertical'
  const x1 = isVert ? value : 0
  const x2 = isVert ? value : doorWidth
  const y1 = isVert ? 0 : doorHeight - value
  const y2 = isVert ? doorHeight : doorHeight - value

  // mm-label volgt de cursor; geplaatst dichtbij het midden van de lijn
  const cx = isVert ? value : doorWidth / 2
  const cy = isVert ? doorHeight / 2 : doorHeight - value

  const lineStroke = dragging ? '#FF5C00' : '#0A0A0A'
  const lineWidth = dragging ? 3 : 2

  return (
    <g style={{ touchAction: 'none' }}>
      {/* zichtbare lijn */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={lineStroke}
        strokeWidth={lineWidth}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {/* hit-zone (transparant, brede strook) */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={HIT_THICKNESS}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: isVert ? 'ew-resize' : 'ns-resize', touchAction: 'none' }}
      />
      {/* sleepgreep */}
      <circle
        cx={cx}
        cy={cy}
        r={HANDLE_R}
        fill={dragging ? '#FF5C00' : '#FFFFFF'}
        stroke="#0A0A0A"
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      <circle cx={cx} cy={cy} r={6} fill={dragging ? '#FFFFFF' : '#0A0A0A'} pointerEvents="none" />

      {/* live mm-label tijdens slepen */}
      {dragging ? (
        <g pointerEvents="none">
          <rect
            x={cx - 90}
            y={cy + (isVert ? 40 : -90)}
            width={180}
            height={60}
            rx={8}
            fill="#0A0A0A"
          />
          <text
            x={cx}
            y={cy + (isVert ? 78 : -52)}
            textAnchor="middle"
            fontSize={36}
            fill="#FFFFFF"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="bold"
          >
            {value} mm
          </text>
          {snapLabel ? (
            <text
              x={cx}
              y={cy + (isVert ? 110 : -22)}
              textAnchor="middle"
              fontSize={22}
              fill="#FF5C00"
              fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            >
              {snapLabel}
            </text>
          ) : null}
        </g>
      ) : null}

      {/* dubbelklik-via-doubleclick: verwijder */}
      {onRequestDelete ? (
        <circle
          cx={isVert ? value : doorWidth - 40}
          cy={isVert ? 40 : doorHeight - value}
          r={20}
          fill="transparent"
          onDoubleClick={() => onRequestDelete()}
          style={{ cursor: 'pointer' }}
        />
      ) : null}
    </g>
  )
}
