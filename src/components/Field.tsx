import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  unit?: string
  error?: string | null
  hint?: string
}

export function Field({ label, unit, error, hint, ...rest }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {unit ? <span className="ml-1 normal-case text-[10px] opacity-70">[{unit}]</span> : null}
      </span>
      <input className="field-input" data-invalid={!!error || undefined} {...rest} />
      {error ? (
        <span className="block text-[11px] text-accent mt-1 font-mono">{error}</span>
      ) : hint ? (
        <span className="block text-[11px] text-[--color-muted] mt-1 font-mono">{hint}</span>
      ) : null}
    </label>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
}

export function TextAreaField({ label, hint, ...rest }: TextAreaFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea className="field-input" {...rest} />
      {hint ? <span className="block text-[11px] text-[--color-muted] mt-1 font-mono">{hint}</span> : null}
    </label>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  hint?: string
}

export function SelectField({ label, value, onChange, options, hint }: SelectFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint ? <span className="block text-[11px] text-[--color-muted] mt-1 font-mono">{hint}</span> : null}
    </label>
  )
}

interface ChipsProps<T extends string> {
  label?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  error?: string | null
}

export function Chips<T extends string>({ label, value, options, onChange, error }: ChipsProps<T>) {
  return (
    <div>
      {label ? <span className="field-label">{label}</span> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            className="chip"
            data-active={o.value === value}
            data-invalid={!!error || undefined}
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
  label?: string
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
      {label ? <span className="field-label">{label}</span> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            className="chip"
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

// ─── Helpers ─────────────────────────────────────────────────

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="section-h">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
