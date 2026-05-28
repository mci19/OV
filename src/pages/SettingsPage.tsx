import { useEffect, useState, type FormEvent } from 'react'
import { Building2, FileText, ListChecks, Save, Plus, Trash2, ArrowUp, ArrowDown, Scissors, RotateCcw } from 'lucide-react'
import { PageContainer, PageHeader } from '../components/Layout'
import { Field, FieldRow, TextAreaField } from '../components/Field'
import { useAllOptionLists, useAppSettings, useUpdateAppSettings, useUpdateOptionList } from '../lib/queries'
import { DEFAULT_APP_SETTINGS, DEFAULT_CUT_FORMULAS, type AppSettings, type CutFormulas, type OptionItem, type OptionList } from '../lib/db'

type Tab = 'bedrijf' | 'offerte' | 'order' | 'zagerij' | 'opties'

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: 'bedrijf', label: 'Bedrijf', icon: Building2 },
  { id: 'offerte', label: 'Offerte', icon: FileText },
  { id: 'order',   label: 'Order-defaults', icon: FileText },
  { id: 'zagerij', label: 'Zagerij-formules', icon: Scissors },
  { id: 'opties',  label: 'Optie-lijsten', icon: ListChecks },
]

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('bedrijf')
  return (
    <PageContainer>
      <PageHeader
        title="Instellingen"
        subtitle="Bedrijfsgegevens, offerte-defaults en configureerbare keuzelijsten"
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 border-b border-soft-2">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors"
              style={{
                borderColor: tab === t.id ? 'var(--color-brand)' : 'transparent',
                color: tab === t.id ? 'var(--color-brand)' : 'var(--color-muted)',
                fontWeight: tab === t.id ? 600 : 400,
              }}
              onClick={() => setTab(t.id)}
            >
              <Icon size={16} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'bedrijf' || tab === 'offerte' || tab === 'order' ? (
        <AppSettingsTab tab={tab} />
      ) : tab === 'zagerij' ? (
        <ZagerijTab />
      ) : (
        <OptionListsTab />
      )}
    </PageContainer>
  )
}

// ─── App settings tabs ───────────────────────────────────────

function AppSettingsTab({ tab }: { tab: 'bedrijf' | 'offerte' | 'order' }) {
  const { data: server, isLoading } = useAppSettings()
  const update = useUpdateAppSettings()
  const [draft, setDraft] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [savedHint, setSavedHint] = useState<string | null>(null)

  useEffect(() => {
    if (server) setDraft({ ...DEFAULT_APP_SETTINGS, ...server, cut_formulas: { ...DEFAULT_CUT_FORMULAS, ...(server.cut_formulas ?? {}) } })
  }, [server])

  function set<K extends keyof AppSettings>(k: K, v: AppSettings[K]) {
    setDraft((d) => ({ ...d, [k]: v }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSavedHint(null)
    try {
      // We sturen alleen het diff t.o.v. server om RLS-strict te zijn
      const { id: _id, updated_at: _updated, ...patch } = draft
      void _id; void _updated
      await update.mutateAsync(patch)
      setSavedHint('Instellingen opgeslagen.')
      setTimeout(() => setSavedHint(null), 2000)
    } catch (err) {
      setSavedHint(`Fout: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (isLoading) return <div className="text-[--color-muted] font-mono text-sm">Laden…</div>

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      {tab === 'bedrijf' ? (
        <div className="card space-y-4">
          <h2 className="section-h">Bedrijfsgegevens</h2>
          <Field label="Bedrijfsnaam" value={draft.company_name} onChange={(e) => set('company_name', e.target.value)} />
          <Field label="Straat + nr" value={draft.company_address_line1 ?? ''} onChange={(e) => set('company_address_line1', e.target.value)} />
          <FieldRow>
            <Field label="Postcode" value={draft.company_address_postal ?? ''} onChange={(e) => set('company_address_postal', e.target.value)} />
            <Field label="Gemeente" value={draft.company_address_city ?? ''} onChange={(e) => set('company_address_city', e.target.value)} />
          </FieldRow>
          <FieldRow>
            <Field label="E-mail" type="email" value={draft.company_email ?? ''} onChange={(e) => set('company_email', e.target.value)} />
            <Field label="Telefoon" type="tel" value={draft.company_phone ?? ''} onChange={(e) => set('company_phone', e.target.value)} />
          </FieldRow>
          <Field label="Website" type="url" value={draft.company_website ?? ''} onChange={(e) => set('company_website', e.target.value)} />
          <FieldRow>
            <Field label="BTW-nummer" value={draft.company_btw ?? ''} onChange={(e) => set('company_btw', e.target.value)} placeholder="BE0123.456.789" />
            <Field label="IBAN" value={draft.company_iban ?? ''} onChange={(e) => set('company_iban', e.target.value)} placeholder="BE.. .... .... ...." />
          </FieldRow>
        </div>
      ) : null}

      {tab === 'offerte' ? (
        <div className="card space-y-4">
          <h2 className="section-h">Offerte-defaults</h2>
          <FieldRow>
            <Field
              label="BTW-tarief"
              unit="%"
              type="number"
              step={0.01}
              value={draft.quote_vat_rate}
              onChange={(e) => set('quote_vat_rate', Number(e.target.value))}
            />
            <Field
              label="Geldigheidsduur"
              unit="dagen"
              type="number"
              value={draft.quote_validity_days}
              onChange={(e) => set('quote_validity_days', Number(e.target.value))}
              hint="bv. 30 dagen vanaf aanmaakdatum"
            />
          </FieldRow>
          <Field
            label="Referentie-prefix"
            value={draft.quote_reference_prefix}
            onChange={(e) => set('quote_reference_prefix', e.target.value)}
            hint='Bv. "Q" geeft Q-20260601-001'
          />
          <TextAreaField
            label="Voettekst onder elke offerte"
            value={draft.quote_footer_note ?? ''}
            onChange={(e) => set('quote_footer_note', e.target.value)}
            hint="Bv. betaalvoorwaarden, garantie-info"
          />
        </div>
      ) : null}

      {tab === 'order' ? (
        <div className="card space-y-4">
          <h2 className="section-h">Order-defaults</h2>
          <FieldRow>
            <Field
              label="Standaard breedte"
              unit="mm"
              type="number"
              value={draft.default_door_width}
              onChange={(e) => set('default_door_width', Number(e.target.value))}
            />
            <Field
              label="Standaard hoogte"
              unit="mm"
              type="number"
              value={draft.default_door_height}
              onChange={(e) => set('default_door_height', Number(e.target.value))}
            />
          </FieldRow>
          <Field
            label="Standaard greep-hoogte"
            unit="mm vanaf onder"
            type="number"
            value={draft.default_handle_height}
            onChange={(e) => set('default_handle_height', Number(e.target.value))}
            hint="Ergonomisch advies: 1050 mm"
          />
          <Field
            label="Order-nummer prefix"
            value={draft.order_number_prefix}
            onChange={(e) => set('order_number_prefix', e.target.value)}
            placeholder="optioneel — leeg laten voor YYYYMMDD-XXX"
          />
        </div>
      ) : null}

      <div className="flex items-center gap-3 sticky bottom-4 z-10 p-3 bg-paper/90 backdrop-blur border border-soft-2 rounded-lg">
        <button type="submit" className="btn btn-primary" disabled={update.isPending}>
          <Save size={14} /> {update.isPending ? 'Opslaan…' : 'Bewaar wijzigingen'}
        </button>
        {savedHint ? (
          <span className="font-mono text-xs text-[--color-success]">{savedHint}</span>
        ) : null}
      </div>
    </form>
  )
}

// ─── Optie-lijsten tab ───────────────────────────────────────

function OptionListsTab() {
  const { data: lists = [], isLoading } = useAllOptionLists()
  if (isLoading) return <div className="text-[--color-muted] font-mono text-sm">Laden…</div>
  if (lists.length === 0) {
    return (
      <div className="card text-sm text-[--color-muted]">
        Geen optie-lijsten gevonden. Run migration <code>0003_settings.sql</code> in Supabase.
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {lists.map((list) => (
        <OptionListEditor key={list.id} list={list} />
      ))}
    </div>
  )
}

function OptionListEditor({ list }: { list: OptionList }) {
  const update = useUpdateOptionList()
  const [items, setItems] = useState<OptionItem[]>(list.items ?? [])
  const [savedHint, setSavedHint] = useState<string | null>(null)

  useEffect(() => { setItems(list.items ?? []) }, [list])

  function patchItem(i: number, patch: Partial<OptionItem>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  function removeItem(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i))
  }
  function addItem() {
    const maxSort = items.reduce((m, it) => Math.max(m, it.sort_order ?? 0), 0)
    setItems((arr) => [
      ...arr,
      { value: '', label: '', sort_order: maxSort + 10, active: true },
    ])
  }
  function moveItem(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    setItems((arr) => {
      const next = arr.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      // re-number sort_order
      return next.map((it, idx) => ({ ...it, sort_order: (idx + 1) * 10 }))
    })
  }

  async function save() {
    setSavedHint(null)
    try {
      // Validate: alle values uniek + niet leeg
      const seen = new Set<string>()
      for (const it of items) {
        if (!it.value.trim()) throw new Error('Elke regel heeft een "value" nodig')
        if (seen.has(it.value)) throw new Error(`Dubbele value: ${it.value}`)
        seen.add(it.value)
      }
      await update.mutateAsync({ list_key: list.list_key, items, description: list.description ?? undefined })
      setSavedHint('Opgeslagen.')
      setTimeout(() => setSavedHint(null), 1800)
    } catch (err) {
      setSavedHint(`Fout: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="section-h !mb-1 !pb-0 !border-0">{listLabel(list.list_key)}</h3>
          <div className="text-xs text-[--color-muted]">
            <code className="font-mono">{list.list_key}</code>
            {list.description ? ` · ${list.description}` : null}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-sm" onClick={addItem}>
            <Plus size={14} /> Regel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={update.isPending}>
            <Save size={14} /> {update.isPending ? '…' : 'Bewaar'}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-[--color-muted] italic py-4">Nog geen items. Klik "+ Regel".</div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[100px_1fr_2fr_80px_120px] gap-2 px-2 text-[10px] uppercase tracking-wider text-[--color-muted] font-mono">
            <div>Sort</div>
            <div>Value</div>
            <div>Label</div>
            <div>Actief</div>
            <div>Acties</div>
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[100px_1fr_2fr_80px_120px] gap-2 items-center">
              <input
                type="number"
                className="field-input"
                value={it.sort_order}
                onChange={(e) => patchItem(i, { sort_order: Number(e.target.value) })}
              />
              <input
                className="field-input"
                placeholder="bv. muharrem"
                value={it.value}
                onChange={(e) => patchItem(i, { value: e.target.value })}
              />
              <input
                className="field-input"
                placeholder="weergavenaam"
                value={it.label}
                onChange={(e) => patchItem(i, { label: e.target.value })}
              />
              <label className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={it.active}
                  onChange={(e) => patchItem(i, { active: e.target.checked })}
                />
              </label>
              <div className="flex gap-1 justify-end">
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label="Omhoog">
                  <ArrowUp size={14} />
                </button>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} aria-label="Omlaag">
                  <ArrowDown size={14} />
                </button>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeItem(i)} aria-label="Verwijder">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {savedHint ? (
        <div className="mt-3 text-xs font-mono" style={{ color: savedHint.startsWith('Fout') ? 'var(--color-accent)' : 'var(--color-success)' }}>
          {savedHint}
        </div>
      ) : null}
    </div>
  )
}

function listLabel(key: string): string {
  switch (key) {
    case 'verkopers': return 'Verkopers'
    case 'ral_extras': return 'Extra RAL-kleuren'
    default: return key
  }
}

// ─── Zagerij-formules tab ────────────────────────────────────

interface FormulaField {
  key: keyof CutFormulas
  label: string
  unit: string
  hint?: string
}

const FORMULA_GROUPS: { title: string; description: string; fields: FormulaField[] }[] = [
  {
    title: 'Kozijn (buitenframe)',
    description: 'Het hoekijzer rond de hele deuropening.',
    fields: [
      { key: 'kozijn_horiz_aftrek', label: 'Horizontale aftrek', unit: 'mm', hint: 'breedte − X (default 40 = 1× profielbreedte)' },
    ],
  },
  {
    title: 'Deurbladkader',
    description: 'Het binnenkader dat het glas+verdeling draagt, met speling rondom.',
    fields: [
      { key: 'blade_vert_aftrek', label: 'Verticale aftrek', unit: 'mm', hint: 'hoogte − X (default 30)' },
      { key: 'blade_horiz_aftrek', label: 'Horizontale aftrek', unit: 'mm', hint: 'breedte − X (default 88 = 2×40 profiel + 2×4 speling)' },
    ],
  },
  {
    title: 'Glaslijst-kader gelaste-zijde',
    description: 'Het 15×15-kader dat het glas vastklemt aan de gelaste (achter)zijde.',
    fields: [
      { key: 'glaslijst_vert_aftrek', label: 'Verticale aftrek', unit: 'mm', hint: 'bladeVert − X (default 40)' },
      { key: 'glaslijst_horiz_aftrek', label: 'Horizontale aftrek', unit: 'mm', hint: 'bladeHoriz − X (default 30)' },
    ],
  },
  {
    title: 'Poederlak-zijde',
    description: 'De zichtkant. "Andere zijde altijd 2 mm korter (lijst-zagerij)".',
    fields: [
      { key: 'poederlak_marge_per_zijde', label: 'Marge per uiteinde', unit: 'mm', hint: 'Default 1 mm × 2 zijden = 2 mm korter dan gelaste' },
    ],
  },
  {
    title: 'Design verticaal (doorlopend)',
    description: 'Verticale glaslijst die over de volle kader-hoogte loopt.',
    fields: [
      { key: 'design_vert_gelaste_aftrek', label: 'Gelaste aftrek', unit: 'mm', hint: 'glassKaderVertGelaste − X (default 30)' },
      { key: 'design_vert_poederlak_aftrek', label: 'Poederlak aftrek', unit: 'mm', hint: 'glassKaderVertGelaste − X (default 32)' },
    ],
  },
  {
    title: 'Dwarslat-segmenten',
    description: 'Hoe een dwarslat wordt opgesplitst door verticalen.',
    fields: [
      { key: 'verticaal_breedte', label: 'Breedte verticaal-profiel', unit: 'mm', hint: 'Default 15 = midden-segment aftrek per verticaal' },
    ],
  },
  {
    title: 'Juosta (afdekstrip)',
    description: 'Aluminium afdeklijst rondom het kozijn.',
    fields: [
      { key: 'juosta_horiz_aftrek', label: 'Horizontale aftrek', unit: 'mm', hint: 'breedte − X (default 70)' },
    ],
  },
  {
    title: 'Greep-lengtes (Kampas 30×30)',
    description: 'Standaard lengtes per greep-type. L-verticaal gebruikt de manueel-ingevoerde lengte per order.',
    fields: [
      { key: 'greep_l_grip_lengte', label: 'L-grip', unit: 'mm', hint: 'Default 200' },
      { key: 'greep_horizontal_bar_lengte', label: 'Horizontale stang', unit: 'mm', hint: 'Default 200' },
      { key: 'greep_other_default_lengte', label: 'Other (fallback)', unit: 'mm', hint: 'Default 700 — gebruikt als geen lengte gegeven' },
    ],
  },
]

function ZagerijTab() {
  const { data: server, isLoading } = useAppSettings()
  const update = useUpdateAppSettings()
  const [draft, setDraft] = useState<CutFormulas>(DEFAULT_CUT_FORMULAS)
  const [savedHint, setSavedHint] = useState<string | null>(null)

  useEffect(() => {
    if (server) setDraft({ ...DEFAULT_CUT_FORMULAS, ...(server.cut_formulas ?? {}) })
  }, [server])

  function setField(k: keyof CutFormulas, v: number) {
    setDraft((d) => ({ ...d, [k]: v }))
  }

  function resetDefaults() {
    if (!confirm('Alle formules terugzetten naar de oorspronkelijke MY DOORS productie-defaults?')) return
    setDraft(DEFAULT_CUT_FORMULAS)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSavedHint(null)
    try {
      await update.mutateAsync({ cut_formulas: draft })
      setSavedHint('Formules opgeslagen. Volgende zaaglijst gebruikt de nieuwe waardes.')
      setTimeout(() => setSavedHint(null), 3000)
    } catch (err) {
      setSavedHint(`Fout: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (isLoading) return <div className="text-[--color-muted] font-mono text-sm">Laden…</div>

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <div className="card bg-paper/60">
        <h2 className="section-h">Zagerij-formules</h2>
        <p className="text-sm text-[--color-muted] mb-3">
          De automatische zaaglijst gebruikt deze constanten. Wijzigingen werken vanaf de eerstvolgende
          PDF-export of openen van de zaaglijst-editor. Per order kan de lijst nog steeds handmatig
          worden overschreven via de Zaaglijst-knop.
        </p>
      </div>

      {FORMULA_GROUPS.map((g) => (
        <div key={g.title} className="card space-y-3">
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--color-brand)' }}>{g.title}</h3>
            <p className="text-xs text-[--color-muted] mt-0.5">{g.description}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.fields.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                unit={field.unit}
                type="number"
                step={0.1}
                value={draft[field.key]}
                onChange={(e) => setField(field.key, Number(e.target.value))}
                hint={field.hint}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 sticky bottom-4 z-10 p-3 bg-paper/90 backdrop-blur border border-soft-2 rounded-lg">
        <button type="submit" className="btn btn-primary" disabled={update.isPending}>
          <Save size={14} /> {update.isPending ? 'Opslaan…' : 'Bewaar formules'}
        </button>
        <button type="button" className="btn" onClick={resetDefaults}>
          <RotateCcw size={14} /> Reset naar defaults
        </button>
        {savedHint ? (
          <span
            className="font-mono text-xs"
            style={{ color: savedHint.startsWith('Fout') ? 'var(--color-accent)' : 'var(--color-success)' }}
          >
            {savedHint}
          </span>
        ) : null}
      </div>
    </form>
  )
}
