import type { OrderData, SketchData } from './types'

export interface Template {
  id: string
  name: string
  description: string
  // produces lines given current door dimensions
  build: (o: Pick<OrderData, 'hoogte' | 'breedte'>) => Omit<SketchData, 'templateId' | 'freehand'>
}

let counter = 0
const nid = (prefix: string) => `${prefix}-${++counter}-${Date.now().toString(36)}`

export const TEMPLATES: Template[] = [
  {
    id: 'effen',
    name: 'Effen',
    description: 'Geen verdeling, volledig glas',
    build: () => ({ verticalLines: [], horizontalLines: [] }),
  },
  {
    id: 'dwarslat-onder',
    name: '1 dwarslat onder',
    description: 'Horizontale lijn op 1/4 hoogte',
    build: ({ hoogte }) => ({
      verticalLines: [],
      horizontalLines: [{ id: nid('h'), y: Math.round(hoogte * 0.2) }],
    }),
  },
  {
    id: 'dwarslat-onder-vertikaal',
    name: '1 dwarslat + verticaal',
    description: 'Zoals Joeri\'s deur: horizontale dwarslat onderin + verticale lijn',
    build: ({ hoogte, breedte }) => ({
      verticalLines: [{ id: nid('v'), x: Math.round(breedte * 0.6) }],
      horizontalLines: [{ id: nid('h'), y: Math.round(hoogte * 0.2) }],
    }),
  },
  {
    id: 'twee-dwarslatten',
    name: '2 dwarslatten',
    description: 'Drie horizontale vakken boven elkaar',
    build: ({ hoogte }) => ({
      verticalLines: [],
      horizontalLines: [
        { id: nid('h'), y: Math.round(hoogte * 0.33) },
        { id: nid('h'), y: Math.round(hoogte * 0.66) },
      ],
    }),
  },
  {
    id: 'raster-2x3',
    name: 'Klassiek raster 2×3',
    description: '1 verticale + 2 horizontale lijnen → 6 vakken',
    build: ({ hoogte, breedte }) => ({
      verticalLines: [{ id: nid('v'), x: Math.round(breedte / 2) }],
      horizontalLines: [
        { id: nid('h'), y: Math.round(hoogte * 0.33) },
        { id: nid('h'), y: Math.round(hoogte * 0.66) },
      ],
    }),
  },
  {
    id: 'halfglas',
    name: 'Halfglas',
    description: 'Bovenste helft glas, onderste paneel',
    build: ({ hoogte }) => ({
      verticalLines: [],
      horizontalLines: [{ id: nid('h'), y: Math.round(hoogte * 0.5) }],
    }),
  },
]

export function applyTemplate(order: OrderData, templateId: string): OrderData {
  const t = TEMPLATES.find((x) => x.id === templateId)
  if (!t) return order
  const built = t.build(order)
  return {
    ...order,
    sketch: {
      ...order.sketch,
      templateId,
      verticalLines: built.verticalLines,
      horizontalLines: built.horizontalLines,
    },
  }
}
