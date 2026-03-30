// ============================================================================
// Vomni Booking System — Type Definitions
// ============================================================================

export interface Service {
  id: string;
  business_id: string;
  name: string;
  name_he: string | null;
  description: string | null;
  description_he: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Staff {
  id: string;
  business_id: string;
  name: string;
  name_he: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  bio: string | null;
  bio_he: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface StaffService {
  id: string;
  staff_id: string;
  service_id: string;
}

export interface BusinessHours {
  id: string;
  business_id: string;
  day_of_week: number; // 0=Sunday ... 6=Saturday
  is_open: boolean;
  open_time: string;  // "HH:MM"
  close_time: string; // "HH:MM"
}

export interface StaffHours {
  id: string;
  staff_id: string;
  day_of_week: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
}

export interface BlockedTime {
  id: string;
  business_id: string | null;
  staff_id: string | null;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_at: string;
}

export interface BookingSlot {
  time: string;       // "HH:MM"
  available: boolean;
  staff_id?: string;  // which staff member is available for this slot
}

export interface BookingFormData {
  service_id: string;
  staff_id: string | "any";
  date: string;        // "YYYY-MM-DD"
  time: string;        // "HH:MM"
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  notes?: string;
  send_reminder: boolean;
}

export interface BookingDetails {
  id: string;
  business_id: string;
  staff_id: string | null;
  service_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_name: string | null;
  service_duration_minutes: number | null;
  service_price: number | null;
  appointment_at: string;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  booking_source: string;
  notes: string | null;
  internal_notes: string | null;
  cancellation_token: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  reminder_sent: boolean;
  created_at: string;
}

export interface BookingBusiness {
  id: string;
  name: string | null;
  logo_url: string | null;
  booking_slug: string;
  booking_enabled: boolean;
  booking_buffer_minutes: number;
  booking_advance_days: number;
  booking_cancellation_hours: number;
  booking_confirmation_message: string | null;
  booking_confirmation_message_he: string | null;
  booking_currency: string;
  booking_timezone: string;
  require_phone: boolean;
  require_email: boolean;
}

export interface DayAvailability {
  date: string;       // "YYYY-MM-DD"
  has_slots: boolean;
}

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "no_show";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, { en: string; he: string; color: string; bg: string }> = {
  confirmed:  { en: "Confirmed",  he: "מאושר",   color: "#00C896", bg: "rgba(0,200,150,0.1)" },
  cancelled:  { en: "Cancelled",  he: "בוטל",    color: "#9CA3AF", bg: "#F3F4F6" },
  completed:  { en: "Completed",  he: "הושלם",   color: "#0A0F1E", bg: "rgba(10,15,30,0.08)" },
  no_show:    { en: "No Show",    he: "לא הגיע", color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
};

// Hebrew day names (Sunday first — Israeli standard)
export const DAY_NAMES_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_NAMES_SHORT_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
export const DAY_NAMES_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTH_NAMES_HE = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
export const MONTH_NAMES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
