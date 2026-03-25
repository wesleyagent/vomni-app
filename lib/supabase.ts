import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url, key);
export const supabaseConfigured = !!(url && key);

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
  competitor_name: string;
  competitor_rating: number;
  instagram_handle: string;
  email: string;
  outreach_channel: OutreachChannel;
  score: number;
  status: LeadStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CopyQueueItem {
  id: string;
  lead_id: string;
  variant_a: string;
  variant_b: string;
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
