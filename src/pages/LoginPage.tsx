import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Field } from '../components/Field'
import { supabaseConfigured } from '../lib/supabase'
import { LANGUAGES, useT, type Lang } from '../lib/i18n'

// Self-signup is uitgeschakeld voor productie — accounts worden door de
// admin aangemaakt in de Supabase dashboard om tenant-leakage te
// voorkomen. Zet deze flag op true voor lokale ontwikkeling.
const SELF_SIGNUP_ENABLED = import.meta.env.VITE_ALLOW_SIGNUP === 'true'

export function LoginPage() {
  const { user, signIn, signUp, loading } = useAuth()
  const navigate = useNavigate()
  const { t, lang, setLang } = useT()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="min-h-[100dvh] grid place-items-center font-mono text-sm text-[--color-muted]">{t('common.loading')}</div>
  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    const fn = mode === 'signin' ? signIn(email, password) : signUp(email, password, fullName)
    const { error } = await fn
    setBusy(false)
    if (error) {
      setError(error)
    } else if (mode === 'signin') {
      navigate('/')
    } else {
      setMode('signin')
      setInfo(t('login.accountCreated'))
    }
  }

  return (
    <div className="min-h-[100dvh] grid place-items-center p-4 relative">
      {/* Taal-toggle rechtsboven — duidelijk zichtbaar als knoppen-paar
          i.p.v. dropdown, zodat anonieme bezoekers meteen zien dat de
          UI in NL én EN beschikbaar is. */}
      <div className="absolute top-4 right-4 flex gap-1 items-center bg-paper/70 backdrop-blur border border-soft-2 rounded-lg p-1 shadow-sm">
        {LANGUAGES.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLang(l.value as Lang)}
            className="px-3 py-1.5 rounded font-mono text-[11px] font-bold uppercase tracking-wider transition-colors"
            style={{
              background: lang === l.value ? 'var(--color-ink)' : 'transparent',
              color: lang === l.value ? 'var(--color-paper)' : 'var(--color-muted)',
            }}
            aria-label={l.label}
            title={l.label}
          >
            <span className="mr-1.5">{l.flag}</span>
            {l.value.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-xl grid place-items-center" style={{ background: 'linear-gradient(135deg, var(--color-brand) 0%, #2A6664 100%)', boxShadow: 'var(--shadow-lg)' }}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#FAF8F3" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="1"/>
                <rect x="7.5" y="4" width="9" height="16" rx="0.5" opacity="0.5"/>
                <line x1="12" y1="4" x2="12" y2="20" opacity="0.5"/>
                <line x1="7.5" y1="14" x2="16.5" y2="14" opacity="0.5"/>
                <circle cx="16" cy="12" r="0.8" fill="#E85D04" stroke="none"/>
              </svg>
            </div>
          </div>
          <div className="brand-mark text-3xl">{t('login.title')}</div>
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[--color-muted] mt-2">{t('login.subtitle')}</div>
        </div>

        <div className="card p-7">

        {!supabaseConfigured ? (
          <div className="mb-4 p-3 border border-accent bg-[--color-accent-soft] text-accent text-xs rounded-md">
            {t('login.supabaseNotConfigured')}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'signup' ? (
            <Field
              label={t('login.fullName')}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          ) : null}
          <Field
            label={t('login.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
          <Field
            label={t('login.password')}
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
          {info ? (
            <div className="font-mono text-xs" style={{ color: '#1F4F4D' }}>{info}</div>
          ) : null}

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
            {busy ? '…' : mode === 'signin' ? t('login.signin') : t('login.signup')}
          </button>
        </form>

        {SELF_SIGNUP_ENABLED ? (
          <div className="mt-5 text-center">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null) }}
            >
              {mode === 'signin' ? t('login.toSignup') : t('login.toSignin')}
            </button>
          </div>
        ) : (
          <div className="mt-5 text-center font-mono text-[11px] text-[--color-muted]">
            {t('login.contactAdmin')}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
