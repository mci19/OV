import { describe, expect, it } from 'vitest'
import { formatEur, relativeTime, truncate } from './format'

describe('formatEur', () => {
  it('formats cents to nl-BE EUR notation', () => {
    expect(formatEur(0)).toMatch(/0,00/)
    expect(formatEur(12345)).toMatch(/123,45/)
  })

  it('handles negative values', () => {
    expect(formatEur(-500)).toMatch(/-5,00/)
  })
})

describe('relativeTime', () => {
  const now = new Date()

  it('returns "net"/"now" for fresh timestamps', () => {
    expect(relativeTime(now.toISOString(), 'nl')).toBe('net')
    expect(relativeTime(now.toISOString(), 'en')).toBe('now')
  })

  it('returns "5 min" voor 5 minuten geleden', () => {
    const past = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    expect(relativeTime(past, 'nl')).toBe('5 min')
  })

  it('returns hour unit voor < 24h', () => {
    const past = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(past, 'nl')).toBe('3 u')
    expect(relativeTime(past, 'en')).toBe('3 h')
  })

  it('returns day unit voor < 7d', () => {
    const past = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(past, 'nl')).toBe('3 d')
  })

  it('returns month unit voor enkele maanden', () => {
    const past = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(past, 'nl')).toBe('2 mnd')
    expect(relativeTime(past, 'en')).toBe('2 mo')
  })
})

describe('truncate', () => {
  it('returns string unchanged when shorter than max', () => {
    expect(truncate('hallo', 60)).toBe('hallo')
  })

  it('truncates met ellipsis bij overflow', () => {
    const long = 'a'.repeat(80)
    const out = truncate(long, 60)
    expect(out.length).toBe(60)
    expect(out.endsWith('…')).toBe(true)
  })

  it('trims whitespace voor truncation', () => {
    expect(truncate('  hallo  ', 60)).toBe('hallo')
  })

  it('handles null/undefined safely', () => {
    expect(truncate(null)).toBe('')
    expect(truncate(undefined)).toBe('')
  })
})
