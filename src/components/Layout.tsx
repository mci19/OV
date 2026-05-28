import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, Users, Briefcase, Package, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabaseConfigured } from '../lib/supabase'

const NAV = [
  { to: '/', icon: Home, label: 'Overzicht', end: true },
  { to: '/opportunities', icon: Briefcase, label: 'Opportunities' },
  { to: '/customers', icon: Users, label: 'Klanten' },
  { to: '/products', icon: Package, label: 'Catalogus' },
]

export function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(false)

  async function onLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-paper overflow-hidden">
      {!supabaseConfigured ? <SetupBanner /> : null}

      <div className="flex-1 grid lg:grid-cols-[220px_1fr] min-h-0" style={{ gridTemplateRows: 'minmax(0, 1fr)' }}>
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col border-r border-soft-2 bg-paper">
          <SidebarContent onLogout={onLogout} userEmail={user?.email ?? ''} />
        </aside>

        {/* Mobile top bar */}
        <div className="lg:hidden border-b border-soft-2 bg-paper/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-3 py-2">
          <button className="btn btn-ghost btn-icon" onClick={() => setDrawer(true)} aria-label="Menu">
            <Menu size={20} />
          </button>
          <div className="brand-mark text-sm">MY DOORS</div>
          <div className="w-10" />
        </div>

        {/* Mobile drawer */}
        {drawer ? (
          <div className="lg:hidden fixed inset-0 z-30 bg-black/30" onClick={() => setDrawer(false)}>
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-paper border-r border-soft-2 flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-3 border-b border-soft-2">
                <div className="brand-mark text-sm">MY DOORS</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setDrawer(false)} aria-label="Sluit">
                  <X size={20} />
                </button>
              </div>
              <SidebarContent onLogout={onLogout} userEmail={user?.email ?? ''} onNavigate={() => setDrawer(false)} />
            </aside>
          </div>
        ) : null}

        <main className="overflow-y-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ onLogout, userEmail, onNavigate }: { onLogout: () => void; userEmail: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="p-5 hidden lg:block">
        <div className="brand-mark text-lg leading-tight">MY DOORS</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[--color-muted] mt-1">CRM · v4</div>
      </div>
      <nav className="flex-1 flex flex-col py-2">
        {NAV.map((n) => {
          const Icon = n.icon
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className="nav-link"
              onClick={onNavigate}
            >
              {({ isActive }) => (
                <span className="flex items-center gap-3" data-active={isActive || undefined}>
                  <Icon size={18} />
                  <span style={{ fontWeight: isActive ? 600 : 400 }}>{n.label}</span>
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-soft-2 p-3">
        <div className="font-mono text-[11px] text-[--color-muted] truncate mb-2">{userEmail}</div>
        <button className="btn btn-ghost w-full justify-start" onClick={onLogout}>
          <LogOut size={16} /> Uitloggen
        </button>
      </div>
    </>
  )
}

function SetupBanner() {
  return (
    <div className="no-print bg-accent text-paper text-center py-2 px-4 font-mono text-xs">
      Supabase env vars ontbreken — zet <code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code> of Netlify.
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex gap-2 flex-wrap">{actions}</div> : null}
    </div>
  )
}

export function PageContainer({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  return <div className={padded ? 'p-4 sm:p-8 max-w-6xl mx-auto w-full' : ''}>{children}</div>
}
