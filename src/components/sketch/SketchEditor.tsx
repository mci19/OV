import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { OrderData, SketchData, SketchMode } from '../../lib/types'
import { applyTemplate } from '../../lib/templates'
import { sketchFromFreehand, sketchFromText } from '../../lib/ai'
import { DoorOutline } from './DoorOutline'
import { DraggableLine } from './DraggableLine'
import { DimensionLabels } from './DimensionLabels'
import { FreehandLayer } from './FreehandLayer'
import { TemplateGallery } from './TemplateGallery'
import { TopViewInset } from './TopViewInset'
import type { SnapMode } from './SnapHelper'

interface Props {
  order: OrderData
  onChange: (next: OrderData) => void
}

const MARGIN = 200 // mm margin around door for dimension labels

export function SketchEditor({ order, onChange }: Props) {
  const [mode, setMode] = useState<SketchMode>('lijnen')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiHint, setAiHint] = useState<string | null>(null)
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

  // Extra ruimte onderaan voor de top-view inset (alleen in technische mode)
  const bottomExtra = clientView ? 0 : 240
  const viewBox = `${-MARGIN} ${-MARGIN} ${breedte + 2 * MARGIN} ${hoogte + 2 * MARGIN + bottomExtra}`

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
                aria-label="Snap"
              >
                <option value="off">Snap uit</option>
                <option value="10">Snap 10 mm</option>
                <option value="50">Snap 50 mm</option>
                <option value="100">Snap 100 mm</option>
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
            data-active={clientView}
            onClick={() => setClientView((v) => !v)}
          >
            {clientView ? 'Klant-zicht aan' : 'Klant-zicht'}
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

            {/* Top-view detail-inset onderaan, alleen in tekening-modus */}
            {!clientView ? (
              <TopViewInset
                order={order}
                x={Math.max(-MARGIN + 20, breedte / 2 - 350)}
                y={hoogte + 170}
                width={700}
                height={220}
              />
            ) : null}
          </svg>
        </div>
      )}

      {exactInput ? (
        <ExactDialog
          orientation={exactInput.orientation}
          value={exactInput.value}
          max={exactInput.orientation === 'vertical' ? breedte : hoogte}
          onCancel={() => setExactInput(null)}
          onConfirm={(v) => {
            if (exactInput.orientation === 'vertical') setVertical(exactInput.id, v)
            else setHorizontal(exactInput.id, v)
            setExactInput(null)
          }}
          onDelete={() => {
            if (exactInput.orientation === 'vertical') removeVertical(exactInput.id)
            else removeHorizontal(exactInput.id)
            setExactInput(null)
          }}
        />
      ) : null}
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

function ExactDialog({ orientation, value, max, onCancel, onConfirm, onDelete }: ExactDialogProps) {
  const label = orientation === 'vertical' ? 'Verticale lijn vanaf links' : 'Horizontale lijn vanaf onder'
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
      <div className="bg-white border border-black p-6 w-full max-w-md">
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
