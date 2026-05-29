import type { OrderData, SketchArea } from './types'
import { visualGeometry } from './calculations'

// Visuele kozijn-divider gap (matchen met DoorOutline). Verschilt van
// de PRODUCTIE-divider (40 mm 20×40×2 profiel) die in cutList.ts gebruikt
// wordt. Deze 8 mm is alleen voor de canvas/PDF-rendering.
const VISUAL_DIV = 8

export interface AreaBounds {
  /** Bounding-box van het VLAK (kozijn-coords). */
  x: number
  y: number
  w: number
  h: number
  /** Welk vlak dit is. */
  area: SketchArea
  /** Is dit vlak actief in de huidige doorConfig? */
  active: boolean
}

/**
 * Bereken de bounding-boxen van elk mogelijk sketch-vlak op basis van
 * de orderdata (kozijn-maten + paneel-configuratie). Dezelfde formules
 * als in DoorOutline en DimensionLabels, om visuele en cut-list-logica
 * consistent te houden.
 *
 * Inactieve vlakken (bv. left_panel als er geen linker-paneel is)
 * worden tóch teruggegeven met `active: false` + breedte 0, zodat
 * callers niet hoeven te branchen op aanwezigheid.
 */
export function computeAreaBounds(order: OrderData): Record<SketchArea, AreaBounds> {
  const { breedte, hoogte } = order
  const baseGeo = visualGeometry(order)
  const isSidePanel = order.doorConfig === 'side_panel'
  const panels = isSidePanel ? order.sidePanels : []
  const hasLeft = panels.includes('left')
  const hasRight = panels.includes('right')
  const hasTop = panels.includes('top')
  const lw = hasLeft ? order.leftPanelWidth : 0
  const rw = hasRight ? order.rightPanelWidth : 0
  const th = hasTop ? order.topPanelHeight : 0

  const reducedBladeW = Math.max(200, baseGeo.bladeWidth
    - lw - (hasLeft ? VISUAL_DIV : 0)
    - rw - (hasRight ? VISUAL_DIV : 0))
  const reducedBladeH = Math.max(800, baseGeo.bladeHeight
    - th - (hasTop ? VISUAL_DIV : 0))
  const baseBladeX = (breedte - baseGeo.bladeWidth) / 2
  const baseBladeY = (hoogte - baseGeo.bladeHeight) / 2
  const bladeX = baseBladeX + lw + (hasLeft ? VISUAL_DIV : 0)
  const bladeY = baseBladeY + th + (hasTop ? VISUAL_DIV : 0)

  return {
    door: { area: 'door', active: true, x: bladeX, y: bladeY, w: reducedBladeW, h: reducedBladeH },
    left_panel: {
      area: 'left_panel',
      active: hasLeft,
      x: baseBladeX,
      y: bladeY,
      w: lw,
      h: reducedBladeH,
    },
    right_panel: {
      area: 'right_panel',
      active: hasRight,
      x: bladeX + reducedBladeW + (hasRight ? VISUAL_DIV : 0),
      y: bladeY,
      w: rw,
      h: reducedBladeH,
    },
    top_panel: {
      area: 'top_panel',
      active: hasTop,
      x: baseBladeX,
      y: baseBladeY,
      w: baseGeo.bladeWidth,
      h: th,
    },
  }
}

/** Geeft de gelokaliseerde labels voor de UI. */
export function areaLabel(area: SketchArea, lang: 'nl' | 'en'): string {
  const map: Record<SketchArea, { nl: string; en: string }> = {
    door: { nl: 'Deur', en: 'Door' },
    left_panel: { nl: 'Links paneel', en: 'Left panel' },
    right_panel: { nl: 'Rechts paneel', en: 'Right panel' },
    top_panel: { nl: 'Boven paneel', en: 'Top panel' },
  }
  return map[area][lang]
}
