import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type {
  Activity,
  AppSettings,
  Customer,
  LineItem,
  Opportunity,
  OpportunityStage,
  OpportunityWithCustomer,
  OptionItem,
  OptionList,
  Order,
  Product,
  Quote,
} from './db'
import { DEFAULT_APP_SETTINGS } from './db'
import type { OrderData } from './types'

// ─── Customers ────────────────────────────────────────────────

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ['customers', search ?? ''],
    queryFn: async () => {
      let q = supabase.from('customers').select('*').order('updated_at', { ascending: false })
      if (search?.trim()) {
        const s = `%${search.trim()}%`
        q = q.or(`name.ilike.${s},email.ilike.${s},phone.ilike.${s}`)
      }
      const { data, error } = await q.limit(200)
      if (error) throw error
      return (data ?? []) as Customer[]
    },
  })
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data as Customer | null
    },
    enabled: !!id,
  })
}

export function useUpsertCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Customer> & { name: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .upsert(payload)
        .select()
        .single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer'] })
    },
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

// ─── Opportunities ────────────────────────────────────────────

export function useOpportunities(customerId?: string) {
  return useQuery({
    queryKey: ['opportunities', customerId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('opportunities_with_customer')
        .select('*')
        .order('updated_at', { ascending: false })
      if (customerId) q = q.eq('customer_id', customerId)
      const { data, error } = await q.limit(500)
      if (error) throw error
      return (data ?? []) as OpportunityWithCustomer[]
    },
  })
}

export function useOpportunity(id: string | undefined) {
  return useQuery({
    queryKey: ['opportunity', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('opportunities_with_customer')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data as OpportunityWithCustomer | null
    },
    enabled: !!id,
  })
}

export function useUpsertOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Opportunity> & { customer_id: string; title: string }) => {
      const { data, error } = await supabase
        .from('opportunities')
        .upsert(payload)
        .select()
        .single()
      if (error) throw error
      return data as Opportunity
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      qc.invalidateQueries({ queryKey: ['opportunity'] })
    },
  })
}

export function useDeleteOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('opportunities').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      // Detail-cache wissen zodat back-navigatie de verwijderde opportunity
      // niet kortstondig nog toont vanuit stale cache.
      qc.removeQueries({ queryKey: ['opportunity', id] })
      qc.removeQueries({ queryKey: ['order', id] })
      qc.removeQueries({ queryKey: ['quotes', id] })
      qc.removeQueries({ queryKey: ['activities', id] })
    },
  })
}

// ─── Orders (sketch + form data) ──────────────────────────────

export function useOrderForOpportunity(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['order', opportunityId],
    queryFn: async () => {
      if (!opportunityId) return null
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as Order | null
    },
    enabled: !!opportunityId,
  })
}

export function useSaveOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id?: string; opportunity_id: string; data: OrderData }) => {
      // onConflict op opportunity_id → twee tabs die tegelijk een nieuwe
      // order proberen op te slaan worden gemerged tot één rij i.p.v.
      // twee parallelle inserts (die stille dataloss veroorzaakten).
      // Migratie 0005 voegt de bijhorende unique constraint toe.
      const payload: { id?: string; opportunity_id: string; data: OrderData } = {
        opportunity_id: input.opportunity_id,
        data: input.data,
      }
      if (input.id) payload.id = input.id
      const { data, error } = await supabase
        .from('orders')
        .upsert(payload, { onConflict: 'opportunity_id' })
        .select()
        .single()
      if (error) throw error
      return data as Order
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['order', vars.opportunity_id] })
    },
  })
}

// ─── Quotes ───────────────────────────────────────────────────

export function useQuotes(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['quotes', opportunityId],
    queryFn: async () => {
      if (!opportunityId) return []
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Quote[]
    },
    enabled: !!opportunityId,
  })
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase.from('quotes').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data as Quote | null
    },
    enabled: !!id,
  })
}

export function useUpsertQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Quote> & { opportunity_id: string; reference: string }) => {
      // bereken subtotaal + vat + total uit line_items
      const items = (payload.line_items ?? []) as LineItem[]
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cents, 0)
      const vatRate = payload.vat_rate ?? 21
      const vat = Math.round((subtotal * vatRate) / 100)
      const total = subtotal + vat
      const final = { ...payload, subtotal_cents: subtotal, vat_cents: vat, total_cents: total }
      const { data, error } = await supabase.from('quotes').upsert(final).select().single()
      if (error) throw error
      return data as Quote
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['quotes', data.opportunity_id] })
      qc.invalidateQueries({ queryKey: ['quote', data.id] })
    },
  })
}

export function useDeleteQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quotes').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      qc.removeQueries({ queryKey: ['quote', id] })
    },
  })
}

// ─── Products ─────────────────────────────────────────────────

export function useProducts(activeOnly = true) {
  return useQuery({
    queryKey: ['products', activeOnly],
    queryFn: async () => {
      let q = supabase.from('products').select('*').order('sort_order', { ascending: true }).order('name')
      if (activeOnly) q = q.eq('active', true)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Product[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpsertProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Product> & { name: string }) => {
      const { data, error } = await supabase.from('products').upsert(payload).select().single()
      if (error) throw error
      return data as Product
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

// ─── Activities (timeline per opportunity) ──────────────────

export function useActivities(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['activities', opportunityId],
    queryFn: async () => {
      if (!opportunityId) return []
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as Activity[]
    },
    enabled: !!opportunityId,
  })
}

export function useLogActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { opportunity_id: string; kind: string; message: string; meta?: Record<string, unknown> }) => {
      const { data, error } = await supabase.from('activities').insert(input).select().single()
      if (error) throw error
      return data as Activity
    },
    onSuccess: (a) => qc.invalidateQueries({ queryKey: ['activities', a.opportunity_id] }),
  })
}

// ─── Inline stage change (voor kanban DnD) ──────────────────

export function useUpdateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; stage: OpportunityStage }) => {
      const { data, error } = await supabase
        .from('opportunities')
        .update({ stage: input.stage })
        .eq('id', input.id)
        .select()
        .single()
      if (error) throw error
      return data as Opportunity
    },
    // Optimistic update zodat de kaart direct in de juiste kolom verschijnt
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ['opportunities'] })
      const previous = qc.getQueriesData<OpportunityWithCustomer[]>({ queryKey: ['opportunities'] })
      qc.setQueriesData<OpportunityWithCustomer[]>({ queryKey: ['opportunities'] }, (old) =>
        old ? old.map((o) => (o.id === id ? { ...o, stage } : o)) : old,
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  })
}

// ─── App settings ────────────────────────────────────────────

export function useAppSettings() {
  return useQuery({
    queryKey: ['app_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').maybeSingle()
      if (error) {
        // Tabel bestaat nog niet (migration 0003 niet gedraaid) → fallback
        return DEFAULT_APP_SETTINGS
      }
      // Defensief mergen: oudere DB-rij kan kolommen missen (bv. cut_formulas
      // vóór migratie 0004). Default-blob garandeert dat consumers nooit
      // undefined zien.
      const row = (data as Partial<AppSettings> | null) ?? {}
      return {
        ...DEFAULT_APP_SETTINGS,
        ...row,
        cut_formulas: { ...DEFAULT_APP_SETTINGS.cut_formulas, ...(row.cut_formulas ?? {}) },
      } as AppSettings
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateAppSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<AppSettings>) => {
      // Upsert in plaats van update: bij verse Supabase-projecten zonder seed
      // bestaat de single-row nog niet, en update zou stil 0 rijen treffen.
      const { data, error } = await supabase
        .from('app_settings')
        .upsert({ id: true, ...patch }, { onConflict: 'id' })
        .select()
        .single()
      if (error) {
        // Pretty-print veelvoorkomende Postgres-errors zodat de UI niet
        // "[object Object]" of een raw error-code toont.
        const msg = error.code === '42703'
          ? `Database-kolom ontbreekt (${error.message}). Draai de migraties in supabase/migrations/.`
          : error.message || 'Onbekende database-fout'
        throw new Error(msg)
      }
      return data as AppSettings
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app_settings'] }),
  })
}

// ─── Option lists ────────────────────────────────────────────

export function useOptionList(listKey: string) {
  return useQuery({
    queryKey: ['option_list', listKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('option_lists')
        .select('*')
        .eq('list_key', listKey)
        .maybeSingle()
      if (error) return null
      return data as OptionList | null
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllOptionLists() {
  return useQuery({
    queryKey: ['option_lists'],
    queryFn: async () => {
      const { data, error } = await supabase.from('option_lists').select('*').order('list_key')
      if (error) return []
      return (data ?? []) as OptionList[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateOptionList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { list_key: string; items: OptionItem[]; description?: string }) => {
      const { data, error } = await supabase
        .from('option_lists')
        .upsert(
          { list_key: input.list_key, items: input.items, description: input.description ?? null },
          { onConflict: 'list_key' },
        )
        .select()
        .single()
      if (error) throw error
      return data as OptionList
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['option_list', data.list_key] })
      qc.invalidateQueries({ queryKey: ['option_lists'] })
    },
  })
}

// ─── User management (admin-only) ────────────────────────────

export interface ProfileWithEmail {
  id: string
  full_name: string
  role: 'admin' | 'sales'
  created_at: string
  email: string | null
}

/** Lijst alle profielen — door RLS enkel zichtbaar voor admins. Sales-
 *  users zien hier alleen hun eigen profiel terug. Sinds migratie 0008
 *  staat email rechtstreeks op de profiles-tabel; geen view nodig. */
export function useAllProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, email, created_at')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as ProfileWithEmail[]
    },
    staleTime: 60 * 1000,
  })
}

/** Patch full_name of role van een gebruiker. RLS controleert of de
 *  caller dit mag (zelf-update OF admin). De `guard_role_change`-trigger
 *  blokkeert sales-users die hun eigen role proberen te promoten. */
export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; full_name?: string; role?: 'admin' | 'sales' }) => {
      const patch: { full_name?: string; role?: 'admin' | 'sales' } = {}
      if (input.full_name !== undefined) patch.full_name = input.full_name
      if (input.role !== undefined) patch.role = input.role
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', input.id)
        .select()
        .single()
      if (error) {
        // Trigger-message van guard_role_change of RLS
        if (/role/i.test(error.message)) {
          throw new Error('Alleen admins kunnen rollen wijzigen')
        }
        throw error
      }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

export interface CreatedUserResult {
  id: string
  email: string
  password: string
  generated_password: boolean
}

/** Admin-only: maak een nieuwe gebruiker aan via de Netlify Function. */
export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; full_name: string; role: 'admin' | 'sales'; password?: string }) => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Niet ingelogd')
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || `HTTP ${res.status}`)
      return json as CreatedUserResult
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

/**
 * Dupliceer een opportunity inclusief order-data. Maakt een nieuwe
 * opportunity aan onder dezelfde klant met "(kopie)"-suffix, stage='lead',
 * waarde + notities meegekopieerd. Als er een bestaande order is, wordt
 * die ook gedupliceerd.
 */
export function useDuplicateOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Haal source opportunity op
      const { data: src, error: srcErr } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', id)
        .single()
      if (srcErr || !src) throw srcErr || new Error('Source niet gevonden')

      // 2. Maak nieuwe opportunity met (kopie) suffix
      const srcOpp = src as Opportunity
      const { data: newOpp, error: oppErr } = await supabase
        .from('opportunities')
        .insert({
          customer_id: srcOpp.customer_id,
          title: `${srcOpp.title} (kopie)`,
          stage: 'lead',
          expected_value_cents: srcOpp.expected_value_cents,
          notes: srcOpp.notes,
        })
        .select()
        .single()
      if (oppErr || !newOpp) throw oppErr || new Error('Kon nieuwe opportunity niet aanmaken')

      // 3. Kopieer order-data als die bestaat
      const { data: srcOrder } = await supabase
        .from('orders')
        .select('data')
        .eq('opportunity_id', id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (srcOrder?.data) {
        await supabase.from('orders').insert({
          opportunity_id: (newOpp as Opportunity).id,
          data: srcOrder.data,
        })
      }

      return newOpp as Opportunity
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
    },
  })
}
