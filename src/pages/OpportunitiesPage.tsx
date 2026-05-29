import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Copy } from 'lucide-react'
import { PageContainer, PageHeader } from '../components/Layout'
import { Chips, Field, FieldRow, SelectField, TextAreaField } from '../components/Field'
import { Dialog } from '../components/Dialog'
import { EmptyState } from './HomePage'
import { formatEur, relativeTime } from '../lib/format'
import { useCustomers, useDuplicateOpportunity, useOpportunities, useUpsertOpportunity } from '../lib/queries'
import { errorMessage, useToast } from '../components/Toast'
import { STAGE_ORDER, type OpportunityStage } from '../lib/db'
import type { OpportunityWithCustomer } from '../lib/db'
import { stageLabel, useT } from '../lib/i18n'
import { KanbanView } from './KanbanView'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { ViewToggle, readViewMode, writeViewMode, type ViewMode } from '../components/ViewToggle'

export function OpportunitiesPage() {
  const { t, lang } = useT()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<'all' | OpportunityStage>(
    (params.get('stage') as OpportunityStage) || 'all',
  )
  const [view, setView] = useState<ViewMode>(() => readViewMode('opportunities', 'table'))
  const [editing, setEditing] = useState<{ customer_id?: string } | null>(null)
  const { data: opps = [], isLoading, error } = useOpportunities()
  const dupOpp = useDuplicateOpportunity()
  const toast = useToast()

  async function duplicate(o: OpportunityWithCustomer) {
    if (!confirm(t('common.duplicateConfirm', { title: o.title }))) return
    try {
      const copy = await dupOpp.mutateAsync(o.id)
      toast.success(t('common.duplicateSuccess'))
      navigate(`/opportunities/${copy.id}`)
    } catch (err) {
      toast.error(t('common.duplicateFailed', { error: errorMessage(err) }))
    }
  }

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
    writeViewMode('opportunities', m)
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

  const tableColumns: DataTableColumn<OpportunityWithCustomer>[] = [
    {
      key: 'title',
      header: t('common.title'),
      cell: (o) => <span className="font-bold">{o.title}</span>,
      sortValue: (o) => o.title,
    },
    {
      key: 'customer',
      header: t('opps.editor.customer'),
      cell: (o) => o.customer_name ?? '—',
      sortValue: (o) => o.customer_name ?? '',
      hideBelow: 640,
    },
    {
      key: 'stage',
      header: t('opps.editor.stage'),
      cell: (o) => <span className="stage-pill" data-stage={o.stage}>{stageLabel(o.stage, lang)}</span>,
      sortValue: (o) => STAGE_ORDER.indexOf(o.stage),
    },
    {
      key: 'value',
      header: t('common.value'),
      cell: (o) => o.expected_value_cents ? <span className="font-mono tabular-nums">{formatEur(o.expected_value_cents)}</span> : '—',
      sortValue: (o) => o.expected_value_cents,
      align: 'right',
      hideBelow: 768,
    },
    {
      key: 'created',
      header: t('common.created'),
      cell: (o) => (
        <span className="font-mono text-[11px] text-[--color-muted]">
          {new Date(o.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'nl-BE')}
        </span>
      ),
      sortValue: (o) => o.created_at,
      align: 'right',
      hideBelow: 1024,
    },
    {
      key: 'updated',
      header: t('common.updated'),
      cell: (o) => <span className="font-mono text-[11px] text-[--color-muted]">{relativeTime(o.updated_at, lang)}</span>,
      sortValue: (o) => o.updated_at,
      align: 'right',
      hideBelow: 1280,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      sortable: false,
      align: 'right',
      width: '70px',
      cell: (o) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => duplicate(o)}
            disabled={dupOpp.isPending}
            aria-label={t('common.duplicate')}
            title={t('common.duplicate')}
          >
            <Copy size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title={t('opps.title')}
        subtitle={t('opps.subtitle')}
        actions={
          <>
            <ViewToggle value={view} onChange={setViewMode} modes={['kanban', 'cards', 'table']} />
            <button className="btn btn-primary" onClick={() => setEditing({})}>
              <Plus size={16} /> {t('opps.new')}
            </button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-muted] pointer-events-none z-10" />
          <input
            className="field-input"
            style={{ paddingLeft: 36 }}
            placeholder={t('opps.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {view !== 'kanban' ? (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button className="chip" data-active={stageFilter === 'all'} onClick={() => setStageFilter('all')}>
            {t('opps.all')} ({opps.length})
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
                {stageLabel(s, lang)} ({count})
              </button>
            )
          })}
        </div>
      ) : null}

      {isLoading ? <div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div> : null}
      {error ? <div className="text-accent font-mono text-sm">{(error as Error).message}</div> : null}

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          title={t('opps.empty.title')}
          subtitle={stageFilter !== 'all' || search ? t('opps.empty.subtitleFiltered') : t('opps.empty.subtitle')}
          cta={<button className="btn btn-primary" onClick={() => setEditing({})}>{t('opps.empty.cta')}</button>}
        />
      ) : view === 'kanban' ? (
        <KanbanView opportunities={search.trim() ? filtered : opps} />
      ) : view === 'table' ? (
        <DataTable<OpportunityWithCustomer>
          rows={filtered}
          columns={tableColumns}
          rowKey={(o) => o.id}
          persistKey="opportunities"
          defaultSort={{ key: 'created', dir: 'desc' }}
          onRowClick={(o) => navigate(`/opportunities/${o.id}`)}
          emptyText={t('opps.empty.title')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((o) => (
            <Link key={o.id} to={`/opportunities/${o.id}`} className="card card-interactive flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-bold text-sm leading-tight">{o.title}</div>
                <span className="stage-pill shrink-0" data-stage={o.stage}>{stageLabel(o.stage, lang)}</span>
              </div>
              <div className="text-xs text-[--color-muted] truncate">{o.customer_name ?? '—'}</div>
              <div className="flex items-end justify-between mt-3 gap-2">
                {o.expected_value_cents ? (
                  <div className="font-mono text-sm font-bold tabular-nums">{formatEur(o.expected_value_cents)}</div>
                ) : <div />}
                <div className="font-mono text-[10px] text-[--color-muted]">{relativeTime(o.updated_at, lang)}</div>
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
  const { t, lang } = useT()
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
    if (!form.customer_id) { setError(t('opps.editor.customerRequired')); return }
    if (!form.title.trim()) { setError(t('opps.editor.titleRequired')); return }
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
      title={existing ? t('opps.editor.title.edit') : t('opps.editor.title.new')}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="opp-form" className="btn btn-primary" disabled={upsert.isPending}>
            {upsert.isPending ? '…' : existing ? t('common.save') : t('opps.editor.create')}
          </button>
        </>
      }
    >
      <form id="opp-form" onSubmit={onSubmit} className="space-y-4">
        <SelectField
          label={t('opps.editor.customer')}
          value={form.customer_id}
          onChange={(v) => setForm({ ...form, customer_id: v })}
          options={[
            { value: '', label: t('opps.editor.customerChoose') },
            ...customers.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Field
          label={t('opps.editor.title')}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder={t('opps.editor.titlePlaceholder')}
          required
        />
        <FieldRow>
          <div>
            <span className="field-label">{t('opps.editor.stage')}</span>
            <Chips
              value={form.stage}
              options={STAGE_ORDER.map((s) => ({ value: s, label: stageLabel(s, lang) }))}
              onChange={(stage) => setForm({ ...form, stage })}
            />
          </div>
          <Field
            label={t('opps.editor.expectedValue')}
            unit="EUR"
            type="text"
            inputMode="decimal"
            value={form.expected_value_eur}
            onChange={(e) => setForm({ ...form, expected_value_eur: e.target.value })}
            placeholder={t('opps.editor.expectedValuePlaceholder')}
          />
        </FieldRow>
        <TextAreaField label={t('opps.editor.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        {customers.length === 0 ? (
          <div className="text-accent font-mono text-xs">
            {t('opps.editor.noCustomers')}
          </div>
        ) : null}
        {error ? <div className="text-accent font-mono text-xs">{error}</div> : null}
      </form>
    </Dialog>
  )
}
