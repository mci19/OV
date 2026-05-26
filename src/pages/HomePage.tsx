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
        <Stat label="Open opportunities" value={String(open.length)} />
        <Stat label="Open waarde" value={formatEur(openValue)} />
        <Stat label="Gewonnen waarde" value={formatEur(wonValue)} />
        <Stat label="Klanten" value={String((cust.data ?? []).length)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Link to="/opportunities" className="card card-interactive flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase size={20} />
            <div>
              <div className="font-mono font-bold text-sm">Opportunities</div>
              <div className="text-xs text-[--color-muted]">Pipeline beheren</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-[--color-muted]" />
        </Link>
        <Link to="/customers" className="card card-interactive flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={20} />
            <div>
              <div className="font-mono font-bold text-sm">Klanten</div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-[10px] uppercase tracking-wider text-[--color-muted] font-mono">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

export function EmptyState({ title, subtitle, cta }: { title: string; subtitle?: string; cta?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-soft-2 p-10 text-center my-4">
      <div className="font-mono font-bold mb-1">{title}</div>
      {subtitle ? <div className="text-sm text-[--color-muted] mb-4">{subtitle}</div> : null}
      {cta}
    </div>
  )
}

