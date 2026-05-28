import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, Phone, Mail, MapPin, Trash2 } from 'lucide-react'
import { PageContainer, PageHeader } from '../components/Layout'
import { Field, FieldRow, FormSection, TextAreaField } from '../components/Field'
import { Dialog } from '../components/Dialog'
import { EmptyState } from './HomePage'
import { useCustomer, useCustomers, useDeleteCustomer, useOpportunities, useUpsertCustomer } from '../lib/queries'
import type { Customer } from '../lib/db'

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Customer | 'new' | null>(null)
  const { data: customers = [], isLoading, error } = useCustomers(search)

  return (
    <PageContainer>
      <PageHeader
        title="Klanten"
        subtitle="Klantenbestand voor offertes en orders"
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus size={16} /> Nieuwe klant
          </button>
        }
      />

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-muted]" />
        <input
          className="field-input pl-9"
          placeholder="Zoek op naam, e-mail of telefoon…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? <div className="text-[--color-muted] font-mono text-sm">Laden…</div> : null}
      {error ? <div className="text-accent font-mono text-sm">{(error as Error).message}</div> : null}

      {customers.length === 0 && !isLoading ? (
        <EmptyState
          title="Geen klanten"
          subtitle={search ? 'Geen resultaat — probeer een andere zoekterm.' : 'Voeg de eerste klant toe.'}
          cta={!search ? <button className="btn btn-primary" onClick={() => setEditing('new')}>+ Nieuwe klant</button> : null}
        />
      ) : null}

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
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: customer, isLoading } = useCustomer(id)
  const { data: opps = [] } = useOpportunities(id)
  const [editing, setEditing] = useState(false)
  const del = useDeleteCustomer()

  if (isLoading) return <PageContainer><div className="text-[--color-muted] font-mono text-sm">Laden…</div></PageContainer>
  if (!customer) return <PageContainer><EmptyState title="Klant niet gevonden" /></PageContainer>

  async function onDelete() {
    if (!customer || !confirm(`Klant "${customer.name}" verwijderen? Alle opportunities + orders worden ook verwijderd.`)) return
    await del.mutateAsync(customer.id)
    navigate('/customers')
  }

  return (
    <PageContainer>
      <PageHeader
        title={customer.name}
        subtitle={[customer.email, customer.phone].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            <button className="btn" onClick={() => setEditing(true)}>Bewerken</button>
            <button className="btn btn-danger" onClick={onDelete}>
              <Trash2 size={14} /> Verwijderen
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <section className="space-y-1 card">
          <h3 className="section-h">Gegevens</h3>
          <DetailRow label="E-mail" value={customer.email} />
          <DetailRow label="Telefoon" value={customer.phone} />
          <DetailRow label="Adres" value={[customer.address_line1, customer.address_postal, customer.address_city].filter(Boolean).join(', ')} />
          <DetailRow label="Notities" value={customer.notes} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-h !mb-0 !pb-0 !border-0">Opportunities</h3>
            <Link to={`/opportunities?new=1&customer_id=${customer.id}`} className="btn btn-sm">
              <Plus size={14} /> Nieuw
            </Link>
          </div>
          {opps.length === 0 ? <EmptyState title="Geen opportunities" /> : (
            <div className="space-y-2">
              {opps.map((o) => (
                <Link key={o.id} to={`/opportunities/${o.id}`} className="card card-interactive flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-sm">{o.title}</div>
                    <div className="text-xs text-[--color-muted] mt-1">{o.expected_value_cents ? `€ ${(o.expected_value_cents / 100).toFixed(2)}` : '—'}</div>
                  </div>
                  <span className="stage-pill" data-stage={o.stage}>{STAGE[o.stage]}</span>
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

const STAGE = {
  lead: 'Lead',
  meeting: 'Afspraak',
  quote_sent: 'Offerte',
  won: 'Akkoord',
  lost: 'Verloren',
} as const

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col py-1.5 border-b border-soft-2 last:border-0">
      <span className="field-label">{label}</span>
      <span className="font-mono text-sm">{value || '—'}</span>
    </div>
  )
}

function CustomerEditor({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
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
      setError('Naam is verplicht')
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
      title={customer ? 'Klant bewerken' : 'Nieuwe klant'}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Annuleer</button>
          <button type="submit" form="customer-form" className="btn btn-primary" disabled={upsert.isPending}>
            {upsert.isPending ? '…' : 'Bewaar'}
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={onSubmit}>
        <FormSection title="Contact">
          <Field label="Naam" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FieldRow>
            <Field label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Field label="Telefoon" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FieldRow>
        </FormSection>

        <div className="mt-5">
          <FormSection title="Adres">
            <Field label="Straat + nr" value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
            <FieldRow>
              <Field label="Postcode" value={form.address_postal} onChange={(e) => setForm({ ...form, address_postal: e.target.value })} />
              <Field label="Gemeente" value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
            </FieldRow>
          </FormSection>
        </div>

        <div className="mt-5">
          <FormSection title="Extra">
            <TextAreaField label="Notities" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormSection>
        </div>

        {error ? <div className="text-accent font-mono text-xs mt-3">{error}</div> : null}
      </form>
    </Dialog>
  )
}
