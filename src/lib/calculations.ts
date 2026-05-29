import type { OrderData, ValidationIssue } from './types'
import { resolveHandleLength, tFor, type Lang } from './i18n'
import { DEFAULT_CUT_FORMULAS, type CutFormulas } from './db'

export function validateOrder(order: OrderData): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { hoogte, breedte, aantalDeuren, sketch } = order

  if (!Number.isFinite(hoogte) || hoogte < 1800)
    issues.push({ field: 'hoogte', message: 'Hoogte minimaal 1800 mm', severity: 'error' })
  if (hoogte > 3500)
    issues.push({ field: 'hoogte', message: 'Hoogte maximaal 3500 mm', severity: 'error' })
  if (!Number.isFinite(breedte) || breedte < 600)
    issues.push({ field: 'breedte', message: 'Breedte minimaal 600 mm', severity: 'error' })
  if (breedte > 1500)
    issues.push({ field: 'breedte', message: 'Breedte maximaal 1500 mm', severity: 'error' })
  if (!Number.isFinite(aantalDeuren) || aantalDeuren < 1)
    issues.push({ field: 'aantalDeuren', message: 'Minimaal 1 deur', severity: 'error' })
  if (!order.klantNaam.trim())
    issues.push({ field: 'klantNaam', message: 'Klantnaam ontbreekt', severity: 'warning' })

  for (const v of sketch.verticalLines) {
    if (v.x < 50 || v.x > breedte - 50)
      issues.push({ field: `vline-${v.id}`, message: `Verticale lijn op ${v.x} mm valt te dicht bij de rand`, severity: 'warning' })
  }
  for (const h of sketch.horizontalLines) {
    if (h.y < 100 || h.y > hoogte - 100)
      issues.push({ field: `hline-${h.id}`, message: `Horizontale lijn op ${h.y} mm valt te dicht bij rand`, severity: 'warning' })
  }

  if (sketch.verticalLines.length > 5)
    issues.push({ field: 'sketch', message: 'Te veel verticale lijnen (max 5)', severity: 'error' })
  if (sketch.horizontalLines.length > 5)
    issues.push({ field: 'sketch', message: 'Te veel horizontale lijnen (max 5)', severity: 'error' })

  return issues
}

export function ralLabel(o: OrderData, lang: Lang = 'nl'): string {
  if (o.colorKind === 'ral_9005') return tFor(lang, 'labels.ral.9005')
  if (o.colorKind === 'ral_9010') return tFor(lang, 'labels.ral.9010')
  return o.colorOther.trim() || tFor(lang, 'labels.ral.unknown')
}

export function glassLabel(o: OrderData, lang: Lang = 'nl'): string {
  switch (o.glassType) {
    case 'clear': return tFor(lang, 'labels.glass.clear')
    case 'matt': return tFor(lang, 'labels.glass.matt')
    case 'cathedraal_flute': return tFor(lang, 'labels.glass.cathedraal')
    case 'other': return o.glassOther.trim() || tFor(lang, 'labels.glass.otherFallback')
  }
}

export function systemLabel(o: OrderData, lang: Lang = 'nl'): string {
  const keyMap = {
    hinges: 'labels.system.hinges',
    pivotica: 'labels.system.pivotica',
    sliding: 'labels.system.sliding',
  } as const
  return tFor(lang, keyMap[o.system])
}

export function finishingLabel(o: OrderData, lang: Lang = 'nl'): string {
  const keyMap = {
    glasslist_10: 'labels.finishing.glasslist10',
    glasslist_15: 'labels.finishing.glasslist15',
    soudal_mastiek: 'labels.finishing.soudal',
  } as const
  return tFor(lang, keyMap[o.finishing])
}

export function handleLabel(o: OrderData, lang: Lang = 'nl', formulas: CutFormulas = DEFAULT_CUT_FORMULAS): string {
  const mm = resolveHandleLength(o.handleKind, o.handleVerticalMm, formulas)
  switch (o.handleKind) {
    case 'none':           return tFor(lang, 'labels.handle.none')
    case 'l_grip':         return tFor(lang, 'labels.handle.lGrip', { mm })
    case 'l_vertical':     return tFor(lang, 'labels.handle.lVertical')
    case 'horizontal_bar': return tFor(lang, 'labels.handle.horizontalBar', { mm })
    case 't_grip':         return tFor(lang, 'labels.handle.tGrip', { mm })
    case 'custom':         return tFor(lang, 'labels.handle.custom', { mm })
    case 'veerklink':      return tFor(lang, 'labels.handle.veerklink')
    case 'other':          return o.handleOther.trim() || tFor(lang, 'labels.handle.otherFallback')
    default:               return o.handleOther?.trim() || tFor(lang, 'labels.handle.otherUnknown')
  }
}

export function lockLabel(o: OrderData, lang: Lang = 'nl'): string {
  switch (o.lockKind) {
    case 'cilinder_litto': return tFor(lang, 'labels.lock.cilinderLitto')
    case 'magnetic':       return tFor(lang, 'labels.lock.magnetic')
    case 'electronic':     return tFor(lang, 'labels.lock.electronic')
    case 'keyhole_only':   return tFor(lang, 'labels.lock.keyholeOnly')
    case 'no_cilinder':    return tFor(lang, 'labels.lock.noCilinder')
    case 'other':          return o.lockOther.trim() || tFor(lang, 'labels.lock.otherFallback')
  }
}

export function hingeLabel(o: OrderData, lang: Lang = 'nl'): string {
  if (o.hingeKind === 'single') {
    return o.hingeSide === 'belgisch_links'
      ? tFor(lang, 'labels.hinge.singleBelgischLinks')
      : tFor(lang, 'labels.hinge.singleBelgischRechts')
  }
  const n = o.hingeSide.replace('double_', '')
  return tFor(lang, 'labels.hinge.doublePrefix', { n })
}

export function variantLabel(o: OrderData, lang: Lang = 'nl'): string {
  if (!o.variants.length) return tFor(lang, 'labels.variant.empty')
  const keyMap = {
    panel_door: 'labels.variant.panelDoor',
    double_door: 'labels.variant.doubleDoor',
    fritsjurgens_3: 'labels.variant.fritsjurgens3',
  } as const
  return o.variants.map((v) => (v in keyMap ? tFor(lang, keyMap[v as keyof typeof keyMap]) : v)).join(', ')
}

// Voor visuele weergave op de schets: breedte/hoogte van het deurblad
// (excl. kozijn) en glas-uitsparing. Slechts informatief — fabrikant
// rekent zelf de exacte profielmaten.
export function visualGeometry(o: OrderData) {
  const bladeWidth = Math.max(0, o.breedte - 88) // 40+40 profiel + 4+4 speling
  const bladeHeight = Math.max(0, o.hoogte - 30)
  const glassWidth = Math.max(0, bladeWidth - 8)
  const glassHeight = Math.max(0, bladeHeight - 48)
  return { bladeWidth, bladeHeight, glassWidth, glassHeight }
}
