import { LayoutGrid, Table as TableIcon, Kanban } from 'lucide-react'
import { useT, type TranslationKey } from '../lib/i18n'

export type ViewMode = 'cards' | 'table' | 'kanban'

interface Props {
  value: ViewMode
  onChange: (m: ViewMode) => void
  /** Welke modes te tonen. Default: cards + table. */
  modes?: ViewMode[]
}

const ICON: Record<ViewMode, typeof LayoutGrid> = {
  cards: LayoutGrid,
  table: TableIcon,
  kanban: Kanban,
}
const LABEL_KEY: Record<ViewMode, TranslationKey> = {
  cards: 'view.cards',
  table: 'view.table',
  kanban: 'view.kanban',
}
const ARIA_KEY: Record<ViewMode, TranslationKey> = {
  cards: 'view.cardsAria',
  table: 'view.tableAria',
  kanban: 'view.kanbanAria',
}

export function ViewToggle({ value, onChange, modes = ['cards', 'table'] }: Props) {
  const { t } = useT()
  return (
    <div className="flex border border-ink rounded overflow-hidden">
      {modes.map((m) => {
        const Icon = ICON[m]
        const active = value === m
        return (
          <button
            key={m}
            type="button"
            className="btn btn-ghost btn-icon"
            data-active={active || undefined}
            aria-label={t(ARIA_KEY[m])}
            title={t(LABEL_KEY[m])}
            onClick={() => onChange(m)}
            style={{
              background: active ? 'var(--color-ink)' : undefined,
              color: active ? 'var(--color-paper)' : undefined,
              borderRadius: 0,
            }}
          >
            <Icon size={16} />
          </button>
        )
      })}
    </div>
  )
}

/**
 * localStorage-helpers voor per-pagina viewMode-persistentie.
 */
export function readViewMode(key: string, fallback: ViewMode): ViewMode {
  try {
    const v = localStorage.getItem(`mydoors:view:${key}`)
    if (v === 'cards' || v === 'table' || v === 'kanban') return v
  } catch { /* */ }
  return fallback
}

export function writeViewMode(key: string, mode: ViewMode) {
  try { localStorage.setItem(`mydoors:view:${key}`, mode) } catch { /* */ }
}
