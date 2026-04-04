/**
 * Vomni — Supabase data-fetching layer for the customer dashboard.
 * All reads/writes go through these helpers so pages stay clean.
 */
import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const db = createClient(url, key);

// ── Types ──────────────────────────────────────────────────────────────────

export interface DBBusiness {
  id: string;
  name: string | null;
  owner_name: string | null;
  owner_email: string | null;
  google_review_link: string | null;
  plan: string | null;
  status: string | null;
  created_at: string;
  business_type: string | null;
  onboarding_step: number | null;
  notification_email: string | null;
  logo_url?: string | null;
  referral_code?: string | null;
  ai_insights_cache?: unknown | null;
  ai_insights_cached_at?: string | null;
  starting_rating?: number | null;
  google_review_count?: number | null;
  onboarding_completed?: boolean | null;
  weekly_google_redirects?: number | null;
  weekly_redirect_cap?: number | null;
  initial_google_rating?: number | null;
  current_google_rating?: number | null;
  initial_review_count?: number | null;
  rating_captured_at?: string | null;
  account_age_weeks?: number | null;
  billing_anchor_day?: number | null;
  // Lemon Squeezy subscription fields
  lemon_customer_id?: string | null;
  lemon_subscription_id?: string | null;
  subscription_status?: string | null;   // active | cancelled | paused | past_due | expired
  subscription_period?: string | null;   // monthly | yearly
  trial_start_date?: string | null;      // ISO timestamp — set when user signs up via free trial
  booking_timezone?: string | null;      // IANA timezone, e.g. "Asia/Jerusalem"
}

export interface DBBooking {
  id: string;
  business_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  service: string | null;
  appointment_at: string | null;
  sms_sent_at: string | null;
  sms_status: string | null;
  rating: number | null;
  review_status: string | null;
  created_at: string;
  form_opened_at?: string | null;
  rating_submitted_at?: string | null;
  redirected_at?: string | null;
  reviewed_at?: string | null;
  pii_cleaned?: boolean | null;
  pii_cleaned_at?: string | null;
}

export interface DBFeedback {
  id: string;
  booking_id: string | null;
  business_id: string;
  rating: number | null;
  feedback_text: string | null;
  status: string | null;
  source?: string | null;
  urgency?: string | null;
  ai_reply: string | null;
  sentiment_topic?: string | null;
  sentiment_intensity?: string | null;
  additional_notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  // joined field
  customer_name?: string | null;
  customer_phone?: string | null;
}

// ── Auth helpers ───────────────────────────────────────────────────────────

/** Returns the currently authenticated Supabase user, or null. */
export async function getCurrentUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

/**
 * Reliably returns the current access token for use in fetch Authorization headers.
 * Tries db.auth.getSession() first; falls back to reading the Supabase localStorage key
 * directly, which handles cases where the GoTrueClient instance hasn't hydrated yet.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch { /* fall through */ }
  // Fallback: read directly from localStorage (client-side only)
  if (typeof window !== "undefined") {
    try {
      const key = Object.keys(localStorage).find(k => k.endsWith("-auth-token"));
      if (key) {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
        return parsed?.access_token ?? null;
      }
    } catch { /* ignore */ }
  }
  return null;
}

/** Gets the business row where owner_email matches the logged-in user. */
export async function getMyBusiness(email: string): Promise<DBBusiness | null> {
  const { data, error } = await db
    .from("businesses")
    .select("*")
    .eq("owner_email", email)
    .single();
  if (error) return null;
  return data as DBBusiness;
}

// ── Date helpers ───────────────────────────────────────────────────────────

/** Format a timestamp string as DD/MM/YY */
export function fmtDate(ts: string | null | undefined): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(2);
    return `${dd}/${mm}/${yy}`;
  } catch {
    return "—";
  }
}

/** ISO string for the first millisecond of the current month */
export function startOfThisMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

/** ISO string for 7 days ago */
export function sevenDaysAgo(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

// ── Overview stats ─────────────────────────────────────────────────────────

export async function getOverviewStats(businessId: string) {
  const monthStart = startOfThisMonth();
  const weekAgo    = sevenDaysAgo();

  // All bookings this month (join feedback to derive effective status)
  const { data: monthBookings } = await db
    .from("bookings")
    .select("id, review_status, rating, created_at, feedback!booking_id(rating)")
    .eq("business_id", businessId)
    .gte("created_at", monthStart);

  // Derive effective status from feedback for legacy pending bookings
  const rawAll = (monthBookings ?? []) as Array<{ id: string; review_status: string | null; rating: number | null; created_at: string; feedback?: any }>;
  const all = rawAll.map((b: any) => {
    const fb = Array.isArray(b.feedback) ? b.feedback[0] : b.feedback;
    let effectiveStatus = b.review_status;
    // For legacy bookings still stuck at pending/sms_sent that have feedback, derive a status
    if ((!effectiveStatus || effectiveStatus === "pending" || effectiveStatus === "sms_sent") && fb) {
      effectiveStatus = fb.rating <= 3 ? "private_feedback" : "form_submitted";
    }
    return { ...b, review_status: effectiveStatus };
  });

  const total = all.length;
  const completed = all.filter(b => b.review_status && b.review_status !== "pending").length;
  // Count both old "redirected" (legacy) and new "redirected_to_google" (native flow)
  const redirected = all.filter(b =>
    b.review_status === "redirected_to_google" || b.review_status === "redirected"
  ).length;

  // Avg rating — all time, from feedback table (more accurate)
  const { data: ratedFb } = await db
    .from("feedback")
    .select("rating")
    .eq("business_id", businessId)
    .not("rating", "is", null);
  const ratings = ((ratedFb ?? []) as Array<{ rating: number }>).map(r => r.rating);
  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  // Negative caught — ALL feedback with rating <= 3
  const { count: negativeFb } = await db
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .lte("rating", 3);

  // Google reviews — positive feedback (rating >= 4) this month
  const { count: positiveFb } = await db
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("rating", 4)
    .gte("created_at", monthStart);

  // Review velocity — positive feedback in last 7 days
  const { count: velocity7d } = await db
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("rating", 4)
    .gte("created_at", weekAgo);

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  // Use max of redirected bookings or positive feedback count (whichever is higher)
  const googleReviews = Math.max(redirected, positiveFb ?? 0);
  const negativeCaught = negativeFb ?? 0;

  return {
    requestsSent:    total,
    completionRate,
    avgRating:       Math.round(avgRating * 10) / 10,
    googleReviews,
    negativeCaught,
    reviewVelocity:  velocity7d ?? 0,
  };
}

// ── Recent activity ────────────────────────────────────────────────────────

export async function getRecentActivity(businessId: string): Promise<DBBooking[]> {
  const { data } = await db
    .from("bookings")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []) as DBBooking[];
}

// ── Active alerts ──────────────────────────────────────────────────────────

export async function getActiveAlerts(businessId: string): Promise<DBFeedback[]> {
  const { data } = await db
    .from("feedback")
    .select("*, bookings(customer_name, customer_phone, service, appointment_at)")
    .eq("business_id", businessId)
    .eq("status", "new")
    .order("created_at", { ascending: false });

  if (!data) return [];

  return (data as Array<DBFeedback & { bookings: { customer_name: string | null } | null }>)
    .map(row => ({
      ...row,
      customer_name: row.bookings?.customer_name ?? null,
    }));
}

// ── All bookings ───────────────────────────────────────────────────────────

export async function getAllBookings(businessId: string): Promise<DBBooking[]> {
  const { data } = await db
    .from("bookings")
    .select("*, feedback!booking_id(rating, status, sentiment_topic, created_at)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((b: any) => {
    const fb = Array.isArray(b.feedback) ? b.feedback[0] : b.feedback;
    // If booking is still pending but has feedback, derive status from feedback rating
    let effectiveStatus = b.review_status;
    if ((!effectiveStatus || effectiveStatus === "pending" || effectiveStatus === "sms_sent") && fb) {
      effectiveStatus = fb.rating <= 3 ? "private_feedback" : "form_submitted";
    }
    return {
      ...b,
      review_status: effectiveStatus,
      rating: b.rating ?? fb?.rating ?? null,
    } as DBBooking;
  });
}

// ── All feedback ───────────────────────────────────────────────────────────

export async function getAllFeedback(businessId: string): Promise<DBFeedback[]> {
  // Try to join booking for customer_name / customer_phone
  const { data } = await db
    .from("feedback")
    .select(`*, bookings(customer_name, customer_phone)`)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return (data as Array<DBFeedback & { bookings: { customer_name: string | null; customer_phone: string | null } | null }>)
    .map(row => ({
      ...row,
      customer_name:  row.bookings?.customer_name  ?? null,
      customer_phone: row.bookings?.customer_phone ?? null,
    }));
}

export async function updateFeedbackStatus(id: string, status: string) {
  await db.from("feedback").update({ status }).eq("id", id);
}

// ── Analytics ──────────────────────────────────────────────────────────────

export interface MonthlyPoint {
  month: string;
  sent: number;
  completed: number;
  redirected: number;
  completionRate: number;
}

export function computeMonthly(bookings: DBBooking[]): MonthlyPoint[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d       = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const dEnd    = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label   = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

    const inMonth = bookings.filter(b => {
      const t = new Date(b.created_at).getTime();
      return t >= d.getTime() && t <= dEnd.getTime();
    });

    const sent      = inMonth.length;
    const completed = inMonth.filter(b => b.review_status && b.review_status !== "pending").length;
    const redirected = inMonth.filter(b =>
      b.review_status === "redirected_to_google" || b.review_status === "redirected"
    ).length;

    return {
      month: label,
      sent,
      completed,
      redirected,
      completionRate: sent > 0 ? Math.round((completed / sent) * 100) : 0,
    };
  });
}

export function computeRatingDist(bookings: DBBooking[]) {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  bookings.forEach(b => {
    if (b.rating && b.rating >= 1 && b.rating <= 5) counts[Math.round(b.rating)]++;
  });
  return [1, 2, 3, 4, 5].map(star => ({ name: `${star} Star`, value: counts[star], star }));
}

// ── Business settings ──────────────────────────────────────────────────────

export async function updateBusiness(
  id: string,
  patch: Partial<Pick<DBBusiness,
    | "name" | "owner_name" | "google_review_link" | "logo_url"
    | "business_type" | "notification_email" | "onboarding_step"
    | "ai_insights_cache" | "ai_insights_cached_at" | "starting_rating"
  >>
) {
  const { error } = await db.from("businesses").update(patch as Record<string, unknown>).eq("id", id);
  return !error;
}
