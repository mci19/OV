import type { SketchData } from './types'

export interface SketchTemplate {
  id: string
  name: string
  description?: string
  doorWidth: number
  doorHeight: number
  sketch: SketchData
  savedAt: string
}

const KEY = 'mydoors:sketch-templates:v1'

export function listSketchTemplates(): SketchTemplate[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as SketchTemplate[]
  } catch {
    return []
  }
}

export function saveSketchTemplate(input: {
  name: string
  description?: string
  doorWidth: number
  doorHeight: number
  sketch: SketchData
}): SketchTemplate {
  const all = listSketchTemplates()
  const t: SketchTemplate = {
    id: `tpl-${Date.now().toString(36)}`,
    name: input.name.trim() || `Schets ${new Date().toLocaleString('nl-BE')}`,
    description: input.description?.trim() || undefined,
    doorWidth: input.doorWidth,
    doorHeight: input.doorHeight,
    sketch: input.sketch,
    savedAt: new Date().toISOString(),
  }
  all.unshift(t)
  try { localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50))) } catch { /* */ }
  return t
}

export function deleteSketchTemplate(id: string): void {
  const all = listSketchTemplates().filter((t) => t.id !== id)
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* */ }
}

/**
 * Hernoem de IDs van lijnen + freehand zodat ze uniek zijn binnen de
 * doel-order (anders krijg je dubbele keys als je een template tweemaal
 * toepast).
 */
export function instantiateSketch(tpl: SketchTemplate): SketchData {
  const stamp = Date.now().toString(36)
  return {
    templateId: undefined,
    verticalLines: tpl.sketch.verticalLines.map((v, i) => ({ id: `v-${stamp}-${i}`, x: v.x })),
    horizontalLines: tpl.sketch.horizontalLines.map((h, i) => ({ id: `h-${stamp}-${i}`, y: h.y })),
    freehand: tpl.sketch.freehand.map((s, i) => ({ id: `f-${stamp}-${i}`, d: s.d, width: s.width })),
  }
}
