import { useEffect, useMemo, useState } from 'react'
import { OrderForm } from './components/OrderForm'
import { SketchEditor } from './components/sketch/SketchEditor'
import { ActionBar } from './components/ActionBar'
import { validateOrder } from './lib/calculations'
import { DEFAULT_ORDER, type OrderData } from './lib/types'
import { loadOrder, saveOrder, listConcepts, deleteConcept, type Concept } from './lib/storage'

type Tab = 'formulier' | 'schets'

export default function App() {
  const [order, setOrder] = useState<OrderData>(loadOrder)
  const [tab, setTab] = useState<Tab>('schets')
  const [showConcepts, setShowConcepts] = useState(false)
  const [concepts, setConcepts] = useState<Concept[]>([])

  useEffect(() => { saveOrder(order) }, [order])

  // initial hingeSide-derived handle side; recompute side when hingeSide changes
  useEffect(() => {
    const desired: 'left' | 'right' = order.hingeSide === 'belgisch_links' ? 'right' : 'left'
    if (order.handlePosition.side !== desired && (order.hingeSide === 'belgisch_links' || order.hingeSide === 'belgisch_rechts')) {
      setOrder((o) => ({ ...o, handlePosition: { ...o.handlePosition, side: desired } }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.hingeSide])

  const issues = useMemo(() => validateOrder(order), [order])
  const hasErrors = issues.some((i) => i.severity === 'error')

  function set<K extends keyof OrderData>(k: K, v: OrderData[K]) {
    setOrder((o) => ({ ...o, [k]: v }))
  }

  function newOrder() {
    if (confirm('Nieuwe bestelling starten? Huidige werkruimte wordt gewist.')) {
      setOrder(DEFAULT_ORDER)
    }
  }

  function refreshConcepts() { setConcepts(listConcepts()) }

  function loadConcept(c: Concept) {
    setOrder(c.order)
    setShowConcepts(false)
  }
  function dropConcept(id: string) {
    deleteConcept(id)
    refreshConcepts()
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-paper overflow-hidden">
      <header className="no-print border-b border-black/15 px-4 py-3 flex items-center justify-between bg-paper sticky top-0 z-10">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-base font-bold tracking-widest">MY DOORS</h1>
          <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 hidden sm:inline">
            Bestelformulier
          </span>
        </div>
        <nav className="flex gap-1 font-mono text-xs lg:hidden">
          {(['schets', 'formulier'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className="option-chip"
              data-active={tab === t}
              onClick={() => setTab(t)}
            >
              {t === 'schets' ? 'Schets' : 'Formulier'}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            className="option-chip"
            onClick={() => { setShowConcepts(true); refreshConcepts() }}
          >
            Concepten
          </button>
          <button type="button" className="option-chip" onClick={newOrder}>
            Nieuw
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(420px,500px)_1fr] min-h-0" style={{ gridTemplateRows: 'minmax(0, 1fr)' }}>
        <aside
          className={`border-r border-black/15 p-4 overflow-y-auto min-h-0 ${tab === 'formulier' ? '' : 'hidden lg:block'}`}
        >
          <OrderForm order={order} set={set} issues={issues} />
        </aside>

        <main
          className={`overflow-hidden min-h-0 ${tab === 'schets' ? '' : 'hidden lg:block'}`}
        >
          <SketchEditor order={order} onChange={setOrder} />
        </main>
      </div>

      <ActionBar order={order} hasErrors={hasErrors} onSavedConcept={refreshConcepts} />

      {showConcepts ? (
        <ConceptsDrawer
          concepts={concepts}
          onLoad={loadConcept}
          onDelete={dropConcept}
          onClose={() => setShowConcepts(false)}
        />
      ) : null}
    </div>
  )
}

interface ConceptsDrawerProps {
  concepts: Concept[]
  onLoad: (c: Concept) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function ConceptsDrawer({ concepts, onLoad, onDelete, onClose }: ConceptsDrawerProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end no-print" onClick={onClose}>
      <div
        className="bg-paper w-full max-w-md h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-black/15 flex items-center justify-between">
          <h3 className="font-mono text-sm font-bold uppercase tracking-widest">Concepten</h3>
          <button type="button" className="option-chip" onClick={onClose}>
            Sluit
          </button>
        </div>
        <div className="p-4 space-y-2">
          {concepts.length === 0 ? (
            <p className="font-mono text-xs text-zinc-500">Nog geen concepten opgeslagen.</p>
          ) : (
            concepts.map((c) => (
              <div
                key={c.id}
                className="border border-black/15 bg-white p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-mono text-sm font-bold">{c.order.klantNaam || 'Onbekende klant'}</div>
                  <div className="font-mono text-[11px] text-zinc-500">
                    {c.order.breedte}×{c.order.hoogte} · {new Date(c.savedAt).toLocaleString('nl-BE')}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button type="button" className="option-chip" onClick={() => onLoad(c)}>
                    Open
                  </button>
                  <button type="button" className="option-chip" onClick={() => onDelete(c.id)}>
                    Wis
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
