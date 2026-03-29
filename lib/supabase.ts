import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = !!(url && key);

// Only create the client when credentials are present — createClient throws on empty strings
export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url, key)
  : (new Proxy({}, { get: () => () => ({ data: null, error: new Error("Supabase not configured") }) }) as unknown as SupabaseClient);

// ── Types ─────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "new"
  | "approved"
  | "rejected"
  | "contacted"
  | "replied"
  | "demo_booked"
  | "customer";

export type BusinessType =
  | "barber"
  | "salon"
  | "restaurant"
  | "dentist"
  | "tattoo"
  | "other";

export type OutreachChannel = "instagram" | "email";

export type CopyStatus = "pending" | "approved" | "sent" | "replied";

export type ConversationStatus =
  | "new_reply"
  | "awaiting_response"
  | "warm"
  | "demo_booked"
  | "dead";

export interface Lead {
  id: string;
  business_name: string;
  business_type: BusinessType;
  location: string;
  city: string;
  country: string;
  google_rating: number;
  review_count: number;
  overall_rating: number;
  total_reviews: number;
  phone: string;
  instagram_handle: string;
  email: string;
  outreach_channel: OutreachChannel;
  score: number;
  status: LeadStatus;
  notes: string;
  // Last bad review (most recent ≤ 3 stars)
  last_bad_review_text: string;
  last_bad_review_name: string;
  last_bad_review_date: string;
  last_bad_review_rating: number;
  // Worst review (lowest rated)
  worst_review_name: string;
  worst_review_rating: number;
  worst_review_text: string;
  worst_review_date: string;
  competitor_name?: string;
  competitor_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface CopyQueueItem {
  id: string;
  lead_id: string;
  subject_a: string;
  variant_a: string;
  subject_b: string;
  variant_b: string;
  subject_c: string;
  variant_c: string;
  approved_variant: "a" | "b" | "c" | null;
  status: CopyStatus;
  sent_at: string | null;
  created_at: string;
  lead?: Lead;
}

export interface ConversationMessage {
  role: "sent" | "received";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  lead_id: string;
  thread: ConversationMessage[];
  suggested_response: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
  lead?: Lead;
}

export interface WeeklyReport {
  id: string;
  week_starting: string;
  leads_found: number;
  outreach_sent: number;
  reply_rate: number;
  demos_booked: number;
  new_customers: number;
  what_worked: string;
  what_didnt: string;
  recommendations: string;
  created_at: string;
}
