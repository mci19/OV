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

// ─── App settings (0003 migration) ──────────────────────────

export interface AppSettings {
  id: true
  // Bedrijf
  company_name: string
  company_address_line1: string | null
  company_address_postal: string | null
  company_address_city: string | null
  company_email: string | null
  company_phone: string | null
  company_website: string | null
  company_btw: string | null
  company_iban: string | null
  // Offerte
  quote_vat_rate: number
  quote_validity_days: number
  quote_footer_note: string | null
  quote_reference_prefix: string
  // Order
  order_number_prefix: string
  default_door_width: number
  default_door_height: number
  default_handle_height: number
  default_vat_rate: number
  updated_at: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: true,
  company_name: 'MY DOORS',
  company_address_line1: null,
  company_address_postal: null,
  company_address_city: null,
  company_email: null,
  company_phone: null,
  company_website: null,
  company_btw: null,
  company_iban: null,
  quote_vat_rate: 21,
  quote_validity_days: 30,
  quote_footer_note: null,
  quote_reference_prefix: 'Q',
  order_number_prefix: '',
  default_door_width: 900,
  default_door_height: 2300,
  default_handle_height: 1050,
  default_vat_rate: 21,
  updated_at: new Date().toISOString(),
}

export interface OptionItem {
  value: string
  label: string
  sort_order: number
  active: boolean
  meta?: Record<string, unknown>
}

export interface OptionList {
  id: string
  list_key: string
  description: string | null
  items: OptionItem[]
  created_at: string
  updated_at: string
}
