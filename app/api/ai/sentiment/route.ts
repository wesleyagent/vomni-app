import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { feedback_id, feedback_text, business_type } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    if (!feedback_text) return NextResponse.json({ error: "feedback_text required" }, { status: 400 });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-20250514",
        max_tokens: 200,
        system: `Analyse customer feedback for a ${business_type || "service business"}. Return JSON only - no explanation, no markdown.`,
        messages: [{
          role: "user",
          content: `Analyse this feedback. Return JSON only:
{"topic": "wait_time|quality|staff|price|cleanliness|other", "intensity": "mild|moderate|severe", "urgency": "1_hour|24_hours|this_week"}

Feedback: ${feedback_text}`,
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic sentiment error:", err);
      return NextResponse.json({ error: "API request failed" }, { status: 500 });
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text?.trim() || "{}";

    let parsed: { topic?: string; intensity?: string; urgency?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // fallback
      parsed = { topic: "other", intensity: "mild", urgency: "this_week" };
    }

    const topic     = parsed.topic     || "other";
    const intensity = parsed.intensity || "mild";
    const urgency   = parsed.urgency   || "this_week";

    // Save to DB if feedback_id provided
    if (feedback_id) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (serviceKey && url) {
        const admin = createClient(url, serviceKey);
        await admin.from("feedback").update({
          sentiment_topic:     topic,
          sentiment_intensity: intensity,
          sentiment_urgency:   urgency,
        }).eq("id", feedback_id);
      }
    }

    return NextResponse.json({ topic, intensity, urgency });
  } catch (err) {
    console.error("Sentiment route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
