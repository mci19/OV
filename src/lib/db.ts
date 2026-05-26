// Database type-definities — handmatig gespiegeld aan supabase/migrations/0001_init.sql.
// Bij schema-wijziging deze file aanpassen.

import type { OrderData } from './types'

export type OpportunityStage = 'lead' | 'meeting' | 'quote_sent' | 'won' | 'lost'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined'

export interface Profile {
  id: string
  full_name: string
  role: 'sales' | 'admin'
  created_at: string
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address_line1: string | null
  address_city: string | null
  address_postal: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: string
  customer_id: string
  title: string
  stage: OpportunityStage
  expected_value_cents: number
  owner_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OpportunityWithCustomer extends Opportunity {
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
}

export interface Order {
  id: string
  opportunity_id: string
  data: OrderData
  version: number
  created_at: string
  updated_at: string
}

export interface LineItem {
  id: string
  description: string
  quantity: number
  unit_cents: number
}

export interface Quote {
  id: string
  opportunity_id: string
  order_id: string | null
  reference: string
  line_items: LineItem[]
  subtotal_cents: number
  vat_rate: number
  vat_cents: number
  total_cents: number
  valid_until: string | null
  status: QuoteStatus
  sent_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

// Minimal Database type voor supabase-js typing. Volledige PostgREST-typen
// kunnen later worden gegenereerd met `supabase gen types typescript`.
export interface Database {
  public: {
    Tables: {
      profiles:      { Row: Profile;     Insert: Partial<Profile>;     Update: Partial<Profile> }
      customers:     { Row: Customer;    Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Customer> }
      opportunities: { Row: Opportunity; Insert: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Opportunity> }
      orders:        { Row: Order;       Insert: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'version'> & { id?: string; version?: number }; Update: Partial<Order> }
      quotes:        { Row: Quote;       Insert: Omit<Quote, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Quote> }
    }
    Views: {
      opportunities_with_customer: { Row: OpportunityWithCustomer }
    }
  }
}

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  lead: 'Lead',
  meeting: 'Showroom-afspraak',
  quote_sent: 'Offerte verstuurd',
  won: 'Akkoord',
  lost: 'Verloren',
}

export const STAGE_ORDER: OpportunityStage[] = ['lead', 'meeting', 'quote_sent', 'won', 'lost']

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Concept',
  sent: 'Verstuurd',
  accepted: 'Geaccepteerd',
  declined: 'Geweigerd',
}

// ─── Products + Activities (0002 migration) ─────────────────

export interface Product {
  id: string
  name: string
  description: string | null
  category: string | null
  unit: string
  default_price_cents: number
  active: boolean
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  opportunity_id: string
  kind: string // 'stage_change' | 'note' | 'order_saved' | 'quote_sent' | ...
  message: string
  meta: Record<string, unknown> | null
  actor_id: string | null
  created_at: string
}
