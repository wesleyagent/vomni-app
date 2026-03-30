// ============================================================================
// Vomni Booking System — Shared Utilities
// ============================================================================

import type { BusinessHours, StaffHours, BookingDetails } from "@/types/booking";

/** Parse "HH:MM" to minutes since midnight */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Convert minutes since midnight to "HH:MM" */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Get the working window for a specific day */
export function getWorkingWindow(
  dayOfWeek: number,
  businessHours: BusinessHours[],
  staffHours?: StaffHours[],
): { open: number; close: number } | null {
  // Staff hours override business hours if set
  if (staffHours && staffHours.length > 0) {
    const sh = staffHours.find(h => h.day_of_week === dayOfWeek);
    if (sh) {
      if (!sh.is_working) return null;
      return { open: timeToMinutes(sh.start_time), close: timeToMinutes(sh.end_time) };
    }
  }

  const bh = businessHours.find(h => h.day_of_week === dayOfWeek);
  if (!bh || !bh.is_open) return null;
  return { open: timeToMinutes(bh.open_time), close: timeToMinutes(bh.close_time) };
}

interface ExistingBooking {
  appointment_at: string;
  service_duration_minutes: number | null;
}

interface BlockedRange {
  start_at: string;
  end_at: string;
}

/** Compute available slots for a given date, service, and staff */
export function computeAvailableSlots(
  date: string, // "YYYY-MM-DD"
  serviceDuration: number,
  bufferMinutes: number,
  businessHours: BusinessHours[],
  staffHoursForStaff: StaffHours[],
  existingBookings: ExistingBooking[],
  blockedTimes: BlockedRange[],
  timezone: string,
): string[] {
  // Day of week: 0=Sunday
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = dateObj.getUTCDay();

  const window = getWorkingWindow(dayOfWeek, businessHours, staffHoursForStaff);
  if (!window) return [];

  const slotDuration = serviceDuration;
  const totalNeeded = slotDuration + bufferMinutes;

  // Build list of occupied ranges in minutes-since-midnight
  const occupied: { start: number; end: number }[] = [];

  for (const b of existingBookings) {
    if (!b.appointment_at) continue;
    const bDate = b.appointment_at.substring(0, 10);
    if (bDate !== date) continue;
    const bTime = b.appointment_at.substring(11, 16);
    const bStart = timeToMinutes(bTime);
    const bDuration = b.service_duration_minutes ?? 30;
    occupied.push({ start: bStart, end: bStart + bDuration + bufferMinutes });
  }

  for (const bt of blockedTimes) {
    const btStartDate = bt.start_at.substring(0, 10);
    const btEndDate = bt.end_at.substring(0, 10);
    // Check if blocked time overlaps with this date
    if (btStartDate > date || btEndDate < date) continue;
    const btStartTime = btStartDate === date ? bt.start_at.substring(11, 16) : "00:00";
    const btEndTime = btEndDate === date ? bt.end_at.substring(11, 16) : "23:59";
    occupied.push({ start: timeToMinutes(btStartTime), end: timeToMinutes(btEndTime) });
  }

  // Generate all possible slots
  const slots: string[] = [];
  for (let t = window.open; t + slotDuration <= window.close; t += slotDuration) {
    const slotEnd = t + totalNeeded;
    const overlaps = occupied.some(
      o => t < o.end && slotEnd > o.start
    );
    if (!overlaps) {
      slots.push(minutesToTime(t));
    }
  }

  // Remove past slots if date is today
  const now = new Date();
  const nowStr = now.toLocaleDateString("en-CA", { timeZone: timezone }); // "YYYY-MM-DD"
  if (date === nowStr) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slots.filter(s => timeToMinutes(s) > nowMinutes);
  }

  return slots;
}

/** Generate a cryptographically random 64-char cancellation token */
export function generateCancellationToken(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(48);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 64);
  }
  // Fallback (Node.js)
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/** Generate an .ics calendar file string */
export function generateICS(booking: {
  service_name: string;
  business_name: string;
  appointment_at: string;
  duration_minutes: number;
  staff_name?: string;
}): string {
  const start = new Date(booking.appointment_at);
  const end = new Date(start.getTime() + booking.duration_minutes * 60000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const summary = `${booking.service_name} - ${booking.business_name}`;
  const description = booking.staff_name ? `With ${booking.staff_name}` : "";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vomni//Booking//EN",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "STATUS:CONFIRMED",
    `UID:${crypto.randomUUID()}@vomni.io`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Format price with currency symbol */
export function formatPrice(price: number | null, currency: string, lang: "en" | "he"): string {
  if (price === null || price === undefined) {
    return lang === "he" ? "מחיר לפי בקשה" : "Price on request";
  }
  const symbols: Record<string, string> = { ILS: "₪", GBP: "£", USD: "$", EUR: "€" };
  const sym = symbols[currency] ?? currency;
  return `${sym}${price}`;
}

/** Format duration */
export function formatDuration(mins: number, lang: "en" | "he"): string {
  if (mins < 60) return lang === "he" ? `${mins} דקות` : `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return lang === "he" ? `${h} שעות` : `${h}h`;
  return lang === "he" ? `${h} שעות ו-${m} דקות` : `${h}h ${m}min`;
}

/** Format date for display */
export function formatBookingDate(dateStr: string, lang: "en" | "he"): string {
  const date = new Date(dateStr + "T00:00:00");
  if (lang === "he") {
    const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    const months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    return `יום ${days[date.getUTCDay()]}, ${date.getUTCDate()} ב${months[date.getUTCMonth()]}`;
  }
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
