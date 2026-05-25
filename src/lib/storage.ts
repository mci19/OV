import { DEFAULT_ORDER, type OrderData } from './types'

const KEY = 'mydoors:order:v3'
const CONCEPTS_KEY = 'mydoors:concepts:v3'

export function loadOrder(): OrderData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_ORDER
    const parsed = JSON.parse(raw)
    return mergeDefaults(parsed)
  } catch {
    return DEFAULT_ORDER
  }
}

export function saveOrder(o: OrderData): void {
  try { localStorage.setItem(KEY, JSON.stringify(o)) } catch { /* */ }
}

export interface Concept {
  id: string
  savedAt: string // ISO timestamp
  order: OrderData
}

export function listConcepts(): Concept[] {
  try {
    const raw = localStorage.getItem(CONCEPTS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Concept[]
  } catch {
    return []
  }
}

export function saveConcept(o: OrderData): Concept {
  const concept: Concept = {
    id: `c-${Date.now().toString(36)}`,
    savedAt: new Date().toISOString(),
    order: o,
  }
  const all = listConcepts()
  all.unshift(concept)
  try { localStorage.setItem(CONCEPTS_KEY, JSON.stringify(all.slice(0, 50))) } catch { /* */ }
  return concept
}

export function deleteConcept(id: string): void {
  const all = listConcepts().filter((c) => c.id !== id)
  try { localStorage.setItem(CONCEPTS_KEY, JSON.stringify(all)) } catch { /* */ }
}

function mergeDefaults(partial: Partial<OrderData>): OrderData {
  return {
    ...DEFAULT_ORDER,
    ...partial,
    handlePosition: { ...DEFAULT_ORDER.handlePosition, ...(partial.handlePosition ?? {}) },
    sketch: {
      ...DEFAULT_ORDER.sketch,
      ...(partial.sketch ?? {}),
      verticalLines: partial.sketch?.verticalLines ?? [],
      horizontalLines: partial.sketch?.horizontalLines ?? [],
      freehand: partial.sketch?.freehand ?? [],
    },
  }
}
