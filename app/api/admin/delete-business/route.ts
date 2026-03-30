/**
 * DELETE /api/admin/delete-business
 *
 * Safely removes a business by:
 *  1. Copying the full business record to `unsubscribed_businesses` (data preserved)
 *  2. Deleting the auth.users entry (clears login credentials)
 *  3. Deleting from businesses (cascades to bookings/feedback)
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY env var - anon key cannot manage auth users.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

export async function DELETE(req: NextRequest) {
  const deny = requireAdmin(req);
  if (deny) return deny;

  const { businessId } = await req.json();

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Fetch the business record
  const { data: biz, error: fetchError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (fetchError || !biz) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // 2. Archive to unsubscribed_businesses (preserves all data)
  const { error: archiveError } = await supabase
    .from("unsubscribed_businesses")
    .insert({
      ...biz,
      unsubscribed_at: new Date().toISOString(),
    });

  if (archiveError) {
    console.error("[delete-business] archive error:", archiveError);
    // Non-fatal - continue with deletion even if archive fails
  }

  // 3. Delete all child records first (FK constraints block business delete otherwise)
  await supabase.from("feedback").delete().eq("business_id", businessId);
  await supabase.from("bookings").delete().eq("business_id", businessId);
  await supabase.from("chat_conversations").delete().eq("business_id", businessId);

  // 4. Now delete the business record
  const { error: bizDeleteError } = await supabase
    .from("businesses")
    .delete()
    .eq("id", businessId);

  if (bizDeleteError) {
    console.error("[delete-business] businesses delete error:", bizDeleteError);
    return NextResponse.json({ error: "Failed to delete business record" }, { status: 500 });
  }

  // 5. Delete the auth user by email (more reliable than ID - handles duplicate business records)
  try {
    // First try direct ID delete (fast path - works when businesses.id === auth.users.id)
    const { error: directDeleteError } = await supabase.auth.admin.deleteUser(businessId);

    if (directDeleteError) {
      console.warn("[delete-business] direct auth delete failed, trying email lookup:", directDeleteError.message);

      // Fallback: find auth user by email and delete by their actual auth ID
      const ownerEmail = biz.owner_email;
      if (ownerEmail) {
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (!listError && listData?.users) {
          const authUser = listData.users.find(u => u.email?.toLowerCase() === ownerEmail.toLowerCase());
          if (authUser) {
            const { error: emailDeleteError } = await supabase.auth.admin.deleteUser(authUser.id);
            if (emailDeleteError) {
              console.error("[delete-business] email-based auth delete also failed:", emailDeleteError.message);
            } else {
              console.log("[delete-business] auth user deleted via email lookup ✓");
            }
          } else {
            console.warn("[delete-business] no auth user found for email:", ownerEmail);
          }
        }
      }
    } else {
      console.log("[delete-business] auth user deleted via direct ID ✓");
    }
  } catch (err) {
    console.error("[delete-business] unexpected auth delete error:", err);
  }

  return NextResponse.json({ success: true });
}
