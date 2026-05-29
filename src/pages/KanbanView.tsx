import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import { STAGE_ORDER, type OpportunityStage, type OpportunityWithCustomer } from '../lib/db'
import { useUpdateStage } from '../lib/queries'
import { formatEur, relativeTime } from '../lib/format'
import { stageLabel, useT } from '../lib/i18n'

interface Props {
  opportunities: OpportunityWithCustomer[]
}

export function KanbanView({ opportunities }: Props) {
  const update = useUpdateStage()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const byStage = useMemo(() => {
    const map: Record<OpportunityStage, OpportunityWithCustomer[]> = {
      lead: [], meeting: [], quote_sent: [], won: [], lost: [],
    }
    for (const o of opportunities) {
      map[o.stage].push(o)
    }
    return map
  }, [opportunities])

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const overStage = e.over?.id
    const id = String(e.active.id)
    if (!overStage || typeof overStage !== 'string') return
    const target = STAGE_ORDER.find((s) => s === overStage)
    if (!target) return
    const opp = opportunities.find((o) => o.id === id)
    if (!opp || opp.stage === target) return
    update.mutate({ id, stage: target })
  }

  const activeOpp = activeId ? opportunities.find((o) => o.id === activeId) : null

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1" style={{ scrollSnapType: 'x mandatory' }}>
        {STAGE_ORDER.map((stage) => (
          <KanbanColumn key={stage} stage={stage} items={byStage[stage]} />
        ))}
      </div>
      <DragOverlay>
        {activeOpp ? <Card opp={activeOpp} dragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({ stage, items }: { stage: OpportunityStage; items: OpportunityWithCustomer[] }) {
  const { t, lang } = useT()
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const sumValue = items.reduce((s, i) => s + (i.expected_value_cents || 0), 0)
  return (
    <div
      ref={setNodeRef}
      className={`shrink-0 w-72 sm:w-80 flex flex-col border bg-paper transition-colors ${isOver ? 'border-accent bg-soft' : 'border-soft-2'}`}
      style={{ scrollSnapAlign: 'start', minHeight: '60vh' }}
      data-stage={stage}
    >
      <div className="px-3 py-2 border-b border-soft-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="stage-pill" data-stage={stage}>{stageLabel(stage, lang)}</span>
          <span className="font-mono text-xs text-[--color-muted]">({items.length})</span>
        </div>
        {sumValue ? <div className="font-mono text-xs text-[--color-muted] tabular-nums">{formatEur(sumValue)}</div> : null}
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center text-[--color-muted] font-mono text-xs py-8 border border-dashed border-soft-2">
            {t('kanban.empty')}
          </div>
        ) : (
          items.map((opp) => <DraggableCard key={opp.id} opp={opp} />)
        )}
      </div>
    </div>
  )
}

function DraggableCard({ opp }: { opp: OpportunityWithCustomer }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: opp.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: 'manipulation' }}
    >
      <Card opp={opp} />
    </div>
  )
}

function Card({ opp, dragging = false }: { opp: OpportunityWithCustomer; dragging?: boolean }) {
  const { lang } = useT()
  const value = opp.expected_value_cents
  return (
    <Link
      to={`/opportunities/${opp.id}`}
      onClick={(e) => { if (dragging) e.preventDefault() }}
      className={`block bg-white border p-3 ${dragging ? 'border-ink shadow-lg cursor-grabbing' : 'border-soft-2 hover:border-ink'}`}
    >
      <div className="font-bold text-sm leading-tight mb-1">{opp.title}</div>
      <div className="text-xs text-[--color-muted] truncate">{opp.customer_name ?? '—'}</div>
      <div className="flex items-end justify-between mt-3 gap-2">
        {value ? <div className="font-mono text-xs tabular-nums">{formatEur(value)}</div> : <div />}
        <div className="font-mono text-[10px] text-[--color-muted]">{relativeTime(opp.updated_at, lang)}</div>
      </div>
    </Link>
  )
}
