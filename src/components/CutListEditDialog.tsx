import { useMemo, useState } from 'react'
import { Plus, RotateCcw, Save, Trash2, X } from 'lucide-react'
import type { OrderData } from '../lib/types'
import { generateCutList, type CutListItem } from '../lib/cutList'
import { useAppSettings } from '../lib/queries'
import { useT } from '../lib/i18n'

interface Props {
  order: OrderData
  onSave: (items: CutListItem[], note: string) => void
  onClear: () => void
  onClose: () => void
}

/**
 * Editor voor de zaaglijst — opent als modal. De gegenereerde zaaglijst
 * wordt geladen als startpunt; gebruiker kan rijen wijzigen, toevoegen,
 * verwijderen. Bij Bewaren gaat de nieuwe lijst als `cutListOverride`
 * op de order. "Resette naar berekende versie" wist de override weer.
 */
export function CutListEditDialog({ order, onSave, onClear, onClose }: Props) {
  const { t } = useT()
  // Startwaarde = override als die er is, anders de berekende versie
  const { data: settings } = useAppSettings()
  const computed = useMemo(() => generateCutList(order, settings?.cut_formulas), [order, settings?.cut_formulas])
  const initial = order.cutListOverride?.items ?? computed.items
  const [items, setItems] = useState<CutListItem[]>(initial.map((i) => ({ ...i })))
  const [note, setNote] = useState<string>(order.cutListOverride?.note ?? '')
  const hasOverride = !!order.cutListOverride

  function patch(idx: number, p: Partial<CutListItem>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...p } : it)))
  }
  function remove(idx: number) {
    setItems((arr) => arr.filter((_, i) => i !== idx))
  }
  function addNumbered() {
    const maxNr = items.reduce((m, i) => Math.max(m, i.nr ?? 0), 0)
    setItems((arr) => [...arr, { nr: maxNr + 1, profiel: '15*15*1.5', lengte: 0, aantal: 1 }])
  }
  function addExtra() {
    setItems((arr) => [...arr, { nr: null, profiel: 'Juosta-35*4', lengte: 0, aantal: 1 }])
  }
  function renumber() {
    // Herstel nummering: alleen items met een nummer krijgen 1..N in volgorde
    let n = 1
    setItems((arr) => arr.map((it) => (it.nr !== null ? { ...it, nr: n++ } : it)))
  }
  function resetToComputed() {
    if (!confirm(t('cutList.resetConfirm'))) return
    setItems(computed.items.map((i) => ({ ...i })))
    setNote('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 no-print" onClick={onClose}>
      <div
        className="bg-white border border-ink/10 rounded-lg w-full max-w-3xl max-h-[92dvh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-3 border-b border-soft-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--color-muted]">
              {hasOverride ? t('cutList.title.override') : t('cutList.title.edit')}
            </div>
            <h2 className="font-bold text-lg leading-tight" style={{ color: 'var(--color-brand)' }}>
              {order.breedte} × {order.hoogte} mm
            </h2>
            <div className="font-mono text-xs text-[--color-muted] mt-0.5">
              {hasOverride
                ? t('cutList.intro.override')
                : t('cutList.intro.edit')}
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[40px_1fr_100px_70px_1.4fr_36px] gap-2 px-1 text-[10px] uppercase tracking-wider text-[--color-muted] font-mono pb-1">
            <div>{t('cutList.col.nr')}</div>
            <div>{t('cutList.col.profile')}</div>
            <div className="text-right">{t('cutList.col.length')}</div>
            <div className="text-right">{t('cutList.col.count')}</div>
            <div>{t('cutList.col.operation')}</div>
            <div></div>
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[40px_1fr_100px_70px_1.4fr_36px] gap-2 items-center">
              <input
                className="field-input text-center !px-1"
                value={it.nr ?? ''}
                placeholder="—"
                onChange={(e) => patch(i, { nr: e.target.value === '' ? null : Number(e.target.value) })}
              />
              <input
                className="field-input"
                value={it.profiel}
                onChange={(e) => patch(i, { profiel: e.target.value })}
              />
              <input
                className="field-input text-right"
                type="number"
                value={it.lengte}
                onChange={(e) => patch(i, { lengte: Number(e.target.value) })}
              />
              <input
                className="field-input text-right"
                type="number"
                min={1}
                value={it.aantal}
                onChange={(e) => patch(i, { aantal: Math.max(1, Number(e.target.value)) })}
              />
              <input
                className="field-input"
                value={it.bewerking ?? ''}
                placeholder={t('cutList.colPlaceholderOptional')}
                onChange={(e) => patch(i, { bewerking: e.target.value || undefined })}
              />
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => remove(i)}
                aria-label={t('cutList.deleteRowAria')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {items.length === 0 ? (
            <div className="text-center text-[--color-muted] font-mono text-sm py-6 border border-dashed border-soft-2 rounded">
              {t('cutList.empty')}
            </div>
          ) : null}
        </div>

        {/* Actions bovenaan footer */}
        <div className="px-4 py-2 border-t border-soft-2 flex flex-wrap items-center gap-2 bg-paper/40">
          <button type="button" className="btn btn-sm" onClick={addNumbered}>
            <Plus size={14} /> {t('cutList.addNumbered')}
          </button>
          <button type="button" className="btn btn-sm" onClick={addExtra}>
            <Plus size={14} /> {t('cutList.addExtra')}
          </button>
          <button type="button" className="btn btn-sm" onClick={renumber}>
            {t('cutList.renumber')}
          </button>
          <button type="button" className="btn btn-sm" onClick={resetToComputed} title={t('cutList.resetTooltip')}>
            <RotateCcw size={14} /> {t('cutList.reset')}
          </button>
          <div className="flex-1" />
          {hasOverride ? (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                if (!confirm(t('cutList.clearConfirm'))) return
                onClear()
              }}
            >
              {t('cutList.clearOverride')}
            </button>
          ) : null}
        </div>

        {/* Notitie */}
        <div className="px-4 py-2 border-t border-soft-2">
          <label className="block field-label">{t('cutList.noteLabel')}</label>
          <input
            className="field-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('cutList.notePlaceholder')}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-soft-2 px-5 py-3 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={() => onSave(items, note)}>
            <Save size={14} /> {t('cutList.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
