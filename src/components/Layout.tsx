import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, Users, Briefcase, Package, Settings, LogOut, Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabaseConfigured } from '../lib/supabase'
import { useT, type TranslationKey } from '../lib/i18n'
import { LanguageSwitcher } from './LanguageSwitcher'

const NAV: { to: string; icon: typeof Home; labelKey: TranslationKey; end?: boolean }[] = [
  { to: '/', icon: Home, labelKey: 'nav.home', end: true },
  { to: '/opportunities', icon: Briefcase, labelKey: 'nav.opportunities' },
  { to: '/customers', icon: Users, labelKey: 'nav.customers' },
  { to: '/products', icon: Package, labelKey: 'nav.products' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

const COLLAPSE_KEY = 'mydoors:sidebar:collapsed'

export function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { t } = useT()
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch { /* */ }
  }, [collapsed])

  async function onLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-paper overflow-hidden">
      {!supabaseConfigured ? <SetupBanner /> : null}

      <div
        className="flex-1 grid lg:grid-cols-[var(--sidebar-w)_1fr] min-h-0 transition-[grid-template-columns] duration-200 ease-out"
        style={{
          gridTemplateRows: 'minmax(0, 1fr)',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ['--sidebar-w' as any]: collapsed ? '76px' : '220px',
        }}
      >
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col border-r border-soft-2 bg-paper relative">
          <SidebarContent
            onLogout={onLogout}
            userEmail={user?.email ?? ''}
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
          />
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
                <button className="btn btn-ghost btn-icon" onClick={() => setDrawer(false)} aria-label={t('common.close')}>
                  <X size={20} />
                </button>
              </div>
              <SidebarContent
                onLogout={onLogout}
                userEmail={user?.email ?? ''}
                collapsed={false}
                onNavigate={() => setDrawer(false)}
              />
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

interface SidebarProps {
  onLogout: () => void
  userEmail: string
  collapsed: boolean
  onToggle?: () => void
  onNavigate?: () => void
}

function SidebarContent({ onLogout, userEmail, collapsed, onToggle, onNavigate }: SidebarProps) {
  const { t } = useT()
  return (
    <>
      {/* Brand + collapse-knop */}
      <div className={`hidden lg:flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 pt-4 pb-2`}>
        {collapsed ? (
          <div
            className="w-12 h-12 rounded-lg grid place-items-center"
            style={{ background: 'linear-gradient(135deg, var(--color-brand) 0%, #2A6664 100%)', boxShadow: 'var(--shadow-sm)' }}
            title="MY DOORS"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FAF8F3" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="1" />
              <rect x="7.5" y="4" width="9" height="16" rx="0.5" opacity="0.5" />
              <line x1="12" y1="4" x2="12" y2="20" opacity="0.5" />
              <line x1="7.5" y1="14" x2="16.5" y2="14" opacity="0.5" />
              <circle cx="16" cy="12" r="0.8" fill="#E85D04" stroke="none" />
            </svg>
          </div>
        ) : (
          <div className="pl-2">
            <div className="brand-mark text-lg leading-tight">MY DOORS</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[--color-muted] mt-1">CRM · v4</div>
          </div>
        )}
      </div>

      {/* Toggle-knop (alleen desktop) */}
      {onToggle ? (
        <button
          type="button"
          className="hidden lg:flex absolute -right-3 top-7 w-6 h-6 items-center justify-center rounded-full bg-white border border-soft-2 hover:border-ink shadow-sm z-10"
          onClick={onToggle}
          aria-label={collapsed ? 'Open sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
        </button>
      ) : null}

      {/* Nav-items */}
      <nav className={`flex-1 flex flex-col ${collapsed ? 'py-3 gap-1' : 'py-2'}`}>
        {NAV.map((n) => {
          const Icon = n.icon
          const label = t(n.labelKey)
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={collapsed ? 'nav-icon-button' : 'nav-link'}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
            >
              {({ isActive }) => (
                collapsed ? (
                  <span className="flex items-center justify-center" data-active={isActive || undefined}>
                    <Icon size={22} strokeWidth={isActive ? 2.2 : 1.7} />
                  </span>
                ) : (
                  <span className="flex items-center gap-3" data-active={isActive || undefined}>
                    <Icon size={18} />
                    <span style={{ fontWeight: isActive ? 600 : 400 }}>{label}</span>
                  </span>
                )
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Language switcher + user + logout */}
      <div className={`border-t border-soft-2 ${collapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3 space-y-2'}`}>
        <LanguageSwitcher compact={collapsed} />
        {!collapsed ? (
          <>
            <div className="font-mono text-[11px] text-[--color-muted] truncate">{userEmail}</div>
            <button className="btn btn-ghost w-full justify-start" onClick={onLogout}>
              <LogOut size={16} /> {t('nav.logout')}
            </button>
          </>
        ) : (
          <button
            className="nav-icon-button"
            onClick={onLogout}
            title={t('nav.logout')}
            aria-label={t('nav.logout')}
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </>
  )
}

function SetupBanner() {
  return (
    <div className="no-print bg-accent text-paper text-center py-2 px-4 font-mono text-xs">
      Supabase env vars missing — set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code> or Netlify.
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
