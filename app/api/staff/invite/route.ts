import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail }     from "@/lib/email";
import { requireAuth, requireBusinessOwnership } from "@/lib/require-auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vomni.io";

// POST /api/staff/invite — Send a staff invite email
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let body: { business_id: string; staff_id?: string; email: string; invited_by_name?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { business_id, staff_id, email, invited_by_name } = body;
  if (!business_id || !email) {
    return NextResponse.json({ error: "Missing business_id or email" }, { status: 400 });
  }

  const ownership = await requireBusinessOwnership(auth.email, business_id, supabaseAdmin);
  if (ownership instanceof NextResponse) return ownership;

  // Look up the business
  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("name, is_master")
    .eq("id", business_id)
    .single();

  if (!biz || !biz.is_master) {
    return NextResponse.json({ error: "Only master accounts can invite staff" }, { status: 403 });
  }

  // Create invite record
  const { data: invite, error: invErr } = await supabaseAdmin
    .from("staff_invites")
    .insert({
      business_id,
      staff_id:        staff_id ?? null,
      email,
      invited_by_name: invited_by_name ?? null,
    })
    .select("token")
    .single();

  if (invErr || !invite) {
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  const inviteUrl = `${APP_URL}/staff/join?token=${invite.token}`;

  await sendEmail({
    to:      email,
    subject: `You're invited to join ${biz.name} on Vomni`,
    type:    "booking_owner_notify",
    html: `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;padding:40px;background:#F7F8FA;">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="font-size:20px;font-weight:700;color:#0A0F1E;margin-bottom:8px;">${biz.name}</div>
        <h2 style="font-size:24px;font-weight:800;color:#0A0F1E;margin:0 0 16px;">You&apos;ve been invited!</h2>
        <p style="color:#6B7280;font-size:14px;line-height:1.7;margin:0 0 24px;">
          ${invited_by_name ? `<strong>${invited_by_name}</strong> has` : "Your team has"} invited you to join
          <strong>${biz.name}</strong> on Vomni — your new online booking dashboard.
        </p>
        <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;background:#00C896;color:#fff;text-decoration:none;border-radius:9999px;font-weight:700;font-size:15px;">
          Accept Invitation →
        </a>
        <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">
          This link expires in 7 days. If you weren't expecting this, ignore it.
        </p>
      </div>
    </body></html>`,
  });

  return NextResponse.json({ success: true, token: invite.token });
}

// GET /api/staff/invite?token=XXX — Validate an invite token (public, no auth needed)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { data: invite } = await supabaseAdmin
    .from("staff_invites")
    .select("id, business_id, staff_id, email, status, expires_at")
    .eq("token", token)
    .single();

  if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 410 });

  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("name, booking_slug")
    .eq("id", invite.business_id)
    .single();

  return NextResponse.json({ valid: true, invite, business: biz });
}
