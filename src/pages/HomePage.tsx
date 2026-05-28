import { Link } from 'react-router-dom'
import { Briefcase, Users, ChevronRight } from 'lucide-react'
import { PageContainer, PageHeader } from '../components/Layout'
import { useCustomers, useOpportunities } from '../lib/queries'
import { STAGE_LABELS } from '../lib/db'
import { formatEur, relativeTimeNl } from '../lib/format'

export { formatEur } from '../lib/format'

export function HomePage() {
  const opps = useOpportunities()
  const cust = useCustomers()

  const all = opps.data ?? []
  const open = all.filter((o) => o.stage !== 'won' && o.stage !== 'lost')
  const wonValue = all.filter((o) => o.stage === 'won').reduce((s, o) => s + (o.expected_value_cents || 0), 0)
  const openValue = open.reduce((s, o) => s + (o.expected_value_cents || 0), 0)
  const recent = all.slice(0, 6)

  return (
    <PageContainer>
      <PageHeader
        title="Overzicht"
        subtitle="Recente activiteit en pipeline-status"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Stat label="Open opportunities" value={String(open.length)} tone="brand" />
        <Stat label="Open waarde" value={formatEur(openValue)} tone="accent" />
        <Stat label="Gewonnen waarde" value={formatEur(wonValue)} tone="success" />
        <Stat label="Klanten" value={String((cust.data ?? []).length)} tone="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Link to="/opportunities" className="card card-interactive card-brand flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md grid place-items-center" style={{ background: 'var(--color-brand-tint)', color: 'var(--color-brand)' }}>
              <Briefcase size={20} />
            </div>
            <div>
              <div className="font-bold text-sm">Opportunities</div>
              <div className="text-xs text-[--color-muted]">Pipeline beheren</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-[--color-muted]" />
        </Link>
        <Link to="/customers" className="card card-interactive card-accent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md grid place-items-center" style={{ background: 'var(--color-accent-tint)', color: 'var(--color-accent)' }}>
              <Users size={20} />
            </div>
            <div>
              <div className="font-bold text-sm">Klanten</div>
              <div className="text-xs text-[--color-muted]">Klantenbestand</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-[--color-muted]" />
        </Link>
      </div>

      <h2 className="section-h mt-10">Recente opportunities</h2>
      {opps.isLoading ? <div className="text-[--color-muted] font-mono text-sm">Laden…</div> : null}
      {opps.error ? <div className="text-accent font-mono text-sm">{(opps.error as Error).message}</div> : null}
      {recent.length === 0 && !opps.isLoading ? (
        <EmptyState
          title="Nog geen opportunities"
          subtitle="Voeg een klant toe en start een opportunity om hier overzicht te zien."
          cta={<Link to="/opportunities/new" className="btn btn-primary">+ Nieuwe opportunity</Link>}
        />
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recent.map((o) => (
          <Link key={o.id} to={`/opportunities/${o.id}`} className="card card-interactive">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="font-bold text-sm truncate">{o.title}</div>
              <span className="stage-pill" data-stage={o.stage}>{STAGE_LABELS[o.stage]}</span>
            </div>
            <div className="text-xs text-[--color-muted] truncate">{o.customer_name ?? '—'}</div>
            <div className="flex items-end justify-between mt-3 gap-2">
              {o.expected_value_cents ? (
                <div className="font-mono text-sm tabular-nums">{formatEur(o.expected_value_cents)}</div>
              ) : <div />}
              <div className="font-mono text-[10px] text-[--color-muted]">{relativeTimeNl(o.updated_at)}</div>
            </div>
          </Link>
        ))}
      </div>
    </PageContainer>
  )
}

type StatTone = 'brand' | 'accent' | 'success' | 'info'

function Stat({ label, value, tone = 'brand' }: { label: string; value: string; tone?: StatTone }) {
  return (
    <div className="stat" data-tone={tone}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

export function EmptyState({ title, subtitle, cta }: { title: string; subtitle?: string; cta?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-soft-2 p-10 text-center my-4 rounded-lg bg-white/40">
      <div className="font-bold mb-1">{title}</div>
      {subtitle ? <div className="text-sm text-[--color-muted] mb-4">{subtitle}</div> : null}
      {cta}
    </div>
  )
}

