import { Languages } from 'lucide-react'
import { LANGUAGES, useT, type Lang } from '../lib/i18n'

interface Props {
  /** Compact variant — alleen vlag, geen label. Voor de sidebar-collapsed
   *  mode of voor de mobile-drawer. */
  compact?: boolean
  className?: string
}

export function LanguageSwitcher({ compact = false, className }: Props) {
  const { lang, setLang } = useT()

  return (
    <label
      className={`relative inline-flex items-center gap-2 cursor-pointer ${className ?? ''}`}
      title="Language / Taal"
    >
      <Languages size={compact ? 14 : 15} className="text-[--color-muted] shrink-0" />
      {!compact ? (
        <span className="font-mono text-[11px] uppercase tracking-wider text-[--color-muted]">
          {LANGUAGES.find((l) => l.value === lang)?.flag}
        </span>
      ) : null}
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className={
          compact
            ? 'absolute inset-0 opacity-0 cursor-pointer'
            : 'chip cursor-pointer !py-1 !text-xs'
        }
        aria-label="Language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.value} value={l.value}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
      {compact ? (
        <span className="font-mono text-sm leading-none">
          {LANGUAGES.find((l) => l.value === lang)?.flag}
        </span>
      ) : null}
    </label>
  )
}
