export type SnapMode = 'off' | '10' | '50' | '100'

export interface SnapResult {
  value: number
  snapped: boolean
  snappedTo: string | null
}

/**
 * Snap a raw value (mm) to the nearest snap point.
 * Magnetic snap to: half, 1/3, 2/3 of total, or another line within 12 mm.
 */
export function snap(
  value: number,
  options: {
    min: number
    max: number
    total: number
    others: number[]
    mode: SnapMode
  },
): SnapResult {
  const { min, max, total, others, mode } = options
  let v = Math.round(Math.max(min, Math.min(max, value)))
  const magneticTol = 12 // mm

  const magnetic: { v: number; label: string }[] = [
    { v: Math.round(total / 2), label: 'midden' },
    { v: Math.round(total / 3), label: '1/3' },
    { v: Math.round((total * 2) / 3), label: '2/3' },
    { v: Math.round(total / 4), label: '1/4' },
    { v: Math.round((total * 3) / 4), label: '3/4' },
    ...others.map((o) => ({ v: o, label: `lijn ${o}` })),
  ]
  for (const m of magnetic) {
    if (Math.abs(v - m.v) <= magneticTol) {
      return { value: m.v, snapped: true, snappedTo: m.label }
    }
  }

  if (mode !== 'off') {
    const step = Number(mode)
    const rounded = Math.round(v / step) * step
    v = rounded
    return { value: v, snapped: true, snappedTo: `${step} mm` }
  }

  return { value: v, snapped: false, snappedTo: null }
}

export function buzz(ms = 6): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms)
    }
  } catch { /* */ }
}
