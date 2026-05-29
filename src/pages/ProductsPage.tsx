import { useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageContainer, PageHeader } from '../components/Layout'
import { Dialog } from '../components/Dialog'
import { Field, FieldRow, SelectField, TextAreaField } from '../components/Field'
import { EmptyState } from './HomePage'
import { formatEur } from '../lib/format'
import { useDeleteProduct, useProducts, useUpsertProduct } from '../lib/queries'
import type { Product } from '../lib/db'
import { useT } from '../lib/i18n'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { ViewToggle, readViewMode, writeViewMode, type ViewMode } from '../components/ViewToggle'

const UNITS = ['stuk', 'm', 'm²', 'u', 'set', 'forfait']

export function ProductsPage() {
  const { t } = useT()
  const { data: products = [], isLoading } = useProducts(false)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [view, setView] = useState<ViewMode>(() => readViewMode('products', 'cards'))
  const del = useDeleteProduct()

  function setViewMode(m: ViewMode) {
    setView(m)
    writeViewMode('products', m)
  }

  async function onDelete(id: string) {
    if (!confirm(t('products.deleteConfirm'))) return
    await del.mutateAsync(id)
  }

  const uncategorized = t('products.uncategorized')
  const byCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const k = p.category ?? uncategorized
    if (!acc[k]) acc[k] = []
    acc[k].push(p)
    return acc
  }, {})

  const tableColumns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      header: t('products.name'),
      cell: (p) => <span className="font-bold" style={{ opacity: p.active ? 1 : 0.5 }}>{p.name}</span>,
      sortValue: (p) => p.name,
    },
    {
      key: 'category',
      header: t('products.category'),
      cell: (p) => p.category ?? '—',
      sortValue: (p) => p.category ?? '',
      hideBelow: 640,
    },
    {
      key: 'unit',
      header: t('products.unitLabel'),
      cell: (p) => p.unit,
      sortValue: (p) => p.unit,
      hideBelow: 768,
    },
    {
      key: 'price',
      header: t('products.price'),
      cell: (p) => <span className="font-mono tabular-nums">{formatEur(p.default_price_cents)}</span>,
      sortValue: (p) => p.default_price_cents,
      align: 'right',
    },
    {
      key: 'active',
      header: t('products.activeLabel'),
      cell: (p) => p.active ? '✓' : '·',
      sortValue: (p) => p.active ? 1 : 0,
      align: 'center',
      hideBelow: 640,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      sortable: false,
      align: 'right',
      width: '110px',
      cell: (p) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(p)} aria-label={t('products.editAria')}>
            <Pencil size={14} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(p.id)} aria-label={t('products.deleteAria')}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title={t('products.pageTitle')}
        subtitle={t('products.pageSubtitle')}
        actions={
          <>
            <ViewToggle value={view} onChange={setViewMode} modes={['cards', 'table']} />
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              <Plus size={16} /> {t('products.new')}
            </button>
          </>
        }
      />

      {isLoading ? <div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div> : null}

      {products.length === 0 && !isLoading ? (
        <EmptyState
          title={t('products.emptyTitle')}
          subtitle={t('products.emptySubtitle')}
          cta={<button className="btn btn-primary" onClick={() => setEditing('new')}>+ {t('products.new')}</button>}
        />
      ) : view === 'table' ? (
        <DataTable<Product>
          rows={products}
          columns={tableColumns}
          rowKey={(p) => p.id}
          persistKey="products"
          defaultSort={{ key: 'name', dir: 'asc' }}
          onRowClick={(p) => setEditing(p)}
          emptyText={t('products.emptyTitle')}
        />
      ) : (
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
                      <div className="text-[10px] text-[--color-muted]">{t('products.unitSuffix', { unit: p.unit })}</div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(p)} aria-label={t('products.editAria')}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(p.id)} aria-label={t('products.deleteAria')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing ? (
        <ProductEditor product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
    </PageContainer>
  )
}

function ProductEditor({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { t } = useT()
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
    if (!form.name.trim()) { setError(t('customers.editor.nameRequired')); return }
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
      title={product ? t('products.editTitle') : t('products.new')}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="product-form" className="btn btn-primary" disabled={upsert.isPending}>
            {upsert.isPending ? '…' : t('common.save')}
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={onSubmit} className="space-y-4">
        <Field label={t('products.name')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextAreaField label={t('products.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <FieldRow>
          <Field label={t('products.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder={t('products.categoryPlaceholder')} />
          <SelectField
            label={t('products.unitLabel')}
            value={form.unit}
            onChange={(v) => setForm({ ...form, unit: v })}
            options={UNITS.map((u) => ({ value: u, label: u }))}
          />
        </FieldRow>
        <FieldRow>
          <Field
            label={t('products.price')}
            unit="EUR"
            type="text"
            inputMode="decimal"
            value={form.price_eur}
            onChange={(e) => setForm({ ...form, price_eur: e.target.value })}
          />
          <Field
            label={t('products.sortOrder')}
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            hint={t('products.sortOrderHint')}
          />
        </FieldRow>
        <label className="flex items-center gap-2 font-mono text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          {t('products.activeLabel')}
        </label>
        {error ? <div className="text-accent font-mono text-xs">{error}</div> : null}
      </form>
    </Dialog>
  )
}
