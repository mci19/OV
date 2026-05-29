/**
 * Helpers voor kwadratische bezier-curves opgeslagen als SVG-path-data.
 *
 * Format dat we gebruiken: "M sx sy Q cx cy ex ey"
 *   - (sx, sy) = startpunt
 *   - (cx, cy) = controlpunt (bepaalt bocht-richting)
 *   - (ex, ey) = eindpunt
 *
 * Wordt gebruikt door CurveLayer (tekenen), CurveEditOverlay (editen)
 * en de AI-server (output-validatie).
 */

export interface Point { x: number; y: number }
export interface QuadraticCurve {
  start: Point
  control: Point
  end: Point
}

/**
 * Parse "M sx sy Q cx cy ex ey" naar QuadraticCurve. Tolerant voor
 * extra spaties; faalt graceful (returns null) bij ongeldige input.
 */
export function parseQuadraticCurve(d: string): QuadraticCurve | null {
  const m = d.trim().match(/^M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Q\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*$/i)
  if (!m) return null
  return {
    start: { x: parseFloat(m[1]), y: parseFloat(m[2]) },
    control: { x: parseFloat(m[3]), y: parseFloat(m[4]) },
    end: { x: parseFloat(m[5]), y: parseFloat(m[6]) },
  }
}

/** Serialiseer naar SVG-path-data string. */
export function serializeQuadraticCurve(c: QuadraticCurve): string {
  const r = (n: number) => Math.round(n)
  return `M ${r(c.start.x)} ${r(c.start.y)} Q ${r(c.control.x)} ${r(c.control.y)} ${r(c.end.x)} ${r(c.end.y)}`
}

/** Verplaats alle 3 punten met dx/dy (move-whole-curve). */
export function translateQuadraticCurve(c: QuadraticCurve, dx: number, dy: number): QuadraticCurve {
  return {
    start: { x: c.start.x + dx, y: c.start.y + dy },
    control: { x: c.control.x + dx, y: c.control.y + dy },
    end: { x: c.end.x + dx, y: c.end.y + dy },
  }
}
