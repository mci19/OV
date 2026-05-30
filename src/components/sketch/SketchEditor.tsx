import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, FolderOpen, Sparkles, Trash2 } from 'lucide-react'
import type { OrderData, SketchArea, SketchData, SketchMode } from '../../lib/types'
import { computeAreaBounds } from '../../lib/areaGeometry'
import { applyTemplate } from '../../lib/templates'
import { sketchFromFreehand, sketchFromText } from '../../lib/ai'
import { deleteSketchTemplate, instantiateSketch, listSketchTemplates, saveSketchTemplate, type SketchTemplate } from '../../lib/sketchTemplates'
import { DoorOutline } from './DoorOutline'
import { DraggableLine } from './DraggableLine'
import { DraggableHandle } from './DraggableHandle'
import { DimensionLabels } from './DimensionLabels'
import { FreehandLayer } from './FreehandLayer'
import { CurveLayer } from './CurveLayer'
import { CurveItems } from './CurveItems'
import { areaLabel } from '../../lib/areaGeometry'
import { CurveEditOverlay } from './CurveEditOverlay'
import { DragLoupe } from './DragLoupe'
import { ElementOptionsPanel } from './ElementOptionsPanel'
import { TemplateGallery } from './TemplateGallery'
import { DetailsStrip } from './DetailsStrip'
// Snap-mode dropdown is verwijderd; we hanteren een vaste 10 mm grid.
const FIXED_SNAP_MODE = '10' as const
import { useT } from '../../lib/i18n'

interface Props {
  order: OrderData
  onChange: (next: OrderData) => void
}

const MARGIN = 200 // mm margin around door for dimension labels

const DETAILS_KEY = 'mydoors:sketch:details'

export function SketchEditor({ order, onChange }: Props) {
  const { t, lang } = useT()
  const [mode, setMode] = useState<SketchMode>('lijnen')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiHint, setAiHint] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [showDetails, setShowDetails] = useState<boolean>(() => {
    try { return localStorage.getItem(DETAILS_KEY) !== '0' } catch { return true }
  })
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [browsingTemplates, setBrowsingTemplates] = useState(false)
  // handleExact + exactInput zijn vervangen door 'selected' + ElementOptionsPanel

  useEffect(() => {
    try { localStorage.setItem(DETAILS_KEY, showDetails ? '1' : '0') } catch { /* */ }
  }, [showDetails])
  const snapMode = FIXED_SNAP_MODE
  const [clientView, setClientView] = useState(false)
  // Drag-loupe: toont een 3× gezoomde inset rondom het sleep-punt
  const [loupe, setLoupe] = useState<{ x: number; y: number } | null>(null)
  // Geselecteerd element → toont ElementOptionsPanel rechtsonder.
  // null = niets geselecteerd. Klikken op element selecteert; klikken
  // elders sluit.
  const [selected, setSelected] = useState<
    | { kind: 'handle' }
    | { kind: 'vertical'; id: string }
    | { kind: 'horizontal'; id: string }
    | { kind: 'curve'; id: string }
    | null
  >(null)
  // Welk vlak nieuwe lijnen/curves gaan krijgen. Default 'door'. Gebruiker
  // wisselt via area-chips wanneer er panelen actief zijn.
  const [activeArea, setActiveArea] = useState<SketchArea>('door')
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Als het actieve vlak uit-gefased wordt (bv. gebruiker zet rechter
  // paneel uit terwijl activeArea = 'right_panel'), terugvallen op 'door'.
  useEffect(() => {
    const bounds = computeAreaBounds(order)
    if (!bounds[activeArea].active) setActiveArea('door')
  }, [order, activeArea])

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
    setShowDetails(false)
    // Start de nieuwe lijn in het midden van het actieve vlak — niet
    // langer per definitie midden-deur — anders verschijnt hij visueel
    // buiten het paneel waar de gebruiker hem hebben wil.
    const bounds = computeAreaBounds(order)
    const b = bounds[activeArea].active ? bounds[activeArea] : bounds.door
    const next = b.x + b.w / 2
    updateSketch({
      verticalLines: [
        ...sketch.verticalLines,
        { id: `v-${Date.now().toString(36)}`, x: Math.round(next), area: activeArea },
      ],
    })
  }
  function addHorizontal() {
    setShowDetails(false)
    const bounds = computeAreaBounds(order)
    const b = bounds[activeArea].active ? bounds[activeArea] : bounds.door
    // Y is "vanaf onder" in onze data; bounds.y is "vanaf boven" in svg-
    // coords. Convertie: onder = hoogte - (boven + h/2)
    const next = hoogte - (b.y + b.h / 2)
    updateSketch({
      horizontalLines: [
        ...sketch.horizontalLines,
        { id: `h-${Date.now().toString(36)}`, y: Math.round(next), area: activeArea },
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
      setAiHint(result.explanation || t('sketch.aiHintLines', { v: result.verticalLines.length, h: result.horizontalLines.length }))
      setAiPrompt('')
      setMode('lijnen')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : t('sketch.aiError'))
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
      const aiCurves = (result.curves ?? []).map((c, i) => ({
        id: `ai-c-${stamp}-${i}`,
        d: c.d,
        width: 6,
      }))
      updateSketch({
        verticalLines: [
          ...sketch.verticalLines,
          ...result.verticalLines.map((v, i) => ({ id: `ai-v-${stamp}-${i}`, x: v.x })),
        ],
        horizontalLines: [
          ...sketch.horizontalLines,
          ...result.horizontalLines.map((h, i) => ({ id: `ai-h-${stamp}-${i}`, y: h.y })),
        ],
        curves: [...(sketch.curves ?? []), ...aiCurves],
        freehand: [],
      })
      setAiHint(result.explanation || t('sketch.aiHintFromFree', { n: result.verticalLines.length + result.horizontalLines.length + aiCurves.length }))
      setMode('lijnen')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : t('sketch.aiError'))
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

  // beperk Apple Pencil naar freehand mode automatisch.
  // We registreren de listener exact ÉÉN keer op mount (deps = []) en
  // lezen de actuele mode via een ref. Eerder stond `mode` in de deps,
  // waardoor we na elke mode-switch een nieuwe {once:true} listener
  // toevoegden — de gebruiker werd dan na elke modus-wissel opnieuw
  // naar 'vrij' geforceerd zodra hij de stylus aanraakte.
  const modeRef = useRef<SketchMode>(mode)
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (e.pointerType === 'pen' && modeRef.current !== 'vrij') {
        setMode('vrij')
      }
    }
    window.addEventListener('pointerdown', onPointer, { capture: true, once: true })
    return () => window.removeEventListener('pointerdown', onPointer, { capture: true })
  }, [])

  // Pulse-feedback: elke configuratie-wijziging triggert een korte glow
  // op de tekening zodat de gebruiker zichtbare bevestiging krijgt.
  // Hash van alle "visueel relevante" opties; wijzigt → React remount
  // van de overlay-div → CSS animation start opnieuw.
  const pulseKey = useMemo(() => {
    // Hash POSITIES (niet alleen .length) zodat het slepen of wijzigen
    // van een bestaande lijn ook een pulse triggert.
    return [
      order.colorKind, order.colorOther,
      order.glassType, order.glassOther,
      order.system, order.variants.join(','), order.softOpen, order.softClose,
      order.finishing,
      order.handleKind, order.handleVerticalMm, order.handleOther,
      order.handlePosition.side, order.handlePosition.heightFromBottom,
      order.hingeKind, order.hingeSide,
      order.breedte, order.hoogte,
      order.doorConfig, order.sidePanels.join(','),
      order.leftPanelWidth, order.rightPanelWidth, order.topPanelHeight,
      sketch.verticalLines.map((v) => `${v.x}:${v.area ?? 'door'}`).join(','),
      sketch.horizontalLines.map((h) => `${h.y}:${h.area ?? 'door'}`).join(','),
      (sketch.curves ?? []).map((c) => `${c.d}:${c.area ?? 'door'}`).join('|'),
      sketch.freehand.length,
    ].join('|')
  }, [order, sketch])

  const viewBox = `${-MARGIN} ${-MARGIN} ${breedte + 2 * MARGIN} ${hoogte + 2 * MARGIN}`

  // Vlakken die nu actief zijn op de deur — gebruikt voor de area-picker
  // én voor de klik-overlay binnen het canvas.
  const activeAreasList: SketchArea[] = (() => {
    const bounds = computeAreaBounds(order)
    return (['door', 'left_panel', 'right_panel', 'top_panel'] as SketchArea[])
      .filter((a) => bounds[a].active)
  })()

  return (
    <div className="flex flex-col h-full">
      {/* ── Rij 1 — modus + vlak-kiezer (centraal, altijd zichtbaar voor
              lijnen/curve zodat de gebruiker niet vastloopt). ── */}
      <div className="no-print border-b border-black/10 bg-paper px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[--color-muted] mr-1">
            {t('sketch.modeLabel')}
          </span>
          {(['snel', 'lijnen', 'vrij', 'curve'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="chip"
              data-active={mode === m}
              onClick={() => setMode(m)}
            >
              {m === 'snel' ? t('sketch.mode.snel') : m === 'lijnen' ? t('sketch.mode.lijnen') : m === 'vrij' ? t('sketch.mode.vrij') : t('sketch.mode.curve')}
            </button>
          ))}
        </div>
        {(mode === 'lijnen' || mode === 'curve') && activeAreasList.length > 1 ? (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[--color-muted] mr-1">
              {t('sketch.area')}
            </span>
            {activeAreasList.map((a) => (
              <button
                key={a}
                type="button"
                className="chip"
                data-active={activeArea === a}
                onClick={() => setActiveArea(a)}
              >
                {areaLabel(a, lang)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Rij 2 — acties binnen het geselecteerde modus. Alleen zichtbaar
              wanneer er iets te kiezen valt (anders blijft de toolbar leeg). ── */}
      {(mode === 'lijnen' || mode === 'vrij' || mode === 'curve') ? (
        <div className="no-print border-b border-black/10 bg-paper/60 px-3 py-1.5 flex items-center gap-1 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[--color-muted] mr-1">
            {t('sketch.actionsLabel')}
          </span>
          {mode === 'lijnen' ? (
            <>
              <button type="button" className="chip" onClick={addVertical}>
                {t('sketch.addVertical')}
              </button>
              <button type="button" className="chip" onClick={addHorizontal}>
                {t('sketch.addHorizontal')}
              </button>
            </>
          ) : null}
          {mode === 'vrij' ? (
            <>
              <button type="button" className="chip" onClick={() => updateSketch({ freehand: [] })}>
                {t('sketch.clearFree')}
              </button>
              {sketch.freehand.length > 0 ? (
                <button
                  type="button"
                  className="chip"
                  onClick={() => updateSketch({ freehand: sketch.freehand.slice(0, -1) })}
                >
                  {t('sketch.undo')}
                </button>
              ) : null}
              {sketch.freehand.length > 0 ? (
                <button
                  type="button"
                  className="chip"
                  data-active
                  onClick={convertFreehandToLines}
                  disabled={aiBusy}
                  title={t('sketch.aiConvertTooltip')}
                >
                  <Sparkles size={14} /> {aiBusy ? t('sketch.aiBusy') : t('sketch.aiConvert')}
                </button>
              ) : null}
            </>
          ) : null}
          {mode === 'curve' ? (
            <>
              <button type="button" className="chip" onClick={() => updateSketch({ curves: [] })}>
                {t('sketch.curve.clear')}
              </button>
              {(sketch.curves?.length ?? 0) > 0 ? (
                <button
                  type="button"
                  className="chip"
                  onClick={() => updateSketch({ curves: (sketch.curves ?? []).slice(0, -1) })}
                >
                  {t('sketch.curve.undo')}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {/* ── Rij 3 — view-opties + templates. Stabiel, altijd op dezelfde
              positie zodat ze niet door modus-wisselingen verschuiven. ── */}
      <div className="no-print border-b border-black/10 bg-paper/40 px-3 py-1.5 flex items-center gap-1 flex-wrap">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[--color-muted] mr-1">
          {t('sketch.viewLabel')}
        </span>
        <button
          type="button"
          className="chip"
          data-active={aiOpen}
          onClick={() => setAiOpen((v) => !v)}
          title={t('sketch.aiToggleTooltip')}
        >
          <Sparkles size={14} /> {t('sketch.aiToggle')}
        </button>
        <button
          type="button"
          className="chip"
          data-active={showDetails}
          onClick={() => setShowDetails((v) => !v)}
          title={t('sketch.detailsTooltip')}
        >
          {t('sketch.details')}
        </button>
        <button
          type="button"
          className="chip"
          data-active={clientView}
          onClick={() => setClientView((v) => !v)}
        >
          {clientView ? t('sketch.clientViewOn') : t('sketch.clientView')}
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="chip"
            onClick={() => setSavingTemplate(true)}
            title={t('sketch.saveTooltip')}
          >
            <Bookmark size={14} /> {t('sketch.save')}
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setBrowsingTemplates(true)}
            title={t('sketch.openTooltip')}
          >
            <FolderOpen size={14} /> {t('sketch.open')}
          </button>
        </div>
      </div>

      {/* AI-prompt row — alleen tonen wanneer de gebruiker de AI-chip
          openzet, anders eet 50px verticale ruimte van het canvas. */}
      {aiOpen ? (
        <div className="no-print border-b border-black/10 bg-paper/60 px-3 py-2 flex items-center gap-2">
          <Sparkles size={14} className="text-accent shrink-0" />
          <input
            className="field-input !border-soft-2 !py-1 text-sm flex-1 min-w-0"
            placeholder={t('sketch.aiPlaceholder')}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                runAiFromText()
              }
            }}
            disabled={aiBusy}
            autoFocus
          />
          <button
            type="button"
            className="chip"
            data-active
            onClick={runAiFromText}
            disabled={!aiPrompt.trim() || aiBusy}
          >
            {aiBusy ? '…' : t('sketch.aiGenerate')}
          </button>
        </div>
      ) : null}

      {aiError || aiHint ? (
        <div className={`no-print px-3 py-1.5 text-xs font-mono ${aiError ? 'bg-accent text-paper' : 'bg-soft text-ink'}`}>
          {aiError || aiHint}
        </div>
      ) : null}

      {/* Warning wanneer greep niet op staal staat. Steel-targets =
          deur-randen (bladeX, bladeX+bladeW) + alle verticale design-
          lijnen. 30 mm tolerantie zoals in DoorOutline. */}
      {(() => {
        if (clientView || order.handleKind === 'none' || order.handleKind === 'veerklink') return null
        const handleX = order.handlePosition.x
        if (typeof handleX !== 'number') return null // gebruikt default-side, altijd op staal
        const bladeWidth = Math.max(0, breedte - 88)
        const bladeX = (breedte - bladeWidth) / 2
        const steelTargets = [bladeX, bladeX + bladeWidth, ...sketch.verticalLines.map((v) => v.x)]
        const minDist = Math.min(...steelTargets.map((t) => Math.abs(handleX - t)))
        if (minDist <= 30) return null
        return (
          <div className="no-print px-3 py-1.5 text-xs font-mono bg-accent text-paper">
            {t('order.handleOnGlassWarning')}
          </div>
        )
      })()}

      {mode === 'curve' && !clientView ? (
        <div className="no-print px-3 py-1.5 text-xs font-mono bg-paper/60 border-b border-soft-2 text-[--color-muted]">
          {t('sketch.curve.hint.start')} → {t('sketch.curve.hint.control')} → {t('sketch.curve.hint.end')}
        </div>
      ) : null}

      {mode === 'snel' ? (
        <div className="flex-1 overflow-auto">
          <TemplateGallery order={order} onPick={pickTemplate} />
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 overflow-hidden relative"
          style={{ touchAction: 'none' }}
          onPointerDownCapture={() => setShowDetails(false)}
        >
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

            {/* curves drawing surface (3-klik bezier). Rendering van bestaande
                curves gebeurt per-area in het clipPath-blok hieronder. */}
            <CurveLayer
              doorWidth={breedte}
              doorHeight={hoogte}
              active={mode === 'curve' && !clientView}
              toUserX={toUserX}
              toUserY={toUserY}
              onAddCurve={(c) =>
                updateSketch({ curves: [...(sketch.curves ?? []), { ...c, area: activeArea }] })
              }
            />

            {/* Curve-edit overlay: control-points + body-drag voor de
                geselecteerde curve. Toont alleen wanneer er een curve
                is geselecteerd in het options-panel. */}
            {selected?.kind === 'curve' ? (() => {
              const c = (sketch.curves ?? []).find((x) => x.id === selected.id)
              if (!c) return null
              return (
                <CurveEditOverlay
                  curve={c}
                  doorWidth={breedte}
                  doorHeight={hoogte}
                  toUserX={toUserX}
                  toUserY={toUserY}
                  onChange={(next) => {
                    updateSketch({
                      curves: (sketch.curves ?? []).map((x) => x.id === next.id ? next : x),
                    })
                  }}
                />
              )
            })() : null}

            {/* Lijnen + curves per area renderen binnen een clipPath
                zodat ze niet doorlopen in andere vlakken. */}
            {(() => {
              const bounds = computeAreaBounds(order)
              const areas: SketchArea[] = ['door', 'left_panel', 'right_panel', 'top_panel']
              return (
                <>
                  <defs>
                    {areas.map((a) => {
                      const b = bounds[a]
                      if (!b.active) return null
                      return (
                        <clipPath key={`clip-${a}`} id={`area-clip-${a}`}>
                          <rect x={b.x} y={b.y} width={b.w} height={b.h} />
                        </clipPath>
                      )
                    })}
                  </defs>

                  {areas.map((a) => {
                    if (!bounds[a].active) return null
                    const vLines = sketch.verticalLines.filter((v) => (v.area ?? 'door') === a)
                    const hLines = sketch.horizontalLines.filter((h) => (h.area ?? 'door') === a)
                    const aCurves = (sketch.curves ?? []).filter((c) => (c.area ?? 'door') === a)
                    if (vLines.length === 0 && hLines.length === 0 && aCurves.length === 0) return null
                    return (
                      <g key={`area-${a}`} clipPath={`url(#area-clip-${a})`}>
                        {vLines.map((v) => (
                          <DraggableLine
                            key={v.id}
                            orientation="vertical"
                            value={v.x}
                            doorWidth={breedte}
                            doorHeight={hoogte}
                            others={vLines.filter((o) => o.id !== v.id).map((o) => o.x)}
                            snapMode={snapMode}
                            onChange={(nv) => setVertical(v.id, nv)}
                            onCommit={(nv) => setVertical(v.id, nv)}
                            onRequestDelete={() => removeVertical(v.id)}
                            onRequestExact={() => setSelected({ kind: 'vertical', id: v.id })}
                            onDragMove={(pos) => setLoupe(pos)}
                            onDragEnd={() => setLoupe(null)}
                            toUserX={toUserX}
                            toUserY={toUserY}
                          />
                        ))}
                        {hLines.map((h) => (
                          <DraggableLine
                            key={h.id}
                            orientation="horizontal"
                            value={h.y}
                            doorWidth={breedte}
                            doorHeight={hoogte}
                            others={hLines.filter((o) => o.id !== h.id).map((o) => o.y)}
                            snapMode={snapMode}
                            onChange={(nv) => setHorizontal(h.id, nv)}
                            onCommit={(nv) => setHorizontal(h.id, nv)}
                            onRequestDelete={() => removeHorizontal(h.id)}
                            onRequestExact={() => setSelected({ kind: 'horizontal', id: h.id })}
                            onDragMove={(pos) => setLoupe(pos)}
                            onDragEnd={() => setLoupe(null)}
                            toUserX={toUserX}
                            toUserY={toUserYFromBottom}
                          />
                        ))}
                        <CurveItems
                          curves={aCurves}
                          onSelectCurve={
                            mode === 'curve' && !clientView
                              ? undefined
                              : (id) => setSelected({ kind: 'curve', id })
                          }
                        />
                      </g>
                    )
                  })}
                </>
              )
            })()}

            {/* Klik-om-vlak-te-kiezen overlay. Toont alleen wanneer er
                meerdere actieve vlakken zijn en de gebruiker NIET aan
                het vrije tekenen of curve-tekenen is (anders eet de hit-
                rect de pointer-events op). Highlight het actieve vlak
                met een licht-oranje rand. */}
            {!clientView && activeAreasList.length > 1 && mode !== 'vrij' && mode !== 'curve' ? (
              <g>
                {activeAreasList.map((a) => {
                  const b = computeAreaBounds(order)[a]
                  return (
                    <rect
                      key={`pick-${a}`}
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      fill="transparent"
                      stroke={activeArea === a ? '#FF5C00' : 'transparent'}
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      vectorEffect="non-scaling-stroke"
                      style={{ cursor: 'pointer' }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        setActiveArea(a)
                      }}
                    />
                  )
                })}
              </g>
            ) : null}

            {/* maatvoering — niet in klant-zicht */}
            {!clientView ? <DimensionLabels order={order} /> : null}

            {/* Draggable greep — alleen interactief in tekening-mode.
                Snap-targets: deur-rand (default-side) + alle verticale en
                horizontale design-lijnen. Greep MOET op ijzer staan (rand
                of een design-lijn), niet op glas. */}
            {!clientView && order.handleKind !== 'none' ? (
              <DraggableHandle
                heightFromBottom={order.handlePosition.heightFromBottom}
                x={order.handlePosition.x}
                doorWidth={breedte}
                doorHeight={hoogte}
                side={order.handlePosition.side}
                snapXTargets={sketch.verticalLines.map((v) => v.x)}
                snapYTargets={sketch.horizontalLines.map((h) => h.y)}
                onChange={(next) => onChange({
                  ...order,
                  handlePosition: {
                    ...order.handlePosition,
                    heightFromBottom: next.heightFromBottom,
                    x: next.x,
                  },
                })}
                onRequestExact={() => setSelected({ kind: 'handle' })}
                onDragStart={() => setShowDetails(false)}
                onDragMove={(pos) => setLoupe(pos)}
                onDragEnd={() => setLoupe(null)}
                toUserX={toUserX}
                toUserY={toUserY}
              />
            ) : null}
          </svg>

          {/* Drag-loupe overlay — verschijnt rechtsboven tijdens drag */}
          {loupe ? (
            <DragLoupe
              focusX={loupe.x}
              focusY={loupe.y}
              doorWidth={breedte}
              doorHeight={hoogte}
            >
              {/* Mini-content: deur-rand + glas-zone + lijnen + handle */}
              <rect x={0} y={0} width={breedte} height={hoogte}
                fill="#FAFAF7" stroke="#0A0A0A" strokeWidth={1.5}
                vectorEffect="non-scaling-stroke" />
              {/* Glas-zone — toont waar de greep NIET op mag staan */}
              {(() => {
                const bladeW = Math.max(0, breedte - 88)
                const bladeH = Math.max(0, hoogte - 30)
                const bladeX = (breedte - bladeW) / 2
                const bladeY = (hoogte - bladeH) / 2
                const glassW = Math.max(0, bladeW - 8)
                const glassH = Math.max(0, bladeH - 48)
                const glassX = bladeX + (bladeW - glassW) / 2
                const glassY = bladeY + 24
                return (
                  <>
                    <rect x={bladeX} y={bladeY} width={bladeW} height={bladeH}
                      fill="none" stroke="#0A0A0A" strokeWidth={1}
                      vectorEffect="non-scaling-stroke" />
                    <rect x={glassX} y={glassY} width={glassW} height={glassH}
                      fill="#DCE7EE" stroke="#9BB3C8" strokeWidth={0.5}
                      vectorEffect="non-scaling-stroke" />
                  </>
                )
              })()}
              {/* Design lijnen */}
              {sketch.verticalLines.map((v) => (
                <line key={`l-v-${v.id}`} x1={v.x} y1={0} x2={v.x} y2={hoogte}
                  stroke="#0A0A0A" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              ))}
              {sketch.horizontalLines.map((h) => {
                const y = hoogte - h.y
                return (
                  <line key={`l-h-${h.id}`} x1={0} y1={y} x2={breedte} y2={y}
                    stroke="#0A0A0A" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                )
              })}
              {/* Curves */}
              {(sketch.curves ?? []).map((c) => (
                <path key={c.id} d={c.d} fill="none" stroke="#0A0A0A"
                  strokeWidth={c.width} vectorEffect="non-scaling-stroke" />
              ))}
            </DragLoupe>
          ) : null}

          {/* Element-options panel — verschijnt na long-press op een
              greep of design-lijn. Bevat mm-inputs, Reset-positie
              (alleen handle) en Verwijder. */}
          {selected ? (() => {
            const bladeWidth = Math.max(0, breedte - 88)
            const bladeX = (breedte - bladeWidth) / 2
            const handleSide: 'left' | 'right' = order.hingeSide === 'belgisch_links' ? 'right' : 'left'
            if (selected.kind === 'handle') {
              const xDefault = handleSide === 'left' ? bladeX + 4 : bladeX + bladeWidth - 4
              const yDefault = order.handlePosition.heightFromBottom
              const xCurrent = order.handlePosition.x ?? xDefault
              const yCurrent = order.handlePosition.heightFromBottom
              const xOverridden = typeof order.handlePosition.x === 'number'
              return (
                <ElementOptionsPanel
                  selected={{ kind: 'handle', xDefault, yDefault, xCurrent, yCurrent, xOverridden }}
                  doorWidth={breedte}
                  doorHeight={hoogte}
                  onApply={(next) => {
                    if (next.kind !== 'handle') return
                    onChange({
                      ...order,
                      handlePosition: {
                        ...order.handlePosition,
                        x: next.xOverridden ? next.xCurrent : undefined,
                        heightFromBottom: next.yCurrent,
                      },
                    })
                  }}
                  onReset={() => {
                    onChange({
                      ...order,
                      handlePosition: { ...order.handlePosition, x: undefined },
                    })
                  }}
                  onClose={() => setSelected(null)}
                />
              )
            }
            const availableAreas: SketchArea[] = (() => {
              const bounds = computeAreaBounds(order)
              return (['door', 'left_panel', 'right_panel', 'top_panel'] as SketchArea[])
                .filter((a) => bounds[a].active)
            })()
            if (selected.kind === 'vertical') {
              const v = sketch.verticalLines.find((vl) => vl.id === selected.id)
              if (!v) { setSelected(null); return null }
              return (
                <ElementOptionsPanel
                  selected={{ kind: 'vertical', id: v.id, value: v.x, area: v.area ?? 'door' }}
                  doorWidth={breedte}
                  doorHeight={hoogte}
                  availableAreas={availableAreas}
                  onApply={(next) => {
                    if (next.kind !== 'vertical') return
                    updateSketch({
                      verticalLines: sketch.verticalLines.map((vl) =>
                        vl.id === v.id ? { ...vl, x: next.value, area: next.area } : vl,
                      ),
                    })
                  }}
                  onDelete={() => { removeVertical(v.id); setSelected(null) }}
                  onClose={() => setSelected(null)}
                />
              )
            }
            if (selected.kind === 'horizontal') {
              const h = sketch.horizontalLines.find((hl) => hl.id === selected.id)
              if (!h) { setSelected(null); return null }
              return (
                <ElementOptionsPanel
                  selected={{ kind: 'horizontal', id: h.id, value: h.y, area: h.area ?? 'door' }}
                  doorWidth={breedte}
                  doorHeight={hoogte}
                  availableAreas={availableAreas}
                  onApply={(next) => {
                    if (next.kind !== 'horizontal') return
                    updateSketch({
                      horizontalLines: sketch.horizontalLines.map((hl) =>
                        hl.id === h.id ? { ...hl, y: next.value, area: next.area } : hl,
                      ),
                    })
                  }}
                  onDelete={() => { removeHorizontal(h.id); setSelected(null) }}
                  onClose={() => setSelected(null)}
                />
              )
            }
            // curve
            const c = (sketch.curves ?? []).find((cu) => cu.id === selected.id)
            if (!c) { setSelected(null); return null }
            return (
              <ElementOptionsPanel
                selected={{ kind: 'curve', id: c.id, d: c.d, area: c.area ?? 'door' }}
                doorWidth={breedte}
                doorHeight={hoogte}
                availableAreas={availableAreas}
                onApply={(next) => {
                  if (next.kind !== 'curve') return
                  updateSketch({
                    curves: (sketch.curves ?? []).map((cu) =>
                      cu.id === c.id ? { ...cu, area: next.area } : cu,
                    ),
                  })
                }}
                onDelete={() => {
                  updateSketch({ curves: (sketch.curves ?? []).filter((x) => x.id !== c.id) })
                  setSelected(null)
                }}
                onClose={() => setSelected(null)}
              />
            )
          })() : null}
        </div>
      )}

      {/* Detail-aanzichten onder het hoofdcanvas, alleen tekening-mode */}
      {mode !== 'snel' && !clientView && showDetails ? (
        <div className="max-h-[40vh] overflow-y-auto">
          <DetailsStrip order={order} />
        </div>
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
            setAiHint(t('sketch.templateAppliedHint', { name: tpl.name }))
          }}
        />
      ) : null}
    </div>
  )
}

// ─── Sketch-template dialogs ─────────────────────────────

function SaveTemplateDialog({ order, onClose }: { order: OrderData; onClose: () => void }) {
  const { t } = useT()
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
        <h3 className="font-mono font-bold uppercase tracking-widest text-sm mb-3">{t('sketch.saveTemplateTitle')}</h3>
        <label className="block field-label">{t('sketch.templateName')}</label>
        <input className="field-input mb-3" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <label className="block field-label">{t('sketch.templateDesc')}</label>
        <textarea className="field-input min-h-[60px] mb-3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('sketch.templateDescPlaceholder')} />
        <div className="font-mono text-xs text-[--color-muted] mb-4">
          {t('sketch.templatesLocalNote')}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={save}>{t('common.save')}</button>
        </div>
      </div>
    </div>
  )
}

function BrowseTemplatesDialog({ onClose, onApply }: { onClose: () => void; onApply: (t: SketchTemplate) => void }) {
  const { t, lang } = useT()
  const [templates, setTemplates] = useState<SketchTemplate[]>(() => listSketchTemplates())
  function remove(id: string) {
    if (!confirm(t('sketch.templateDeleteConfirm'))) return
    deleteSketchTemplate(id)
    setTemplates(listSketchTemplates())
  }
  const locale = lang === 'en' ? 'en-GB' : 'nl-BE'
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print" onClick={onClose}>
      <div className="bg-paper border border-ink w-full max-w-2xl max-h-[80dvh] p-5 rounded-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono font-bold uppercase tracking-widest text-sm">{t('sketch.savedTemplatesTitle')}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.close')}</button>
        </div>
        {templates.length === 0 ? (
          <div className="text-[--color-muted] font-mono text-sm py-8 text-center border border-dashed border-soft-2 rounded">
            {t('sketch.savedTemplatesEmpty')}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {templates.map((tpl) => (
              <div key={tpl.id} className="border border-soft-2 bg-white p-3 rounded flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{tpl.name}</div>
                  <div className="font-mono text-[11px] text-[--color-muted] mt-1">
                    {tpl.doorWidth}×{tpl.doorHeight} · {tpl.sketch.verticalLines.length}v + {tpl.sketch.horizontalLines.length}h{tpl.sketch.freehand.length ? t('sketch.templateFreeSuffix', { n: tpl.sketch.freehand.length }) : ''} · {new Date(tpl.savedAt).toLocaleDateString(locale)}
                  </div>
                  {tpl.description ? <div className="text-xs text-[--color-muted] mt-1 truncate">{tpl.description}</div> : null}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => onApply(tpl)}>{t('sketch.templateApply')}</button>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(tpl.id)} aria-label={t('common.delete')}>
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

