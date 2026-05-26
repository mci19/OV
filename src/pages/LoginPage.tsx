import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Field } from '../components/Field'
import { supabaseConfigured } from '../lib/supabase'

export function LoginPage() {
  const { user, signIn, signUp, loading } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="min-h-[100dvh] grid place-items-center font-mono text-sm text-[--color-muted]">Laden…</div>
  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const fn = mode === 'signin' ? signIn(email, password) : signUp(email, password, fullName)
    const { error } = await fn
    setBusy(false)
    if (error) {
      setError(error)
    } else if (mode === 'signin') {
      navigate('/')
    } else {
      setError(null)
      setMode('signin')
      setError('Account aangemaakt — log nu in.')
    }
  }

  return (
    <div className="min-h-[100dvh] grid place-items-center bg-paper p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="font-mono text-2xl font-bold tracking-widest">MY DOORS</div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-[--color-muted] mt-1">CRM</div>
        </div>

        {!supabaseConfigured ? (
          <div className="mb-4 p-3 border border-accent bg-paper text-accent font-mono text-xs">
            Supabase niet geconfigureerd. Zet <code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_ANON_KEY</code>.
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'signup' ? (
            <Field
              label="Volledige naam"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          ) : null}
          <Field
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
          <Field
            label="Wachtwoord"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={8}
          />

          {error ? (
            <div className="text-accent font-mono text-xs">{error}</div>
          ) : null}

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
            {busy ? '…' : mode === 'signin' ? 'Inloggen' : 'Account aanmaken'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
          >
            {mode === 'signin' ? 'Nieuw account aanmaken' : 'Heb al een account — inloggen'}
          </button>
        </div>
      </div>
    </div>
  )
}
