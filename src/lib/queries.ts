import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type {
  Activity,
  Customer,
  LineItem,
  Opportunity,
  OpportunityStage,
  OpportunityWithCustomer,
  Order,
  Product,
  Quote,
} from './db'
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
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
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
      const { data, error } = await supabase
        .from('orders')
        .upsert({ id: input.id, opportunity_id: input.opportunity_id, data: input.data })
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
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
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
