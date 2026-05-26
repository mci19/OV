/** "3 dagen geleden", "net" */
export function relativeTimeNl(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const sec = Math.max(0, Math.round((now - then) / 1000))
  if (sec < 45) return 'net'
  const min = Math.round(sec / 60)
  if (min < 45) return `${min} min`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} u`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day} d`
  const wk = Math.round(day / 7)
  if (wk < 5) return `${wk} w`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo} mnd`
  const yr = Math.round(day / 365)
  return `${yr} j`
}

export function formatEur(cents: number): string {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
