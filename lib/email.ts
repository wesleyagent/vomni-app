/**
 * Email sending with reliability logging.
 *
 * Every email is written to `email_log` table before sending,
 * then updated to sent/failed. This gives visibility into failures
 * without blocking the caller on delivery.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";

const FROM    = process.env.RESEND_FROM_ADDRESS ?? "bookings@vomni.app";
const API_KEY = process.env.RESEND_API_KEY      ?? "";

export type EmailType =
  | "booking_owner_notify"
  | "booking_customer_confirm"
  | "booking_reminder"
  | "booking_noshow_recovery"
  | "waitlist_notify"
  | "limit_reached";

interface SendEmailOpts {
  to:        string | string[];
  subject:   string;
  html:      string;
  type:      EmailType;
  bookingId?: string | null;
  meta?:     Record<string, unknown>;
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
        from:    FROM,
        to:      Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html:    opts.html,
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
}) {
  const rows: [string, string | null | undefined][] = [
    ["Service",  opts.service],
    ["Duration", `${opts.duration} min`],
    ["With",     opts.staffName],
    ["Where",    opts.address],
  ];

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
      </div>
      <div style="text-align:center;">
        <a href="${escHtml(opts.cancelUrl)}" style="font-family:Inter,sans-serif;font-size:12px;color:#9CA3AF;text-decoration:none;">Need to cancel? Click here</a>
      </div>
      <div style="margin-top:24px;padding:16px;background:#FEF3C7;border-radius:10px;font-family:Inter,sans-serif;font-size:13px;color:#92400E;">
        ⏰ Please arrive a few minutes early. If you need to cancel, do so at least 24 hours in advance.
      </div>
    </td></tr>
  `);
}
