import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save, Trash2, Plus, FileText, Pencil, Scissors } from 'lucide-react'
import { PageContainer } from '../components/Layout'
import { Chips } from '../components/Field'
import { OrderForm } from '../components/OrderForm'
import { SketchEditor } from '../components/sketch/SketchEditor'
import { ActionBar } from '../components/ActionBar'
import { useAppSettings, useOpportunity, useOrderForOpportunity, useQuotes, useSaveOrder, useUpsertOpportunity, useDeleteOpportunity, useLogActivity } from '../lib/queries'
import { STAGE_ORDER, type OpportunityStage } from '../lib/db'
import { DEFAULT_ORDER, sanitizeOrderData, type OrderData } from '../lib/types'
import { validateOrder } from '../lib/calculations'
import { EmptyState, formatEur } from './HomePage'
import { OpportunityEditor } from './OpportunitiesPage'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { CutListEditDialog } from '../components/CutListEditDialog'
import { useToast, errorMessage } from '../components/Toast'
import { stageLabel, useT } from '../lib/i18n'

type Tab = 'order' | 'quote' | 'activity'
type View = 'split' | 'schets' | 'form'

export function OpportunityDetailPage() {
  const { t, lang } = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: opp, isLoading } = useOpportunity(id)
  const { data: existingOrder } = useOrderForOpportunity(id)
  const { data: quotes = [] } = useQuotes(id)
  const { data: settings } = useAppSettings()
  const saveOrder = useSaveOrder()
  const updateOpp = useUpsertOpportunity()
  const delOpp = useDeleteOpportunity()
  const logActivity = useLogActivity()

  const [order, setOrder] = useState<OrderData>(DEFAULT_ORDER)
  const [tab, setTab] = useState<Tab>('order')
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'split' : 'schets',
  )
  const [dirty, setDirty] = useState(false)
  const [editingOpp, setEditingOpp] = useState(false)
  const [editingCutList, setEditingCutList] = useState(false)

  const toast = useToast()

  // bij eerste load: vul order vanuit DB OF uit opportunity-context + settings.
  // Re-runs ALLEEN bij wissel van order/opportunity zodat dirty edits niet
  // worden overschreven wanneer settings refresht.
  useEffect(() => {
    if (existingOrder?.data) {
      // sanitizeOrderData mapt legacy handleKinds + strip oude sketch-fields
      setOrder(sanitizeOrderData(existingOrder.data))
      setDirty(false)
    } else if (opp) {
      setOrder({
        ...DEFAULT_ORDER,
        breedte: settings?.default_door_width ?? DEFAULT_ORDER.breedte,
        hoogte: settings?.default_door_height ?? DEFAULT_ORDER.hoogte,
        handlePosition: {
          ...DEFAULT_ORDER.handlePosition,
          heightFromBottom: settings?.default_handle_height ?? DEFAULT_ORDER.handlePosition.heightFromBottom,
        },
        klantNaam: opp.customer_name ?? '',
        referentie: opp.title,
        datum: (opp.created_at ?? new Date().toISOString()).slice(0, 10),
      })
      setDirty(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingOrder?.id, opp?.id])

  // hingeSide → handle.side
  useEffect(() => {
    const desired: 'left' | 'right' = order.hingeSide === 'belgisch_links' ? 'right' : 'left'
    if (order.handlePosition.side !== desired && (order.hingeSide === 'belgisch_links' || order.hingeSide === 'belgisch_rechts')) {
      setOrder((o) => ({ ...o, handlePosition: { ...o.handlePosition, side: desired } }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.hingeSide])

  const issues = useMemo(() => validateOrder(order), [order])
  const hasErrors = issues.some((i) => i.severity === 'error')

  function updateOrder(next: OrderData) {
    setOrder(next)
    setDirty(true)
  }
  function set<K extends keyof OrderData>(k: K, v: OrderData[K]) {
    updateOrder({ ...order, [k]: v })
  }

  async function persist() {
    if (!id) return
    try {
      await saveOrder.mutateAsync({ id: existingOrder?.id, opportunity_id: id, data: order })
      setDirty(false)
      toast.success(t('opps.detail.toast.orderSaved'))
      logActivity.mutate({
        opportunity_id: id,
        kind: 'order_saved',
        message: `${t('opps.detail.toast.orderSaved')}: ${order.breedte}×${order.hoogte} mm`,
      })
    } catch (err) {
      toast.error(t('opps.detail.toast.saveFailed', { error: errorMessage(err) }))
    }
  }

  async function changeStage(stage: OpportunityStage) {
    if (!opp) return
    try {
      await updateOpp.mutateAsync({ id: opp.id, customer_id: opp.customer_id, title: opp.title, stage })
    } catch (err) {
      toast.error(t('opps.detail.toast.stageFailed', { error: errorMessage(err) }))
    }
  }

  async function onDelete() {
    if (!opp) return
    if (!confirm(t('opps.detail.deleteConfirm', { title: opp.title }))) return
    try {
      await delOpp.mutateAsync(opp.id)
      navigate('/opportunities')
    } catch (err) {
      toast.error(t('opps.detail.toast.deleteFailed', { error: errorMessage(err) }))
    }
  }

  if (isLoading) return <PageContainer><div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div></PageContainer>
  if (!opp) return <PageContainer><EmptyState title={t('opps.notFound')} /></PageContainer>

  return (
    <div className="h-[100dvh] flex flex-col">
      {/* Sub-header voor opportunity context */}
      <div className="no-print border-b border-soft-2 bg-paper px-4 py-3 flex items-center gap-3 flex-wrap">
        <Link to="/opportunities" className="btn btn-ghost btn-sm">
          <ChevronLeft size={14} /> {t('opps.detail.pipeline')}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{opp.title}</div>
          <Link to={`/customers/${opp.customer_id}`} className="text-xs text-[--color-muted] hover:underline truncate block">
            {opp.customer_name}
          </Link>
        </div>
        <select
          className="chip cursor-pointer"
          value={opp.stage}
          onChange={(e) => changeStage(e.target.value as OpportunityStage)}
        >
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>{stageLabel(s, lang)}</option>
          ))}
        </select>
        {opp.expected_value_cents ? (
          <div className="font-mono text-sm font-bold hidden sm:block tabular-nums">{formatEur(opp.expected_value_cents)}</div>
        ) : null}
        <button className="btn btn-ghost btn-icon" onClick={() => setEditingOpp(true)} aria-label={t('opps.detail.editAria')}>
          <Pencil size={16} />
        </button>
        <button className="btn btn-ghost btn-icon" onClick={onDelete} aria-label={t('opps.detail.deleteAria')}>
          <Trash2 size={16} />
        </button>
      </div>

      {/* Tabs: Order schets+form vs Quote */}
      <div className="no-print border-b border-soft-2 bg-paper px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          <button className="chip" data-active={tab === 'order'} onClick={() => setTab('order')}>
            {t('opps.detail.tab.order')}
          </button>
          <button className="chip" data-active={tab === 'quote'} onClick={() => setTab('quote')}>
            {t('opps.detail.tab.quotes')} {quotes.length ? `(${quotes.length})` : ''}
          </button>
          <button className="chip" data-active={tab === 'activity'} onClick={() => setTab('activity')}>
            {t('opps.detail.tab.activity')}
          </button>
        </div>
        {tab === 'order' ? (
          <div className="flex gap-1 flex-wrap">
            <Chips
              value={view}
              options={[
                { value: 'split', label: t('opps.detail.view.both') },
                { value: 'schets', label: t('opps.detail.view.sketch') },
                { value: 'form', label: t('opps.detail.view.form') },
              ]}
              onChange={(v) => setView(v)}
            />
            <button
              className="btn"
              onClick={() => setEditingCutList(true)}
              title={t('opps.detail.cutListTitle')}
            >
              <Scissors size={14} /> {t('opps.detail.cutListBtn')}
              {order.cutListOverride ? <span className="ml-1 text-[--color-accent]">●</span> : null}
            </button>
            <button
              className="btn btn-primary"
              onClick={persist}
              disabled={!dirty || saveOrder.isPending}
            >
              <Save size={14} /> {saveOrder.isPending ? '…' : dirty ? t('common.save') : t('common.saved')}
            </button>
          </div>
        ) : tab === 'quote' ? (
          <Link to={`/opportunities/${id}/quote/new`} className="btn btn-primary">
            <Plus size={14} /> {t('opps.quotes.newButton')}
          </Link>
        ) : null}
      </div>

      {/* Content */}
      {tab === 'order' ? (
        <div
          className="flex-1 min-h-0"
          style={{
            display: 'grid',
            gridTemplateRows: 'minmax(0, 1fr)',
            gridTemplateColumns:
              view === 'split'
                ? typeof window !== 'undefined' && window.innerWidth >= 1024 ? '420px 1fr' : '1fr'
                : '1fr',
          }}
        >
          {view === 'split' || view === 'form' ? (
            <aside className="border-r border-soft-2 p-4 overflow-y-auto min-h-0">
              <OrderForm order={order} set={set} issues={issues} />
            </aside>
          ) : null}
          {view === 'split' || view === 'schets' ? (
            <main className="overflow-hidden min-h-0">
              <SketchEditor order={order} onChange={updateOrder} />
            </main>
          ) : null}
        </div>
      ) : tab === 'quote' ? (
        <div className="flex-1 overflow-y-auto">
          <QuotesTab opportunityId={id!} orderData={order} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <PageContainer>
            <h2 className="section-h">{t('opps.detail.tab.activity')}</h2>
            <ActivityTimeline opportunityId={id!} />
          </PageContainer>
        </div>
      )}

      {tab === 'order' ? (
        <ActionBar order={order} hasErrors={hasErrors} />
      ) : null}

      {editingOpp ? (
        <OpportunityEditor existing={opp} onClose={() => setEditingOpp(false)} />
      ) : null}

      {editingCutList ? (
        <CutListEditDialog
          order={order}
          onSave={(items, note) => {
            updateOrder({
              ...order,
              cutListOverride: { items, note: note || undefined, updatedAt: new Date().toISOString() },
            })
            setEditingCutList(false)
          }}
          onClear={() => {
            updateOrder({ ...order, cutListOverride: undefined })
            setEditingCutList(false)
          }}
          onClose={() => setEditingCutList(false)}
        />
      ) : null}
    </div>
  )
}

function QuotesTab({ opportunityId }: { opportunityId: string; orderData: OrderData }) {
  const { t, lang } = useT()
  const { data: quotes = [], isLoading } = useQuotes(opportunityId)
  if (isLoading) return <div className="p-8 text-[--color-muted] font-mono text-sm">{t('common.loading')}</div>

  const locale = lang === 'en' ? 'en-GB' : 'nl-BE'

  return (
    <PageContainer>
      {quotes.length === 0 ? (
        <EmptyState
          title={t('opps.quotes.empty.title')}
          subtitle={t('opps.quotes.empty.subtitle')}
          cta={<Link to={`/opportunities/${opportunityId}/quote/new`} className="btn btn-primary">{t('opps.quotes.empty.cta')}</Link>}
        />
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => (
            <Link
              key={q.id}
              to={`/opportunities/${opportunityId}/quote/${q.id}`}
              className="card card-interactive flex items-center justify-between"
            >
              <div>
                <div className="font-mono font-bold text-sm">{q.reference}</div>
                <div className="text-xs text-[--color-muted] mt-1">
                  {t('opps.quotes.lines', { n: q.line_items.length })} · {new Date(q.created_at).toLocaleDateString(locale)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-mono text-sm font-bold tabular-nums">{formatEur(q.total_cents)}</div>
                <FileText size={16} className="text-[--color-muted]" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
