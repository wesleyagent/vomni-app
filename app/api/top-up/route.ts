import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Top-up / credit system deprecated — SMS limits removed from new architecture.
// This endpoint is a no-op stub kept for backward compatibility.

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "Top-up credits have been removed. Upgrade your plan instead." }, { status: 410 });
}

export async function GET() {
  return NextResponse.json({ packages: [], message: "Credit-based top-ups have been removed." });
}
