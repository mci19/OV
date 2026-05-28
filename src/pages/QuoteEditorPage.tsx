import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Download } from 'lucide-react'
import { PageContainer, PageHeader } from '../components/Layout'
import { Field, FieldRow, SelectField } from '../components/Field'
import { EmptyState } from './HomePage'
import { formatEur } from '../lib/format'
import { useAppSettings, useOpportunity, useOrderForOpportunity, useProducts, useQuote, useUpsertQuote, useDeleteQuote, useLogActivity } from '../lib/queries'
import { Dialog } from '../components/Dialog'
import type { LineItem, QuoteStatus } from '../lib/db'
import { QUOTE_STATUS_LABELS } from '../lib/db'

const DEFAULT_LINEITEMS: LineItem[] = [
  { id: 'li-1', description: 'Stalen deur op maat', quantity: 1, unit_cents: 0 },
  { id: 'li-2', description: 'Glas helder (conform schets)', quantity: 1, unit_cents: 0 },
  { id: 'li-3', description: 'Greep + slot', quantity: 1, unit_cents: 0 },
  { id: 'li-4', description: 'Plaatsing', quantity: 1, unit_cents: 0 },
]

export function QuoteEditorPage() {
  const { id: oppId, quoteId } = useParams()
  const navigate = useNavigate()
  const { data: opp } = useOpportunity(oppId)
  const { data: existingOrder } = useOrderForOpportunity(oppId)
  const { data: existing, isLoading } = useQuote(quoteId === 'new' ? undefined : quoteId)
  const { data: settings } = useAppSettings()
  const upsert = useUpsertQuote()
  const del = useDeleteQuote()
  const logActivity = useLogActivity()

  const [reference, setReference] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [status, setStatus] = useState<QuoteStatus>('draft')
  const [vatRate, setVatRate] = useState(21)
  const [items, setItems] = useState<LineItem[]>(DEFAULT_LINEITEMS)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [picker, setPicker] = useState(false)

  useEffect(() => {
    if (existing) {
      setReference(existing.reference)
      setValidUntil(existing.valid_until ?? '')
      setStatus(existing.status)
      setVatRate(Number(existing.vat_rate))
      setItems(existing.line_items)
    } else if (quoteId === 'new' && opp) {
      const date = new Date()
      const prefix = settings?.quote_reference_prefix?.trim() || 'Q'
      const ref = `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`
      setReference(ref)
      const validityDays = settings?.quote_validity_days ?? 30
      const valid = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
      setValidUntil(valid.toISOString().slice(0, 10))
      setVatRate(Number(settings?.quote_vat_rate ?? 21))
    }
  }, [existing, opp, quoteId, settings])

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cents, 0)
    const vat = Math.round((subtotal * vatRate) / 100)
    return { subtotal, vat, total: subtotal + vat }
  }, [items, vatRate])

  function addLine() {
    setItems((arr) => [...arr, { id: `li-${Date.now().toString(36)}`, description: '', quantity: 1, unit_cents: 0 }])
  }
  function addFromCatalog(picked: Array<{ description: string; unit_cents: number }>) {
    setItems((arr) => [
      ...arr,
      ...picked.map((p, i) => ({
        id: `li-${Date.now().toString(36)}-${i}`,
        description: p.description,
        quantity: 1,
        unit_cents: p.unit_cents,
      })),
    ])
  }
  function patchLine(id: string, patch: Partial<LineItem>) {
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }
  function removeLine(id: string) {
    setItems((arr) => arr.filter((i) => i.id !== id))
  }

  async function save() {
    if (!oppId) return
    const saved = await upsert.mutateAsync({
      id: existing?.id,
      opportunity_id: oppId,
      order_id: existingOrder?.id ?? null,
      reference,
      line_items: items,
      vat_rate: vatRate,
      valid_until: validUntil || null,
      status,
    })
    if (quoteId === 'new') {
      logActivity.mutate({
        opportunity_id: oppId,
        kind: 'quote_created',
        message: `Offerte ${saved.reference} aangemaakt`,
      })
      navigate(`/opportunities/${oppId}/quote/${saved.id}`, { replace: true })
    }
  }

  async function downloadPdf() {
    if (!opp) return
    setPdfBusy(true)
    try {
      const [{ pdf }, { QuotePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/pdf/QuotePDF'),
      ])
      const blob = await pdf(
        <QuotePDF
          opportunity={opp}
          orderData={existingOrder?.data}
          reference={reference}
          validUntil={validUntil}
          items={items}
          vatRate={vatRate}
          settings={settings}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Offerte-${reference}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfBusy(false)
    }
  }

  async function onDelete() {
    if (!existing) return
    if (!confirm('Offerte verwijderen?')) return
    await del.mutateAsync(existing.id)
    navigate(`/opportunities/${oppId}`)
  }

  if (!opp) return <PageContainer><EmptyState title="Opportunity niet gevonden" /></PageContainer>
  if (isLoading && quoteId !== 'new') return <PageContainer><div className="text-[--color-muted] font-mono text-sm">Laden…</div></PageContainer>

  return (
    <PageContainer>
      <PageHeader
        title={existing ? `Offerte ${reference}` : 'Nieuwe offerte'}
        subtitle={`${opp.customer_name} · ${opp.title}`}
        actions={
          <>
            <Link to={`/opportunities/${oppId}`} className="btn btn-ghost"><ChevronLeft size={14} /> Terug</Link>
            <button className="btn" onClick={downloadPdf} disabled={pdfBusy}>
              <Download size={14} /> {pdfBusy ? '…' : 'PDF'}
            </button>
            {existing ? <button className="btn btn-danger" onClick={onDelete}><Trash2 size={14} /></button> : null}
            <button className="btn btn-primary" onClick={save} disabled={upsert.isPending}>
              {upsert.isPending ? '…' : 'Bewaar'}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-6">
          <div className="card">
            <h3 className="section-h">Header</h3>
            <FieldRow>
              <Field
                label="Referentie"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <Field
                label="Geldig tot"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </FieldRow>
            <div className="mt-3">
              <SelectField
                label="Status"
                value={status}
                onChange={(v) => setStatus(v as QuoteStatus)}
                options={Object.entries(QUOTE_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h3 className="section-h !mb-0 !pb-0 !border-0">Regels</h3>
              <div className="flex gap-2">
                <button className="btn btn-sm" onClick={() => setPicker(true)}>
                  <Plus size={14} /> Uit catalogus
                </button>
                <button className="btn btn-sm" onClick={addLine}>
                  <Plus size={14} /> Lege regel
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((i) => (
                <LineRow
                  key={i.id}
                  item={i}
                  onChange={(patch) => patchLine(i.id, patch)}
                  onRemove={() => removeLine(i.id)}
                />
              ))}
              {items.length === 0 ? (
                <div className="text-[--color-muted] font-mono text-sm">Geen regels. Klik "+ Regel".</div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Totalen */}
        <aside className="space-y-3 lg:sticky lg:top-4 h-fit">
          <div className="card space-y-2">
            <div className="flex justify-between font-mono text-sm">
              <span>Subtotaal</span>
              <span className="tabular-nums">{formatEur(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center font-mono text-sm">
              <span>
                BTW{' '}
                <input
                  type="number"
                  className="w-12 border-b border-ink bg-transparent text-center"
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                />
                %
              </span>
              <span className="tabular-nums">{formatEur(totals.vat)}</span>
            </div>
            <div className="border-t border-ink pt-2 flex justify-between font-mono font-bold">
              <span>Totaal</span>
              <span className="tabular-nums">{formatEur(totals.total)}</span>
            </div>
          </div>
        </aside>
      </div>

      {picker ? (
        <ProductPickerDialog
          onClose={() => setPicker(false)}
          onPick={(items) => {
            addFromCatalog(items)
            setPicker(false)
          }}
        />
      ) : null}
    </PageContainer>
  )
}

function ProductPickerDialog({
  onClose,
  onPick,
}: { onClose: () => void; onPick: (items: { description: string; unit_cents: number }[]) => void }) {
  const { data: products = [], isLoading } = useProducts(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function confirm() {
    const items = products
      .filter((p) => selected.has(p.id))
      .map((p) => ({
        description: p.description ? `${p.name} — ${p.description}` : p.name,
        unit_cents: p.default_price_cents,
      }))
    onPick(items)
  }

  const byCategory = products.reduce<Record<string, typeof products>>((acc, p) => {
    const k = p.category ?? 'Overig'
    if (!acc[k]) acc[k] = []
    acc[k].push(p)
    return acc
  }, {})

  return (
    <Dialog
      open
      onClose={onClose}
      title="Producten uit catalogus"
      size="lg"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Annuleer</button>
          <button type="button" className="btn btn-primary" onClick={confirm} disabled={selected.size === 0}>
            Voeg toe ({selected.size})
          </button>
        </>
      }
    >
      {isLoading ? <div className="text-[--color-muted] font-mono text-sm">Laden…</div> : null}
      {products.length === 0 && !isLoading ? (
        <div className="text-[--color-muted] font-mono text-sm">
          Geen actieve producten. Voeg producten toe via <strong>Catalogus</strong>.
        </div>
      ) : null}
      <div className="space-y-5">
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat}>
            <div className="field-label">{cat}</div>
            <div className="space-y-1">
              {items.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 p-2 border border-soft-2 hover:border-ink cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm">{p.name}</div>
                    {p.description ? <div className="text-xs text-[--color-muted] truncate">{p.description}</div> : null}
                  </div>
                  <div className="font-mono text-sm tabular-nums">{formatEur(p.default_price_cents)}</div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

function LineRow({
  item,
  onChange,
  onRemove,
}: { item: LineItem; onChange: (patch: Partial<LineItem>) => void; onRemove: () => void }) {
  const totalCents = item.quantity * item.unit_cents
  return (
    <div className="grid grid-cols-[1fr_60px_110px_110px_32px] gap-2 items-start">
      <input
        className="field-input"
        placeholder="Omschrijving"
        value={item.description}
        onChange={(e) => onChange({ description: e.target.value })}
      />
      <input
        className="field-input text-right"
        type="number"
        min={0}
        value={item.quantity}
        onChange={(e) => onChange({ quantity: Math.max(0, Number(e.target.value)) })}
      />
      <input
        className="field-input text-right"
        type="text"
        inputMode="decimal"
        placeholder="0,00"
        value={(item.unit_cents / 100).toFixed(2)}
        onChange={(e) => onChange({ unit_cents: Math.round(Number(e.target.value.replace(',', '.') || 0) * 100) })}
      />
      <div className="font-mono text-sm tabular-nums text-right self-center">{formatEur(totalCents)}</div>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={onRemove} aria-label="Verwijder regel">
        <Trash2 size={14} />
      </button>
    </div>
  )
}
