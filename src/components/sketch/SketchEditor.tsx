import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { OrderData, SketchData, SketchMode } from '../../lib/types'
import { applyTemplate } from '../../lib/templates'
import { DoorOutline } from './DoorOutline'
import { DraggableLine } from './DraggableLine'
import { DimensionLabels } from './DimensionLabels'
import { HandleIndicator } from './HandleIndicator'
import { FreehandLayer } from './FreehandLayer'
import { TemplateGallery } from './TemplateGallery'
import type { SnapMode } from './SnapHelper'

interface Props {
  order: OrderData
  onChange: (next: OrderData) => void
}

const MARGIN = 200 // mm margin around door for dimension labels

export function SketchEditor({ order, onChange }: Props) {
  const [mode, setMode] = useState<SketchMode>('lijnen')
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

  const viewBox = `${-MARGIN} ${-MARGIN} ${breedte + 2 * MARGIN} ${hoogte + 2 * MARGIN}`

  return (
    <div className="flex flex-col h-full">
      <div className="no-print border-b border-black/10 bg-paper px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          {(['snel', 'lijnen', 'vrij'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="option-chip"
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
              <button type="button" className="option-chip" onClick={addVertical}>
                + Verticaal
              </button>
              <button type="button" className="option-chip" onClick={addHorizontal}>
                + Horizontaal
              </button>
              <select
                className="option-chip cursor-pointer"
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
                className="option-chip"
                onClick={() => updateSketch({ freehand: [] })}
              >
                Wis vrij
              </button>
              {sketch.freehand.length > 0 ? (
                <button
                  type="button"
                  className="option-chip"
                  onClick={() =>
                    updateSketch({ freehand: sketch.freehand.slice(0, -1) })
                  }
                >
                  Ongedaan
                </button>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            className="option-chip"
            data-active={clientView}
            onClick={() => setClientView((v) => !v)}
          >
            {clientView ? 'Klant-zicht aan' : 'Klant-zicht'}
          </button>
        </div>
      </div>

      {mode === 'snel' ? (
        <div className="flex-1 overflow-auto">
          <TemplateGallery order={order} onPick={pickTemplate} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden" style={{ touchAction: 'none' }}>
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

            <HandleIndicator order={order} clientView={clientView} />

            {/* maatvoering — niet in klant-zicht */}
            {!clientView ? <DimensionLabels order={order} /> : null}
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
          <button type="button" className="option-chip" onClick={onDelete}>
            Verwijder lijn
          </button>
          <div className="flex gap-2">
            <button type="button" className="option-chip" onClick={onCancel}>
              Annuleer
            </button>
            <button
              type="button"
              className="option-chip"
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
