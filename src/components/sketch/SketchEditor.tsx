import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, FolderOpen, Sparkles, Trash2 } from 'lucide-react'
import type { OrderData, SketchData, SketchMode } from '../../lib/types'
import { applyTemplate } from '../../lib/templates'
import { sketchFromFreehand, sketchFromText } from '../../lib/ai'
import { deleteSketchTemplate, instantiateSketch, listSketchTemplates, saveSketchTemplate, type SketchTemplate } from '../../lib/sketchTemplates'
import { DoorOutline } from './DoorOutline'
import { DraggableLine } from './DraggableLine'
import { DraggableHandle } from './DraggableHandle'
import { DimensionLabels } from './DimensionLabels'
import { FreehandLayer } from './FreehandLayer'
import { TemplateGallery } from './TemplateGallery'
import { DetailsStrip } from './DetailsStrip'
import type { SnapMode } from './SnapHelper'

interface Props {
  order: OrderData
  onChange: (next: OrderData) => void
}

const MARGIN = 200 // mm margin around door for dimension labels

const DETAILS_KEY = 'mydoors:sketch:details'

export function SketchEditor({ order, onChange }: Props) {
  const [mode, setMode] = useState<SketchMode>('lijnen')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiHint, setAiHint] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState<boolean>(() => {
    try { return localStorage.getItem(DETAILS_KEY) !== '0' } catch { return true }
  })
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [browsingTemplates, setBrowsingTemplates] = useState(false)
  const [handleExact, setHandleExact] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(DETAILS_KEY, showDetails ? '1' : '0') } catch { /* */ }
  }, [showDetails])
  const [snapMode, setSnapMode] = useState<SnapMode>('10')
  const [clientView, setClientView] = useState(false)
  const [exactInput, setExactInput] = useState<{
    orientation: 'vertical' | 'horizontal'
    id: string
    value: number
  } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const { breedte, hoogte, sketch } = order

  // helpers om client-px naar user-mm te mappen
  const toUserX = useCallback((clientX: number) => {
    if (!svgRef.current) return 0
    const pt = svgRef.current.createSVGPoint()
    pt.x = clientX
    pt.y = 0
    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return 0
    return pt.matrixTransform(ctm.inverse()).x
  }, [])
  const toUserY = useCallback((clientY: number) => {
    if (!svgRef.current) return 0
    const pt = svgRef.current.createSVGPoint()
    pt.x = 0
    pt.y = clientY
    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return 0
    // door coords are from top in svg; "y mm vanaf onder" conversion happens in caller
    return pt.matrixTransform(ctm.inverse()).y
  }, [])

  const toUserYFromBottom = useCallback((clientY: number) => {
    return hoogte - toUserY(clientY)
  }, [hoogte, toUserY])

  function updateSketch(patch: Partial<SketchData>) {
    onChange({ ...order, sketch: { ...order.sketch, ...patch } })
  }

  function addVertical() {
    const next = breedte / 2
    updateSketch({
      verticalLines: [
        ...sketch.verticalLines,
        { id: `v-${Date.now().toString(36)}`, x: Math.round(next) },
      ],
    })
  }
  function addHorizontal() {
    const next = hoogte / 2
    updateSketch({
      horizontalLines: [
        ...sketch.horizontalLines,
        { id: `h-${Date.now().toString(36)}`, y: Math.round(next) },
      ],
    })
  }

  function setVertical(id: string, x: number) {
    updateSketch({
      verticalLines: sketch.verticalLines.map((v) => (v.id === id ? { ...v, x } : v)),
    })
  }
  function setHorizontal(id: string, y: number) {
    updateSketch({
      horizontalLines: sketch.horizontalLines.map((h) => (h.id === id ? { ...h, y } : h)),
    })
  }
  function removeVertical(id: string) {
    updateSketch({ verticalLines: sketch.verticalLines.filter((v) => v.id !== id) })
  }
  function removeHorizontal(id: string) {
    updateSketch({ horizontalLines: sketch.horizontalLines.filter((h) => h.id !== id) })
  }

  function pickTemplate(id: string) {
    onChange(applyTemplate(order, id))
    setMode('lijnen')
  }

  async function runAiFromText() {
    const text = aiPrompt.trim()
    if (!text || aiBusy) return
    setAiBusy(true)
    setAiError(null)
    setAiHint(null)
    try {
      const result = await sketchFromText({ text, doorWidth: breedte, doorHeight: hoogte })
      const stamp = Date.now().toString(36)
      updateSketch({
        verticalLines: result.verticalLines.map((v, i) => ({ id: `ai-v-${stamp}-${i}`, x: v.x })),
        horizontalLines: result.horizontalLines.map((h, i) => ({ id: `ai-h-${stamp}-${i}`, y: h.y })),
        templateId: undefined,
      })
      setAiHint(result.explanation || `${result.verticalLines.length}v + ${result.horizontalLines.length}h lijnen toegevoegd`)
      setAiPrompt('')
      setMode('lijnen')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI-fout')
    } finally {
      setAiBusy(false)
    }
  }

  async function convertFreehandToLines() {
    if (sketch.freehand.length === 0 || aiBusy) return
    setAiBusy(true)
    setAiError(null)
    setAiHint(null)
    try {
      const result = await sketchFromFreehand({
        strokes: sketch.freehand,
        doorWidth: breedte,
        doorHeight: hoogte,
      })
      const stamp = Date.now().toString(36)
      updateSketch({
        verticalLines: [
          ...sketch.verticalLines,
          ...result.verticalLines.map((v, i) => ({ id: `ai-v-${stamp}-${i}`, x: v.x })),
        ],
        horizontalLines: [
          ...sketch.horizontalLines,
          ...result.horizontalLines.map((h, i) => ({ id: `ai-h-${stamp}-${i}`, y: h.y })),
        ],
        freehand: [],
      })
      setAiHint(result.explanation || `Vrije schets omgezet in ${result.verticalLines.length + result.horizontalLines.length} lijnen`)
      setMode('lijnen')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI-fout')
    } finally {
      setAiBusy(false)
    }
  }

  // grid lijnen op de achtergrond, alleen in lijnen-modus
  const gridStep = 50
  const gridLines = useMemo(() => {
    if (mode !== 'lijnen' || clientView) return null
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
    for (let x = gridStep; x < breedte; x += gridStep) {
      lines.push({ x1: x, y1: 0, x2: x, y2: hoogte })
    }
    for (let y = gridStep; y < hoogte; y += gridStep) {
      lines.push({ x1: 0, y1: y, x2: breedte, y2: y })
    }
    return lines
  }, [mode, breedte, hoogte, clientView])

  // beperk Apple Pencil naar freehand mode automatisch
  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (e.pointerType === 'pen' && mode !== 'vrij') {
        setMode('vrij')
      }
    }
    window.addEventListener('pointerdown', onPointer, { capture: true, once: true })
    return () => window.removeEventListener('pointerdown', onPointer, { capture: true })
  }, [mode])

  // Pulse-feedback: elke configuratie-wijziging triggert een korte glow
  // op de tekening zodat de gebruiker zichtbare bevestiging krijgt.
  // Hash van alle "visueel relevante" opties; wijzigt → React remount
  // van de overlay-div → CSS animation start opnieuw.
  const pulseKey = useMemo(() => {
    return [
      order.colorKind, order.colorOther,
      order.glassType, order.glassOther,
      order.system, order.variants.join(','), order.softOpen, order.softClose,
      order.finishing,
      order.handleKind, order.handleVerticalMm, order.handleOther,
      order.handlePosition.side, order.handlePosition.heightFromBottom,
      order.hingeKind, order.hingeSide,
      order.breedte, order.hoogte,
      sketch.verticalLines.length, sketch.horizontalLines.length,
      sketch.freehand.length,
    ].join('|')
  }, [order, sketch.verticalLines.length, sketch.horizontalLines.length, sketch.freehand.length])

  const viewBox = `${-MARGIN} ${-MARGIN} ${breedte + 2 * MARGIN} ${hoogte + 2 * MARGIN}`

  return (
    <div className="flex flex-col h-full">
      <div className="no-print border-b border-black/10 bg-paper px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          {(['snel', 'lijnen', 'vrij'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="chip"
              data-active={mode === m}
              onClick={() => setMode(m)}
            >
              {m === 'snel' ? 'Snel' : m === 'lijnen' ? 'Lijnen' : 'Vrij'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 items-center flex-wrap">
          {mode === 'lijnen' ? (
            <>
              <button type="button" className="chip" onClick={addVertical}>
                + Verticaal
              </button>
              <button type="button" className="chip" onClick={addHorizontal}>
                + Horizontaal
              </button>
              <select
                className="chip cursor-pointer"
                value={snapMode}
                onChange={(e) => setSnapMode(e.target.value as SnapMode)}
                aria-label="Snap-grid voor design-lijnen"
                title="Snap-grid: lijn-positie klikt vast op veelvouden tijdens slepen. Magneet-snap naar midden/1/3/2/3 werkt altijd binnen 12 mm."
              >
                <option value="off">Snap uit · vrije positie</option>
                <option value="10">Snap rooster 10 mm</option>
                <option value="50">Snap rooster 50 mm</option>
                <option value="100">Snap rooster 100 mm</option>
              </select>
            </>
          ) : null}
          {mode === 'vrij' ? (
            <>
              <button
                type="button"
                className="chip"
                onClick={() => updateSketch({ freehand: [] })}
              >
                Wis vrij
              </button>
              {sketch.freehand.length > 0 ? (
                <button
                  type="button"
                  className="chip"
                  onClick={() =>
                    updateSketch({ freehand: sketch.freehand.slice(0, -1) })
                  }
                >
                  Ongedaan
                </button>
              ) : null}
              {sketch.freehand.length > 0 ? (
                <button
                  type="button"
                  className="chip"
                  data-active
                  onClick={convertFreehandToLines}
                  disabled={aiBusy}
                  title="Laat AI je vrije schets omzetten naar exacte lijnen"
                >
                  <Sparkles size={14} /> {aiBusy ? 'AI bezig…' : 'AI: omzet naar lijnen'}
                </button>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            className="chip"
            data-active={showDetails}
            onClick={() => setShowDetails((v) => !v)}
            title="Detail-aanzichten onderaan tonen/verbergen"
          >
            Details
          </button>
          <button
            type="button"
            className="chip"
            data-active={clientView}
            onClick={() => setClientView((v) => !v)}
          >
            {clientView ? 'Klant-zicht aan' : 'Klant-zicht'}
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setSavingTemplate(true)}
            title="Bewaar deze schets als sjabloon voor hergebruik"
          >
            <Bookmark size={14} /> Bewaar
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setBrowsingTemplates(true)}
            title="Een bewaarde schets toepassen"
          >
            <FolderOpen size={14} /> Open
          </button>
        </div>
      </div>

      {/* AI-prompt row — beschrijf de gewenste verdeling in tekst */}
      <div className="no-print border-b border-black/10 bg-paper/60 px-3 py-2 flex items-center gap-2">
        <Sparkles size={14} className="text-accent shrink-0" />
        <input
          className="field-input !border-soft-2 !py-1 text-sm flex-1 min-w-0"
          placeholder="Beschrijf de verdeling — bv. '2 dwarslatten onder + verticale lijn in midden'"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              runAiFromText()
            }
          }}
          disabled={aiBusy}
        />
        <button
          type="button"
          className="chip"
          data-active
          onClick={runAiFromText}
          disabled={!aiPrompt.trim() || aiBusy}
        >
          {aiBusy ? '…' : 'Genereer'}
        </button>
      </div>

      {aiError || aiHint ? (
        <div className={`no-print px-3 py-1.5 text-xs font-mono ${aiError ? 'bg-accent text-paper' : 'bg-soft text-ink'}`}>
          {aiError || aiHint}
        </div>
      ) : null}

      {mode === 'snel' ? (
        <div className="flex-1 overflow-auto">
          <TemplateGallery order={order} onPick={pickTemplate} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden relative" style={{ touchAction: 'none' }}>
          {/* Pulse overlay: remount via key triggert CSS animation opnieuw */}
          <div key={pulseKey} className="door-pulse-overlay" aria-hidden />
          <svg
            ref={svgRef}
            viewBox={viewBox}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', background: clientView ? '#EFE9DB' : '#FAFAF7' }}
          >
            {/* grid */}
            {gridLines
              ? gridLines.map((l, i) => (
                  <line
                    key={i}
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke="#D6D6CF"
                    strokeWidth={0.5}
                    vectorEffect="non-scaling-stroke"
                  />
                ))
              : null}

            <DoorOutline order={order} clientView={clientView} />

            {/* freehand (alleen tonen indien er strokes zijn of we in vrij-mode zitten) */}
            <FreehandLayer
              strokes={sketch.freehand}
              doorWidth={breedte}
              doorHeight={hoogte}
              active={mode === 'vrij' && !clientView}
              toUserX={toUserX}
              toUserY={toUserY}
              onAddStroke={(s) =>
                updateSketch({ freehand: [...sketch.freehand, s] })
              }
            />

            {/* verticale lijnen */}
            {sketch.verticalLines.map((v) => (
              <DraggableLine
                key={v.id}
                orientation="vertical"
                value={v.x}
                doorWidth={breedte}
                doorHeight={hoogte}
                others={sketch.verticalLines.filter((o) => o.id !== v.id).map((o) => o.x)}
                snapMode={snapMode}
                onChange={(nv) => setVertical(v.id, nv)}
                onCommit={(nv) => setVertical(v.id, nv)}
                onRequestDelete={() => removeVertical(v.id)}
                onRequestExact={() =>
                  setExactInput({ orientation: 'vertical', id: v.id, value: v.x })
                }
                toUserX={toUserX}
                toUserY={toUserY}
              />
            ))}

            {/* horizontale lijnen (y mm vanaf onder) */}
            {sketch.horizontalLines.map((h) => (
              <DraggableLine
                key={h.id}
                orientation="horizontal"
                value={h.y}
                doorWidth={breedte}
                doorHeight={hoogte}
                others={sketch.horizontalLines.filter((o) => o.id !== h.id).map((o) => o.y)}
                snapMode={snapMode}
                onChange={(nv) => setHorizontal(h.id, nv)}
                onCommit={(nv) => setHorizontal(h.id, nv)}
                onRequestDelete={() => removeHorizontal(h.id)}
                onRequestExact={() =>
                  setExactInput({ orientation: 'horizontal', id: h.id, value: h.y })
                }
                toUserX={toUserX}
                toUserY={toUserYFromBottom}
              />
            ))}

            {/* maatvoering — niet in klant-zicht */}
            {!clientView ? <DimensionLabels order={order} /> : null}

            {/* Draggable greep — alleen interactief in tekening-mode */}
            {!clientView && order.handleKind !== 'none' ? (
              <DraggableHandle
                heightFromBottom={order.handlePosition.heightFromBottom}
                doorWidth={breedte}
                doorHeight={hoogte}
                side={order.handlePosition.side}
                onChange={(h) => onChange({
                  ...order,
                  handlePosition: { ...order.handlePosition, heightFromBottom: h },
                })}
                onRequestExact={() => setHandleExact(true)}
                toUserY={toUserY}
              />
            ) : null}
          </svg>
        </div>
      )}

      {/* Detail-aanzichten onder het hoofdcanvas, alleen tekening-mode */}
      {mode !== 'snel' && !clientView && showDetails ? (
        <div className="max-h-[40vh] overflow-y-auto">
          <DetailsStrip order={order} />
        </div>
      ) : null}

      {exactInput ? (
        <ExactDialog
          orientation={exactInput.orientation}
          value={exactInput.value}
          max={exactInput.orientation === 'vertical' ? breedte : hoogte}
          onCancel={() => setExactInput(null)}
          onConfirm={(nv) => {
            if (exactInput.orientation === 'vertical') setVertical(exactInput.id, nv)
            else setHorizontal(exactInput.id, nv)
            setExactInput(null)
          }}
          onDelete={() => {
            if (exactInput.orientation === 'vertical') removeVertical(exactInput.id)
            else removeHorizontal(exactInput.id)
            setExactInput(null)
          }}
        />
      ) : null}

      {savingTemplate ? (
        <SaveTemplateDialog
          order={order}
          onClose={() => setSavingTemplate(false)}
        />
      ) : null}

      {browsingTemplates ? (
        <BrowseTemplatesDialog
          onClose={() => setBrowsingTemplates(false)}
          onApply={(tpl) => {
            updateSketch(instantiateSketch(tpl))
            setBrowsingTemplates(false)
            setMode('lijnen')
            setAiHint(`Schets "${tpl.name}" toegepast`)
          }}
        />
      ) : null}

      {handleExact ? (
        <HandleExactDialog
          order={order}
          onClose={() => setHandleExact(false)}
          onSave={(h, side) => {
            onChange({ ...order, handlePosition: { side, heightFromBottom: h } })
            setHandleExact(false)
          }}
        />
      ) : null}
    </div>
  )
}

function HandleExactDialog({
  order, onClose, onSave,
}: { order: OrderData; onClose: () => void; onSave: (h: number, side: 'left' | 'right') => void }) {
  const [h, setH] = useState(order.handlePosition.heightFromBottom)
  const [side, setSide] = useState<'left' | 'right'>(order.handlePosition.side)
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print" onClick={onClose}>
      <div className="bg-white border border-black p-6 w-full max-w-md rounded-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-mono font-bold uppercase tracking-wider text-sm mb-3">Greep-positie exact</h3>
        <label className="block field-label">Hoogte vanaf onder</label>
        <input
          type="number"
          autoFocus
          min={50}
          max={order.hoogte - 50}
          step={1}
          value={h}
          onChange={(e) => setH(Math.max(50, Math.min(order.hoogte - 50, Number(e.target.value))))}
          className="field-input text-2xl"
        />
        <div className="font-mono text-xs text-[--color-muted] mt-2">50 – {order.hoogte - 50} mm · stap 1 mm</div>

        <div className="mt-4">
          <span className="field-label">Zijde</span>
          <div className="flex gap-2 mt-1">
            <button type="button" className="chip" data-active={side === 'left'} onClick={() => setSide('left')}>Links</button>
            <button type="button" className="chip" data-active={side === 'right'} onClick={() => setSide('right')}>Rechts</button>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="chip" onClick={onClose}>Annuleer</button>
          <button type="button" className="chip" data-active onClick={() => onSave(h, side)}>Bevestig</button>
        </div>
      </div>
    </div>
  )
}

// ─── Sketch-template dialogs ─────────────────────────────

function SaveTemplateDialog({ order, onClose }: { order: OrderData; onClose: () => void }) {
  const [name, setName] = useState(`${order.breedte}×${order.hoogte} — ${order.sketch.verticalLines.length}v + ${order.sketch.horizontalLines.length}h`)
  const [description, setDescription] = useState('')
  function save() {
    saveSketchTemplate({
      name,
      description,
      doorWidth: order.breedte,
      doorHeight: order.hoogte,
      sketch: order.sketch,
    })
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print" onClick={onClose}>
      <div className="bg-paper border border-ink w-full max-w-md p-5 rounded-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-mono font-bold uppercase tracking-widest text-sm mb-3">Schets bewaren</h3>
        <label className="block field-label">Naam</label>
        <input className="field-input mb-3" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <label className="block field-label">Omschrijving (optioneel)</label>
        <textarea className="field-input min-h-[60px] mb-3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="bv. 'Klassiek 1 dwarslat + verticaal'" />
        <div className="font-mono text-xs text-[--color-muted] mb-4">
          Wordt lokaal bewaard. Beschikbaar in alle opportunities op dit toestel.
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Annuleer</button>
          <button type="button" className="btn btn-primary" onClick={save}>Bewaar</button>
        </div>
      </div>
    </div>
  )
}

function BrowseTemplatesDialog({ onClose, onApply }: { onClose: () => void; onApply: (t: SketchTemplate) => void }) {
  const [templates, setTemplates] = useState<SketchTemplate[]>(() => listSketchTemplates())
  function remove(id: string) {
    if (!confirm('Schets-sjabloon verwijderen?')) return
    deleteSketchTemplate(id)
    setTemplates(listSketchTemplates())
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print" onClick={onClose}>
      <div className="bg-paper border border-ink w-full max-w-2xl max-h-[80dvh] p-5 rounded-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono font-bold uppercase tracking-widest text-sm">Bewaarde schetsen</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Sluit</button>
        </div>
        {templates.length === 0 ? (
          <div className="text-[--color-muted] font-mono text-sm py-8 text-center border border-dashed border-soft-2 rounded">
            Nog geen bewaarde schetsen. Klik "Bewaar" op een schets om er een aan te maken.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="border border-soft-2 bg-white p-3 rounded flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{t.name}</div>
                  <div className="font-mono text-[11px] text-[--color-muted] mt-1">
                    {t.doorWidth}×{t.doorHeight} · {t.sketch.verticalLines.length}v + {t.sketch.horizontalLines.length}h{t.sketch.freehand.length ? ` + ${t.sketch.freehand.length} freehand` : ''} · {new Date(t.savedAt).toLocaleDateString('nl-BE')}
                  </div>
                  {t.description ? <div className="text-xs text-[--color-muted] mt-1 truncate">{t.description}</div> : null}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => onApply(t)}>Pas toe</button>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(t.id)} aria-label="Verwijder">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ExactDialogProps {
  orientation: 'vertical' | 'horizontal'
  value: number
  max: number
  onCancel: () => void
  onConfirm: (v: number) => void
  onDelete: () => void
}

function ExactDialog({
  orientation, value, max,
  onCancel, onConfirm, onDelete,
}: ExactDialogProps) {
  const label = orientation === 'vertical' ? 'Verticale lijn vanaf links' : 'Horizontale lijn vanaf onder'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
      <div className="bg-white border border-black p-6 w-full max-w-md rounded-lg">
        <h3 className="font-mono font-bold uppercase tracking-wider text-sm mb-3">Lijn exact instellen</h3>
        <label className="block field-label">{label}</label>
        <input
          type="number"
          autoFocus
          min={0}
          max={max}
          defaultValue={value}
          className="field-input text-2xl"
          id="exact-input"
        />
        <div className="font-mono text-xs text-zinc-500 mt-2">0 – {max} mm</div>

        <div className="mt-5 flex gap-2 justify-between">
          <button type="button" className="chip" onClick={onDelete}>
            Verwijder lijn
          </button>
          <div className="flex gap-2">
            <button type="button" className="chip" onClick={onCancel}>
              Annuleer
            </button>
            <button
              type="button"
              className="chip"
              data-active
              onClick={() => {
                const inp = document.getElementById('exact-input') as HTMLInputElement | null
                if (inp) onConfirm(Math.max(0, Math.min(max, Number(inp.value))))
              }}
            >
              Bevestig
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
