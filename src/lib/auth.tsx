import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type UserRole = 'admin' | 'sales'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  created_at: string
}

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>
  /** Vraag een password-reset email aan voor `email`. Supabase verstuurt
   *  een magic link. */
  resetPassword: (email: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  /** Forceer een refresh van het profiel — bv. na rol-wijziging door admin. */
  refreshProfile: () => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return null
    // Defensieve cast: role kan in theorie een onbekende string zijn als
    // de DB-enum is uitgebreid; we degraderen naar 'sales' in dat geval.
    const role: UserRole = data.role === 'admin' ? 'admin' : 'sales'
    return { ...(data as Omit<Profile, 'role'>), role }
  }

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        const p = await loadProfile(data.session.user.id)
        if (mounted) setProfile(p)
      }
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      if (!mounted) return
      setSession(s)
      if (s?.user) {
        const p = await loadProfile(s.user.id)
        if (mounted) setProfile(p)
      } else {
        if (mounted) setProfile(null)
      }
      setLoading(false)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn: AuthState['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message }
  }
  const signUp: AuthState['signUp'] = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error: error?.message }
  }
  const resetPassword: AuthState['resetPassword'] = async (email) => {
    // redirectTo wijst naar /login zodat we na de magic-link gewoon
    // terug op de inlog-flow landen. Supabase voegt automatisch het
    // recovery-token toe aan de URL.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    return { error: error?.message }
  }
  const signOut: AuthState['signOut'] = async () => {
    await supabase.auth.signOut()
  }
  const refreshProfile: AuthState['refreshProfile'] = async () => {
    if (!session?.user) return
    const p = await loadProfile(session.user.id)
    setProfile(p)
  }

  const value: AuthState = {
    user: session?.user ?? null,
    session,
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
    signIn,
    signUp,
    resetPassword,
    signOut,
    refreshProfile,
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(AuthCtx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
