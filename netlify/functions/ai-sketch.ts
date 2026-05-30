import type { Handler, HandlerEvent } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic SDK. ANTHROPIC_API_KEY must be set in Netlify env vars.
const client = new Anthropic()

// ─── System prompt (cached) ─────────────────────────────────────
// Stable across requests → eligible for prompt caching via cache_control.
const SYSTEM_PROMPT = `Je bent een AI assistent voor MY DOORS, een Belgisch bedrijf dat
stalen binnendeuren op maat maakt. Je interpreteert ofwel:

1. Een Nederlandse tekstbeschrijving van een glasverdeling, OF
2. Vrije schets-strokes (lijst van puntenreeksen) op een deurblad,

en zet die om naar exacte structured grid-lijnen voor de productie.

KADER:
- De deur is "doorWidth" × "doorHeight" mm (gegeven in user message).
- Verticale lijnen worden gemeten in mm vanaf de LINKER rand (x).
- Horizontale lijnen (dwarslatten) worden gemeten in mm vanaf de ONDERRAND (y).
- Alle waarden zijn integers in millimeters.
- Marges: lijnen moeten minstens 50mm van een rand liggen, dus
  50 ≤ x ≤ doorWidth-50  en  50 ≤ y ≤ doorHeight-50.
- Max 5 verticale + 5 horizontale lijnen.

VEELGEBRUIKTE TERMINOLOGIE (Nederlands):
- "dwarslat" / "dwarsbalk" = horizontale lijn
- "middenstijl" / "verticale lijn" = verticale lijn
- "halfglas" = horizontale lijn op ~halve hoogte
- "kruisverdeling" = 1 verticale + 1 horizontale
- "raster 2×3" = 1 verticale + 2 horizontale (= 6 vakken)
- "vanaf onder" / "onderaan" = lage y-waarde (bv. 200mm = laag)
- "vanaf boven" / "bovenaan" = hoge y-waarde (= doorHeight - 200mm bij voorbeeld)
- "midden" = doorWidth/2 of doorHeight/2
- "1/3 hoogte" = doorHeight × 0.33 vanaf onder

FREEHAND-INTERPRETATIE:
Bij vrije strokes: kijk per stroke naar de START en END punten.
- Als |dx| > |dy| EN het pad is relatief recht → horizontale lijn op gemiddelde y
- Als |dy| > |dx| EN relatief recht → verticale lijn op gemiddelde x
- Als de stroke duidelijk een BOOG of CURVE is (start en eind niet recht verbonden, met
  een duidelijk hoogtepunt of dieptepunt ertussen) → retourneer een 'curves' item met
  SVG path "M sx sy Q cx cy ex ey", waar (cx, cy) het schatting-control-punt is dat
  de boog reproduceert. Y-as in coördinaten van BOVEN, NIET vanaf onder.
- Wiebelig zonder duidelijke vorm → negeer (geen valide design-element)
- Snap naar logische posities indien dicht bij midden/1/3/2/3 (binnen 30mm).

ALTIJD aanroepen: de tool "set_sketch_lines" met de bepaalde lijnen. Geef
ook een korte uitleg in het Nederlands (1 zin) van wat je hebt geïnterpreteerd.`

// ─── Tool definition for structured output ─────────────────────
const SKETCH_TOOL: Anthropic.Tool = {
  name: 'set_sketch_lines',
  description:
    'Stel de structured grid-lijnen in voor de deurschets. Roep deze tool exact één keer aan met de geïnterpreteerde lijnen.',
  input_schema: {
    type: 'object',
    properties: {
      verticalLines: {
        type: 'array',
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            x: {
              type: 'integer',
              description: 'Positie in mm vanaf links',
            },
          },
          required: ['x'],
        },
      },
      horizontalLines: {
        type: 'array',
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            y: {
              type: 'integer',
              description: 'Positie in mm vanaf onder',
            },
          },
          required: ['y'],
        },
      },
      curves: {
        type: 'array',
        maxItems: 8,
        description: 'Optionele gebogen lijnen (kwadratische beziers). Gebruik dit voor designs met bogen, halve cirkels, S-curves. Coördinaten in mm; oorsprong linksboven, y van boven (NIET van onder).',
        items: {
          type: 'object',
          properties: {
            d: {
              type: 'string',
              description: 'SVG path data, alleen M en Q toegestaan. Bv. "M 100 200 Q 400 50 700 200" = curve van (100,200) naar (700,200) met controlpunt (400,50).',
            },
          },
          required: ['d'],
        },
      },
      explanation: {
        type: 'string',
        description: 'Korte uitleg in het Nederlands van de interpretatie',
      },
    },
    required: ['verticalLines', 'horizontalLines', 'explanation'],
  },
}

// ─── Request validation ─────────────────────────────────────────
interface FreehandStrokeInput {
  d?: string
  points?: { x: number; y: number }[]
}
interface RequestBody {
  mode: 'text' | 'freehand'
  doorWidth: number
  doorHeight: number
  text?: string
  strokes?: FreehandStrokeInput[]
}

function validate(body: unknown): { ok: true; body: RequestBody } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body ontbreekt' }
  const b = body as Record<string, unknown>
  if (b.mode !== 'text' && b.mode !== 'freehand') return { ok: false, error: 'Ongeldige mode' }
  const w = Number(b.doorWidth)
  const h = Number(b.doorHeight)
  if (!Number.isFinite(w) || w < 600 || w > 1500) return { ok: false, error: 'doorWidth buiten 600–1500' }
  if (!Number.isFinite(h) || h < 1800 || h > 3500) return { ok: false, error: 'doorHeight buiten 1800–3500' }
  if (b.mode === 'text') {
    if (typeof b.text !== 'string' || !b.text.trim()) return { ok: false, error: 'text ontbreekt' }
    if (b.text.length > 2000) return { ok: false, error: 'text te lang' }
  } else {
    if (!Array.isArray(b.strokes) || b.strokes.length === 0) return { ok: false, error: 'strokes ontbreken' }
    if (b.strokes.length > 50) return { ok: false, error: 'te veel strokes' }
  }
  return { ok: true, body: b as unknown as RequestBody }
}

// ─── Stroke compression: full SVG paths kunnen veel tokens kosten ─
// Pak per stroke de start, mid, end en bbox — genoeg voor interpretatie.
function summarizeStrokes(strokes: FreehandStrokeInput[]): string {
  const lines: string[] = []
  for (let i = 0; i < strokes.length; i++) {
    const s = strokes[i]
    const pts = extractPoints(s)
    if (pts.length === 0) {
      lines.push(`stroke ${i + 1}: <leeg>`)
      continue
    }
    const start = pts[0]
    const end = pts[pts.length - 1]
    const mid = pts[Math.floor(pts.length / 2)]
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    lines.push(
      `stroke ${i + 1}: start(${start.x.toFixed(0)},${start.y.toFixed(0)}) mid(${mid.x.toFixed(0)},${mid.y.toFixed(0)}) end(${end.x.toFixed(0)},${end.y.toFixed(0)}) bbox(${minX.toFixed(0)}-${maxX.toFixed(0)}, ${minY.toFixed(0)}-${maxY.toFixed(0)}) ${pts.length}pts`,
    )
  }
  return lines.join('\n')
}

function extractPoints(s: FreehandStrokeInput): { x: number; y: number }[] {
  if (Array.isArray(s.points)) return s.points
  if (typeof s.d !== 'string') return []
  // Parse SVG path "M x y L x y L x y" — accepteert M/L/m/l, geen curves.
  const out: { x: number; y: number }[] = []
  const tokens = s.d.trim().split(/[\s,]+/)
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    if (t === 'M' || t === 'L' || t === 'm' || t === 'l') {
      i++
      const x = Number(tokens[i++])
      const y = Number(tokens[i++])
      if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y })
    } else if (!isNaN(Number(t))) {
      const x = Number(t)
      const y = Number(tokens[++i])
      i++
      if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y })
    } else {
      i++
    }
  }
  return out
}

function buildUserMessage(body: RequestBody): string {
  if (body.mode === 'text') {
    return `Deur: ${body.doorWidth} × ${body.doorHeight} mm

Beschrijving van de glasverdeling:
"${body.text!.trim()}"

Geef de exacte verticale en horizontale lijnen.`
  }
  return `Deur: ${body.doorWidth} × ${body.doorHeight} mm

De medewerker heeft deze vrije strokes op het deurblad getekend
(coördinaten zijn in mm; oorsprong linksboven, x vanaf links, y vanaf BOVEN):

${summarizeStrokes(body.strokes!)}

LET OP: alle y-waarden hierboven zijn vanaf BOVEN. Bij teruggave moeten
horizontale lijnen worden uitgedrukt vanaf ONDER, dus: y_terug = ${body.doorHeight} - y_top.

Interpreteer de strokes als grid-lijnen. Negeer wiebelige of irrelevante strokes.`
}

// ─── Handler ────────────────────────────────────────────────────
export const handler: Handler = async (event: HandlerEvent) => {
  const reqOrigin = event.headers.origin || event.headers.Origin
  const origin = allowedOrigin(reqOrigin)
  if (event.httpMethod === 'OPTIONS') {
    if (!origin) return { statusCode: 403, headers: {}, body: '' }
    return { statusCode: 204, headers: corsHeaders(origin), body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' }, origin)
  }
  // CSRF-mitigatie: blokkeer requests van niet-toegestane origins.
  if (!origin) return json(403, { error: 'Origin not allowed' }, null)
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(500, { error: 'AI niet geconfigureerd op de server (ANTHROPIC_API_KEY ontbreekt)' }, origin)
  }

  // Hard auth: vereis een geldig Supabase JWT zodat alleen ingelogde
  // gebruikers (en geen anonieme bots) Anthropic-credits kunnen verbruiken.
  const auth = event.headers.authorization || event.headers.Authorization
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    return json(401, { error: 'Authorization header ontbreekt' }, origin)
  }
  const token = auth.slice(7).trim()
  const userId = await verifySupabaseJwt(token)
  if (!userId) {
    return json(401, { error: 'Ongeldige of verlopen sessie' }, origin)
  }

  // Soft rate-limit: per-user dagelijkse cap zodat 1 sales-user niet
  // ongelimiteerd Anthropic-credits kan opmaken. Limiet instelbaar via
  // Netlify env AI_DAILY_LIMIT (default 50/dag/user). We tellen vóór
  // het Anthropic-aanroepen op zodat 429-pieken op onze rekening blijven
  // en niet als billable-call doorgaan.
  const limit = Number(process.env.AI_DAILY_LIMIT) || 50
  const newCount = await incrementAiUsage(userId)
  if (newCount !== null && newCount > limit) {
    return json(429, {
      error: `Dagelijkse AI-limiet bereikt (${limit}). Probeer morgen opnieuw of vraag een verhoging aan je beheerder.`,
      limit,
      used: newCount,
    }, origin)
  }

  let body: unknown
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'Ongeldige JSON' }, origin)
  }
  const v = validate(body)
  if (!v.ok) return json(400, { error: v.error }, origin)

  const userMessage = buildUserMessage(v.body)

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      // Cache het systeemprompt — het is identiek voor elke request.
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: [SKETCH_TOOL],
      tool_choice: { type: 'tool', name: 'set_sketch_lines' },
      // Lage effort = snelle response voor deze parsing-taak.
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: userMessage }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    )
    if (!toolUse) {
      return json(502, { error: 'Model gaf geen tool-output' }, origin)
    }

    const result = toolUse.input as {
      verticalLines: { x: number }[]
      horizontalLines: { y: number }[]
      curves?: { d: string }[]
      explanation: string
    }

    // Server-side clamp — paranoia voor model dat buiten range gaat.
    const { doorWidth, doorHeight } = v.body
    const safeV = (result.verticalLines || []).slice(0, 5).map((l) => ({
      x: clamp(Math.round(l.x), 50, doorWidth - 50),
    }))
    const safeH = (result.horizontalLines || []).slice(0, 5).map((l) => ({
      y: clamp(Math.round(l.y), 50, doorHeight - 50),
    }))
    // Curves: alleen M..Q..-paden toelaten, geen rare characters, max
    // 200 chars zodat een model dat veel coördinaten genereert geen
    // client-DoS via een mega-polyline kan veroorzaken.
    const safeCurves = (result.curves || []).slice(0, 8)
      .map((c) => (c?.d ?? '').trim().slice(0, 200))
      .filter((d) => /^M\s+[-\d.\s]+Q\s+[-\d.\s]+$/i.test(d))
      .map((d) => ({ d }))

    return json(200, {
      verticalLines: safeV,
      horizontalLines: safeH,
      curves: safeCurves,
      explanation: result.explanation ?? '',
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_read: response.usage.cache_read_input_tokens ?? 0,
        cache_create: response.usage.cache_creation_input_tokens ?? 0,
      },
    }, origin)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (err instanceof Anthropic.RateLimitError) {
      return json(429, { error: 'Rate limit bereikt; probeer over enkele seconden opnieuw' }, origin)
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return json(500, { error: 'AI niet correct geconfigureerd (auth-fout)' }, origin)
    }
    return json(500, { error: `AI-aanroep mislukt: ${message}` }, origin)
  }
}

function allowedOrigin(reqOrigin: string | undefined): string | null {
  const allowList = [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean) as string[]
  if (reqOrigin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(reqOrigin)) return reqOrigin
  if (reqOrigin && allowList.includes(reqOrigin)) return reqOrigin
  return null
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * Verifieer een Supabase JWT door /auth/v1/user te raadplegen. Geen JWT-
 * library nodig — Supabase doet zelf de cryptografische validatie en
 * retourneert 401 voor verlopen of vervalste tokens.
 *
 * Returnt het user-id zodat de caller per-user kan rate-limiten;
 * null = ongeldige of verlopen token.
 */
async function verifySupabaseJwt(token: string): Promise<string | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.error('verifySupabaseJwt: SUPABASE_URL of SUPABASE_ANON_KEY ontbreekt op de server')
    return null
  }
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) return null
    const body = (await res.json()) as { id?: string }
    return body.id ?? null
  } catch (err) {
    console.error('verifySupabaseJwt fetch failed:', err)
    return null
  }
}

/**
 * Atomische +1 op de ai_usage-teller. Retourneert de NIEUWE count voor
 * vandaag, of null bij een server-fout. Gebruikt de service-role key
 * (niet de anon key) zodat de RPC-call de increment_ai_usage functie
 * mag aanroepen ondanks de revoke-policy.
 */
async function incrementAiUsage(userId: string): Promise<number | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('incrementAiUsage: SUPABASE_SERVICE_ROLE_KEY ontbreekt')
    return null
  }
  try {
    const res = await fetch(`${url}/rest/v1/rpc/increment_ai_usage`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_user_id: userId }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('incrementAiUsage RPC failed:', res.status, text)
      return null
    }
    const rows = (await res.json()) as Array<{ new_count?: number }>
    return rows[0]?.new_count ?? null
  } catch (err) {
    console.error('incrementAiUsage fetch failed:', err)
    return null
  }
}

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin ?? 'null',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

function json(statusCode: number, body: unknown, origin: string | null) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    body: JSON.stringify(body),
  }
}
