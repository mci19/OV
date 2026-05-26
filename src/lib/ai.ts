import { supabase } from './supabase'
import type { FreehandStroke } from './types'

export interface AiSketchResult {
  verticalLines: { x: number }[]
  horizontalLines: { y: number }[]
  explanation: string
}

interface ApiError {
  error: string
}

async function getAuthHeader(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? `Bearer ${token}` : null
}

async function call(body: unknown): Promise<AiSketchResult> {
  const auth = await getAuthHeader()
  if (!auth) throw new Error('Niet ingelogd')

  const res = await fetch('/api/ai-sketch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as ApiError
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return (await res.json()) as AiSketchResult
}

export function sketchFromText(input: {
  text: string
  doorWidth: number
  doorHeight: number
}): Promise<AiSketchResult> {
  return call({ mode: 'text', ...input })
}

export function sketchFromFreehand(input: {
  strokes: FreehandStroke[]
  doorWidth: number
  doorHeight: number
}): Promise<AiSketchResult> {
  // We sturen de SVG path 'd' als-is mee; de server samenvat per-stroke.
  return call({
    mode: 'freehand',
    doorWidth: input.doorWidth,
    doorHeight: input.doorHeight,
    strokes: input.strokes.map((s) => ({ d: s.d })),
  })
}
