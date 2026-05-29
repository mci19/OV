import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, Phone, Mail, MapPin, Trash2 } from 'lucide-react'
import { PageContainer, PageHeader } from '../components/Layout'
import { Field, FieldRow, FormSection, TextAreaField } from '../components/Field'
import { Dialog } from '../components/Dialog'
import { EmptyState } from './HomePage'
import { useCustomer, useCustomers, useDeleteCustomer, useOpportunities, useUpsertCustomer } from '../lib/queries'
import type { Customer } from '../lib/db'
import { errorMessage, useToast } from '../components/Toast'
import { stageLabel, useT } from '../lib/i18n'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { ViewToggle, readViewMode, writeViewMode, type ViewMode } from '../components/ViewToggle'

export function CustomersPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Customer | 'new' | null>(null)
  const [view, setView] = useState<ViewMode>(() => readViewMode('customers', 'cards'))
  const { data: customers = [], isLoading, error } = useCustomers(search)

  function setViewMode(m: ViewMode) {
    setView(m)
    writeViewMode('customers', m)
  }

  const tableColumns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      header: t('customers.name'),
      cell: (c) => <span className="font-bold">{c.name}</span>,
      sortValue: (c) => c.name,
    },
    {
      key: 'email',
      header: t('customers.email'),
      cell: (c) => c.email || '—',
      sortValue: (c) => c.email ?? '',
      hideBelow: 768,
    },
    {
      key: 'phone',
      header: t('customers.phone'),
      cell: (c) => c.phone || '—',
      sortValue: (c) => c.phone ?? '',
      hideBelow: 640,
    },
    {
      key: 'city',
      header: t('customers.editor.city'),
      cell: (c) => c.address_city || '—',
      sortValue: (c) => c.address_city ?? '',
      hideBelow: 1024,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        actions={
          <>
            <ViewToggle value={view} onChange={setViewMode} modes={['cards', 'table']} />
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              <Plus size={16} /> {t('customers.new')}
            </button>
          </>
        }
      />

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-muted]" />
        <input
          className="field-input pl-9"
          placeholder={t('customers.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? <div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div> : null}
      {error ? <div className="text-accent font-mono text-sm">{(error as Error).message}</div> : null}

      {customers.length === 0 && !isLoading ? (
        <EmptyState
          title={t('customers.empty')}
          subtitle={search ? t('opps.empty.subtitleFiltered') : undefined}
          cta={!search ? <button className="btn btn-primary" onClick={() => setEditing('new')}>+ {t('customers.new')}</button> : null}
        />
      ) : view === 'table' ? (
        <DataTable<Customer>
          rows={customers}
          columns={tableColumns}
          rowKey={(c) => c.id}
          persistKey="customers"
          defaultSort={{ key: 'name', dir: 'asc' }}
          onRowClick={(c) => navigate(`/customers/${c.id}`)}
          emptyText={t('customers.empty')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {customers.map((c) => (
            <Link key={c.id} to={`/customers/${c.id}`} className="card card-interactive">
              <div className="font-bold text-base mb-1 truncate">{c.name}</div>
              {c.email ? <Row icon={Mail}>{c.email}</Row> : null}
              {c.phone ? <Row icon={Phone}>{c.phone}</Row> : null}
              {c.address_city || c.address_line1 ? (
                <Row icon={MapPin}>{[c.address_line1, c.address_city].filter(Boolean).join(', ')}</Row>
              ) : null}
            </Link>
          ))}
        </div>
      )}

      {editing ? (
        <CustomerEditor
          customer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </PageContainer>
  )
}

function Row({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[--color-muted] mt-1 truncate">
      <Icon size={12} />
      <span className="truncate">{children}</span>
    </div>
  )
}

export function CustomerDetailPage() {
  const { t, lang } = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: customer, isLoading } = useCustomer(id)
  const { data: opps = [] } = useOpportunities(id)
  const [editing, setEditing] = useState(false)
  const del = useDeleteCustomer()
  const toast = useToast()

  if (isLoading) return <PageContainer><div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div></PageContainer>
  if (!customer) return <PageContainer><EmptyState title={t('customers.notFound')} /></PageContainer>

  async function onDelete() {
    if (!customer || !confirm(t('customers.deleteConfirm', { name: customer.name }))) return
    try {
      await del.mutateAsync(customer.id)
      navigate('/customers')
    } catch (err) {
      toast.error(t('opps.detail.toast.deleteFailed', { error: errorMessage(err) }))
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title={customer.name}
        subtitle={[customer.email, customer.phone].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            <button className="btn" onClick={() => setEditing(true)}>{t('common.edit')}</button>
            <button className="btn btn-danger" onClick={onDelete}>
              <Trash2 size={14} /> {t('common.delete')}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <section className="space-y-1 card">
          <h3 className="section-h">{t('customers.details')}</h3>
          <DetailRow label={t('customers.email')} value={customer.email} />
          <DetailRow label={t('customers.phone')} value={customer.phone} />
          <DetailRow label={t('customers.address')} value={[customer.address_line1, customer.address_postal, customer.address_city].filter(Boolean).join(', ')} />
          <DetailRow label={t('common.notes')} value={customer.notes} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-h !mb-0 !pb-0 !border-0">{t('customers.opportunities')}</h3>
            <Link to={`/opportunities?new=1&customer_id=${customer.id}`} className="btn btn-sm">
              <Plus size={14} /> {t('common.new')}
            </Link>
          </div>
          {opps.length === 0 ? <EmptyState title={t('customers.noOpportunities')} /> : (
            <div className="space-y-2">
              {opps.map((o) => (
                <Link key={o.id} to={`/opportunities/${o.id}`} className="card card-interactive flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-sm">{o.title}</div>
                    <div className="text-xs text-[--color-muted] mt-1">{o.expected_value_cents ? `€ ${(o.expected_value_cents / 100).toFixed(2)}` : '—'}</div>
                  </div>
                  <span className="stage-pill" data-stage={o.stage}>{stageLabel(o.stage, lang)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {editing ? <CustomerEditor customer={customer} onClose={() => setEditing(false)} /> : null}
    </PageContainer>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col py-1.5 border-b border-soft-2 last:border-0">
      <span className="field-label">{label}</span>
      <span className="font-mono text-sm">{value || '—'}</span>
    </div>
  )
}

function CustomerEditor({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const { t } = useT()
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    address_line1: customer?.address_line1 ?? '',
    address_postal: customer?.address_postal ?? '',
    address_city: customer?.address_city ?? '',
    notes: customer?.notes ?? '',
  })
  const upsert = useUpsertCustomer()
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(t('customers.editor.nameRequired'))
      return
    }
    try {
      await upsert.mutateAsync({ ...(customer ? { id: customer.id } : {}), ...form })
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={customer ? t('customers.editor.title.edit') : t('customers.editor.title.new')}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="customer-form" className="btn btn-primary" disabled={upsert.isPending}>
            {upsert.isPending ? '…' : t('common.save')}
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={onSubmit}>
        <FormSection title={t('customers.editor.section.contact')}>
          <Field label={t('customers.name')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FieldRow>
            <Field label={t('customers.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Field label={t('customers.phone')} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FieldRow>
        </FormSection>

        <div className="mt-5">
          <FormSection title={t('customers.editor.section.address')}>
            <Field label={t('customers.editor.street')} value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
            <FieldRow>
              <Field label={t('customers.editor.postal')} value={form.address_postal} onChange={(e) => setForm({ ...form, address_postal: e.target.value })} />
              <Field label={t('customers.editor.city')} value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
            </FieldRow>
          </FormSection>
        </div>

        <div className="mt-5">
          <FormSection title={t('customers.editor.section.extra')}>
            <TextAreaField label={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormSection>
        </div>

        {error ? <div className="text-accent font-mono text-xs mt-3">{error}</div> : null}
      </form>
    </Dialog>
  )
}
