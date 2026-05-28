import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List } from 'lucide-react'
import { PageContainer, PageHeader } from '../components/Layout'
import { Chips, Field, FieldRow, SelectField, TextAreaField } from '../components/Field'
import { Dialog } from '../components/Dialog'
import { EmptyState } from './HomePage'
import { formatEur, relativeTimeNl } from '../lib/format'
import { useCustomers, useOpportunities, useUpsertOpportunity } from '../lib/queries'
import { STAGE_LABELS, STAGE_ORDER, type OpportunityStage } from '../lib/db'
import { KanbanView } from './KanbanView'

type ViewMode = 'list' | 'kanban'

const VIEW_KEY = 'mydoors:oppview:v1'

export function OpportunitiesPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<'all' | OpportunityStage>(
    (params.get('stage') as OpportunityStage) || 'all',
  )
  const [view, setView] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_KEY) as ViewMode) || 'kanban' } catch { return 'kanban' }
  })
  const [editing, setEditing] = useState<{ customer_id?: string } | null>(null)
  const { data: opps = [], isLoading, error } = useOpportunities()

  // Auto-open editor when navigated to with ?new=1 (typisch vanaf klant-detail)
  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing({ customer_id: params.get('customer_id') ?? undefined })
      const next = new URLSearchParams(params)
      next.delete('new')
      next.delete('customer_id')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setViewMode(m: ViewMode) {
    setView(m)
    try { localStorage.setItem(VIEW_KEY, m) } catch { /* */ }
  }

  const filtered = useMemo(() => {
    let list = opps
    if (stageFilter !== 'all') list = list.filter((o) => o.stage === stageFilter)
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      list = list.filter(
        (o) =>
          o.title.toLowerCase().includes(s) ||
          (o.customer_name ?? '').toLowerCase().includes(s),
      )
    }
    return list
  }, [opps, stageFilter, search])

  return (
    <PageContainer>
      <PageHeader
        title="Opportunities"
        subtitle="Pipeline en lopende offertes"
        actions={
          <>
            <div className="flex border border-ink">
              <button
                className="btn btn-ghost btn-icon"
                data-active={view === 'kanban' || undefined}
                aria-label="Kanban-weergave"
                title="Kanban"
                onClick={() => setViewMode('kanban')}
                style={{ background: view === 'kanban' ? 'var(--color-ink)' : undefined, color: view === 'kanban' ? 'var(--color-paper)' : undefined }}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className="btn btn-ghost btn-icon"
                aria-label="Lijst-weergave"
                title="Lijst"
                onClick={() => setViewMode('list')}
                style={{ background: view === 'list' ? 'var(--color-ink)' : undefined, color: view === 'list' ? 'var(--color-paper)' : undefined }}
              >
                <List size={16} />
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => setEditing({})}>
              <Plus size={16} /> Nieuw
            </button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-muted]" />
          <input
            className="field-input pl-9"
            placeholder="Zoek op titel of klant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {view === 'list' ? (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button className="chip" data-active={stageFilter === 'all'} onClick={() => setStageFilter('all')}>
            Alle ({opps.length})
          </button>
          {STAGE_ORDER.map((s) => {
            const count = opps.filter((o) => o.stage === s).length
            return (
              <button
                key={s}
                className="chip"
                data-active={stageFilter === s}
                onClick={() => setStageFilter(s)}
              >
                {STAGE_LABELS[s]} ({count})
              </button>
            )
          })}
        </div>
      ) : null}

      {isLoading ? <div className="text-[--color-muted] font-mono text-sm">Laden…</div> : null}
      {error ? <div className="text-accent font-mono text-sm">{(error as Error).message}</div> : null}

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          title="Geen opportunities"
          subtitle={stageFilter !== 'all' || search ? 'Geen resultaat met huidige filters.' : 'Start een nieuwe opportunity.'}
          cta={<button className="btn btn-primary" onClick={() => setEditing({})}>+ Nieuwe opportunity</button>}
        />
      ) : null}

      {view === 'kanban' ? (
        <KanbanView opportunities={search.trim() ? filtered : opps} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((o) => (
            <Link key={o.id} to={`/opportunities/${o.id}`} className="card card-interactive flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-bold text-sm leading-tight">{o.title}</div>
                <span className="stage-pill shrink-0" data-stage={o.stage}>{STAGE_LABELS[o.stage]}</span>
              </div>
              <div className="text-xs text-[--color-muted] truncate">{o.customer_name ?? '—'}</div>
              <div className="flex items-end justify-between mt-3 gap-2">
                {o.expected_value_cents ? (
                  <div className="font-mono text-sm font-bold tabular-nums">{formatEur(o.expected_value_cents)}</div>
                ) : <div />}
                <div className="font-mono text-[10px] text-[--color-muted]">{relativeTimeNl(o.updated_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {editing ? (
        <OpportunityEditor
          presetCustomerId={editing.customer_id ?? params.get('customer_id') ?? undefined}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </PageContainer>
  )
}

interface OpportunityEditorProps {
  presetCustomerId?: string
  existing?: import('../lib/db').Opportunity | null
  onClose: () => void
}

export function OpportunityEditor({ presetCustomerId, existing, onClose }: OpportunityEditorProps) {
  const { data: customers = [] } = useCustomers()
  const navigate = useNavigate()
  const upsert = useUpsertOpportunity()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    customer_id: existing?.customer_id ?? presetCustomerId ?? customers[0]?.id ?? '',
    title: existing?.title ?? '',
    stage: existing?.stage ?? ('lead' as OpportunityStage),
    expected_value_eur: existing ? (existing.expected_value_cents / 100).toFixed(2) : '',
    notes: existing?.notes ?? '',
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.customer_id) { setError('Kies een klant'); return }
    if (!form.title.trim()) { setError('Titel is verplicht'); return }
    try {
      const cents = Math.round(Number(form.expected_value_eur.replace(',', '.') || 0) * 100)
      const opp = await upsert.mutateAsync({
        ...(existing ? { id: existing.id } : {}),
        customer_id: form.customer_id,
        title: form.title.trim(),
        stage: form.stage,
        expected_value_cents: cents,
        notes: form.notes || null,
      })
      onClose()
      if (!existing) navigate(`/opportunities/${opp.id}`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={existing ? 'Opportunity bewerken' : 'Nieuwe opportunity'}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Annuleer</button>
          <button type="submit" form="opp-form" className="btn btn-primary" disabled={upsert.isPending}>
            {upsert.isPending ? '…' : existing ? 'Bewaar' : 'Maak aan'}
          </button>
        </>
      }
    >
      <form id="opp-form" onSubmit={onSubmit} className="space-y-4">
        <SelectField
          label="Klant"
          value={form.customer_id}
          onChange={(v) => setForm({ ...form, customer_id: v })}
          options={[
            { value: '', label: '— kies klant —' },
            ...customers.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Field
          label="Titel"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="bv. Stalen deur woonkamer"
          required
        />
        <FieldRow>
          <div>
            <span className="field-label">Stage</span>
            <Chips
              value={form.stage}
              options={STAGE_ORDER.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
              onChange={(stage) => setForm({ ...form, stage })}
            />
          </div>
          <Field
            label="Verwachte waarde"
            unit="EUR"
            type="text"
            inputMode="decimal"
            value={form.expected_value_eur}
            onChange={(e) => setForm({ ...form, expected_value_eur: e.target.value })}
            placeholder="bv. 1850"
          />
        </FieldRow>
        <TextAreaField label="Notities" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        {customers.length === 0 ? (
          <div className="text-accent font-mono text-xs">
            Geen klanten — maak eerst een klant aan.
          </div>
        ) : null}
        {error ? <div className="text-accent font-mono text-xs">{error}</div> : null}
      </form>
    </Dialog>
  )
}
