import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save, Trash2, Plus, FileText, Pencil } from 'lucide-react'
import { PageContainer } from '../components/Layout'
import { Chips } from '../components/Field'
import { OrderForm } from '../components/OrderForm'
import { SketchEditor } from '../components/sketch/SketchEditor'
import { ActionBar } from '../components/ActionBar'
import { useAppSettings, useOpportunity, useOrderForOpportunity, useQuotes, useSaveOrder, useUpsertOpportunity, useDeleteOpportunity, useLogActivity } from '../lib/queries'
import { STAGE_LABELS, STAGE_ORDER, type OpportunityStage } from '../lib/db'
import { DEFAULT_ORDER, type OrderData } from '../lib/types'
import { validateOrder } from '../lib/calculations'
import { EmptyState, formatEur } from './HomePage'
import { OpportunityEditor } from './OpportunitiesPage'
import { ActivityTimeline } from '../components/ActivityTimeline'

type Tab = 'order' | 'quote' | 'activity'
type View = 'split' | 'schets' | 'form'

export function OpportunityDetailPage() {
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

  // bij eerste load: vul order vanuit DB OF uit opportunity-context + settings
  useEffect(() => {
    if (existingOrder?.data) {
      setOrder({ ...DEFAULT_ORDER, ...existingOrder.data })
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
        datum: opp.created_at.slice(0, 10),
      })
      setDirty(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingOrder?.id, opp?.id, settings?.default_door_width, settings?.default_door_height, settings?.default_handle_height])

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
    await saveOrder.mutateAsync({ id: existingOrder?.id, opportunity_id: id, data: order })
    setDirty(false)
    logActivity.mutate({
      opportunity_id: id,
      kind: 'order_saved',
      message: `Bestelling opgeslagen: ${order.breedte}×${order.hoogte} mm`,
    })
  }

  async function changeStage(stage: OpportunityStage) {
    if (!opp) return
    await updateOpp.mutateAsync({ id: opp.id, customer_id: opp.customer_id, title: opp.title, stage })
  }

  async function onDelete() {
    if (!opp) return
    if (!confirm(`Opportunity "${opp.title}" verwijderen?`)) return
    await delOpp.mutateAsync(opp.id)
    navigate('/opportunities')
  }

  if (isLoading) return <PageContainer><div className="text-[--color-muted] font-mono text-sm">Laden…</div></PageContainer>
  if (!opp) return <PageContainer><EmptyState title="Opportunity niet gevonden" /></PageContainer>

  return (
    <div className="h-[100dvh] flex flex-col">
      {/* Sub-header voor opportunity context */}
      <div className="no-print border-b border-soft-2 bg-paper px-4 py-3 flex items-center gap-3 flex-wrap">
        <Link to="/opportunities" className="btn btn-ghost btn-sm">
          <ChevronLeft size={14} /> Pipeline
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
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>
        {opp.expected_value_cents ? (
          <div className="font-mono text-sm font-bold hidden sm:block tabular-nums">{formatEur(opp.expected_value_cents)}</div>
        ) : null}
        <button className="btn btn-ghost btn-icon" onClick={() => setEditingOpp(true)} aria-label="Bewerken">
          <Pencil size={16} />
        </button>
        <button className="btn btn-ghost btn-icon" onClick={onDelete} aria-label="Verwijder">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Tabs: Order schets+form vs Quote */}
      <div className="no-print border-b border-soft-2 bg-paper px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          <button className="chip" data-active={tab === 'order'} onClick={() => setTab('order')}>
            Bestelling
          </button>
          <button className="chip" data-active={tab === 'quote'} onClick={() => setTab('quote')}>
            Offertes {quotes.length ? `(${quotes.length})` : ''}
          </button>
          <button className="chip" data-active={tab === 'activity'} onClick={() => setTab('activity')}>
            Activiteit
          </button>
        </div>
        {tab === 'order' ? (
          <div className="flex gap-1 flex-wrap">
            <Chips
              value={view}
              options={[
                { value: 'split', label: 'Beide' },
                { value: 'schets', label: 'Schets' },
                { value: 'form', label: 'Formulier' },
              ]}
              onChange={(v) => setView(v)}
            />
            <button
              className="btn btn-primary"
              onClick={persist}
              disabled={!dirty || saveOrder.isPending}
            >
              <Save size={14} /> {saveOrder.isPending ? '…' : dirty ? 'Bewaar' : 'Opgeslagen'}
            </button>
          </div>
        ) : tab === 'quote' ? (
          <Link to={`/opportunities/${id}/quote/new`} className="btn btn-primary">
            <Plus size={14} /> Nieuwe offerte
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
            <h2 className="section-h">Activiteit</h2>
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
    </div>
  )
}

function QuotesTab({ opportunityId }: { opportunityId: string; orderData: OrderData }) {
  const { data: quotes = [], isLoading } = useQuotes(opportunityId)
  if (isLoading) return <div className="p-8 text-[--color-muted] font-mono text-sm">Laden…</div>

  return (
    <PageContainer>
      {quotes.length === 0 ? (
        <EmptyState
          title="Nog geen offertes"
          subtitle="Genereer een offerte uit deze opportunity met regels + prijzen."
          cta={<Link to={`/opportunities/${opportunityId}/quote/new`} className="btn btn-primary">+ Nieuwe offerte</Link>}
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
                  {q.line_items.length} regels · {new Date(q.created_at).toLocaleDateString('nl-BE')}
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
