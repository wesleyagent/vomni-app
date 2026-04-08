"use client";

import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Bell, Search, Star, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Clock, MessageSquare, CheckCircle2,
  TrendingUp, AlertTriangle, Lightbulb, Users, Building2,
  Smartphone, ExternalLink, Copy,
} from "lucide-react";

// ── Palette (matches real dashboard exactly) ──────────────────────────────────
const G    = "#00C896";   // header/layout green
const GD   = "#1D9E75";   // page-content green (matches dashboard/page.tsx)
const N    = "#0A0F1E";
const TEXT = "#1A1A1A";
const MUTED  = "#6B7280";
const DIVIDER = "#F0F0EE";
const BORDER  = "#E5E7EB";
const SHADOW  = "0 1px 3px rgba(0,0,0,0.06)";

// ── Tab structure (mirrors real dashboard) ────────────────────────────────────
type TabKey = "overview" | "calendar" | "customers" | "feedback" | "analytics" | "settings";

// ── Hardcoded demo data ───────────────────────────────────────────────────────

const TODAY_APPTS = [
  { time: "09:00", name: "Yoav Cohen",       service: "Fade & Lineup",    duration: 30, reminded: true,  status: "confirmed" },
  { time: "10:00", name: "Nir Shapiro",       service: "Skin Fade",        duration: 45, reminded: true,  status: "confirmed" },
  { time: "11:30", name: "Rotem Katz",        service: "Full Cut & Style", duration: 45, reminded: false, status: "confirmed" },
  { time: "13:00", name: "Daniel Goldstein",  service: "Beard Trim",       duration: 20, reminded: false, status: "confirmed" },
  { time: "14:30", name: "Lior Ben-David",    service: "Skin Fade",        duration: 45, reminded: false, status: "confirmed" },
  { time: "16:00", name: "James Miller",      service: "Full Cut & Style", duration: 45, reminded: false, status: "confirmed" },
];

const PRIVATE_FEEDBACK = [
  {
    id: "f1", name: "Omri Barak", rating: 2,
    text: "Had to wait 25 minutes past my appointment time. Not great.",
    topic: "wait_time", urgency: "24_hours", status: "new",
    date: "Apr 3, 2026",
  },
  {
    id: "f2", name: "Gal Nakash", rating: 1,
    text: "Not happy with the fade, one side was noticeably shorter.",
    topic: "quality", urgency: "1_hour", status: "in_progress",
    date: "Apr 2, 2026",
  },
  {
    id: "f3", name: "Avi Hazut", rating: 2,
    text: "Price went up without any notice. Would have appreciated a heads up.",
    topic: "price", urgency: "this_week", status: "resolved",
    date: "Mar 30, 2026",
  },
];

const ALL_APPOINTMENTS = [
  { id: 1,  name: "Yoav Cohen",       service: "Fade & Lineup",     date: "2026-04-07", time: "09:00", status: "confirmed",  phone: "+972 52-111-2233", reviewStatus: null },
  { id: 2,  name: "Nir Shapiro",      service: "Skin Fade",         date: "2026-04-07", time: "10:00", status: "confirmed",  phone: "+972 54-222-3344", reviewStatus: null },
  { id: 3,  name: "Rotem Katz",       service: "Full Cut & Style",  date: "2026-04-07", time: "11:30", status: "confirmed",  phone: "+972 50-777-8899", reviewStatus: null },
  { id: 4,  name: "Daniel Goldstein", service: "Beard Trim",        date: "2026-04-07", time: "13:00", status: "confirmed",  phone: "+972 52-999-0011", reviewStatus: null },
  { id: 5,  name: "Tal Mizrahi",      service: "Skin Fade",         date: "2026-04-04", time: "11:00", status: "completed", phone: "+972 54-666-7788", reviewStatus: "redirected_to_google" },
  { id: 6,  name: "Amir Peretz",      service: "Fade & Lineup",     date: "2026-04-03", time: "10:30", status: "completed", phone: "+972 58-888-9900", reviewStatus: "form_submitted" },
  { id: 7,  name: "Omri Barak",       service: "Full Cut & Style",  date: "2026-04-03", time: "14:00", status: "completed", phone: "+972 58-011-1122", reviewStatus: "private_feedback" },
  { id: 8,  name: "Guy Friedman",     service: "Kids Cut",          date: "2026-04-02", time: "09:00", status: "completed", phone: "+972 54-011-1122", reviewStatus: "redirected_to_google" },
  { id: 9,  name: "Gal Nakash",       service: "Skin Fade",         date: "2026-04-02", time: "11:00", status: "completed", phone: "+972 50-566-6677", reviewStatus: "private_feedback" },
  { id: 10, name: "Ron Dahan",        service: "Fade & Lineup",     date: "2026-04-01", time: "14:30", status: "completed", phone: "+972 58-233-3344", reviewStatus: "redirected_to_google" },
  { id: 11, name: "Noam Avraham",     service: "Full Cut & Style",  date: "2026-04-01", time: "16:00", status: "completed", phone: "+972 52-344-4455", reviewStatus: "form_submitted" },
  { id: 12, name: "Eran Ben-Ami",     service: "Beard Trim",        date: "2026-03-31", time: "10:00", status: "completed", phone: "+972 54-455-5566", reviewStatus: "redirected_to_google" },
  { id: 13, name: "Shai Tzur",        service: "Skin Fade",         date: "2026-03-30", time: "13:00", status: "completed", phone: "+972 58-677-7788", reviewStatus: "redirected_to_google" },
  { id: 14, name: "Avi Hazut",        service: "Fade & Lineup",     date: "2026-03-30", time: "15:30", status: "completed", phone: "+972 52-788-8899", reviewStatus: "private_feedback" },
  { id: 15, name: "Matan Erez",       service: "Full Cut & Style",  date: "2026-03-29", time: "09:30", status: "completed", phone: "+972 54-899-9900", reviewStatus: "form_submitted" },
  { id: 16, name: "Ido Ziv",          service: "Beard Trim",        date: "2026-03-29", time: "12:00", status: "completed", phone: "+972 50-900-0011", reviewStatus: "redirected_to_google" },
  { id: 17, name: "Yuval Stern",      service: "Skin Fade",         date: "2026-03-28", time: "14:00", status: "completed", phone: "+972 52-122-2233", reviewStatus: "form_opened" },
  { id: 18, name: "Alex Turner",      service: "Kids Cut",          date: "2026-03-27", time: "10:00", status: "completed", phone: "+972 54-233-3344", reviewStatus: "redirected_to_google" },
  { id: 19, name: "Yoav Cohen",       service: "Fade & Lineup",     date: "2026-03-26", time: "11:00", status: "completed", phone: "+972 52-111-2233", reviewStatus: "redirected_to_google" },
  { id: 20, name: "Rotem Katz",       service: "Full Cut & Style",  date: "2026-03-25", time: "15:00", status: "completed", phone: "+972 50-777-8899", reviewStatus: "form_submitted" },
  { id: 21, name: "Nir Shapiro",      service: "Skin Fade",         date: "2026-03-24", time: "09:00", status: "completed", phone: "+972 54-222-3344", reviewStatus: "redirected_to_google" },
  { id: 22, name: "Lior Ben-David",   service: "Fade & Lineup",     date: "2026-03-24", time: "11:30", status: "completed", phone: "+972 50-333-4455", reviewStatus: "redirected_to_google" },
  { id: 23, name: "Amir Peretz",      service: "Beard Trim",        date: "2026-03-23", time: "14:00", status: "completed", phone: "+972 58-888-9900", reviewStatus: "form_submitted" },
  { id: 24, name: "Guy Friedman",     service: "Kids Cut",          date: "2026-03-22", time: "10:00", status: "completed", phone: "+972 54-011-1122", reviewStatus: "redirected_to_google" },
  { id: 25, name: "Sam Kohen",        service: "Full Cut & Style",  date: "2026-03-20", time: "09:30", status: "completed", phone: "+972 58-300-0011", reviewStatus: "redirected_to_google" },
  { id: 26, name: "Ron Dahan",        service: "Skin Fade",         date: "2026-03-20", time: "12:00", status: "completed", phone: "+972 58-233-3344", reviewStatus: "form_submitted" },
  { id: 27, name: "Eran Ben-Ami",     service: "Fade & Lineup",     date: "2026-03-18", time: "10:30", status: "completed", phone: "+972 54-455-5566", reviewStatus: "redirected_to_google" },
  { id: 28, name: "Shai Tzur",        service: "Skin Fade",         date: "2026-03-17", time: "13:00", status: "cancelled", phone: "+972 58-677-7788", reviewStatus: null },
  { id: 29, name: "Matan Erez",       service: "Full Cut & Style",  date: "2026-03-15", time: "11:00", status: "completed", phone: "+972 54-899-9900", reviewStatus: "redirected_to_google" },
  { id: 30, name: "Itai Levy",        service: "Fade & Lineup",     date: "2026-03-14", time: "15:30", status: "completed", phone: "+972 52-555-6677", reviewStatus: "form_submitted" },
  { id: 31, name: "Yuval Stern",      service: "Beard Trim",        date: "2026-03-12", time: "09:00", status: "completed", phone: "+972 52-122-2233", reviewStatus: "redirected_to_google" },
  { id: 32, name: "Oren Malka",       service: "Skin Fade",         date: "2026-03-10", time: "14:00", status: "completed", phone: "+972 50-122-2233", reviewStatus: "form_submitted" },
  { id: 33, name: "Omri Barak",       service: "Full Cut & Style",  date: "2026-03-08", time: "11:30", status: "completed", phone: "+972 58-011-1122", reviewStatus: "private_feedback" },
  { id: 34, name: "Noam Avraham",     service: "Fade & Lineup",     date: "2026-03-06", time: "16:00", status: "completed", phone: "+972 52-344-4455", reviewStatus: "redirected_to_google" },
  { id: 35, name: "Daniel Goldstein", service: "Skin Fade",         date: "2026-03-04", time: "10:00", status: "completed", phone: "+972 52-999-0011", reviewStatus: "form_submitted" },
  { id: 36, name: "Ido Ziv",          service: "Beard Trim",        date: "2026-03-02", time: "13:00", status: "completed", phone: "+972 50-900-0011", reviewStatus: "redirected_to_google" },
  { id: 37, name: "Alex Turner",      service: "Fade & Lineup",     date: "2026-03-01", time: "09:30", status: "cancelled", phone: "+972 54-233-3344", reviewStatus: null },
  { id: 38, name: "Tal Mizrahi",      service: "Full Cut & Style",  date: "2026-02-27", time: "14:00", status: "completed", phone: "+972 54-666-7788", reviewStatus: "redirected_to_google" },
  { id: 39, name: "Lior Ben-David",   service: "Skin Fade",         date: "2026-02-25", time: "11:00", status: "completed", phone: "+972 50-333-4455", reviewStatus: "form_submitted" },
  { id: 40, name: "Eran Ben-Ami",     service: "Full Cut & Style",  date: "2026-02-22", time: "13:30", status: "no_show",   phone: "+972 54-455-5566", reviewStatus: null },
];

const CRM_CUSTOMERS = [
  { id: "c1",  name: "Yoav Cohen",       phone: "+972 52-111-2233", status: "active",  visits: 8,  lastVisit: "Mar 26",  avgGap: "3 weeks", nudgedAt: null },
  { id: "c2",  name: "Rotem Katz",       phone: "+972 50-777-8899", status: "active",  visits: 7,  lastVisit: "Apr 4",   avgGap: "3 weeks", nudgedAt: null },
  { id: "c3",  name: "Amir Peretz",      phone: "+972 58-888-9900", status: "active",  visits: 7,  lastVisit: "Apr 3",   avgGap: "2 weeks", nudgedAt: null },
  { id: "c4",  name: "Nir Shapiro",      phone: "+972 54-222-3344", status: "active",  visits: 6,  lastVisit: "Mar 24",  avgGap: "3 weeks", nudgedAt: null },
  { id: "c5",  name: "Daniel Goldstein", phone: "+972 52-999-0011", status: "active",  visits: 6,  lastVisit: "Mar 22",  avgGap: "3 weeks", nudgedAt: null },
  { id: "c6",  name: "Lior Ben-David",   phone: "+972 50-333-4455", status: "active",  visits: 5,  lastVisit: "Mar 24",  avgGap: "4 weeks", nudgedAt: null },
  { id: "c7",  name: "Guy Friedman",     phone: "+972 54-011-1122", status: "active",  visits: 5,  lastVisit: "Mar 22",  avgGap: "4 weeks", nudgedAt: null },
  { id: "c8",  name: "Noam Avraham",     phone: "+972 52-344-4455", status: "active",  visits: 5,  lastVisit: "Mar 19",  avgGap: "4 weeks", nudgedAt: null },
  { id: "c9",  name: "Ron Dahan",        phone: "+972 58-233-3344", status: "active",  visits: 5,  lastVisit: "Mar 20",  avgGap: "3 weeks", nudgedAt: null },
  { id: "c10", name: "Eran Ben-Ami",     phone: "+972 54-455-5566", status: "active",  visits: 4,  lastVisit: "Mar 18",  avgGap: "4 weeks", nudgedAt: null },
  { id: "c11", name: "Matan Erez",       phone: "+972 54-899-9900", status: "active",  visits: 4,  lastVisit: "Mar 15",  avgGap: "4 weeks", nudgedAt: null },
  { id: "c12", name: "Shai Tzur",        phone: "+972 58-677-7788", status: "at_risk", visits: 3,  lastVisit: "Mar 17",  avgGap: "4 weeks", nudgedAt: "Apr 1" },
  { id: "c13", name: "Avi Hazut",        phone: "+972 52-788-8899", status: "at_risk", visits: 3,  lastVisit: "Mar 10",  avgGap: "3 weeks", nudgedAt: "Mar 31" },
  { id: "c14", name: "Itai Levy",        phone: "+972 52-555-6677", status: "at_risk", visits: 3,  lastVisit: "Mar 14",  avgGap: "4 weeks", nudgedAt: null },
  { id: "c15", name: "Yuval Stern",      phone: "+972 52-122-2233", status: "lapsed",  visits: 3,  lastVisit: "Mar 12",  avgGap: "3 weeks", nudgedAt: "Mar 28" },
  { id: "c16", name: "Omri Barak",       phone: "+972 58-011-1122", status: "lapsed",  visits: 3,  lastVisit: "Mar 8",   avgGap: "4 weeks", nudgedAt: "Mar 25" },
  { id: "c17", name: "Sam Kohen",        phone: "+972 58-300-0011", status: "active",  visits: 2,  lastVisit: "Mar 20",  avgGap: "—",       nudgedAt: null },
  { id: "c18", name: "Alex Turner",      phone: "+972 54-233-3344", status: "lapsed",  visits: 2,  lastVisit: "Mar 4",   avgGap: "—",       nudgedAt: "Mar 21" },
  { id: "c19", name: "Oren Malka",       phone: "+972 50-122-2233", status: "at_risk", visits: 2,  lastVisit: "Mar 10",  avgGap: "—",       nudgedAt: null },
  { id: "c20", name: "Gal Nakash",       phone: "+972 50-566-6677", status: "lapsed",  visits: 2,  lastVisit: "Mar 6",   avgGap: "—",       nudgedAt: "Mar 20" },
];

// ── Demo invoices (some past appointments already invoiced) ───────────────────
const SERVICE_PRICES: Record<string, number> = {
  "Fade & Lineup":     120,
  "Skin Fade":         140,
  "Full Cut & Style":  160,
  "Beard Trim":         80,
  "Kids Cut":          100,
};

const DEMO_INVOICES: Record<number, { invoice_number: string; payment_method: string; total: number }> = {
  5:  { invoice_number: "INV-0001", payment_method: "bit",    total: 140 },
  6:  { invoice_number: "INV-0002", payment_method: "cash",   total: 120 },
  7:  { invoice_number: "INV-0003", payment_method: "credit", total: 160 },
  8:  { invoice_number: "INV-0004", payment_method: "bit",    total: 100 },
  9:  { invoice_number: "INV-0005", payment_method: "paybox", total: 140 },
  10: { invoice_number: "INV-0006", payment_method: "cash",   total: 120 },
  12: { invoice_number: "INV-0007", payment_method: "credit", total:  80 },
  13: { invoice_number: "INV-0008", payment_method: "bit",    total: 140 },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash", credit: "Credit Card", bit: "Bit", paybox: "Paybox",
};

// ── Full invoice list for InvoicesTab ────────────────────────────────────────
interface DemoInvoice {
  id: string; invoice_number: string; document_type: "receipt" | "tax_invoice";
  issued_at: string; customer_name: string; service: string;
  total: number; payment_method: string;
}

const ALL_DEMO_INVOICES: DemoInvoice[] = [
  { id: "i1",  invoice_number: "INV-0001", document_type: "receipt",    issued_at: "2026-04-04", customer_name: "Tal Mizrahi",      service: "Skin Fade",         total: 140, payment_method: "bit"    },
  { id: "i2",  invoice_number: "INV-0002", document_type: "receipt",    issued_at: "2026-04-03", customer_name: "Amir Peretz",      service: "Fade & Lineup",     total: 120, payment_method: "cash"   },
  { id: "i3",  invoice_number: "INV-0003", document_type: "receipt",    issued_at: "2026-04-03", customer_name: "Omri Barak",       service: "Full Cut & Style",  total: 160, payment_method: "credit" },
  { id: "i4",  invoice_number: "INV-0004", document_type: "receipt",    issued_at: "2026-04-02", customer_name: "Guy Friedman",     service: "Kids Cut",          total: 100, payment_method: "bit"    },
  { id: "i5",  invoice_number: "INV-0005", document_type: "receipt",    issued_at: "2026-04-02", customer_name: "Gal Nakash",       service: "Skin Fade",         total: 140, payment_method: "paybox" },
  { id: "i6",  invoice_number: "INV-0006", document_type: "receipt",    issued_at: "2026-04-01", customer_name: "Ron Dahan",        service: "Fade & Lineup",     total: 120, payment_method: "cash"   },
  { id: "i7",  invoice_number: "INV-0007", document_type: "receipt",    issued_at: "2026-03-31", customer_name: "Eran Ben-Ami",     service: "Beard Trim",        total:  80, payment_method: "credit" },
  { id: "i8",  invoice_number: "INV-0008", document_type: "receipt",    issued_at: "2026-03-30", customer_name: "Shai Tzur",        service: "Skin Fade",         total: 140, payment_method: "bit"    },
  { id: "i9",  invoice_number: "INV-0009", document_type: "receipt",    issued_at: "2026-03-29", customer_name: "Matan Erez",       service: "Full Cut & Style",  total: 160, payment_method: "cash"   },
  { id: "i10", invoice_number: "INV-0010", document_type: "receipt",    issued_at: "2026-03-28", customer_name: "Yuval Stern",      service: "Beard Trim",        total:  80, payment_method: "paybox" },
  { id: "i11", invoice_number: "INV-0011", document_type: "receipt",    issued_at: "2026-03-27", customer_name: "Alex Turner",      service: "Kids Cut",          total: 100, payment_method: "cash"   },
  { id: "i12", invoice_number: "INV-0012", document_type: "receipt",    issued_at: "2026-03-26", customer_name: "Yoav Cohen",       service: "Fade & Lineup",     total: 120, payment_method: "bit"    },
  { id: "i13", invoice_number: "INV-0013", document_type: "receipt",    issued_at: "2026-03-25", customer_name: "Rotem Katz",       service: "Full Cut & Style",  total: 160, payment_method: "credit" },
  { id: "i14", invoice_number: "INV-0014", document_type: "receipt",    issued_at: "2026-03-24", customer_name: "Nir Shapiro",      service: "Skin Fade",         total: 140, payment_method: "cash"   },
  { id: "i15", invoice_number: "INV-0015", document_type: "receipt",    issued_at: "2026-03-23", customer_name: "Amir Peretz",      service: "Beard Trim",        total:  80, payment_method: "bit"    },
  { id: "i16", invoice_number: "INV-0016", document_type: "receipt",    issued_at: "2026-03-22", customer_name: "Guy Friedman",     service: "Kids Cut",          total: 100, payment_method: "paybox" },
  { id: "i17", invoice_number: "INV-0017", document_type: "receipt",    issued_at: "2026-03-20", customer_name: "Sam Kohen",        service: "Full Cut & Style",  total: 160, payment_method: "cash"   },
  { id: "i18", invoice_number: "INV-0018", document_type: "receipt",    issued_at: "2026-03-20", customer_name: "Ron Dahan",        service: "Skin Fade",         total: 140, payment_method: "credit" },
  { id: "i19", invoice_number: "INV-0019", document_type: "receipt",    issued_at: "2026-03-18", customer_name: "Eran Ben-Ami",     service: "Fade & Lineup",     total: 120, payment_method: "bit"    },
  { id: "i20", invoice_number: "INV-0020", document_type: "receipt",    issued_at: "2026-03-15", customer_name: "Matan Erez",       service: "Full Cut & Style",  total: 160, payment_method: "cash"   },
];

// ── Waitlist demo data ────────────────────────────────────────────────────────
const DEMO_WAITLIST = [
  { id: "w1", name: "Oren Malka",    phone: "+972 50-122-2233", service: "Skin Fade",        date: "2026-04-07", time: "09:00", position: 1, status: "notified"  },
  { id: "w2", name: "Liron Geva",    phone: "+972 52-345-6789", service: "Fade & Lineup",    date: "2026-04-07", time: "11:30", position: 2, status: "waiting"   },
  { id: "w3", name: "Tomer Shahar",  phone: "+972 54-876-5432", service: "Full Cut & Style", date: "2026-04-07", time: "14:00", position: 3, status: "waiting"   },
  { id: "w4", name: "Barak Cohen",   phone: "+972 58-222-3344", service: "Beard Trim",       date: "2026-04-08", time: "10:00", position: 1, status: "waiting"   },
  { id: "w5", name: "Noa Perelman",  phone: "+972 50-444-5566", service: "Kids Cut",         date: "2026-04-08", time: "13:30", position: 2, status: "waiting"   },
];

// ── Monthly bookings chart data ───────────────────────────────────────────────
const MONTHLY_DATA = [
  { month: "Nov", bookings: 18 },
  { month: "Dec", bookings: 22 },
  { month: "Jan", bookings: 27 },
  { month: "Feb", bookings: 31 },
  { month: "Mar", bookings: 38 },
  { month: "Apr", bookings: 14 },
];

const RATING_DIST = [
  { label: "5★", value: 17, color: GD   },
  { label: "4★", value: 9,  color: "#22C55E" },
  { label: "3★", value: 3,  color: "#F59E0B" },
  { label: "1-2★ (caught)", value: 4, color: "#EF4444" },
];

// ── CRM status config ─────────────────────────────────────────────────────────
const CRM_STATUS: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  active:  { label: "Active",   bg: "rgba(0,200,150,0.08)",  color: GD,       dot: GD        },
  at_risk: { label: "At Risk",  bg: "#FEF3C7",               color: "#B45309", dot: "#F59E0B" },
  lapsed:  { label: "Lapsed",   bg: "#FCEBEB",               color: "#A32D2D", dot: "#EF4444" },
};

// ── Appointment badge ─────────────────────────────────────────────────────────
const APPT_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  confirmed: { label: "Confirmed", bg: "rgba(0,200,150,0.10)", color: "#00A87D", border: "rgba(0,200,150,0.3)" },
  completed: { label: "Completed", bg: "#EFF6FF",              color: "#3B82F6", border: "#BFDBFE"             },
  cancelled: { label: "Cancelled", bg: "#F3F4F6",              color: "#6B7280", border: "#E5E7EB"             },
  no_show:   { label: "No-Show",   bg: "#FEE2E2",              color: "#DC2626", border: "#FECACA"             },
};

const REVIEW_BADGE: Record<string, { label: string; color: string }> = {
  redirected_to_google: { label: "→ Google",       color: GD       },
  form_submitted:       { label: "Rated",           color: "#3B82F6" },
  private_feedback:     { label: "Caught ⚠",        color: "#DC2626" },
  form_opened:          { label: "Opened",           color: "#B45309" },
};

const FEEDBACK_STATUS: Record<string, { label: string; style: React.CSSProperties; icon: React.ReactNode }> = {
  new:         { label: "New",         style: { background: "#FEF3C7", color: "#B45309"   }, icon: <MessageSquare size={12} /> },
  in_progress: { label: "In Progress", style: { background: "rgba(0,200,150,0.1)", color: "#00A87D" }, icon: <Clock size={12} /> },
  resolved:    { label: "Resolved",    style: { background: "#F0FDF4", color: "#166534"   }, icon: <CheckCircle2 size={12} /> },
};

const TOPIC_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  wait_time:   { label: "Wait Time", bg: "#FEF3C7", color: "#B45309" },
  quality:     { label: "Quality",   bg: "#FEE2E2", color: "#DC2626" },
  staff:       { label: "Staff",     bg: "#FEE2E2", color: "#DC2626" },
  price:       { label: "Price",     bg: "#F3F4F6", color: "#6B7280" },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  "1_hour":    { label: "Respond within 1 hour",   color: "#EF4444" },
  "24_hours":  { label: "Respond within 24 hours", color: "#F59E0B" },
  "this_week": { label: "Respond this week",        color: "#6B7280" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StarDisplay({ rating }: { rating: number }) {
  const colors: Record<number, string> = { 1: "#EF4444", 2: "#F97316", 3: "#F59E0B", 4: "#22C55E", 5: GD };
  const col = colors[Math.min(5, Math.max(1, rating))] ?? "#6B7280";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} style={{ fill: i <= rating ? col : "#E5E7EB", color: i <= rating ? col : "#E5E7EB" }} />
      ))}
      <span style={{ fontSize: 12, fontWeight: 600, color: col, marginLeft: 4 }}>{rating}/5</span>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  // Stats
  const statsToday  = TODAY_APPTS.length;
  const statsWeek   = 18;
  const statsMonth  = 38;
  const revenue     = 7410; // ₪ (38 bookings × avg ₪195)
  const reEngagRev  = 1560; // from lapsed customer re-bookings

  // Funnel (this month)
  const funnelSent     = 38;
  const funnelOpened   = 27;
  const funnelRated    = 21;
  const funnelToGoogle = 17;
  const funnelCaught   = 4;

  const funnelSteps = [
    { label: "requests sent", count: funnelSent,     pctBase: null          },
    { label: "link opened",   count: funnelOpened,   pctBase: funnelSent    },
    { label: "rated",         count: funnelRated,    pctBase: funnelOpened  },
    { label: "to Google",     count: funnelToGoogle, pctBase: funnelRated   },
  ];

  // Re-engagement profiles
  const reEngagProfiles = [
    { name: "Yuval Stern",  state: "lapsed", detail: "7 weeks · visits every 3 weeks"   },
    { name: "Omri Barak",   state: "lapsed", detail: "4 weeks since nudge sent"          },
    { name: "Shai Tzur",    state: "queued", detail: "Nudge sent Apr 1"                  },
    { name: "Avi Hazut",    state: "booked", detail: "Returned after nudge ✓"            },
  ];

  const profileBadge: Record<string, { bg: string; color: string; dot: string; label: string }> = {
    lapsed: { bg: "#FCEBEB", color: "#A32D2D", dot: "#EF4444", label: "Lapsed"       },
    queued: { bg: "#FAEEDA", color: "#854F0B", dot: "#F59E0B", label: "Queued"       },
    booked: { bg: "#E1F5EE", color: "#0F6E56", dot: GD,        label: "Booked ✓"     },
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* Next appointment banner */}
      <div style={{ background: GD, borderRadius: 14, padding: "18px 22px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9FE1CB", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Next Appointment
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: "#fff", marginBottom: 5 }}>
            Yoav Cohen — Fade & Lineup
          </div>
          <div style={{ fontSize: 13, color: "#9FE1CB" }}>
            Today at 09:00 · Reminder sent ✓
          </div>
        </div>
        <span style={{ padding: "5px 14px", borderRadius: 9999, background: "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 500, color: "#fff" }}>
          Confirmed
        </span>
      </div>

      {/* Stats row */}
      <div className="demo-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Today",      value: statsToday, sub: "appointments" },
          { label: "This week",  value: statsWeek,  sub: "appointments" },
          { label: "This month", value: statsMonth, sub: "appointments" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: SHADOW }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: TEXT, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 5 }}>{s.sub}</div>
          </div>
        ))}
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: SHADOW }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Est. revenue</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: GD, lineHeight: 1 }}>₪{revenue.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: GD, marginTop: 6 }}>+₪{reEngagRev.toLocaleString()} re-engagements</div>
        </div>
      </div>

      {/* Today's appointments */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: TEXT }}>Today&apos;s appointments</div>
          <span style={{ fontSize: 13, color: GD, cursor: "default" }}>View calendar →</span>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: SHADOW, overflow: "hidden" }}>
          {TODAY_APPTS.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 22px", borderTop: i === 0 ? "none" : `1px solid ${DIVIDER}` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: GD, flexShrink: 0 }} />
              <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, flexShrink: 0, minWidth: 42 }}>{b.time}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>{b.name}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{b.service} · {b.duration} min</div>
              </div>
              {b.reminded
                ? <span style={{ padding: "3px 11px", borderRadius: 9999, background: "#E1F5EE", color: "#0F6E56", fontSize: 12, fontWeight: 500, flexShrink: 0 }}>Reminded ✓</span>
                : <span style={{ padding: "3px 11px", borderRadius: 9999, background: "#F3F4F6", color: MUTED, fontSize: 12, flexShrink: 0 }}>Reminder at {
                    (() => { const [h,m] = b.time.split(":").map(Number); const rh = h - 24 < 0 ? h + 0 : h - 1; return `${String(rh).padStart(2,"0")}:${String(m).padStart(2,"0")}`; })()
                  } tomorrow</span>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Needs your attention */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 10 }}>Needs your attention</div>
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: SHADOW, overflow: "hidden" }}>
          {PRIVATE_FEEDBACK.filter(f => f.status !== "resolved").map((fb, i) => (
            <div key={fb.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 22px", borderTop: i === 0 ? "none" : `1px solid ${DIVIDER}` }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>💬</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: TEXT, marginBottom: 3 }}>Private complaint — not on Google</div>
                <div style={{ fontSize: 13, color: MUTED }}>&ldquo;{fb.text.substring(0, 60)}…&rdquo;</div>
              </div>
              <span style={{ fontSize: 13, color: GD, flexShrink: 0, paddingTop: 2, cursor: "default" }}>Reply →</span>
            </div>
          ))}
        </div>
      </div>

      {/* This month */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 10 }}>This month</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div className="demo-content-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>

            {/* Review pipeline */}
            <div style={{ background: "#fff", padding: "20px 22px", borderRadius: 14, boxShadow: SHADOW }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Review pipeline</div>
                <span style={{ fontSize: 13, color: GD, cursor: "default" }}>Details →</span>
              </div>
              <div style={{ display: "flex", alignItems: "stretch", gap: 0, minWidth: 0, overflow: "hidden" }}>
                {funnelSteps.map((step, i) => (
                  <div key={step.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div style={{
                      flex: 1, textAlign: "center",
                      background: i === 3 ? "rgba(0,200,150,0.08)" : "#F7F8FA",
                      border: `1.5px solid ${i === 3 ? GD : "#D1D5DB"}`,
                      borderRadius: 12, padding: "14px 6px",
                    }}>
                      <div style={{ fontSize: 30, fontWeight: 700, color: i === 3 ? GD : TEXT, lineHeight: 1 }}>{step.count}</div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>{step.label}</div>
                      {step.pctBase !== null && (
                        <div style={{ fontSize: 11, color: GD, fontWeight: 600, marginTop: 4 }}>
                          {step.pctBase > 0 ? Math.round((step.count / step.pctBase) * 100) : 0}%
                        </div>
                      )}
                    </div>
                    {i < funnelSteps.length - 1 && (
                      <div style={{ color: "#9CA3AF", fontSize: 18, padding: "0 6px", flexShrink: 0, userSelect: "none" }}>→</div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingLeft: 10, borderLeft: "3px solid #E5E7EB" }}>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>
                  {funnelCaught} negatives intercepted — never reached Google
                </div>
              </div>
            </div>

            {/* Re-engagement */}
            <div style={{ background: "#fff", padding: "20px 22px", borderRadius: 14, boxShadow: SHADOW }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Re-engagement</div>
                <span style={{ fontSize: 13, color: GD, cursor: "default" }}>View all →</span>
              </div>
              {reEngagProfiles.map((p, i) => {
                const badge = profileBadge[p.state];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: i === 0 ? "none" : `1px solid ${DIVIDER}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: badge.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{p.detail}</div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 9999, background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vomni handled automatically */}
          <div style={{ background: "#E1F5EE", padding: "16px 20px", borderRadius: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#085041", marginBottom: 12 }}>
              Vomni handled this month — automatically
            </div>
            <div className="demo-vomni-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
              {[
                { label: "reminders sent",         value: 38 },
                { label: "review requests",        value: 38 },
                { label: "re-engagement messages", value: 6  },
                { label: "bad reviews on Google",  value: 4  },
              ].map((card, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: GD, lineHeight: 1, marginBottom: 5 }}>{card.value}</div>
                  <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.3 }}>{card.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────

function CalendarTab() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // April 2026 starts on Wednesday (index 3)
  const startDay = 3;
  const daysInMonth = 30;
  const today = 7;

  // Map appts to dates
  const apptsByDay: Record<number, number> = {};
  ALL_APPOINTMENTS.forEach(a => {
    const d = parseInt(a.date.split("-")[2]);
    if (a.date.startsWith("2026-04")) apptsByDay[d] = (apptsByDay[d] || 0) + 1;
  });

  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: SHADOW }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: N }}>April 2026</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ padding: "6px 14px", border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff", fontSize: 13, color: MUTED, cursor: "pointer" }}>‹</button>
            <button style={{ padding: "6px 14px", border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff", fontSize: 13, color: MUTED, cursor: "pointer" }}>›</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${BORDER}` }}>
          {days.map(d => (
            <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((day, i) => {
            const count = day ? apptsByDay[day] || 0 : 0;
            const isToday = day === today;
            return (
              <div key={i} style={{
                minHeight: 72, padding: "8px 10px",
                borderRight: (i + 1) % 7 !== 0 ? `1px solid ${BORDER}` : "none",
                borderBottom: i < cells.length - 7 ? `1px solid ${BORDER}` : "none",
                background: isToday ? "rgba(0,200,150,0.04)" : "#fff",
              }}>
                {day && (
                  <>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      background: isToday ? GD : "transparent",
                      fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? "#fff" : day > 7 ? "#9CA3AF" : TEXT,
                      marginBottom: 4,
                    }}>{day}</div>
                    {count > 0 && (
                      <div style={{ background: isToday ? GD : "rgba(0,200,150,0.1)", color: isToday ? "#fff" : GD, borderRadius: 6, padding: "2px 6px", fontSize: 11, fontWeight: 600, display: "inline-block" }}>
                        {count} appt{count !== 1 ? "s" : ""}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Demo Payment Drawer ───────────────────────────────────────────────────────

type DemoAppt = typeof ALL_APPOINTMENTS[number];
type DrawerStep = 1 | 2 | 3 | "success";
type PaymentMethod = "cash" | "credit" | "bit" | "paybox";

function DemoPaymentDrawer({
  appt, onClose, onInvoiced,
}: { appt: DemoAppt; onClose: () => void; onInvoiced: (apptId: number, inv: { invoice_number: string; payment_method: string; total: number }) => void }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<DrawerStep>(1);
  const [customerName, setCustomerName] = useState(appt.name);
  const [serviceDesc, setServiceDesc] = useState(appt.service);
  const [price, setPrice] = useState(String(SERVICE_PRICES[appt.service] ?? 120));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const unitPrice = parseFloat(price) || 0;
  const step1Valid = customerName.trim() && serviceDesc.trim() && unitPrice > 0;

  // Slide in on mount
  useState(() => { requestAnimationFrame(() => setVisible(true)); });

  function close() { setVisible(false); setTimeout(onClose, 280); }

  function confirm() {
    const nextNum = "INV-" + String(Object.keys(DEMO_INVOICES).length + 9).padStart(4, "0");
    setInvoiceNumber(nextNum);
    setStep("success");
    onInvoiced(appt.id, { invoice_number: nextNum, payment_method: paymentMethod!, total: unitPrice });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1px solid #E5E7EB", fontSize: 14, color: N, outline: "none",
    boxSizing: "border-box", fontFamily: "Inter, sans-serif", direction: "rtl",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "#9CA3AF", display: "block",
    marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em",
  };

  return (
    <>
      <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 55, opacity: visible ? 1 : 0, transition: "opacity 0.25s ease" }} />
      <div dir="rtl" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, maxHeight: "92vh",
        background: "#fff", borderRadius: "20px 20px 0 0",
        boxShadow: "0 -4px 40px rgba(0,0,0,0.18)", zIndex: 60,
        display: "flex", flexDirection: "column",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.28s cubic-bezier(0.32,0.72,0,1)",
        overflowY: "auto", fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E5E7EB" }} />
        </div>
        <div style={{ padding: "16px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: 0 }}>
            {step === "success" ? "Document issued ✓" : "Record Payment"}
          </h2>
          <button onClick={close} style={{ background: "#F7F8FA", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>
        {step !== "success" && (
          <div style={{ padding: "14px 24px 0", display: "flex", gap: 6 }}>
            {[1,2,3].map(s => (
              <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: (step as number) >= s ? GD : "#E5E7EB", transition: "background 0.2s" }} />
            ))}
          </div>
        )}

        <div style={{ padding: "16px 24px 48px" }}>
          {/* Step 1 */}
          {step === 1 && (
            <div>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Review or edit details before continuing</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                <div><label style={labelStyle}>Customer Name</label><input value={customerName} onChange={e => setCustomerName(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Service</label><input value={serviceDesc} onChange={e => setServiceDesc(e.target.value)} style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>Price (₪)</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} style={{ ...inputStyle, textAlign: "right" }} />
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!step1Valid} style={{ width: "100%", padding: 14, borderRadius: 12, background: step1Valid ? GD : "#E5E7EB", color: step1Valid ? "#fff" : "#9CA3AF", border: "none", fontSize: 15, fontWeight: 700, cursor: step1Valid ? "pointer" : "not-allowed", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Continue to Payment Method →
              </button>
            </div>
          )}
          {/* Step 2 */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Select payment method</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                {(["cash","credit","bit","paybox"] as PaymentMethod[]).map(pm => {
                  const icons: Record<string,string> = { cash:"💵", credit:"💳", bit:"📱", paybox:"📲" };
                  const sel = paymentMethod === pm;
                  return (
                    <button key={pm} onClick={() => setPaymentMethod(pm)} style={{ padding: "18px 12px", borderRadius: 14, border: `2px solid ${sel ? GD : "#E5E7EB"}`, background: sel ? `${GD}12` : "#fff", cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{icons[pm]}</div>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, color: sel ? GD : N }}>{PAYMENT_LABELS[pm]}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: 13, borderRadius: 12, border: "1px solid #E5E7EB", background: "#fff", color: N, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Back</button>
                <button onClick={() => setStep(3)} disabled={!paymentMethod} style={{ flex: 2, padding: 13, borderRadius: 12, background: paymentMethod ? N : "#E5E7EB", color: paymentMethod ? "#fff" : "#9CA3AF", border: "none", fontSize: 15, fontWeight: 700, cursor: paymentMethod ? "pointer" : "not-allowed", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  Continue to Preview →
                </button>
              </div>
            </div>
          )}
          {/* Step 3: preview */}
          {step === 3 && (
            <div>
              <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 20, marginBottom: 24, background: "#F7F8FA" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #E5E7EB" }}>
                  <div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, color: N }}>The Fade Room</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>תל אביב</div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: GD }}>Receipt</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF" }}>מס׳: יוקצה אוטומטית</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#374151", marginBottom: 12 }}>
                  <span style={{ fontWeight: 600 }}>Received from: </span>{customerName}
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", marginBottom: 12, border: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: N }}>{serviceDesc}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: N }}>₪{unitPrice.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: N }}>
                  <span>Total</span><span>₪{unitPrice.toFixed(2)}</span>
                </div>
                {paymentMethod && (
                  <div style={{ marginTop: 10, fontSize: 11, color: "#9CA3AF", borderTop: "1px solid #E5E7EB", paddingTop: 8 }}>
                    Payment method: {PAYMENT_LABELS[paymentMethod]}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(2)} style={{ flex: 1, padding: 13, borderRadius: 12, border: "1px solid #E5E7EB", background: "#fff", color: N, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Back</button>
                <button onClick={confirm} style={{ flex: 2, padding: 13, borderRadius: 12, background: N, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  Confirm & Issue ✓
                </button>
              </div>
            </div>
          )}
          {/* Success */}
          {step === "success" && (
            <div style={{ textAlign: "center", paddingTop: 8 }}>
              <div style={{ fontSize: 56, marginBottom: 14 }}>✅</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N, marginBottom: 6 }}>Receipt issued</div>
              <div style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 28 }}>
                Document number: <strong style={{ color: N }}>{invoiceNumber}</strong>
              </div>
              <button onClick={() => alert("Demo mode — PDF would download here")} style={{ width: "100%", padding: "13px 16px", borderRadius: 12, background: "#F7F8FA", color: N, border: "1px solid #E5E7EB", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>
                ⬇️ Download PDF
              </button>
              <button onClick={close} style={{ width: "100%", padding: 13, borderRadius: 12, background: GD, color: "#fff", border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Customers Tab ─────────────────────────────────────────────────────────────

// ── Customer Invoices Sub-tab ─────────────────────────────────────────────────

function CustomerInvoicesTab() {
  const PM_LABELS: Record<string, string> = { cash: "Cash", credit: "Credit Card", bit: "Bit", paybox: "Paybox" };
  const [filterMonth, setFilterMonth] = useState("");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [filterPM,    setFilterPM]    = useState("all");
  const [selected,    setSelected]    = useState<Set<string>>(new Set());

  const effectiveDateFrom = filterMonth ? `${filterMonth}-01` : dateFrom;
  const effectiveDateTo   = filterMonth
    ? (() => { const [y,m] = filterMonth.split("-").map(Number); return new Date(y, m, 0).toISOString().substring(0, 10); })()
    : dateTo;

  const filtered = ALL_DEMO_INVOICES.filter(inv => {
    if (effectiveDateFrom && inv.issued_at < effectiveDateFrom) return false;
    if (effectiveDateTo   && inv.issued_at > effectiveDateTo)   return false;
    if (filterPM !== "all" && inv.payment_method !== filterPM)  return false;
    return true;
  });

  const thisMonthInvs = ALL_DEMO_INVOICES.filter(inv => inv.issued_at.startsWith("2026-04"));
  const totalRevenue  = thisMonthInvs.reduce((s, inv) => s + inv.total, 0);
  const byPM = ["cash","credit","bit","paybox"].map(pm => ({
    pm, label: PM_LABELS[pm],
    amount: thisMonthInvs.filter(i => i.payment_method === pm).reduce((s,i) => s + i.total, 0),
    count:  thisMonthInvs.filter(i => i.payment_method === pm).length,
  }));

  function exportCSVDemo() {
    const BOM = "\uFEFF";
    const headers = ["Invoice #","Type","Date","Customer","Service","Total","Payment Method"];
    const rows = filtered.map(inv => [inv.invoice_number, "Receipt", inv.issued_at, inv.customer_name, inv.service, inv.total.toFixed(2), PM_LABELS[inv.payment_method] ?? inv.payment_method]);
    const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `invoices_TheFadeRoom_${filterMonth || "all"}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const hasFilters = dateFrom || dateTo || filterMonth || filterPM !== "all";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: N, margin: 0 }}>Invoices & Receipts</h2>
          <p style={{ fontSize: 13, color: MUTED, margin: "3px 0 0" }}>Financial document history</p>
        </div>
        <button onClick={exportCSVDemo} disabled={filtered.length === 0}
          style={{ padding: "9px 18px", borderRadius: 10, background: filtered.length > 0 ? `${GD}18` : "#F9FAFB", color: filtered.length > 0 ? GD : MUTED, border: `1px solid ${filtered.length > 0 ? GD : BORDER}`, fontSize: 13, fontWeight: 600, cursor: filtered.length > 0 ? "pointer" : "not-allowed" }}>
          ⬇ Export CSV
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", border: `1px solid ${BORDER}`, borderLeft: `4px solid ${GD}`, flex: 1, minWidth: 140, boxShadow: SHADOW }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Revenue (This Month)</div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: GD }}>₪{totalRevenue.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{thisMonthInvs.length} documents this month</div>
        </div>
        {byPM.map(({ pm, label, amount, count }) => (
          <div key={pm} style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", border: `1px solid ${BORDER}`, flex: 1, minWidth: 100, boxShadow: SHADOW }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N }}>₪{amount.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{count} docs</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>Month:</label>
          <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setDateFrom(""); setDateTo(""); }}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none" }} />
        </div>
        <span style={{ fontSize: 12, color: MUTED }}>or</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>From:</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setFilterMonth(""); }}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>To:</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setFilterMonth(""); }}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none" }} />
        </div>
        <select value={filterPM} onChange={e => setFilterPM(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none", background: "#fff" }}>
          <option value="all">All payment methods</option>
          <option value="cash">Cash</option>
          <option value="credit">Credit Card</option>
          <option value="bit">Bit</option>
          <option value="paybox">Paybox</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterMonth(""); setDateFrom(""); setDateTo(""); setFilterPM("all"); }}
            style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", fontSize: 13, color: MUTED, cursor: "pointer" }}>
            Clear ✕
          </button>
        )}
        <span style={{ fontSize: 12, color: MUTED, marginLeft: "auto" }}>{filtered.length} documents</span>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: SHADOW }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ padding: "11px 14px", width: 40 }}>
                  <input type="checkbox" checked={filtered.length > 0 && filtered.every(i => selected.has(i.id))}
                    onChange={() => setSelected(filtered.every(i => selected.has(i.id)) ? new Set() : new Set(filtered.map(i => i.id)))}
                    style={{ cursor: "pointer", width: 14, height: 14 }} />
                </th>
                {["Invoice #","Type","Date","Customer","Service","Total","Payment",""].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={inv.id} style={{ borderTop: i > 0 ? `1px solid #F3F4F6` : "none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                  <td style={{ padding: "12px 14px" }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(inv.id)} onChange={() => {
                      const n = new Set(selected);
                      if (n.has(inv.id)) n.delete(inv.id); else n.add(inv.id);
                      setSelected(n);
                    }} style={{ cursor: "pointer", width: 14, height: 14 }} />
                  </td>
                  <td style={{ padding: "12px 14px", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, color: N }}>{inv.invoice_number}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: "#EEF2FF", color: "#6366F1" }}>Receipt</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>
                    {new Date(inv.issued_at + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 500, color: N }}>{inv.customer_name}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: MUTED }}>{inv.service}</td>
                  <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 700, color: N }}>₪{inv.total}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 9999, background: "#F3F4F6", color: "#374151", fontSize: 11, fontWeight: 600 }}>{PM_LABELS[inv.payment_method]}</span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <button onClick={() => alert("Demo mode — PDF would download here")}
                      style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${BORDER}`, background: "#F9FAFB", color: N, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                      ⬇ PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected.size > 0 && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, background: "#F9FAFB", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: MUTED }}>{selected.size} selected</span>
            <button onClick={() => { alert(`Demo mode — would download ${selected.size} PDF(s)`); setSelected(new Set()); }}
              style={{ padding: "7px 16px", borderRadius: 8, background: N, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ⬇ Download PDFs ({selected.size})
            </button>
            <button onClick={() => setSelected(new Set())}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Customers Tab ─────────────────────────────────────────────────────────────

function CustomersTab() {
  const [subTab, setSubTab] = useState<"schedule" | "clients" | "history" | "waitlist" | "invoices">("schedule");
  const [apptSearch, setApptSearch] = useState("");
  const [apptStatus, setApptStatus] = useState("all");
  const [crmFilter, setCrmFilter] = useState("all");
  const [crmSearch, setCrmSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [invoices, setInvoices] = useState<Record<number, { invoice_number: string; payment_method: string; total: number }>>(DEMO_INVOICES);
  const [drawerAppt, setDrawerAppt] = useState<DemoAppt | null>(null);
  const [noShowIds, setNoShowIds] = useState<Set<number>>(new Set());
  const [markingNoShow, setMarkingNoShow] = useState<number | null>(null);

  const filteredAppts = useMemo(() => {
    const q = apptSearch.toLowerCase();
    return ALL_APPOINTMENTS.filter(a => {
      if (a.status !== "confirmed" && a.status !== "pending") return false;
      const matchSearch = !q || a.name.toLowerCase().includes(q) || (a.service || "").toLowerCase().includes(q);
      const matchStatus = apptStatus === "all" || a.status === apptStatus;
      return matchSearch && matchStatus;
    });
  }, [apptSearch, apptStatus]);

  const filteredCrm = useMemo(() => {
    const q = crmSearch.toLowerCase();
    return CRM_CUSTOMERS.filter(c => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
      const matchFilter = crmFilter === "all" || c.status === crmFilter;
      return matchSearch && matchFilter;
    });
  }, [crmSearch, crmFilter]);

  const crmStats = { total: 20, active: 11, at_risk: 4, lapsed: 5 };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "#fff", borderRadius: 10, border: `1px solid ${BORDER}`, overflow: "hidden", width: "fit-content" }}>
        {([["schedule", "Upcoming Appointments"], ["waitlist", "Waitlist"], ["history", "Past Appointments"], ["clients", "Customers"], ["invoices", "Invoices"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key)} style={{
            padding: "9px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: subTab === key ? GD : "transparent",
            color: subTab === key ? "#fff" : MUTED,
            transition: "all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {subTab === "schedule" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MUTED }} />
              <input value={apptSearch} onChange={e => setApptSearch(e.target.value)} placeholder="Search appointments..."
                style={{ width: "100%", paddingLeft: 34, paddingRight: 14, paddingTop: 9, paddingBottom: 9, border: `1px solid ${BORDER}`, borderRadius: 9, fontFamily: "Inter, sans-serif", fontSize: 13, color: N, background: "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>
            <select value={apptStatus} onChange={e => setApptStatus(e.target.value)}
              style={{ padding: "9px 14px", border: `1px solid ${BORDER}`, borderRadius: 9, fontFamily: "Inter, sans-serif", fontSize: 13, color: N, background: "#fff", outline: "none", cursor: "pointer" }}>
              <option value="all">All upcoming</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: SHADOW }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${BORDER}` }}>
                    {["Customer", "Service", "Date & Time", "Status", "Review", "Phone"].map(h => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", fontFamily: "Inter, sans-serif" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAppts.map((a, i) => {
                    const badge = APPT_BADGE[a.status] ?? APPT_BADGE.completed;
                    const rv = a.reviewStatus ? REVIEW_BADGE[a.reviewStatus] : null;
                    return (
                      <tr key={a.id} style={{ borderBottom: i < filteredAppts.length - 1 ? `1px solid #F3F4F6` : "none" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: GD, flexShrink: 0 }}>
                              {a.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: N }}>{a.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: MUTED }}>{a.service}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: N, whiteSpace: "nowrap" }}>
                          {new Date(a.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {a.time}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "3px 9px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: rv ? rv.color : "#D1D5DB" }}>
                          {rv ? rv.label : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: MUTED }}>{a.phone}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "10px 16px", borderTop: `1px solid #F3F4F6`, background: "#F9FAFB", fontSize: 12, color: MUTED, fontFamily: "Inter, sans-serif" }}>
              {filteredAppts.length} upcoming appointments
            </div>
          </div>
        </div>
      )}

      {subTab === "history" && (() => {
        const pastAppts = ALL_APPOINTMENTS.filter(a => a.status === "completed" || a.status === "cancelled" || a.status === "no_show");
        const filtered = pastAppts.filter(a => {
          if (!historySearch) return true;
          const q = historySearch.toLowerCase();
          return a.name.toLowerCase().includes(q) || a.service.toLowerCase().includes(q);
        });
        return (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MUTED }} />
                <input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Search name, service..."
                  style={{ width: "100%", paddingLeft: 34, paddingRight: 14, paddingTop: 9, paddingBottom: 9, border: `1px solid ${BORDER}`, borderRadius: 9, fontFamily: "Inter, sans-serif", fontSize: 13, color: N, background: "#fff", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Summary cards */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { label: "Revenue this month", value: `₪${Object.values(invoices).reduce((s,v) => s + v.total, 0).toLocaleString()}`, color: GD },
                { label: "Invoices issued", value: String(Object.keys(invoices).length), color: N },
                { label: "Awaiting payment", value: String(pastAppts.filter(a => !invoices[a.id] && a.status !== "cancelled" && a.status !== "no_show").length), color: "#F59E0B" },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", border: `1px solid ${BORDER}`, boxShadow: SHADOW, minWidth: 120 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: SHADOW }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${BORDER}` }}>
                      {["Customer", "Service", "Date", "Status", "Review", "Rating", "Invoice", ""].map(h => (
                        <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", fontFamily: "Inter, sans-serif" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, i) => {
                      const effectiveStatus = noShowIds.has(a.id) ? "no_show" : a.status;
                      const badge = APPT_BADGE[effectiveStatus] ?? APPT_BADGE.completed;
                      const inv = invoices[a.id];
                      const canCharge = !inv && effectiveStatus !== "cancelled" && effectiveStatus !== "no_show";
                      return (
                        <tr key={a.id}
                          onClick={canCharge ? () => setDrawerAppt(a) : undefined}
                          style={{ borderBottom: i < filtered.length - 1 ? `1px solid #F3F4F6` : "none", cursor: canCharge ? "pointer" : "default" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: GD, flexShrink: 0 }}>
                                {a.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 500, color: N }}>{a.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: MUTED }}>{a.service}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: N, whiteSpace: "nowrap" }}>
                            {new Date(a.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "3px 9px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                              {badge.label}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {a.reviewStatus ? (() => {
                              const rv = REVIEW_BADGE[a.reviewStatus];
                              return rv ? (
                                <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: "3px 9px", background: `${rv.color}18`, color: rv.color }}>
                                  {rv.label}
                                </span>
                              ) : <span style={{ fontSize: 12, color: "#D1D5DB" }}>—</span>;
                            })() : <span style={{ fontSize: 12, color: "#D1D5DB" }}>—</span>}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: 12, color: "#D1D5DB" }}>—</span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {inv ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: GD }}>{inv.invoice_number}</span>
                                <span style={{ fontSize: 11, color: MUTED }}>· {PAYMENT_LABELS[inv.payment_method]}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: N }}>₪{inv.total}</span>
                              </div>
                            ) : canCharge ? (
                              <button onClick={(e) => { e.stopPropagation(); setDrawerAppt(a); }} style={{
                                padding: "7px 14px", borderRadius: 10,
                                background: GD, color: "#fff", border: "none",
                                fontSize: 13, fontWeight: 700, cursor: "pointer",
                                fontFamily: "'Bricolage Grotesque', sans-serif",
                              }}>
                                💳 Collect Payment
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, color: "#D1D5DB" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                            {effectiveStatus === "completed" && (
                              <button
                                disabled={markingNoShow === a.id}
                                onClick={async () => {
                                  setMarkingNoShow(a.id);
                                  await new Promise(r => setTimeout(r, 600));
                                  setNoShowIds(prev => new Set([...prev, a.id]));
                                  setMarkingNoShow(null);
                                  alert(`Demo mode — ${a.name} marked as no-show. A WhatsApp rebook message would be sent automatically.`);
                                }}
                                style={{
                                  padding: "6px 12px", borderRadius: 8, border: "1px solid #FECACA",
                                  background: markingNoShow === a.id ? "#F9FAFB" : "#FEF2F2",
                                  color: "#DC2626", fontFamily: "Inter, sans-serif", fontSize: 12,
                                  fontWeight: 600, cursor: markingNoShow === a.id ? "not-allowed" : "pointer",
                                  display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                                }}
                              >
                                {markingNoShow === a.id ? "Saving…" : "Mark No-Show"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Demo Payment Drawer */}
            {drawerAppt && (
              <DemoPaymentDrawer
                appt={drawerAppt}
                onClose={() => setDrawerAppt(null)}
                onInvoiced={(id, inv) => {
                  setInvoices(prev => ({ ...prev, [id]: inv }));
                  setDrawerAppt(null);
                }}
              />
            )}
          </div>
        );
      })()}

      {subTab === "clients" && (
        <div>
          {/* CRM stats */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { label: "Total", val: crmStats.total, color: N },
              { label: "Active", val: crmStats.active, color: GD },
              { label: "At risk", val: crmStats.at_risk, color: "#F59E0B" },
              { label: "Lapsed", val: crmStats.lapsed, color: "#EF4444" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", border: `1px solid ${BORDER}`, boxShadow: SHADOW, minWidth: 90, textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MUTED }} />
              <input value={crmSearch} onChange={e => setCrmSearch(e.target.value)} placeholder="Search customers..."
                style={{ width: "100%", paddingLeft: 34, paddingRight: 14, paddingTop: 9, paddingBottom: 9, border: `1px solid ${BORDER}`, borderRadius: 9, fontFamily: "Inter, sans-serif", fontSize: 13, color: N, background: "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["all", "active", "at_risk", "lapsed"] as const).map(f => (
                <button key={f} onClick={() => setCrmFilter(f)} style={{
                  padding: "7px 14px", borderRadius: 9999, border: `1.5px solid ${crmFilter === f ? GD : BORDER}`,
                  background: crmFilter === f ? GD : "#fff", color: crmFilter === f ? "#fff" : MUTED,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  {f === "at_risk" ? "At Risk" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: SHADOW }}>
            {filteredCrm.map((c, i) => {
              const s = CRM_STATUS[c.status];
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderTop: i === 0 ? "none" : `1px solid ${DIVIDER}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: s.color, flexShrink: 0 }}>
                    {c.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>
                      {c.visits} visit{c.visits !== 1 ? "s" : ""} · Last: {c.lastVisit}
                      {c.avgGap !== "—" ? ` · Avg every ${c.avgGap}` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, flexShrink: 0, textAlign: "right" }}>
                    {c.nudgedAt && <div style={{ color: "#F59E0B", fontWeight: 600 }}>Nudge sent {c.nudgedAt}</div>}
                    <div style={{ marginTop: c.nudgedAt ? 2 : 0 }}>{c.phone}</div>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 9999, background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, flexShrink: 0, border: `1px solid ${s.color}22` }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === "waitlist" && <CustomerWaitlistTab />}
      {subTab === "invoices" && <CustomerInvoicesTab />}
    </div>
  );
}

// ── Feedback Inbox Tab ────────────────────────────────────────────────────────

function FeedbackTab() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toneShown, setToneShown] = useState<"apologetic" | "professional" | "personal">("apologetic");

  const filtered = PRIVATE_FEEDBACK.filter(f => filterStatus === "all" || f.status === filterStatus);

  const aiReplies: Record<string, Record<string, string>> = {
    f1: {
      apologetic:    "Hi Omri, I'm really sorry you had to wait — that's not the experience we want for you. I'd love to make it right with a complimentary booking. Please reach out directly.",
      professional:  "Hi Omri, thank you for your feedback. We take appointment timing seriously and will be reviewing our scheduling to prevent this. We hope to serve you better next time.",
      personal:      "Hey Omri, I hear you — waiting past your slot is frustrating and I get it. We had an unusual day but that's no excuse. Let me know when you want to come back, on me.",
    },
    f2: {
      apologetic:    "Hi Gal, I'm truly sorry the fade wasn't even — that's something I take personally. Please come back at your convenience and I'll sort it out, no charge.",
      professional:  "Hi Gal, thank you for letting us know. We strive for precision on every cut and clearly fell short here. We'd welcome the chance to correct it at no cost.",
      personal:      "Hey Gal, that's on me and I'm not happy about it either. Bring yourself back and I'll fix it properly. No questions asked.",
    },
  };

  return (
    <div>
      <div style={{ background: "#FEF3C7", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, border: "1px solid #FDE68A" }}>
        <span style={{ fontSize: 18 }}>🛡️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>Vomni caught {PRIVATE_FEEDBACK.length} private complaints this month</div>
          <div style={{ fontSize: 12, color: "#B45309", marginTop: 2 }}>These customers rated 1-2★ and were redirected away from Google. Respond below to recover them.</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ value: "all", label: "All" }, { value: "new", label: "New" }, { value: "in_progress", label: "In Progress" }, { value: "resolved", label: "Resolved" }].map(f => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)} style={{
            padding: "7px 16px", borderRadius: 9999, border: `1.5px solid ${filterStatus === f.value ? GD : BORDER}`,
            background: filterStatus === f.value ? GD : "#fff", color: filterStatus === f.value ? "#fff" : MUTED,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>{f.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map(fb => {
          const expanded = expandedId === fb.id;
          const statusCfg = FEEDBACK_STATUS[fb.status];
          const topicCfg  = TOPIC_CONFIG[fb.topic];
          const urgCfg    = URGENCY_CONFIG[fb.urgency];
          const replies   = aiReplies[fb.id];

          return (
            <div key={fb.id} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${fb.status === "new" ? "#FDE68A" : BORDER}`, boxShadow: SHADOW, overflow: "hidden" }}>
              <div
                onClick={() => setExpandedId(expanded ? null : fb.id)}
                style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "18px 22px", cursor: "pointer" }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
                  💬
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{fb.name}</span>
                    <StarDisplay rating={fb.rating} />
                    <span style={{ fontSize: 11, color: MUTED }}>{fb.date}</span>
                  </div>
                  <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>&ldquo;{fb.text}&rdquo;</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {topicCfg && (
                      <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: topicCfg.bg, color: topicCfg.color }}>{topicCfg.label}</span>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 600, color: urgCfg.color }}>{urgCfg.label}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, ...statusCfg.style }}>
                    {statusCfg.icon}{statusCfg.label}
                  </span>
                  <span style={{ color: MUTED, fontSize: 16 }}>{expanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {expanded && (
                <div style={{ borderTop: `1px solid ${BORDER}`, padding: "18px 22px" }}>
                  {replies ? (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        AI-generated reply — choose a tone
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                        {(["apologetic", "professional", "personal"] as const).map(tone => (
                          <button key={tone} onClick={() => setToneShown(tone)} style={{
                            padding: "6px 14px", borderRadius: 9999, border: `1.5px solid ${toneShown === tone ? GD : BORDER}`,
                            background: toneShown === tone ? "rgba(0,200,150,0.08)" : "#fff", color: toneShown === tone ? GD : MUTED,
                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}>{tone.charAt(0).toUpperCase() + tone.slice(1)}</button>
                        ))}
                      </div>
                      <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "14px 16px", border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, lineHeight: 1.6, marginBottom: 12 }}>
                        {replies[toneShown]}
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9999, background: "#F3F4F6", color: N, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          <Copy size={13} /> Copy
                        </button>
                        <button style={{ padding: "9px 18px", borderRadius: 9999, background: GD, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          Send via WhatsApp
                        </button>
                        <button style={{ padding: "9px 18px", borderRadius: 9999, background: "#fff", color: MUTED, border: `1px solid ${BORDER}`, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          Mark Resolved
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: MUTED }}>This complaint has been resolved.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const insights = [
    { type: "positive",    title: "Completion Rate Above Average", body: "Your 73% rate is 33pp above the 40% benchmark. Vomni's review requests are working well." },
    { type: "warning",     title: "4 Negatives Intercepted",       body: "4 complaints were resolved privately. Your public Google rating is protected from these reviews." },
    { type: "positive",    title: "Excellent Average Rating",      body: "Your 4.8 average is well above the 4.5 top-tier threshold. Consistent quality is compounding your Google Maps visibility." },
  ];

  const insightColors: Record<string, { title: string; border: string; bg: string; icon: React.ReactNode }> = {
    positive:    { title: GD,      border: GD,      bg: "rgba(0,200,150,0.05)", icon: <TrendingUp size={16} color={GD} />      },
    warning:     { title: "#F59E0B", border: "#F59E0B", bg: "rgba(245,158,11,0.05)", icon: <AlertTriangle size={16} color="#F59E0B" /> },
    opportunity: { title: "#0D9488", border: "#0D9488", bg: "rgba(13,148,136,0.05)", icon: <Lightbulb size={16} color="#0D9488" />    },
  };

  // Weekly bookings bar chart
  const weeklyData = [
    { week: "Feb W1", bookings: 6  },
    { week: "Feb W2", bookings: 7  },
    { week: "Feb W3", bookings: 8  },
    { week: "Feb W4", bookings: 10 },
    { week: "Mar W1", bookings: 9  },
    { week: "Mar W2", bookings: 10 },
    { week: "Mar W3", bookings: 11 },
    { week: "Mar W4", bookings: 8  },
    { week: "Apr W1", bookings: 14 },
  ];

  const ratingTotal = RATING_DIST.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      {/* AI Insights */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 12 }}>AI Insights</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {insights.map((ins, i) => {
            const cfg = insightColors[ins.type];
            return (
              <div key={i} style={{ background: cfg.bg, border: `1px solid ${cfg.border}22`, borderLeft: `3px solid ${cfg.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, marginTop: 1 }}>{cfg.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: cfg.title, marginBottom: 4 }}>{ins.title}</div>
                  <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{ins.body}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="demo-content-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Weekly bookings */}
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: "20px 20px 12px", boxShadow: SHADOW, height: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: N, marginBottom: 16 }}>Bookings by week</div>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={weeklyData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: MUTED, fontFamily: "Inter, sans-serif" }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: MUTED, fontFamily: "Inter, sans-serif" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${BORDER}` }} />
              <Bar dataKey="bookings" fill={GD} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rating distribution */}
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: "20px", boxShadow: SHADOW, height: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: N, marginBottom: 12 }}>Rating distribution</div>
          <div style={{ display: "flex", alignItems: "center", height: "calc(100% - 40px)", gap: 16 }}>
            <div style={{ flex: "0 0 60%", height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={RATING_DIST} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" paddingAngle={2} dataKey="value" nameKey="label" startAngle={90} endAngle={-270} stroke="none">
                    {RATING_DIST.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RATING_DIST.map((seg, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#374151", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>{seg.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: N, fontFamily: "Inter, sans-serif" }}>
                    {Math.round((seg.value / ratingTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly trend */}
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: "20px 20px 12px", boxShadow: SHADOW, height: 220 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: N, marginBottom: 16 }}>Monthly booking trend</div>
        <ResponsiveContainer width="100%" height="78%">
          <AreaChart data={MONTHLY_DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GD} stopOpacity={0.15} />
                <stop offset="95%" stopColor={GD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED, fontFamily: "Inter, sans-serif" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: MUTED, fontFamily: "Inter, sans-serif" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${BORDER}` }} />
            <Area type="monotone" dataKey="bookings" stroke={GD} strokeWidth={2.5} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: GD }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Waitlist Tab ──────────────────────────────────────────────────────────────

function CustomerWaitlistTab() {
  const [date, setDate] = useState("2026-04-07");
  const entries = DEMO_WAITLIST.filter(w => w.date === date);
  const activeCount = entries.filter(w => w.status === "waiting" || w.status === "notified").length;
  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    waiting:   { label: "Waiting",   color: "#92400E", bg: "#FEF3C7" },
    notified:  { label: "Notified",  color: "#1D4ED8", bg: "#DBEAFE" },
    confirmed: { label: "Confirmed", color: "#065F46", bg: "#D1FAE5" },
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 9, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none" }} />
        <div style={{ background: activeCount > 0 ? "rgba(0,200,150,0.1)" : "#F7F8FA", color: activeCount > 0 ? GD : MUTED, borderRadius: 9999, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>
          {activeCount > 0 ? `${activeCount} active` : "No active entries"}
        </div>
        <span style={{ fontSize: 13, color: MUTED }}>Customers are automatically notified when a booking is cancelled.</span>
      </div>
      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "#F7F8FA", borderRadius: 16, border: `1px dashed ${BORDER}` }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, marginBottom: 6 }}>No waitlist for this date</div>
          <div style={{ fontSize: 13, color: MUTED }}>Try 7 Apr 2026 to see demo data.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: SHADOW }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${BORDER}` }}>
                {["#", "Customer", "Service", "Time", "Phone", "Status"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((w, i) => {
                const s = statusCfg[w.status] ?? statusCfg.waiting;
                return (
                  <tr key={w.id} style={{ borderTop: i > 0 ? `1px solid #F3F4F6` : "none", opacity: w.status === "confirmed" ? 0.6 : 1 }}>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: GD, fontSize: 16 }}>{w.position}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: N, fontSize: 13 }}>{w.name}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: MUTED }}>{w.service}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: N }}>{w.time}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: MUTED }}>{w.phone}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Invoices Tab ──────────────────────────────────────────────────────────────

function InvoicesTab() {
  const [filterMonth, setFilterMonth] = useState("");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [filterPM, setFilterPM]       = useState("all");
  const [selected, setSelected]       = useState<Set<string>>(new Set());

  const PM_LABELS: Record<string, string> = { cash: "Cash", credit: "Credit Card", bit: "Bit", paybox: "Paybox" };

  // Auto set date range when month is picked
  const effectiveDateFrom = filterMonth ? `${filterMonth}-01` : dateFrom;
  const effectiveDateTo   = filterMonth
    ? (() => { const [y,m] = filterMonth.split("-").map(Number); return new Date(y, m, 0).toISOString().substring(0, 10); })()
    : dateTo;

  const filtered = ALL_DEMO_INVOICES.filter(inv => {
    if (effectiveDateFrom && inv.issued_at < effectiveDateFrom) return false;
    if (effectiveDateTo   && inv.issued_at > effectiveDateTo)   return false;
    if (filterPM !== "all" && inv.payment_method !== filterPM)  return false;
    return true;
  });

  // Summary — this month (April 2026)
  const thisMonthInvs  = ALL_DEMO_INVOICES.filter(inv => inv.issued_at.startsWith("2026-04"));
  const totalRevenue   = thisMonthInvs.reduce((s, inv) => s + inv.total, 0);
  const byPM = ["cash","credit","bit","paybox"].map(pm => ({
    pm, label: PM_LABELS[pm],
    amount: thisMonthInvs.filter(i => i.payment_method === pm).reduce((s,i) => s + i.total, 0),
    count:  thisMonthInvs.filter(i => i.payment_method === pm).length,
  }));

  function exportCSVDemo() {
    const BOM = "\uFEFF";
    const headers = ["Invoice #","Type","Date","Customer","Service","Total","Payment Method"];
    const rows = filtered.map(inv => [
      inv.invoice_number,
      inv.document_type === "tax_invoice" ? "Tax Invoice" : "Receipt",
      inv.issued_at,
      inv.customer_name,
      inv.service,
      inv.total.toFixed(2),
      PM_LABELS[inv.payment_method] ?? inv.payment_method,
    ]);
    const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `invoices_TheFadeRoom_${filterMonth || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id));
  const hasFilters = dateFrom || dateTo || filterMonth || filterPM !== "all";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N, margin: 0 }}>Invoices & Receipts</h2>
          <p style={{ fontSize: 13, color: MUTED, margin: "3px 0 0" }}>Financial document history</p>
        </div>
        <button onClick={exportCSVDemo} disabled={filtered.length === 0}
          style={{ padding: "9px 18px", borderRadius: 10, background: filtered.length > 0 ? `${GD}18` : "#F9FAFB", color: filtered.length > 0 ? GD : MUTED, border: `1px solid ${filtered.length > 0 ? GD : BORDER}`, fontSize: 13, fontWeight: 600, cursor: filtered.length > 0 ? "pointer" : "not-allowed" }}>
          ⬇ Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", border: `1px solid ${BORDER}`, borderLeft: `4px solid ${GD}`, flex: 1, minWidth: 140, boxShadow: SHADOW }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Revenue (This Month)</div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, color: GD }}>₪{totalRevenue.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{thisMonthInvs.length} documents this month</div>
        </div>
        {byPM.map(({ pm, label, amount, count }) => (
          <div key={pm} style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", border: `1px solid ${BORDER}`, flex: 1, minWidth: 120, boxShadow: SHADOW }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: N }}>₪{amount.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{count} documents</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>Month:</label>
          <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setDateFrom(""); setDateTo(""); }}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none" }} />
        </div>
        <span style={{ fontSize: 12, color: MUTED }}>or</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>From:</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setFilterMonth(""); }}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>To:</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setFilterMonth(""); }}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none" }} />
        </div>
        <select value={filterPM} onChange={e => setFilterPM(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: N, outline: "none", background: "#fff" }}>
          <option value="all">All payment methods</option>
          <option value="cash">Cash</option>
          <option value="credit">Credit Card</option>
          <option value="bit">Bit</option>
          <option value="paybox">Paybox</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterMonth(""); setDateFrom(""); setDateTo(""); setFilterPM("all"); }}
            style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", fontSize: 13, color: MUTED, cursor: "pointer" }}>
            Clear ✕
          </button>
        )}
        <span style={{ fontSize: 12, color: MUTED, marginLeft: "auto" }}>{filtered.length} documents</span>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: SHADOW }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ padding: "11px 16px", width: 40 }}>
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map(i => i.id)))} style={{ cursor: "pointer", width: 14, height: 14 }} />
                </th>
                {["Invoice #","Type","Date","Customer","Service","Total","Payment",""].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={inv.id} style={{ borderTop: i > 0 ? `1px solid #F3F4F6` : "none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                  <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(inv.id)} onChange={() => {
                      const n = new Set(selected);
                      if (n.has(inv.id)) n.delete(inv.id); else n.add(inv.id);
                      setSelected(n);
                    }} style={{ cursor: "pointer", width: 14, height: 14 }} />
                  </td>
                  <td style={{ padding: "12px 16px", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, color: N }}>{inv.invoice_number}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: "#EEF2FF", color: "#6366F1" }}>Receipt</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>
                    {new Date(inv.issued_at + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: N }}>{inv.customer_name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: MUTED }}>{inv.service}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: N }}>₪{inv.total}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 9999, background: "#F3F4F6", color: "#374151", fontSize: 11, fontWeight: 600 }}>
                      {PM_LABELS[inv.payment_method]}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => alert("Demo mode — PDF would download here")}
                      style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${BORDER}`, background: "#F9FAFB", color: N, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                      ⬇ PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected.size > 0 && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, background: "#F9FAFB", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: MUTED }}>{selected.size} selected</span>
            <button onClick={() => alert(`Demo mode — would download ${selected.size} PDF(s)`)}
              style={{ padding: "7px 16px", borderRadius: 8, background: N, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ⬇ Download PDFs ({selected.size})
            </button>
            <button onClick={() => setSelected(new Set())}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  return (
    <div style={{ maxWidth: 660 }}>

      {/* Business info */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 28, marginBottom: 20, boxShadow: SHADOW }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <Building2 size={18} style={{ color: GD }} />
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: 0 }}>Business Information</h2>
        </div>
        {[
          ["Business name",  "The Fade Room"],
          ["Business type",  "Barbershop"],
          ["Owner name",     "Yoni Azulai"],
          ["Location",       "Dizengoff St 88, Tel Aviv"],
          ["Google Review link", "maps.google.com/…/TheFadeRoom ✓ verified"],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid #F3F4F6` }}>
            <span style={{ fontSize: 13, color: MUTED }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: N, textAlign: "right", maxWidth: "55%" }}>{val}</span>
          </div>
        ))}
        <button disabled style={{ marginTop: 18, padding: "9px 20px", borderRadius: 9999, border: `1.5px solid ${BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#D1D5DB", background: "#F9FAFB", cursor: "not-allowed" }}>
          Edit (demo mode)
        </button>
      </div>

      {/* Automation settings */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 28, marginBottom: 20, boxShadow: SHADOW }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <Smartphone size={18} style={{ color: GD }} />
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: 0 }}>Automation Settings</h2>
        </div>
        {[
          ["Channel",                  "WhatsApp (primary) + SMS fallback"],
          ["Reminder timing",          "24 hours before appointment"],
          ["Review request timing",    "2 hours after appointment completes"],
          ["Re-engagement trigger",    "When customer is overdue by 1.5× their avg visit gap"],
          ["Negative review threshold","Rating 1–2★ → redirected to private feedback"],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid #F3F4F6` }}>
            <span style={{ fontSize: 13, color: MUTED }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: N, textAlign: "right", maxWidth: "55%" }}>{val}</span>
          </div>
        ))}
      </div>

      {/* SMS/WhatsApp template preview */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 28, marginBottom: 20, boxShadow: SHADOW }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <MessageSquare size={18} style={{ color: GD }} />
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: 0 }}>Message Templates</h2>
        </div>
        {[
          {
            label: "Appointment reminder",
            msg: "היי {{name}}, תזכורת לתור שלך ב-The Fade Room 💈 מחר ב-{{time}}. נשמח לראותך! לביטול: {{cancel_link}}",
          },
          {
            label: "Review request",
            msg: "היי {{name}}, תודה שביקרת ב-The Fade Room! נשמח לשמוע מה חשבת — לחץ כאן: {{review_link}}",
          },
          {
            label: "Re-engagement nudge",
            msg: "היי {{name}}, עבר קצת זמן! התגעגענו 💈 רוצה לקבוע תור? {{booking_link}}",
          },
        ].map(({ label, msg }) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ padding: "12px 14px", background: "#F7F8FA", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, lineHeight: 1.6 }}>
              {msg}
            </div>
          </div>
        ))}
      </div>

      {/* Plan */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 28, boxShadow: SHADOW }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <Users size={18} style={{ color: GD }} />
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: 0 }}>Subscription</h2>
          <span style={{ padding: "3px 12px", borderRadius: 9999, background: "rgba(0,200,150,0.12)", color: GD, fontSize: 12, fontWeight: 600 }}>Growth</span>
        </div>
        {[
          ["Plan",                      "Growth"],
          ["Billing cycle",             "Monthly"],
          ["Review requests this month","38 / Unlimited"],
          ["Re-engagement messages",    "6 / Unlimited"],
          ["Next billing date",         "May 1, 2026"],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid #F3F4F6` }}>
            <span style={{ fontSize: 13, color: MUTED }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: N }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Demo Page ─────────────────────────────────────────────────────────────

export default function AccountPreviewPage() {
  const [tab, setTab] = useState<TabKey>("overview");

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview",  label: "Overview"       },
    { key: "calendar",  label: "Calendar"       },
    { key: "customers", label: "Customers"      },
    { key: "feedback",  label: "Feedback Inbox" },
    { key: "analytics", label: "Analytics"      },
    { key: "settings",  label: "Settings"       },
  ];

  const PAGE_TITLES: Record<TabKey, [string, string]> = {
    overview:  ["Dashboard",      "The Fade Room · Tel Aviv · Saturday, 7 April 2026"],
    calendar:  ["Calendar",       "April 2026"],
    customers: ["Customers",      "40 appointments · 20 CRM profiles tracked"],
    feedback:  ["Feedback Inbox", "Private complaints caught before they reach Google"],
    analytics: ["Analytics",      "Review funnel & booking trends"],
    settings:  ["Settings",       "Account and automation preferences"],
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8F6", display: "flex", flexDirection: "column" }}>
      <style>{`
        .demo-nav-tab:hover { color: #00C896 !important; border-bottom-color: rgba(0,200,150,0.3) !important; }
        .demo-header-inner { padding: 0 40px; }
        .demo-tab-bar { padding: 0 40px; overflow-x: auto; scrollbar-width: none; }
        .demo-tab-bar::-webkit-scrollbar { display: none; }
        .demo-page-outer { padding: 28px 40px; }
        @media (max-width: 900px) {
          .demo-header-inner { padding: 0 16px !important; }
          .demo-tab-bar { padding: 0 8px !important; }
          .demo-page-outer { padding: 16px !important; }
        }
        @media (max-width: 768px) {
          .demo-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .demo-content-grid { grid-template-columns: 1fr !important; }
          .demo-vomni-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .demo-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ background: "#fff", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 40 }}>
        <div className="demo-header-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 22, color: N, letterSpacing: "-0.5px" }}>vomni</span>
            <span style={{ color: "#D1D5DB", fontSize: 18 }}>/</span>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16, color: N }}>The Fade Room</span>
            <span style={{ padding: "3px 10px", borderRadius: 9999, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, background: "rgba(0,200,150,0.12)", color: G }}>
              Growth
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ padding: "5px 14px", borderRadius: 9999, background: "rgba(0,200,150,0.1)", color: G, border: "1.5px solid rgba(0,200,150,0.3)", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              DEMO MODE
            </span>
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "#9CA3AF", display: "flex", alignItems: "center" }}>
              <Bell size={20} />
            </button>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: G, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13 }}>
              FR
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="demo-tab-bar" style={{ display: "flex", gap: 0, background: "#fff", borderTop: "1px solid #F3F4F6" }}>
          {TABS.map(t => {
            const active = tab === t.key;
            const isFeedback = t.key === "feedback";
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={!active ? "demo-nav-tab" : ""}
                style={{
                  padding: "14px 20px", background: "none", border: "none",
                  fontFamily: active ? "'Bricolage Grotesque', sans-serif" : "Inter, sans-serif",
                  fontWeight: active ? 700 : 500, fontSize: 14, cursor: "pointer",
                  color: active ? G : MUTED,
                  borderBottom: active ? `2px solid ${G}` : "2px solid transparent",
                  marginBottom: -1, whiteSpace: "nowrap", transition: "color 0.15s, border-bottom-color 0.15s",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                {t.label}
                {isFeedback && (
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
                    2
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Page content */}
      <main className="demo-page-outer" style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: TEXT, margin: 0, lineHeight: 1.2, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {PAGE_TITLES[tab][0]}
            </h1>
            <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{PAGE_TITLES[tab][1]}</div>
          </div>
          {tab === "overview" && (
            <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 9999, background: GD, color: "#fff", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", marginTop: 4 }}>
              + New booking
            </button>
          )}
        </div>

        {tab === "overview"  && <OverviewTab />}
        {tab === "calendar"  && <CalendarTab />}
        {tab === "customers" && <CustomersTab />}
        {tab === "feedback"  && <FeedbackTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "settings"  && <SettingsTab />}
      </main>

      {/* Footer */}
      <div style={{ padding: "14px 40px", borderTop: `1px solid ${BORDER}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#D1D5DB" }}>
          Demo account — no real data shown.
        </span>
        <a href="/" style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: G, fontWeight: 600, textDecoration: "none" }}>
          Get started with Vomni →
        </a>
      </div>
    </div>
  );
}
