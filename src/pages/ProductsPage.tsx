import { useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageContainer, PageHeader } from '../components/Layout'
import { Dialog } from '../components/Dialog'
import { Field, FieldRow, SelectField, TextAreaField } from '../components/Field'
import { EmptyState } from './HomePage'
import { formatEur } from '../lib/format'
import { useDeleteProduct, useProducts, useUpsertProduct } from '../lib/queries'
import type { Product } from '../lib/db'

const UNITS = ['stuk', 'm', 'm²', 'u', 'set', 'forfait']

export function ProductsPage() {
  const { data: products = [], isLoading } = useProducts(false)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const del = useDeleteProduct()

  async function onDelete(id: string) {
    if (!confirm('Product verwijderen?')) return
    await del.mutateAsync(id)
  }

  const byCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const k = p.category ?? 'Overig'
    if (!acc[k]) acc[k] = []
    acc[k].push(p)
    return acc
  }, {})

  return (
    <PageContainer>
      <PageHeader
        title="Productcatalogus"
        subtitle="Standaard-regels voor offertes — wijzigingen gelden alleen voor nieuwe offertes"
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus size={16} /> Nieuw product
          </button>
        }
      />

      {isLoading ? <div className="text-[--color-muted] font-mono text-sm">Laden…</div> : null}

      {products.length === 0 && !isLoading ? (
        <EmptyState
          title="Catalogus is leeg"
          subtitle="Voeg producten toe om offertes sneller op te bouwen."
          cta={<button className="btn btn-primary" onClick={() => setEditing('new')}>+ Nieuw product</button>}
        />
      ) : null}

      <div className="space-y-6">
        {Object.entries(byCategory).map(([cat, items]) => (
          <section key={cat}>
            <h2 className="section-h">{cat}</h2>
            <div className="space-y-1">
              {items.map((p) => (
                <div key={p.id} className="card flex items-center gap-3" style={{ opacity: p.active ? 1 : 0.5 }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{p.name}</div>
                    {p.description ? <div className="text-xs text-[--color-muted] mt-1 truncate">{p.description}</div> : null}
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold tabular-nums">{formatEur(p.default_price_cents)}</div>
                    <div className="text-[10px] text-[--color-muted]">per {p.unit}</div>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(p)} aria-label="Bewerken">
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(p.id)} aria-label="Verwijderen">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {editing ? (
        <ProductEditor product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
    </PageContainer>
  )
}

function ProductEditor({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const upsert = useUpsertProduct()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? '',
    unit: product?.unit ?? 'stuk',
    price_eur: product ? (product.default_price_cents / 100).toFixed(2) : '',
    sort_order: String(product?.sort_order ?? 100),
    active: product?.active ?? true,
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Naam is verplicht'); return }
    try {
      const cents = Math.round(Number(form.price_eur.replace(',', '.') || 0) * 100)
      await upsert.mutateAsync({
        ...(product ? { id: product.id } : {}),
        name: form.name.trim(),
        description: form.description || null,
        category: form.category || null,
        unit: form.unit,
        default_price_cents: cents,
        sort_order: Number(form.sort_order) || 100,
        active: form.active,
      })
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={product ? 'Product bewerken' : 'Nieuw product'}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Annuleer</button>
          <button type="submit" form="product-form" className="btn btn-primary" disabled={upsert.isPending}>
            {upsert.isPending ? '…' : 'Bewaar'}
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Naam" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextAreaField label="Omschrijving" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <FieldRow>
          <Field label="Categorie" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="bv. Frame, Glas" />
          <SelectField
            label="Eenheid"
            value={form.unit}
            onChange={(v) => setForm({ ...form, unit: v })}
            options={UNITS.map((u) => ({ value: u, label: u }))}
          />
        </FieldRow>
        <FieldRow>
          <Field
            label="Standaardprijs"
            unit="EUR"
            type="text"
            inputMode="decimal"
            value={form.price_eur}
            onChange={(e) => setForm({ ...form, price_eur: e.target.value })}
          />
          <Field
            label="Sorteervolgorde"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            hint="lagere getallen bovenaan"
          />
        </FieldRow>
        <label className="flex items-center gap-2 font-mono text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Actief (zichtbaar in offerte-picker)
        </label>
        {error ? <div className="text-accent font-mono text-xs">{error}</div> : null}
      </form>
    </Dialog>
  )
}
