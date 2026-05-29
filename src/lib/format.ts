import type { Lang } from './i18n'

/** Relatieve tijd, taal-bewust. "3 d", "5 min", etc. */
export function relativeTime(iso: string, lang: Lang = 'nl'): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const sec = Math.max(0, Math.round((now - then) / 1000))
  const units = lang === 'en'
    ? { now: 'now', min: 'min', hr: 'h', day: 'd', wk: 'w', mo: 'mo', yr: 'y' }
    : { now: 'net', min: 'min', hr: 'u', day: 'd', wk: 'w', mo: 'mnd', yr: 'j' }
  if (sec < 45) return units.now
  const min = Math.round(sec / 60)
  if (min < 45) return `${min} ${units.min}`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} ${units.hr}`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day} ${units.day}`
  const wk = Math.round(day / 7)
  if (wk < 5) return `${wk} ${units.wk}`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo} ${units.mo}`
  const yr = Math.round(day / 365)
  return `${yr} ${units.yr}`
}

/** Backwards-compat alias: oude code blijft werken. */
export const relativeTimeNl = (iso: string) => relativeTime(iso, 'nl')

export function formatEur(cents: number): string {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
