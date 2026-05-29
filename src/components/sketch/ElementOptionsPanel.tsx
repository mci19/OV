import { useEffect, useState } from 'react'
import { RotateCcw, Trash2, X } from 'lucide-react'
import { useT } from '../../lib/i18n'

export type SelectedElement =
  | { kind: 'handle'; xDefault: number; yDefault: number; xCurrent: number; yCurrent: number; xOverridden: boolean }
  | { kind: 'vertical'; id: string; value: number }
  | { kind: 'horizontal'; id: string; value: number }
  | { kind: 'curve'; id: string; d: string }

interface Props {
  selected: SelectedElement
  doorWidth: number
  doorHeight: number
  onApply: (next: SelectedElement) => void
  onReset?: () => void
  onDelete?: () => void
  onClose: () => void
}

/**
 * Drijvend panel rechtsonder dat verschijnt wanneer de gebruiker op een
 * element klikt (greep of design-lijn). Toont mm-inputs + Reset (alleen
 * voor handle: terug naar default-positie) + Verwijder + Sluit.
 *
 * Compact en draggable-vrij — wordt boven de canvas overlay weergegeven.
 */
export function ElementOptionsPanel({
  selected,
  doorWidth,
  doorHeight,
  onApply,
  onReset,
  onDelete,
  onClose,
}: Props) {
  const { t } = useT()

  // Lokale draft zodat inputs niet bij elke keypress de state pushen
  const [draft, setDraft] = useState<SelectedElement>(selected)

  useEffect(() => {
    // Re-sync wanneer een nieuw element wordt geselecteerd
    setDraft(selected)
  }, [selected])

  // ESC sluit het paneel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function commit(next: SelectedElement) {
    setDraft(next)
    onApply(next)
  }

  return (
    <div
      className="absolute bottom-3 right-3 z-30 bg-white border border-ink/15 rounded-lg shadow-2xl no-print"
      style={{ width: 260 }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-soft-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[--color-muted]">
          {selected.kind === 'handle'
            ? t('elemOpts.handleTitle')
            : selected.kind === 'vertical'
              ? t('elemOpts.verticalTitle')
              : selected.kind === 'horizontal'
                ? t('elemOpts.horizontalTitle')
                : t('elemOpts.curveTitle')}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {selected.kind === 'handle' ? (
          <>
            <label className="block">
              <span className="field-label">X (mm vanaf links)</span>
              <input
                type="number"
                className="field-input"
                value={(draft as { xCurrent: number }).xCurrent}
                min={0}
                max={doorWidth}
                step={1}
                onChange={(e) => {
                  const x = Math.max(0, Math.min(doorWidth, Number(e.target.value)))
                  commit({ ...(draft as Extract<SelectedElement, { kind: 'handle' }>), xCurrent: x, xOverridden: true })
                }}
              />
            </label>
            <label className="block">
              <span className="field-label">Y (mm vanaf onder)</span>
              <input
                type="number"
                className="field-input"
                value={(draft as { yCurrent: number }).yCurrent}
                min={0}
                max={doorHeight}
                step={1}
                onChange={(e) => {
                  const y = Math.max(0, Math.min(doorHeight, Number(e.target.value)))
                  commit({ ...(draft as Extract<SelectedElement, { kind: 'handle' }>), yCurrent: y })
                }}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-sm flex-1 justify-center"
                onClick={() => commit({
                  ...(draft as Extract<SelectedElement, { kind: 'handle' }>),
                  xCurrent: Math.round(doorWidth / 2),
                  xOverridden: true,
                })}
                title={t('elemOpts.centerHorizontalHint')}
              >
                {t('elemOpts.centerHorizontal')}
              </button>
              {onReset && (selected as { xOverridden: boolean }).xOverridden ? (
                <button type="button" className="btn btn-sm flex-1 justify-center" onClick={onReset}>
                  <RotateCcw size={14} /> {t('elemOpts.resetPosition')}
                </button>
              ) : null}
            </div>
          </>
        ) : selected.kind === 'curve' ? (
          <div className="font-mono text-[11px] text-[--color-muted] space-y-1">
            <div>{t('elemOpts.curveInfo')}</div>
            <code className="block bg-paper/40 p-2 rounded text-[10px] break-all">
              {(draft as { d: string }).d}
            </code>
          </div>
        ) : (
          <label className="block">
            <span className="field-label">
              {selected.kind === 'vertical'
                ? t('sketch.exactVertical')
                : t('sketch.exactHorizontal')}
            </span>
            <input
              type="number"
              className="field-input"
              value={(draft as { value: number }).value}
              min={0}
              max={selected.kind === 'vertical' ? doorWidth : doorHeight}
              step={1}
              onChange={(e) => {
                const max = selected.kind === 'vertical' ? doorWidth : doorHeight
                const v = Math.max(0, Math.min(max, Number(e.target.value)))
                commit({ ...(draft as Extract<SelectedElement, { kind: 'vertical' | 'horizontal' }>), value: v })
              }}
            />
            <div className="font-mono text-[11px] text-[--color-muted] mt-1">
              0 – {selected.kind === 'vertical' ? doorWidth : doorHeight} mm
            </div>
          </label>
        )}

        {onDelete ? (
          <button type="button" className="btn btn-sm btn-danger w-full justify-center" onClick={onDelete}>
            <Trash2 size={14} /> {t('common.delete')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
