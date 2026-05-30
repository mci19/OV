import { Link } from 'react-router-dom'
import { Briefcase, Users, ChevronRight, TrendingUp } from 'lucide-react'
import { PageContainer, PageHeader } from '../components/Layout'
import { useCustomers, useOpportunities } from '../lib/queries'
import { formatEur, relativeTime } from '../lib/format'
import { useT, stageLabel } from '../lib/i18n'
import type { OpportunityStage } from '../lib/db'

export { formatEur } from '../lib/format'

const STAGES: OpportunityStage[] = ['lead', 'meeting', 'quote_sent', 'won', 'lost']

export function HomePage() {
  const { t, lang } = useT()
  const opps = useOpportunities()
  const cust = useCustomers()

  const all = opps.data ?? []
  const open = all.filter((o) => o.stage !== 'won' && o.stage !== 'lost')
  const wonValue = all.filter((o) => o.stage === 'won').reduce((s, o) => s + (o.expected_value_cents || 0), 0)
  const openValue = open.reduce((s, o) => s + (o.expected_value_cents || 0), 0)
  const recent = [...all].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6)

  // Pipeline counts + value per stage voor de pipeline-funnel.
  const byStage = STAGES.map((s) => {
    const items = all.filter((o) => o.stage === s)
    return {
      stage: s,
      count: items.length,
      value: items.reduce((sum, o) => sum + (o.expected_value_cents || 0), 0),
    }
  })
  const maxCount = Math.max(1, ...byStage.map((b) => b.count))

  return (
    <PageContainer>
      <PageHeader
        title={t('home.title')}
        subtitle={t('home.subtitle')}
      />

      {/* Rij 1 — KPI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label={t('opps.title')} value={String(open.length)} tone="brand" />
        <Stat label={t('home.openValue')} value={formatEur(openValue, lang)} tone="accent" />
        <Stat label={t('home.wonThisMonth')} value={formatEur(wonValue, lang)} tone="success" />
        <Stat label={t('customers.title')} value={String((cust.data ?? []).length)} tone="info" />
      </div>

      {/* Rij 2 — Pipeline funnel (links) + Recent activity (rechts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <section className="card !p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-[--color-muted]">{t('home.pipeline')}</h2>
            <TrendingUp size={14} className="text-[--color-muted]" />
          </div>
          <div className="space-y-2">
            {byStage.map((b) => (
              <Link
                key={b.stage}
                to={`/opportunities?stage=${b.stage}`}
                className="flex items-center gap-2 group"
              >
                <div className="w-24 shrink-0">
                  <span className="stage-pill" data-stage={b.stage}>{stageLabel(b.stage, lang)}</span>
                </div>
                <div className="flex-1 h-6 bg-soft rounded overflow-hidden relative">
                  <div
                    className="h-full transition-all group-hover:opacity-80"
                    style={{
                      width: `${(b.count / maxCount) * 100}%`,
                      background: stageBarColor(b.stage),
                    }}
                  />
                  <div className="absolute inset-0 flex items-center px-2 font-mono text-[11px] tabular-nums">
                    <span className="font-bold">{b.count}</span>
                    {b.value > 0 ? (
                      <span className="ml-2 text-[--color-muted]">· {formatEur(b.value, lang)}</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="card !p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-[--color-muted]">{t('home.recentActivity')}</h2>
            <Link to="/opportunities" className="font-mono text-[11px] text-[--color-muted] hover:text-ink">
              {t('home.viewAll')} →
            </Link>
          </div>
          {opps.isLoading ? <div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div> : null}
          {recent.length === 0 && !opps.isLoading ? (
            <div className="text-[--color-muted] font-mono text-sm py-4">
              {t('opps.empty.title')}
            </div>
          ) : null}
          <ol className="space-y-2">
            {recent.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link
                  to={`/opportunities/${o.id}`}
                  className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded hover:bg-soft transition-colors"
                >
                  <span className="stage-pill" data-stage={o.stage}>{stageLabel(o.stage, lang)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{o.title}</div>
                    <div className="text-xs text-[--color-muted] truncate">{o.customer_name ?? '—'}</div>
                  </div>
                  <div className="font-mono text-[10px] text-[--color-muted] shrink-0">
                    {relativeTime(o.updated_at, lang)}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Rij 3 — quick-action cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <Link to="/opportunities" className="card card-interactive card-brand flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md grid place-items-center" style={{ background: 'var(--color-brand-tint)', color: 'var(--color-brand)' }}>
              <Briefcase size={20} />
            </div>
            <div>
              <div className="font-bold text-sm">{t('opps.title')}</div>
              <div className="text-xs text-[--color-muted]">{t('opps.subtitle')}</div>
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
              <div className="font-bold text-sm">{t('customers.title')}</div>
              <div className="text-xs text-[--color-muted]">{t('customers.subtitle')}</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-[--color-muted]" />
        </Link>
      </div>

      {/* Rij 4 — recent opportunities (cards) */}
      <h2 className="section-h">{t('home.recentOpportunities')}</h2>
      {opps.error ? <div className="text-accent font-mono text-sm">{(opps.error as Error).message}</div> : null}
      {recent.length === 0 && !opps.isLoading ? (
        <EmptyState
          title={t('opps.empty.title')}
          subtitle={t('opps.empty.subtitle')}
          cta={<Link to="/opportunities?new=1" className="btn btn-primary">{t('opps.empty.cta')}</Link>}
        />
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recent.map((o) => (
          <Link key={o.id} to={`/opportunities/${o.id}`} className="card card-interactive">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="font-bold text-sm truncate">{o.title}</div>
              <span className="stage-pill" data-stage={o.stage}>{stageLabel(o.stage, lang)}</span>
            </div>
            <div className="text-xs text-[--color-muted] truncate">{o.customer_name ?? '—'}</div>
            <div className="flex items-end justify-between mt-3 gap-2">
              {o.expected_value_cents ? (
                <div className="font-mono text-sm tabular-nums">{formatEur(o.expected_value_cents, lang)}</div>
              ) : <div />}
              <div className="font-mono text-[10px] text-[--color-muted]">{relativeTime(o.updated_at, lang)}</div>
            </div>
          </Link>
        ))}
      </div>
    </PageContainer>
  )
}

function stageBarColor(s: OpportunityStage): string {
  switch (s) {
    case 'lead':       return 'var(--color-brand-tint)'
    case 'meeting':    return 'var(--color-info-tint, #BBD9E0)'
    case 'quote_sent': return 'var(--color-accent-tint)'
    case 'won':        return 'var(--color-success-tint, #BFE3C7)'
    case 'lost':       return '#E0DCD3'
  }
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

