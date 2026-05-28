import type { OrderData, ValidationIssue } from './types'

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

export function ralLabel(o: OrderData): string {
  if (o.colorKind === 'ral_9005') return 'RAL 9005 (zwart)'
  if (o.colorKind === 'ral_9010') return 'RAL 9010 (wit)'
  return o.colorOther.trim() || 'RAL ?'
}

export function glassLabel(o: OrderData): string {
  switch (o.glassType) {
    case 'clear': return 'Helder glas'
    case 'matt': return 'Mat glas'
    case 'cathedraal_flute': return 'Cathedraal / Flute'
    case 'other': return o.glassOther.trim() || 'Ander glas'
  }
}

export function systemLabel(o: OrderData): string {
  return { hinges: 'Scharnieren', pivotica: 'Pivotica', sliding: 'Schuifsysteem' }[o.system]
}

export function finishingLabel(o: OrderData): string {
  return {
    glasslist_10: 'Glaslijst 10×10',
    glasslist_15: 'Glaslijst 15×15',
    soudal_mastiek: 'Soudal Mastiek',
  }[o.finishing]
}

export function handleLabel(o: OrderData): string {
  switch (o.handleKind) {
    case 'none':           return 'Geen greep'
    case 'l_grip':         return 'L-greep 200 mm'
    case 'l_vertical':     return `L-verticaal ${o.handleVerticalMm} mm`
    case 'horizontal_bar': return 'Horizontale stang 200 mm'
    case 'other':          return o.handleOther.trim() || 'Greep — vrij'
  }
}

export function lockLabel(o: OrderData): string {
  switch (o.lockKind) {
    case 'cilinder_litto': return 'Cilinder Litto 30/30'
    case 'magnetic':       return 'Magneetslot'
    case 'electronic':     return 'Elektronisch slot / smart-lock'
    case 'keyhole_only':   return 'Alleen sleutelgat (zonder klink)'
    case 'no_cilinder':    return 'Geen cilinder'
    case 'other':          return o.lockOther.trim() || 'Ander slot'
  }
}

export function hingeLabel(o: OrderData): string {
  if (o.hingeKind === 'single') {
    return o.hingeSide === 'belgisch_links' ? 'Single — Belgisch Links (DIN R)' : 'Single — Belgisch Rechts (DIN L)'
  }
  return `Double — ${o.hingeSide.replace('double_', 'optie ')}`
}

export function variantLabel(o: OrderData): string {
  if (!o.variants.length) return '—'
  const map: Record<string, string> = {
    panel_door: 'Panel + Deur',
    double_door: 'Dubbele deur',
    fritsjurgens_3: 'Fritsjurgens 3',
  }
  return o.variants.map((v) => map[v] ?? v).join(', ')
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
