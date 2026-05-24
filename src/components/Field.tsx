import type { InputHTMLAttributes, ReactNode } from 'react'

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  unit?: string
  error?: string | null
  hint?: string
}

export function Field({ label, unit, error, hint, ...rest }: FieldProps) {
  return (
    <label className="block">
      <span className="field-label">
        {label}
        {unit ? <span className="ml-1 text-[10px] tracking-wide">[{unit}]</span> : null}
      </span>
      <input className="field-input" {...rest} />
      {error ? (
        <span className="block text-[11px] text-accent mt-1 font-mono">{error}</span>
      ) : hint ? (
        <span className="block text-[11px] text-zinc-500 mt-1 font-mono">{hint}</span>
      ) : null}
    </label>
  )
}

interface ChipsProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  error?: string | null
}

export function Chips<T extends string>({ label, value, options, onChange, error }: ChipsProps<T>) {
  return (
    <div>
      <span className="field-label block mb-2">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            className="option-chip"
            data-active={o.value === value}
            data-error={!!error}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {error ? <span className="block text-[11px] text-accent mt-1">{error}</span> : null}
    </div>
  )
}

interface MultiChipsProps<T extends string> {
  label: string
  values: T[]
  options: { value: T; label: string }[]
  onChange: (v: T[]) => void
}

export function MultiChips<T extends string>({ label, values, options, onChange }: MultiChipsProps<T>) {
  function toggle(v: T) {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  }
  return (
    <div>
      <span className="field-label block mb-2">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            className="option-chip"
            data-active={values.includes(o.value)}
            onClick={() => toggle(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
