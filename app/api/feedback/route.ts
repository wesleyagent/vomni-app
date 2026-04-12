import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/feedback — Save a customer review/feedback
// Called from the review-invite page after star selection
export async function POST(req: NextRequest) {
  let body: {
    business_id: string;
    booking_id?: string | null;
    rating: number;
    feedback_text?: string | null;
    customer_name?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { business_id, booking_id, rating, feedback_text, customer_name } = body;

  if (!business_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("feedback").insert({
    business_id,
    booking_id:    booking_id  ?? null,
    rating,
    feedback_text: feedback_text ?? null,
    customer_name: customer_name ?? null,
    created_at:    new Date().toISOString(),
  });

  if (error) {
    console.error("[api/feedback] insert error:", error.message);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
