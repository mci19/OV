import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = !!(url && anon)

// Init met dummy waarden als env vars ontbreken, zodat de import niet crasht
// in dev zonder .env. De UI zal een setup-banner tonen.
// Typing: queries.ts wrapt elke call met expliciete return-types — daar
// gebeurt de type-veiligheid, niet via Database-generic.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anon || 'placeholder-key',
)
