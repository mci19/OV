import type { OrderData } from './types'

export function orderNumber(o: OrderData): string {
  const d = (o.datum || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
  const ref = o.referentie.trim() || o.klantNaam.trim() || 'X'
  let h = 0
  for (let i = 0; i < ref.length; i++) h = ((h << 5) - h + ref.charCodeAt(i)) | 0
  const suffix = String(Math.abs(h) % 1000).padStart(3, '0')
  return `${d}-${suffix}`
}

export function slug(o: OrderData): string {
  const base = (o.referentie || o.klantNaam || 'mydoors').trim()
  return base.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
}
