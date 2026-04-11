/**
 * Email sending with reliability logging.
 *
 * Every email is written to `email_log` table before sending,
 * then updated to sent/failed. This gives visibility into failures
 * without blocking the caller on delivery.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";

const FROM     = process.env.RESEND_FROM_ADDRESS ?? "Vomni <hello@mail.vomni.io>";
const REPLY_TO = process.env.RESEND_REPLY_TO    ?? "hello@vomni.io";
const API_KEY  = process.env.RESEND_API_KEY     ?? "";
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

/** Build a one-click unsubscribe URL for a customer.
 *  Token = base64url(email|businessId) — decodable without a secret.
 *  Worst case: someone unsubscribes themselves from a business's emails.
 */
export function buildUnsubscribeUrl(email: string, businessId: string): string {
  const token = Buffer.from(`${email}|${businessId}`).toString("base64url");
  return `${APP_URL}/api/email/unsubscribe?t=${token}`;
}

export type EmailType =
  | "booking_owner_notify"
  | "booking_customer_confirm"
  | "booking_reminder"
  | "booking_noshow_recovery"
  | "waitlist_notify"
  | "limit_reached"
  | "review_request"
  | "no_show_follow_up"
  | "crm_nudge";

interface SendEmailOpts {
  to:             string | string[];
  subject:        string;
  html:           string;
  type:           EmailType;
  bookingId?:     string | null;
  unsubscribeUrl?: string | null;
  meta?:          Record<string, unknown>;
}

/**
 * Send an email via Resend, logging the attempt and result to email_log.
 * Never throws — failures are logged and returned as { success: false }.
 */
export async function sendEmail(opts: SendEmailOpts): Promise<{ success: boolean; error?: string }> {
  if (!API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  // Write pending log record
  const { data: logRow } = await supabaseAdmin
    .from("email_log")
    .insert({
      booking_id: opts.bookingId ?? null,
      type:       opts.type,
      status:     "pending",
      to_address: Array.isArray(opts.to) ? opts.to.join(",") : opts.to,
      subject:    opts.subject,
    })
    .select("id")
    .single();

  const logId = logRow?.id ?? null;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:     FROM,
        to:       Array.isArray(opts.to) ? opts.to : [opts.to],
        reply_to: REPLY_TO,
        subject:  opts.subject,
        html:     opts.html,
        ...(opts.unsubscribeUrl ? {
          headers: {
            "List-Unsubscribe":      `<${opts.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (logId) {
        await supabaseAdmin
          .from("email_log")
          .update({ status: "failed", error: errText.slice(0, 500) })
          .eq("id", logId);
      }
      return { success: false, error: errText };
    }

    if (logId) {
      await supabaseAdmin
        .from("email_log")
        .update({ status: "sent" })
        .eq("id", logId);
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (logId) {
      await supabaseAdmin
        .from("email_log")
        .update({ status: "failed", error: msg.slice(0, 500) })
        .eq("id", logId);
    }
    console.error("[email] send failed:", msg);
    return { success: false, error: msg };
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

function escHtml(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

const header = `
  <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:#0A0F1E;padding:20px 32px;">
      <span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:20px;color:#fff;">vomni</span>
    </td></tr>
`;

const footer = `
    <tr><td style="padding:16px 32px;border-top:1px solid #F0F0F0;text-align:center;">
      <p style="font-size:12px;color:#D1D5DB;margin:0;font-family:Inter,sans-serif;">
        <a href="https://vomni.io" style="color:#9CA3AF;text-decoration:none;">vomni.io</a>
        &nbsp;·&nbsp;
        <a href="mailto:hello@vomni.io" style="color:#9CA3AF;text-decoration:none;">hello@vomni.io</a>
      </p>
    </td></tr>
  </table>
`;

const wrap = (inner: string) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#F7F8FA;font-family:Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:40px 20px;">
    <tr><td align="center">${header}${inner}${footer}</td></tr>
  </table>
  </body></html>`;

function detailTable(rows: [string, string | undefined | null][]) {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:24px;">
    ${rows.filter(([,v]) => v).map(([label, val], i) => `
    <tr style="background:${i % 2 === 0 ? "#F9FAFB" : "#fff"}">
      <td style="padding:10px 16px;font-family:Inter,sans-serif;font-size:12px;font-weight:600;color:#6B7280;width:110px;">${escHtml(label)}</td>
      <td style="padding:10px 16px;font-family:Inter,sans-serif;font-size:14px;color:#0A0F1E;">${escHtml(val!)}</td>
    </tr>`).join("")}
  </table>`;
}

/**
 * Email to the BUSINESS OWNER when a new booking is made.
 */
export function buildOwnerNotifyHtml(opts: {
  customerName: string;
  phone:        string;
  service:      string;
  duration:     number;
  price?:       number | null;
  staffName?:   string | null;
  notes?:       string | null;
  date:         string;
  time:         string;
  apptLabel:    string;
  calendarUrl:  string;
  cancelUrl:    string;
}) {
  const rows: [string, string | null | undefined][] = [
    ["Customer",   opts.customerName],
    ["Phone",      opts.phone],
    ["Service",    opts.service],
    ["Duration",   `${opts.duration} min`],
    ["Price",      opts.price ? `£${opts.price}` : null],
    ["Staff",      opts.staffName],
    ["Notes",      opts.notes],
  ];

  return wrap(`
    <tr><td style="padding:28px 32px;">
      <div style="background:#00C896;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;">New Booking!</div>
        <div style="font-family:Inter,sans-serif;font-size:14px;color:rgba(255,255,255,0.85);">${escHtml(opts.apptLabel)}</div>
      </div>
      ${detailTable(rows)}
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${escHtml(opts.calendarUrl)}" style="display:inline-block;padding:13px 28px;background:#0A0F1E;color:#fff;text-decoration:none;border-radius:9999px;font-size:14px;font-weight:700;font-family:'Bricolage Grotesque',sans-serif;">
          View in Calendar →
        </a>
      </div>
      <div style="text-align:center;">
        <a href="${escHtml(opts.cancelUrl)}" style="font-family:Inter,sans-serif;font-size:12px;color:#9CA3AF;text-decoration:none;">Customer cancel link</a>
      </div>
    </td></tr>
  `);
}

/**
 * Confirmation email to the CUSTOMER after successful booking.
 */
export function buildCustomerConfirmHtml(opts: {
  firstName:     string;
  businessName:  string;
  service:       string;
  duration:      number;
  staffName?:    string | null;
  apptLabel:     string;
  date:          string;
  time:          string;
  icalUrl:       string;
  cancelUrl:     string;
  address?:      string | null;
  manageUrl?:    string | null;
}) {
  const rows: [string, string | null | undefined][] = [
    ["Service",  opts.service],
    ["Duration", `${opts.duration} min`],
    ["With",     opts.staffName],
    ["Where",    opts.address],
  ];

  // Prefer the manage URL (change/cancel) over the legacy cancel-only URL
  const manageOrCancelUrl = opts.manageUrl ?? opts.cancelUrl;

  return wrap(`
    <tr><td style="padding:28px 32px;">
      <p style="font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;color:#0A0F1E;margin:0 0 8px;">
        You&apos;re booked in, ${escHtml(opts.firstName)}! ✅
      </p>
      <p style="font-family:Inter,sans-serif;font-size:14px;color:#6B7280;margin:0 0 24px;">
        Here are the details for your appointment at ${escHtml(opts.businessName)}.
      </p>
      <div style="background:#F0FDF9;border:1.5px solid #6EE7D0;border-radius:14px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;color:#0A0F1E;">${escHtml(opts.apptLabel)}</div>
      </div>
      ${detailTable(rows)}
      <div style="display:flex;gap:12px;justify-content:center;margin-bottom:16px;flex-wrap:wrap;">
        <a href="${escHtml(opts.icalUrl)}" style="display:inline-block;padding:12px 24px;background:#0A0F1E;color:#fff;text-decoration:none;border-radius:9999px;font-size:13px;font-weight:700;font-family:'Bricolage Grotesque',sans-serif;">
          📅 Add to Calendar
        </a>
        <a href="${escHtml(manageOrCancelUrl)}" style="display:inline-block;padding:12px 24px;background:#F7F8FA;color:#0A0F1E;border:1.5px solid #E5E7EB;text-decoration:none;border-radius:9999px;font-size:13px;font-weight:700;font-family:'Bricolage Grotesque',sans-serif;">
          Manage appointment
        </a>
      </div>
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${escHtml(manageOrCancelUrl)}" style="font-family:Inter,sans-serif;font-size:12px;color:#9CA3AF;text-decoration:none;">
          Change date / time · Cancel · לניהול התור
        </a>
      </div>
      <div style="margin-top:16px;padding:16px;background:#FEF3C7;border-radius:10px;font-family:Inter,sans-serif;font-size:13px;color:#92400E;">
        ⏰ Please arrive a few minutes early. If you need to cancel, do so at least 24 hours in advance.
      </div>
    </td></tr>
  `);
}

// ── Teal header used for customer-facing ILS emails ───────────────────────────
const tealHeader = `
  <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:#0B2D2A;padding:20px 32px;">
      <span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:20px;color:#fff;">vomni</span>
    </td></tr>
`;

const tealFooter = (unsubUrl?: string | null) => `
    <tr><td style="padding:16px 32px;border-top:1px solid #F0F0F0;text-align:center;">
      <p style="font-size:12px;color:#D1D5DB;margin:0 0 6px;font-family:Inter,sans-serif;">
        <a href="https://vomni.io" style="color:#9CA3AF;text-decoration:none;">vomni.io</a>
        &nbsp;·&nbsp;
        <a href="mailto:hello@vomni.io" style="color:#9CA3AF;text-decoration:none;">hello@vomni.io</a>
      </p>
      ${unsubUrl ? `<p style="font-size:11px;color:#D1D5DB;margin:0;font-family:Inter,sans-serif;">
        <a href="${escHtml(unsubUrl)}" style="color:#D1D5DB;text-decoration:underline;">Unsubscribe · הסר מרשימה</a>
      </p>` : ""}
    </td></tr>
  </table>
`;

const wrapTeal = (inner: string, unsubUrl?: string | null) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#F7F8FA;font-family:Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:40px 20px;">
    <tr><td align="center">${tealHeader}${inner}${tealFooter(unsubUrl)}</td></tr>
  </table>
  </body></html>`;

/**
 * Appointment reminder email — sent to Israeli customers instead of SMS.
 * Bilingual: English + Hebrew.
 */
export function buildReminderEmailHtml(opts: {
  firstName:      string;
  businessName:   string;
  serviceName:    string;
  date:           string;
  time:           string;
  staffName?:     string | null;
  cancelUrl?:     string | null;
  locale?:        string | null;
  unsubscribeUrl?: string | null;
}) {
  const he = opts.locale === "he";
  const staffLine = opts.staffName
    ? (he ? ` עם ${opts.staffName}` : ` with ${opts.staffName}`)
    : "";

  return wrapTeal(`
    <tr><td style="padding:28px 32px;">
      <p style="font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;color:#0A0F1E;margin:0 0 8px;">
        ${he ? `תזכורת לתור שלך, ${escHtml(opts.firstName)}! 📅` : `Reminder: your appointment, ${escHtml(opts.firstName)}! 📅`}
      </p>
      <p style="font-family:Inter,sans-serif;font-size:14px;color:#6B7280;margin:0 0 24px;">
        ${he
          ? `תזכורת לתורך ב‑${escHtml(opts.businessName)} מחר.`
          : `Your appointment at ${escHtml(opts.businessName)} is tomorrow.`}
      </p>
      <div style="background:#F0FDF9;border:1.5px solid #6EE7D0;border-radius:14px;padding:20px 24px;margin-bottom:24px;${he ? "direction:rtl;text-align:right;" : ""}">
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;color:#0A0F1E;">
          ${escHtml(opts.serviceName)}${staffLine}
        </div>
        <div style="font-family:Inter,sans-serif;font-size:16px;color:#374151;margin-top:6px;">
          ${escHtml(opts.date)} · ${escHtml(opts.time)}
        </div>
      </div>
      ${opts.cancelUrl ? `
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${escHtml(opts.cancelUrl)}" style="display:inline-block;padding:12px 28px;background:#F7F8FA;color:#0A0F1E;border:1.5px solid #E5E7EB;text-decoration:none;border-radius:9999px;font-size:13px;font-weight:600;font-family:'Bricolage Grotesque',sans-serif;">
          ${he ? "ביטול תור" : "Cancel appointment"}
        </a>
      </div>` : ""}
      <div style="padding:16px;background:#FEF3C7;border-radius:10px;font-family:Inter,sans-serif;font-size:13px;color:#92400E;${he ? "direction:rtl;text-align:right;" : ""}">
        ${he
          ? "⏰ אנא הגיע/י כמה דקות לפני. לביטול, יש לעשות זאת לפחות 24 שעות מראש."
          : "⏰ Please arrive a few minutes early. Cancel at least 24 hours in advance."}
      </div>
    </td></tr>
  `, opts.unsubscribeUrl);
}

/**
 * Review request email — sent to Israeli customers instead of WhatsApp/SMS.
 * Links to /r/{bookingId} which handles 4-5 star → Google, 1-3 star → private feedback.
 */
export function buildReviewRequestEmailHtml(opts: {
  firstName:       string;
  businessName:    string;
  reviewUrl:       string;
  locale?:         string | null;
  unsubscribeUrl?: string | null;
}) {
  const he = opts.locale === "he";

  return wrapTeal(`
    <tr><td style="padding:28px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">⭐</div>
      <p style="font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;color:#0A0F1E;margin:0 0 12px;">
        ${he ? `תודה על הביקור, ${escHtml(opts.firstName)}!` : `Thanks for your visit, ${escHtml(opts.firstName)}!`}
      </p>
      <p style="font-family:Inter,sans-serif;font-size:14px;color:#6B7280;margin:0 0 28px;max-width:360px;margin-left:auto;margin-right:auto;">
        ${he
          ? `מה דעתך על הביקור שלך ב‑${escHtml(opts.businessName)}? כמה שניות מספיקות 😊`
          : `How was your experience at ${escHtml(opts.businessName)}? Takes just a few seconds 😊`}
      </p>
      <a href="${escHtml(opts.reviewUrl)}" style="display:inline-block;padding:16px 40px;background:#0B2D2A;color:#fff;text-decoration:none;border-radius:9999px;font-size:16px;font-weight:700;font-family:'Bricolage Grotesque',sans-serif;margin-bottom:20px;">
        ${he ? "דרגו את החוויה שלכם ⭐" : "Rate your experience ⭐"}
      </a>
      <p style="font-family:Inter,sans-serif;font-size:12px;color:#9CA3AF;margin:0;">
        ${he
          ? "4-5 כוכבים → Google | 1-3 כוכבים → משוב פרטי אלינו ישירות"
          : "4-5 stars → Google review · 1-3 stars → private feedback directly to us"}
      </p>
    </td></tr>
  `, opts.unsubscribeUrl);
}

/**
 * No-show follow-up email — sent to Israeli customers instead of SMS.
 */
export function buildNoShowEmailHtml(opts: {
  firstName:       string;
  businessName:    string;
  serviceName:     string;
  rebookUrl?:      string | null;
  locale?:         string | null;
  unsubscribeUrl?: string | null;
}) {
  const he = opts.locale === "he";

  return wrapTeal(`
    <tr><td style="padding:28px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">😊</div>
      <p style="font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;color:#0A0F1E;margin:0 0 12px;">
        ${he ? `פספסנו אותך, ${escHtml(opts.firstName)}!` : `We missed you, ${escHtml(opts.firstName)}!`}
      </p>
      <p style="font-family:Inter,sans-serif;font-size:14px;color:#6B7280;margin:0 0 28px;max-width:380px;margin-left:auto;margin-right:auto;">
        ${he
          ? `לא הגעת היום ל‑${escHtml(opts.businessName)}. נשמח לראות אותך בפעם הבאה!`
          : `You missed your ${escHtml(opts.serviceName)} at ${escHtml(opts.businessName)} today. We'd love to see you next time!`}
      </p>
      ${opts.rebookUrl ? `
      <a href="${escHtml(opts.rebookUrl)}" style="display:inline-block;padding:16px 40px;background:#0B2D2A;color:#fff;text-decoration:none;border-radius:9999px;font-size:15px;font-weight:700;font-family:'Bricolage Grotesque',sans-serif;">
        ${he ? "קביעת תור חדש →" : "Book again →"}
      </a>` : ""}
    </td></tr>
  `, opts.unsubscribeUrl);
}

/**
 * CRM nudge email — sent to Israeli customers for pattern-based and lapsed re-engagement.
 */
export function buildNudgeEmailHtml(opts: {
  firstName:       string;
  businessName:    string;
  weeksSince:      number;
  bookingUrl:      string;
  nudgeType:       "pattern" | "lapsed";
  locale?:         string | null;
  unsubscribeUrl?: string | null;
}) {
  const he = opts.locale === "he";
  const weeks = opts.weeksSince;

  const bodyText = he
    ? `עברו ${weeks} שבוע${weeks !== 1 ? "ות" : ""} מאז הביקור האחרון שלך ב‑${escHtml(opts.businessName)}. נשמח לראות אותך שוב!`
    : `It's been ${weeks} week${weeks !== 1 ? "s" : ""} since your last visit at ${escHtml(opts.businessName)}. We'd love to see you again!`;

  return wrapTeal(`
    <tr><td style="padding:28px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">👋</div>
      <p style="font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;color:#0A0F1E;margin:0 0 12px;">
        ${he ? `היי ${escHtml(opts.firstName)}!` : `Hey ${escHtml(opts.firstName)}!`}
      </p>
      <p style="font-family:Inter,sans-serif;font-size:14px;color:#6B7280;margin:0 0 28px;max-width:380px;margin-left:auto;margin-right:auto;">
        ${bodyText}
      </p>
      <a href="${escHtml(opts.bookingUrl)}" style="display:inline-block;padding:16px 40px;background:#0B2D2A;color:#fff;text-decoration:none;border-radius:9999px;font-size:15px;font-weight:700;font-family:'Bricolage Grotesque',sans-serif;">
        ${he ? "קביעת תור →" : "Book now →"}
      </a>
    </td></tr>
  `, opts.unsubscribeUrl);
}
