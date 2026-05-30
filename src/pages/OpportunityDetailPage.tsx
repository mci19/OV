import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save, Trash2, Plus, FileText, Pencil, Scissors, Copy, Maximize2 } from 'lucide-react'
import { PageContainer } from '../components/Layout'
import { Chips } from '../components/Field'
import { OrderForm } from '../components/OrderForm'
import { SketchEditor } from '../components/sketch/SketchEditor'
import { ActionBar } from '../components/ActionBar'
import { useAppSettings, useOpportunity, useOrderForOpportunity, useQuotes, useSaveOrder, useUpsertOpportunity, useDeleteOpportunity, useDuplicateOpportunity, useLogActivity } from '../lib/queries'
import { STAGE_ORDER, type OpportunityStage } from '../lib/db'
import { DEFAULT_ORDER, sanitizeOrderData, type OrderData } from '../lib/types'
import { validateOrder } from '../lib/calculations'
import { EmptyState, formatEur } from './HomePage'
import { OpportunityEditor } from './OpportunitiesPage'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { CutListEditDialog } from '../components/CutListEditDialog'
import { useToast, errorMessage } from '../components/Toast'
import { stageLabel, useT } from '../lib/i18n'
import { useUnsavedChangesGuard } from '../lib/useUnsavedChangesGuard'

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
  const dupOpp = useDuplicateOpportunity()
  const logActivity = useLogActivity()

  const [order, setOrder] = useState<OrderData>(DEFAULT_ORDER)
  const [tab, setTab] = useState<Tab>('order')
  // Fullscreen-sketch mode voor mobiel: strip alle chrome (sub-header,
  // tabs, action-bar, layout bottom-nav) zodat het canvas de volle
  // viewport krijgt. Toggleable via knop op mobiel; persistent in
  // localStorage zodat hij open blijft bij navigeren tussen opps.
  const [fullscreenSketch, setFullscreenSketch] = useState<boolean>(() => {
    // Default AAN op mobiel zodat eerste-keer-gebruikers niet door een
    // toolbar-stapel hoeven om de schets te zien. Op desktop/tablet
    // (≥lg) altijd uit tenzij ze hem explicit aanzetten. localStorage
    // overrules zodra de gebruiker een keuze maakt ('0' = expliciet uit).
    try {
      const stored = localStorage.getItem('mydoors:sketch:fullscreen')
      if (stored === '1') return true
      if (stored === '0') return false
      // Geen voorkeur opgeslagen: kies op basis van viewport.
      return typeof window !== 'undefined' && window.innerWidth < 1024
    } catch {
      return typeof window !== 'undefined' && window.innerWidth < 1024
    }
  })
  useEffect(() => {
    try { localStorage.setItem('mydoors:sketch:fullscreen', fullscreenSketch ? '1' : '0') } catch { /* */ }
    // Body-data attribuut zodat Layout's bottom-nav weet dat we
    // immersive zijn (zie Layout.tsx — verbergt zichzelf in deze modus).
    document.body.dataset.sketchImmersive = fullscreenSketch ? '1' : '0'
    return () => { delete document.body.dataset.sketchImmersive }
  }, [fullscreenSketch])
  // isWide volgt de viewport-breedte reactief — tablet draaien of
  // window-resize past de layout meteen aan i.p.v. alleen bij mount.
  // isXl = ≥1280px → derde pane (activity + quotes mini) verschijnt
  // rechts naast de sketch zodat alles op één scherm staat.
  const [isWide, setIsWide] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024,
  )
  const [isXl, setIsXl] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1280,
  )
  useEffect(() => {
    function onResize() {
      setIsWide(window.innerWidth >= 1024)
      setIsXl(window.innerWidth >= 1280)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'split' : 'schets',
  )
  // Op xl+ is de rail standaard open (er is genoeg ruimte). Op kleinere
  // schermen blijven we de bestaande full-screen tabs gebruiken.
  const [railOpen, setRailOpen] = useState<boolean>(true)
  const [railTab, setRailTab] = useState<'activity' | 'quotes'>('activity')
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

  // hingeSide → handle.side. De LOAD-correctie zit nu in sanitizeOrderData
  // (voorkomt race met de load-effect die `dirty=false` zet). Deze
  // useEffect dekt LIVE edits af: als de gebruiker de hingeSide flipt
  // in de UI, moet de handle ook flippen — en de save-knop moet dan
  // wél dirty zijn. We bewaken op een ref of de wijziging vanuit
  // sanitize (load) of vanuit een echte user-edit komt om dubbele
  // setOrder-cycles te voorkomen.
  const lastHingeSideRef = useRef(order.hingeSide)
  useEffect(() => {
    if (lastHingeSideRef.current === order.hingeSide) return
    lastHingeSideRef.current = order.hingeSide
    const desired: 'left' | 'right' = order.hingeSide === 'belgisch_links' ? 'right' : 'left'
    if (order.handlePosition.side !== desired && (order.hingeSide === 'belgisch_links' || order.hingeSide === 'belgisch_rechts')) {
      setOrder((o) => ({ ...o, handlePosition: { ...o.handlePosition, side: desired } }))
      setDirty(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.hingeSide])

  const issues = useMemo(() => validateOrder(order), [order])
  const hasErrors = issues.some((i) => i.severity === 'error')

  // Beschermt tegen weg-navigeren met ongesaved sketch- of order-edits
  useUnsavedChangesGuard(dirty, t('common.unsavedConfirm'))

  function updateOrder(next: OrderData) {
    setOrder(next)
    setDirty(true)
  }
  // Functional update zodat opeenvolgende set()-calls binnen één event-
  // handler de juiste vorige state zien (anders overschrijven ze elkaar
  // — bv. setDoorConfig + setHingeKind achter elkaar).
  function set<K extends keyof OrderData>(k: K, v: OrderData[K]) {
    setOrder((prev) => ({ ...prev, [k]: v }))
    setDirty(true)
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

  async function onDuplicate() {
    if (!opp) return
    if (!confirm(t('common.duplicateConfirm', { title: opp.title }))) return
    try {
      const copy = await dupOpp.mutateAsync(opp.id)
      toast.success(t('common.duplicateSuccess'))
      navigate(`/opportunities/${copy.id}`)
    } catch (err) {
      toast.error(t('common.duplicateFailed', { error: errorMessage(err) }))
    }
  }

  if (isLoading) return <PageContainer><div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div></PageContainer>
  if (!opp) return <PageContainer><EmptyState title={t('opps.notFound')} /></PageContainer>

  // Mobiel-immersive: render alleen de sketch + een mini-top-bar voor
  // back/save. Alle andere chrome (sub-header, tabs, action-bar, bottom-
  // nav) wordt overgeslagen zodat het canvas de volle viewport krijgt.
  if (fullscreenSketch && tab === 'order') {
    return (
      <div className="fixed inset-0 z-40 bg-paper flex flex-col">
        <div className="border-b border-soft-2 bg-paper/95 backdrop-blur px-2 py-1.5 flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setFullscreenSketch(false)}
            aria-label={t('opps.detail.exitFullscreen')}
            title={t('opps.detail.exitFullscreen')}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{opp.title}</div>
            <div className="font-mono text-[10px] text-[--color-muted] truncate">
              {opp.customer_name} · {stageLabel(opp.stage, lang)}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={persist}
            disabled={!dirty || saveOrder.isPending}
          >
            <Save size={14} /> {saveOrder.isPending ? '…' : dirty ? t('common.save') : t('common.saved')}
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <SketchEditor order={order} onChange={updateOrder} />
        </div>
        {editingCutList ? (
          <CutListEditDialog
            order={order}
            onSave={(items, note) => {
              updateOrder({ ...order, cutListOverride: { items, note: note || undefined, updatedAt: new Date().toISOString() } })
              setEditingCutList(false)
            }}
            onClear={() => { updateOrder({ ...order, cutListOverride: undefined }); setEditingCutList(false) }}
            onClose={() => setEditingCutList(false)}
          />
        ) : null}
      </div>
    )
  }

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
        <button className="btn btn-ghost btn-icon" onClick={onDuplicate} disabled={dupOpp.isPending} aria-label={t('common.duplicate')} title={t('common.duplicate')}>
          <Copy size={16} />
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
            {/* Mobiel-only: maximaliseer-knop. Op desktop/tablet (lg+)
                is er ruimte genoeg, daar niet nodig. */}
            <button
              type="button"
              className="chip lg:hidden"
              onClick={() => setFullscreenSketch(true)}
              title={t('opps.detail.enterFullscreen')}
            >
              <Maximize2 size={14} /> {t('opps.detail.enterFullscreen')}
            </button>
            {/* Rail-toggle alleen tonen op xl+ in split-view; daarop draait
                het 3-pane-design (form/sketch/context). Onder xl draaien
                gebruikers automatisch terug naar tabs voor activity/quotes. */}
            {isXl && view === 'split' ? (
              <button
                type="button"
                className="chip"
                data-active={railOpen}
                onClick={() => setRailOpen((v) => !v)}
                title={t('opps.detail.toggleRail')}
              >
                {railOpen ? t('opps.detail.hideRail') : t('opps.detail.showRail')}
              </button>
            ) : null}
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

      {/* Content. Op xl+ schermen tonen we een 3e pane (activity + quotes
          mini-rail) zodat alle context op één scherm zichtbaar is. Onder
          xl blijft de bestaande tab-flow werken. */}
      {tab === 'order' ? (
        <div
          className="flex-1 min-h-0"
          style={{
            display: 'grid',
            gridTemplateRows: 'minmax(0, 1fr)',
            gridTemplateColumns: gridColumnsFor(view, isWide, isXl, railOpen),
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
          {isXl && view === 'split' && railOpen ? (
            <ContextRail
              opportunityId={id!}
              activeTab={railTab}
              onTabChange={setRailTab}
              onClose={() => setRailOpen(false)}
            />
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

/**
 * Compute grid-template-columns op basis van view (single/split/form),
 * viewport-breedte (wide / xl) en of de context-rail open is. Centraal
 * hier zodat de JSX leesbaar blijft.
 *
 * Layout-budgetten:
 *  - form: 420 px (genoeg voor labels + 2-koloms grid binnen het form)
 *  - sketch: 1fr (groeit met beschikbare ruimte — kerngebied)
 *  - rail: 320 px (activity + quotes preview, schaalt mee bij scrollen)
 */
function gridColumnsFor(view: 'split' | 'schets' | 'form', isWide: boolean, isXl: boolean, railOpen: boolean): string {
  if (view === 'form') return '1fr'
  if (view === 'schets') return '1fr'
  // split
  if (!isWide) return '1fr'
  if (isXl && railOpen) return '380px 1fr 320px'
  return '420px 1fr'
}

interface ContextRailProps {
  opportunityId: string
  activeTab: 'activity' | 'quotes'
  onTabChange: (t: 'activity' | 'quotes') => void
  onClose: () => void
}

/**
 * Rechter-rail die activity timeline + quotes preview tegelijk in beeld
 * houdt op xl+ schermen. De bestaande full-screen Tabs blijven werken
 * voor diepere actie (offerte editen, alle activiteit zien).
 */
function ContextRail({ opportunityId, activeTab, onTabChange, onClose }: ContextRailProps) {
  const { t, lang } = useT()
  const { data: quotes = [] } = useQuotes(opportunityId)
  const locale = lang === 'en' ? 'en-GB' : 'nl-BE'
  return (
    <aside className="border-l border-soft-2 bg-paper/40 flex flex-col min-h-0">
      <div className="border-b border-soft-2 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <button
            className="chip"
            data-active={activeTab === 'activity'}
            onClick={() => onTabChange('activity')}
          >
            {t('opps.detail.tab.activity')}
          </button>
          <button
            className="chip"
            data-active={activeTab === 'quotes'}
            onClick={() => onTabChange('quotes')}
          >
            {t('opps.detail.tab.quotes')} {quotes.length ? `(${quotes.length})` : ''}
          </button>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={onClose}
          aria-label={t('common.close')}
          title={t('opps.detail.hideRail')}
        >
          <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 p-3">
        {activeTab === 'activity' ? (
          <ActivityTimeline opportunityId={opportunityId} />
        ) : (
          <div className="space-y-2">
            {quotes.length === 0 ? (
              <div className="text-[--color-muted] font-mono text-sm py-4">
                {t('opps.quotes.empty.title')}
              </div>
            ) : (
              quotes.map((q) => (
                <Link
                  key={q.id}
                  to={`/opportunities/${opportunityId}/quote/${q.id}`}
                  className="card card-interactive !p-3 block"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-xs font-bold truncate">{q.reference}</div>
                    <div className="font-mono text-xs font-bold tabular-nums shrink-0">{formatEur(q.total_cents, lang)}</div>
                  </div>
                  <div className="text-[10px] text-[--color-muted] mt-1">
                    {t('opps.quotes.lines', { n: q.line_items.length })} · {new Date(q.created_at).toLocaleDateString(locale)}
                  </div>
                </Link>
              ))
            )}
            <Link
              to={`/opportunities/${opportunityId}/quote/new`}
              className="btn btn-primary w-full justify-center mt-3"
            >
              <Plus size={14} /> {t('opps.quotes.newButton')}
            </Link>
          </div>
        )}
      </div>
    </aside>
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
