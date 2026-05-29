import type { Handler, HandlerEvent } from '@netlify/functions'

// ─── Endpoint admin-only: create user ─────────────────────────────
// Verifieert dat de caller een geldige admin-JWT heeft, en gebruikt dan
// de SERVICE-ROLE-key (server-side only!) om via Supabase admin API een
// nieuwe gebruiker aan te maken. handle_new_user-trigger maakt
// automatisch het profile-record aan.

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' }
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

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
    return json(401, { error: 'Authorization header ontbreekt' })
  }
  const token = auth.slice(7).trim()

  // 2. Verifieer JWT + haal user-id op
  const userRes = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!userRes.ok) return json(401, { error: 'Ongeldige of verlopen sessie' })
  const callerUser = (await userRes.json()) as { id?: string }
  if (!callerUser.id) return json(401, { error: 'Geen user-id in token' })

  // 3. Check admin-rol via service-role (omzeilt RLS)
  const profileRes = await fetch(`${url}/rest/v1/profiles?id=eq.${callerUser.id}&select=role`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  if (!profileRes.ok) return json(500, { error: 'Kon profiel niet ophalen' })
  const profiles = (await profileRes.json()) as Array<{ role: string }>
  if (profiles[0]?.role !== 'admin') {
    return json(403, { error: 'Alleen admins kunnen gebruikers aanmaken' })
  }

  // 4. Parse + valideer body
  let body: { email?: string; full_name?: string; role?: 'admin' | 'sales'; password?: string }
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'Ongeldige JSON' })
  }
  const email = (body.email ?? '').trim().toLowerCase()
  const fullName = (body.full_name ?? '').trim()
  const role = body.role === 'admin' ? 'admin' : 'sales'
  const password = body.password && body.password.length >= 8
    ? body.password
    : generatePassword()

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(400, { error: 'Ongeldig e-mailadres' })
  }
  if (!fullName) {
    return json(400, { error: 'Naam is verplicht' })
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
    })
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

  return json(200, {
    id: created.id,
    email: created.email,
    password, // Geef het wachtwoord terug zodat de admin het kan delen
    generated_password: !body.password || body.password.length < 8,
  })
}

function generatePassword(): string {
  // 12 chars uit alphanumeric + symbols, voldoende voor Supabase default policy
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!#$%&*-'
  let out = ''
  for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(body),
  }
}
