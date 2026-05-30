import type { Handler, HandlerEvent } from '@netlify/functions'
import { randomBytes } from 'node:crypto'

// Toegestane origins: alleen de productie- + preview-deploy van Netlify.
// process.env.URL = primaire deploy URL (Netlify injecteert dit automatisch).
// process.env.DEPLOY_PRIME_URL = branch/preview deploys.
// Bij lokale dev (netlify dev) staat URL meestal op http://localhost:8888.
function allowedOrigin(reqOrigin: string | undefined): string | null {
  const allowList = [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean) as string[]
  // Lokaal dev-comfort: sta localhost / 127.0.0.1 toe ongeacht poort
  if (reqOrigin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(reqOrigin)) return reqOrigin
  if (reqOrigin && allowList.includes(reqOrigin)) return reqOrigin
  return null
}

// ─── Endpoint admin-only: create user ─────────────────────────────
// Verifieert dat de caller een geldige admin-JWT heeft, en gebruikt dan
// de SERVICE-ROLE-key (server-side only!) om via Supabase admin API een
// nieuwe gebruiker aan te maken. handle_new_user-trigger maakt
// automatisch het profile-record aan.

export const handler: Handler = async (event: HandlerEvent) => {
  const reqOrigin = event.headers.origin || event.headers.Origin
  const origin = allowedOrigin(reqOrigin)
  if (event.httpMethod === 'OPTIONS') {
    if (!origin) return { statusCode: 403, headers: {}, body: '' }
    return { statusCode: 204, headers: corsHeaders(origin), body: '' }
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' }, origin)
  // Strikte same-origin-check op state-changing requests
  if (!origin) return json(403, { error: 'Origin not allowed' }, null)

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) {
    return json(500, {
      error: 'Server niet geconfigureerd — zet SUPABASE_URL, SUPABASE_ANON_KEY en SUPABASE_SERVICE_ROLE_KEY in Netlify env',
    })
  }

  // 1. Auth: bearer JWT vereist
  const auth = event.headers.authorization || event.headers.Authorization
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    return json(401, { error: 'Authorization header ontbreekt' }, origin)
  }
  const token = auth.slice(7).trim()

  // 2. Verifieer JWT + haal user-id op
  const userRes = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!userRes.ok) return json(401, { error: 'Ongeldige of verlopen sessie' }, origin)
  const callerUser = (await userRes.json()) as { id?: string }
  if (!callerUser.id) return json(401, { error: 'Geen user-id in token' }, origin)

  // 3. Check admin-rol via service-role (omzeilt RLS)
  const profileRes = await fetch(`${url}/rest/v1/profiles?id=eq.${callerUser.id}&select=role`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  if (!profileRes.ok) return json(500, { error: 'Kon profiel niet ophalen' }, origin)
  const profiles = (await profileRes.json()) as Array<{ role: string }>
  if (profiles[0]?.role !== 'admin') {
    return json(403, { error: 'Alleen admins kunnen gebruikers aanmaken' }, origin)
  }

  // 4. Parse + valideer body
  let body: { email?: string; full_name?: string; role?: 'admin' | 'sales'; password?: string }
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'Ongeldige JSON' }, origin)
  }
  const email = (body.email ?? '').trim().toLowerCase()
  const fullName = (body.full_name ?? '').trim()
  const role = body.role === 'admin' ? 'admin' : 'sales'
  const password = body.password && body.password.length >= 8
    ? body.password
    : generatePassword()

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(400, { error: 'Ongeldig e-mailadres' }, origin)
  }
  if (!fullName) {
    return json(400, { error: 'Naam is verplicht' }, origin)
  }

  // 5. Create via Supabase admin API (service-role)
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true, // niet wachten op confirm-mail; admin maakt aan
      user_metadata: { full_name: fullName },
    }),
  })
  if (!createRes.ok) {
    const err = await createRes.text()
    return json(createRes.status, {
      error: `Gebruiker aanmaken mislukt: ${err.slice(0, 300)}`,
    }, origin)
  }
  const created = (await createRes.json()) as { id?: string; email?: string }

  // 6. Zet role als geen 'sales' (signup-trigger default = sales)
  if (role === 'admin' && created.id) {
    await fetch(`${url}/rest/v1/profiles?id=eq.${created.id}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ role: 'admin' }),
    })
  }

  // Genereer een password-reset-link via de admin API. De caller toont
  // die link aan de nieuwe gebruiker (kopieer-knop in de UI); we sturen
  // GEEN plaintext wachtwoord meer terug in de response zodat hij niet
  // in netwerk-logs / Sentry / Netlify access logs belandt.
  let reset_link: string | null = null
  if (created.id) {
    try {
      const linkRes = await fetch(`${url}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'recovery', email }),
      })
      if (linkRes.ok) {
        const lj = (await linkRes.json()) as { action_link?: string }
        reset_link = lj.action_link ?? null
      }
    } catch {
      // niet-fataal; de admin kan via dashboard alsnog een reset-link sturen
    }
  }

  return json(200, {
    id: created.id,
    email: created.email,
    reset_link,
    generated_password: !body.password || body.password.length < 8,
  }, origin)
}

function generatePassword(): string {
  // CSPRNG via node:crypto (Math.random is voorspelbaar genoeg om een
  // probleem te zijn als dit het enige credential is). 16 random bytes →
  // base64url → 22 char string, voldoende entropie + Supabase-policy.
  return randomBytes(16).toString('base64url')
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
