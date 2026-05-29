import { useEffect, useState, type FormEvent } from 'react'
import { Building2, FileText, ListChecks, Save, Plus, Trash2, ArrowUp, ArrowDown, Scissors, RotateCcw, Users as UsersIcon, ShieldCheck, ShieldOff } from 'lucide-react'
import { PageContainer, PageHeader } from '../components/Layout'
import { Field, FieldRow, TextAreaField } from '../components/Field'
import { useAllOptionLists, useAllProfiles, useAppSettings, useUpdateAppSettings, useUpdateOptionList, useUpdateProfile, type ProfileWithEmail } from '../lib/queries'
import { DEFAULT_APP_SETTINGS, DEFAULT_CUT_FORMULAS, type AppSettings, type CutFormulas, type OptionItem, type OptionList } from '../lib/db'
import { useT } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import { EmptyState } from './HomePage'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { errorMessage, useToast } from '../components/Toast'

type Tab = 'bedrijf' | 'offerte' | 'order' | 'zagerij' | 'opties' | 'gebruikers'

interface TabDef { id: Tab; labelKey: 'settings.tab.company' | 'settings.tab.quote' | 'settings.tab.order' | 'settings.tab.zagerij' | 'settings.tab.options' | 'users.title'; icon: typeof Building2 }

const TABS: TabDef[] = [
  { id: 'bedrijf',    labelKey: 'settings.tab.company', icon: Building2 },
  { id: 'offerte',    labelKey: 'settings.tab.quote',   icon: FileText },
  { id: 'order',      labelKey: 'settings.tab.order',   icon: FileText },
  { id: 'zagerij',    labelKey: 'settings.tab.zagerij', icon: Scissors },
  { id: 'opties',     labelKey: 'settings.tab.options', icon: ListChecks },
  { id: 'gebruikers', labelKey: 'users.title',          icon: UsersIcon },
]

export function SettingsPage() {
  const { t } = useT()
  const { isAdmin, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('bedrijf')

  // Sales-users zien een lege staat met uitleg i.p.v. de instellingen.
  if (loading) {
    return <PageContainer><div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div></PageContainer>
  }
  if (!isAdmin) {
    return (
      <PageContainer>
        <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
        <EmptyState
          title={t('profile.adminOnly')}
          subtitle={t('users.inviteNote')}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 border-b border-soft-2">
        {TABS.map((tb) => {
          const Icon = tb.icon
          return (
            <button
              key={tb.id}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap"
              style={{
                borderColor: tab === tb.id ? 'var(--color-brand)' : 'transparent',
                color: tab === tb.id ? 'var(--color-brand)' : 'var(--color-muted)',
                fontWeight: tab === tb.id ? 600 : 400,
              }}
              onClick={() => setTab(tb.id)}
            >
              <Icon size={16} /> {t(tb.labelKey)}
            </button>
          )
        })}
      </div>

      {tab === 'bedrijf' || tab === 'offerte' || tab === 'order' ? (
        <AppSettingsTab tab={tab} />
      ) : tab === 'zagerij' ? (
        <ZagerijTab />
      ) : tab === 'gebruikers' ? (
        <UsersTab />
      ) : (
        <OptionListsTab />
      )}
    </PageContainer>
  )
}

// ─── Users tab (admin only) ─────────────────────────────────

function UsersTab() {
  const { t, lang } = useT()
  const { user } = useAuth()
  const { data: profiles = [], isLoading } = useAllProfiles()
  const update = useUpdateProfile()
  const toast = useToast()

  async function changeRole(p: ProfileWithEmail, newRole: 'admin' | 'sales') {
    // Self-demote blokkeren om te voorkomen dat de enige admin zichzelf
    // buitensluit.
    if (p.id === user?.id && newRole === 'sales') {
      toast.error(t('users.demoteSelfBlocked'))
      return
    }
    const message = newRole === 'admin'
      ? t('users.promoteConfirm', { name: p.full_name || p.email || p.id })
      : t('users.demoteConfirm', { name: p.full_name || p.email || p.id })
    if (!confirm(message)) return
    try {
      await update.mutateAsync({ id: p.id, role: newRole })
      toast.success(t('users.roleUpdated'))
    } catch (err) {
      toast.error(t('users.roleUpdateFailed', { error: errorMessage(err) }))
    }
  }

  const columns: DataTableColumn<ProfileWithEmail>[] = [
    {
      key: 'name',
      header: t('users.colName'),
      cell: (p) => <span className="font-bold">{p.full_name || '—'}</span>,
      sortValue: (p) => p.full_name,
    },
    {
      key: 'email',
      header: t('users.colEmail'),
      cell: (p) => <span className="font-mono text-xs">{p.email || '—'}</span>,
      sortValue: (p) => p.email ?? '',
      hideBelow: 640,
    },
    {
      key: 'role',
      header: t('users.colRole'),
      cell: (p) => (
        <span
          className="chip"
          data-active={p.role === 'admin' || undefined}
          style={{ background: p.role === 'admin' ? 'var(--color-brand)' : undefined, color: p.role === 'admin' ? 'var(--color-paper)' : undefined }}
        >
          {p.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleSales')}
        </span>
      ),
      sortValue: (p) => p.role,
    },
    {
      key: 'created',
      header: t('users.colCreated'),
      cell: (p) => (
        <span className="font-mono text-[11px] text-[--color-muted]">
          {new Date(p.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'nl-BE')}
        </span>
      ),
      sortValue: (p) => p.created_at,
      hideBelow: 768,
    },
    {
      key: 'actions',
      header: t('users.colActions'),
      sortable: false,
      align: 'right',
      width: '180px',
      cell: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {p.role === 'sales' ? (
            <button
              className="btn btn-sm"
              onClick={() => changeRole(p, 'admin')}
              disabled={update.isPending}
              title={t('users.promote')}
            >
              <ShieldCheck size={14} /> {t('users.promote')}
            </button>
          ) : (
            <button
              className="btn btn-sm"
              onClick={() => changeRole(p, 'sales')}
              disabled={update.isPending || p.id === user?.id}
              title={p.id === user?.id ? t('users.demoteSelfBlocked') : t('users.demote')}
            >
              <ShieldOff size={14} /> {t('users.demote')}
            </button>
          )}
        </div>
      ),
    },
  ]

  if (isLoading) return <div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div>

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="card !p-3 bg-paper/40">
        <p className="text-xs text-[--color-muted]">{t('users.inviteNote')}</p>
      </div>
      <DataTable<ProfileWithEmail>
        rows={profiles}
        columns={columns}
        rowKey={(p) => p.id}
        persistKey="users"
        defaultSort={{ key: 'created', dir: 'asc' }}
        emptyText={t('users.empty')}
      />
    </div>
  )
}

// ─── App settings tabs ───────────────────────────────────────

function AppSettingsTab({ tab }: { tab: 'bedrijf' | 'offerte' | 'order' }) {
  const { t } = useT()
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
      setSavedHint(t('settings.saved'))
      setTimeout(() => setSavedHint(null), 2000)
    } catch (err) {
      setSavedHint(t('settings.error', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  if (isLoading) return <div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div>

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      {tab === 'bedrijf' ? (
        <div className="card space-y-4">
          <h2 className="section-h">{t('settings.company.title')}</h2>
          <Field label={t('settings.company.name')} value={draft.company_name} onChange={(e) => set('company_name', e.target.value)} />
          <Field label={t('settings.company.street')} value={draft.company_address_line1 ?? ''} onChange={(e) => set('company_address_line1', e.target.value)} />
          <FieldRow>
            <Field label={t('settings.company.postal')} value={draft.company_address_postal ?? ''} onChange={(e) => set('company_address_postal', e.target.value)} />
            <Field label={t('settings.company.city')} value={draft.company_address_city ?? ''} onChange={(e) => set('company_address_city', e.target.value)} />
          </FieldRow>
          <FieldRow>
            <Field label={t('settings.company.email')} type="email" value={draft.company_email ?? ''} onChange={(e) => set('company_email', e.target.value)} />
            <Field label={t('settings.company.phone')} type="tel" value={draft.company_phone ?? ''} onChange={(e) => set('company_phone', e.target.value)} />
          </FieldRow>
          <Field label={t('settings.company.website')} type="url" value={draft.company_website ?? ''} onChange={(e) => set('company_website', e.target.value)} />
          <FieldRow>
            <Field label={t('settings.company.vat')} value={draft.company_btw ?? ''} onChange={(e) => set('company_btw', e.target.value)} placeholder="BE0123.456.789" />
            <Field label={t('settings.company.iban')} value={draft.company_iban ?? ''} onChange={(e) => set('company_iban', e.target.value)} placeholder="BE.. .... .... ...." />
          </FieldRow>
        </div>
      ) : null}

      {tab === 'offerte' ? (
        <div className="card space-y-4">
          <h2 className="section-h">{t('settings.quote.title')}</h2>
          <FieldRow>
            <Field
              label={t('settings.quote.vatRate')}
              unit="%"
              type="number"
              step={0.01}
              value={draft.quote_vat_rate}
              onChange={(e) => set('quote_vat_rate', Number(e.target.value))}
            />
            <Field
              label={t('settings.quote.validity')}
              unit={t('settings.quote.validityUnit')}
              type="number"
              value={draft.quote_validity_days}
              onChange={(e) => set('quote_validity_days', Number(e.target.value))}
              hint={t('settings.quote.validityHint')}
            />
          </FieldRow>
          <Field
            label={t('settings.quote.refPrefix')}
            value={draft.quote_reference_prefix}
            onChange={(e) => set('quote_reference_prefix', e.target.value)}
            hint={t('settings.quote.refPrefixHint')}
          />
          <TextAreaField
            label={t('settings.quote.footer')}
            value={draft.quote_footer_note ?? ''}
            onChange={(e) => set('quote_footer_note', e.target.value)}
            hint={t('settings.quote.footerHint')}
          />
        </div>
      ) : null}

      {tab === 'order' ? (
        <div className="card space-y-4">
          <h2 className="section-h">{t('settings.order.title')}</h2>
          <FieldRow>
            <Field
              label={t('settings.order.defaultWidth')}
              unit="mm"
              type="number"
              value={draft.default_door_width}
              onChange={(e) => set('default_door_width', Number(e.target.value))}
            />
            <Field
              label={t('settings.order.defaultHeight')}
              unit="mm"
              type="number"
              value={draft.default_door_height}
              onChange={(e) => set('default_door_height', Number(e.target.value))}
            />
          </FieldRow>
          <Field
            label={t('settings.order.defaultHandleHeight')}
            unit={t('settings.order.defaultHandleHeightUnit')}
            type="number"
            value={draft.default_handle_height}
            onChange={(e) => set('default_handle_height', Number(e.target.value))}
            hint={t('settings.order.defaultHandleHeightHint')}
          />
          <Field
            label={t('settings.order.numberPrefix')}
            value={draft.order_number_prefix}
            onChange={(e) => set('order_number_prefix', e.target.value)}
            placeholder={t('settings.order.numberPrefixPlaceholder')}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-3 sticky bottom-4 z-10 p-3 bg-paper/90 backdrop-blur border border-soft-2 rounded-lg">
        <button type="submit" className="btn btn-primary" disabled={update.isPending}>
          <Save size={14} /> {update.isPending ? t('common.saving') : t('settings.save')}
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
  const { t } = useT()
  const { data: lists = [], isLoading } = useAllOptionLists()
  if (isLoading) return <div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div>
  if (lists.length === 0) {
    return (
      <div className="card text-sm text-[--color-muted]">
        {t('settings.options.noLists')}
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
  const { t } = useT()
  const update = useUpdateOptionList()
  const [items, setItems] = useState<OptionItem[]>(list.items ?? [])
  const [savedHint, setSavedHint] = useState<{ msg: string; isErr: boolean } | null>(null)

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
        if (!it.value.trim()) throw new Error(t('settings.options.errValue'))
        if (seen.has(it.value)) throw new Error(t('settings.options.errDuplicate', { value: it.value }))
        seen.add(it.value)
      }
      await update.mutateAsync({ list_key: list.list_key, items, description: list.description ?? undefined })
      setSavedHint({ msg: t('settings.options.saved'), isErr: false })
      setTimeout(() => setSavedHint(null), 1800)
    } catch (err) {
      setSavedHint({ msg: t('settings.error', { error: err instanceof Error ? err.message : String(err) }), isErr: true })
    }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="section-h !mb-1 !pb-0 !border-0">{listLabel(list.list_key, t)}</h3>
          <div className="text-xs text-[--color-muted]">
            <code className="font-mono">{list.list_key}</code>
            {list.description ? ` · ${list.description}` : null}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-sm" onClick={addItem}>
            <Plus size={14} /> {t('settings.options.addRow')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={update.isPending}>
            <Save size={14} /> {update.isPending ? '…' : t('common.save')}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-[--color-muted] italic py-4">{t('settings.options.noItems')}</div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[100px_1fr_2fr_80px_120px] gap-2 px-2 text-[10px] uppercase tracking-wider text-[--color-muted] font-mono">
            <div>{t('settings.options.sort')}</div>
            <div>{t('settings.options.value')}</div>
            <div>{t('settings.options.label')}</div>
            <div>{t('settings.options.active')}</div>
            <div>{t('settings.options.actions')}</div>
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
                placeholder={t('settings.options.valuePlaceholder')}
                value={it.value}
                onChange={(e) => patchItem(i, { value: e.target.value })}
              />
              <input
                className="field-input"
                placeholder={t('settings.options.labelPlaceholder')}
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
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label={t('settings.options.upAria')}>
                  <ArrowUp size={14} />
                </button>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} aria-label={t('settings.options.downAria')}>
                  <ArrowDown size={14} />
                </button>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeItem(i)} aria-label={t('settings.options.deleteAria')}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {savedHint ? (
        <div className="mt-3 text-xs font-mono" style={{ color: savedHint.isErr ? 'var(--color-accent)' : 'var(--color-success)' }}>
          {savedHint.msg}
        </div>
      ) : null}
    </div>
  )
}

function listLabel(key: string, t: ReturnType<typeof useT>['t']): string {
  switch (key) {
    case 'verkopers': return t('settings.options.listSellers')
    case 'ral_extras': return t('settings.options.listRalExtras')
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
  const { t } = useT()
  const { data: server, isLoading } = useAppSettings()
  const update = useUpdateAppSettings()
  const [draft, setDraft] = useState<CutFormulas>(DEFAULT_CUT_FORMULAS)
  const [savedHint, setSavedHint] = useState<{ msg: string; isErr: boolean } | null>(null)

  useEffect(() => {
    if (server) setDraft({ ...DEFAULT_CUT_FORMULAS, ...(server.cut_formulas ?? {}) })
  }, [server])

  function setField(k: keyof CutFormulas, v: number) {
    setDraft((d) => ({ ...d, [k]: v }))
  }

  // Invalid = NaN of negatief. Save-knop disabled tot alles geldig is zodat
  // we nooit "NaN mm" in een zaaglijst-PDF krijgen.
  const invalidFields = (Object.keys(draft) as (keyof CutFormulas)[]).filter((k) => {
    const v = draft[k]
    return !Number.isFinite(v) || v < 0
  })
  const isValid = invalidFields.length === 0

  function resetDefaults() {
    if (!confirm(t('zagerij.resetConfirm'))) return
    setDraft(DEFAULT_CUT_FORMULAS)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setSavedHint(null)
    try {
      await update.mutateAsync({ cut_formulas: draft })
      setSavedHint({ msg: t('zagerij.saved'), isErr: false })
      setTimeout(() => setSavedHint(null), 3000)
    } catch (err) {
      setSavedHint({ msg: t('settings.error', { error: err instanceof Error ? err.message : String(err) }), isErr: true })
    }
  }

  if (isLoading) return <div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div>

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <div className="card bg-paper/60">
        <h2 className="section-h">{t('settings.zagerij.title')}</h2>
        <p className="text-sm text-[--color-muted] mb-3">
          {t('zagerij.intro')}
        </p>
      </div>

      {FORMULA_GROUPS.map((g) => (
        <div key={g.title} className="card space-y-3">
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--color-brand)' }}>{g.title}</h3>
            <p className="text-xs text-[--color-muted] mt-0.5">{g.description}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.fields.map((field) => {
              const value = draft[field.key]
              const invalid = !Number.isFinite(value) || value < 0
              return (
                <Field
                  key={field.key}
                  label={field.label}
                  unit={field.unit}
                  type="number"
                  step={0.1}
                  min={0}
                  value={Number.isFinite(value) ? value : ''}
                  onChange={(e) => {
                    const raw = e.target.value
                    setField(field.key, raw === '' ? NaN : Number(raw))
                  }}
                  hint={field.hint}
                  error={invalid ? t('zagerij.invalidField') : undefined}
                />
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 sticky bottom-4 z-10 p-3 bg-paper/90 backdrop-blur border border-soft-2 rounded-lg">
        <button type="submit" className="btn btn-primary" disabled={update.isPending || !isValid}>
          <Save size={14} /> {update.isPending ? t('common.saving') : t('zagerij.save')}
        </button>
        <button type="button" className="btn" onClick={resetDefaults}>
          <RotateCcw size={14} /> {t('zagerij.reset')}
        </button>
        {!isValid ? (
          <span className="font-mono text-xs text-accent">
            {t('zagerij.invalidFields', { n: invalidFields.length })}
          </span>
        ) : savedHint ? (
          <span
            className="font-mono text-xs"
            style={{ color: savedHint.isErr ? 'var(--color-accent)' : 'var(--color-success)' }}
          >
            {savedHint.msg}
          </span>
        ) : null}
      </div>
    </form>
  )
}
