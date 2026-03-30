import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";

// Server-side logo upload using service role key.
// Handles both storage upload and businesses.logo_url update in one call,
// bypassing anon RLS and bucket policy restrictions entirely.

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const businessId = formData.get("business_id") as string | null;

    if (!file || !businessId) {
      return NextResponse.json(
        { error: "Missing file or business_id" },
        { status: 400 }
      );
    }

    // Verify the caller is authenticated and owns this business
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.id !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use PNG, JPG, SVG or WebP." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${businessId}/logo.${ext}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure bucket exists (creates it if not — idempotent)
    const { error: bucketErr } = await supabaseAdmin.storage.createBucket(
      "business-logos",
      { public: true, allowedMimeTypes: allowedTypes, fileSizeLimit: 5242880 }
    );
    // Ignore "already exists" error
    if (bucketErr && !bucketErr.message.includes("already exists") && !bucketErr.message.includes("Duplicate")) {
      console.error("[upload-logo] bucket create error:", bucketErr.message);
    }

    // Upload file using admin client — bypasses all storage RLS
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("business-logos")
      .upload(path, buffer, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadErr) {
      console.error("[upload-logo] storage upload error:", uploadErr.message);
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("business-logos")
      .getPublicUrl(path);

    // Update businesses table — admin client bypasses RLS
    const { error: updateErr } = await supabaseAdmin
      .from("businesses")
      .update({ logo_url: publicUrl })
      .eq("id", businessId);

    if (updateErr) {
      console.error("[upload-logo] db update error:", updateErr.message);
      // If column doesn't exist yet, return the URL anyway so caller can retry
      return NextResponse.json(
        { error: updateErr.message, publicUrl },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, publicUrl });
  } catch (err) {
    console.error("[upload-logo] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
