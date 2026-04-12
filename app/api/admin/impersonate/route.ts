import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/require-admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/impersonate
// Generates a Supabase magic link for the business owner's email.
// Admin clicks it to log in as that user with a full native session.
export async function POST(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const { business_id } = await req.json().catch(() => ({}));
  if (!business_id) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
  }

  // Fetch owner email
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("owner_email, name")
    .eq("id", business_id)
    .single();

  if (bizErr || !biz?.owner_email) {
    return NextResponse.json({ error: "Business not found or has no owner email" }, { status: 404 });
  }

  // Generate a one-time magic link for the owner's email
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: biz.owner_email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error("[admin/impersonate] generateLink error:", linkErr?.message);
    return NextResponse.json({ error: "Failed to generate magic link" }, { status: 500 });
  }

  return NextResponse.json({
    link: linkData.properties.action_link,
    email: biz.owner_email,
    business_name: biz.name,
  });
}
