import type { ReactNode } from 'react'

interface Props {
  /** Het sleep-punt in door-coords (mm) waar de loupe op focust. */
  focusX: number
  focusY: number
  doorWidth: number
  doorHeight: number
  /** Zone die in de loupe te zien is, in mm. Default 80 = ±40mm rondom. */
  windowMm?: number
  /** Pixelgrootte van het loupe-paneel. */
  size?: number
  /** SVG-children die worden geherrenderd in de loupe (kopie van canvas). */
  children: ReactNode
}

/**
 * Mini-SVG die een gezoomd kijkje toont rondom (focusX, focusY) tijdens
 * een drag-operatie. Wordt geplaatst rechtsboven in de canvas-container
 * via een absolute-positioned wrap. De children zijn een sub-render van
 * de canvas-inhoud (DoorOutline + lijnen) — die worden via de viewBox
 * gemagnificeerd.
 *
 * Renders een fadcenter-cirkel + mm-coords als overlay binnenin.
 */
export function DragLoupe({
  focusX,
  focusY,
  doorWidth,
  doorHeight,
  windowMm = 80,
  size = 200,
  children,
}: Props) {
  // Clamp focus binnen de deur zodat de loupe geen rare leegtes toont
  const fx = Math.max(windowMm / 2, Math.min(doorWidth - windowMm / 2, focusX))
  const fy = Math.max(windowMm / 2, Math.min(doorHeight - windowMm / 2, focusY))
  const vbX = fx - windowMm / 2
  const vbY = fy - windowMm / 2

  return (
    <div
      className="absolute top-3 right-3 z-20 rounded-lg overflow-hidden shadow-2xl no-print"
      style={{
        width: size,
        height: size,
        border: '2px solid #FF5C00',
        background: '#FFFFFF',
        pointerEvents: 'none',
      }}
    >
      <svg
        viewBox={`${vbX} ${vbY} ${windowMm} ${windowMm}`}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {children}
        {/* Crosshair op het focus-punt */}
        <line x1={fx - windowMm / 2} y1={fy} x2={fx + windowMm / 2} y2={fy}
          stroke="#FF5C00" strokeWidth={0.4} opacity={0.7} vectorEffect="non-scaling-stroke" />
        <line x1={fx} y1={fy - windowMm / 2} x2={fx} y2={fy + windowMm / 2}
          stroke="#FF5C00" strokeWidth={0.4} opacity={0.7} vectorEffect="non-scaling-stroke" />
        <circle cx={fx} cy={fy} r={2} fill="#FF5C00" />
      </svg>
      {/* mm-label onderaan loupe */}
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1 font-mono text-[10px] text-center"
        style={{ background: 'rgba(10,10,10,0.85)', color: '#FFFFFF' }}
      >
        x: {Math.round(focusX)} · y: {Math.round(focusY)} mm
      </div>
    </div>
  )
}
