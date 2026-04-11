import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePlanByEmail } from "@/lib/require-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const planErr = await requirePlanByEmail(auth.email, "growth", supabaseAdmin);
  if (planErr) return planErr;

  try {
    const { feedbackText, rating, customerName, businessName, service, businessType, threeTones } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

    // Three-tone mode (new)
    if (threeTones) {
      const systemPrompt = `You are helping a ${businessType || "service business"} owner respond to a customer complaint. Write responses that address the specific complaint, use the customer's name, mention the specific service, offer a concrete remedy, sound human not corporate, and are under 80 words each. Return valid JSON only - no markdown, no explanation.`;

      const userContent = `Business: ${businessName || "our business"}
Customer: ${customerName || "the customer"}
Service: ${service || "their recent visit"}
Rating: ${rating || "low"} stars
Feedback: ${feedbackText}

Return JSON with exactly this structure:
{
  "apologetic": "...",
  "professional": "...",
  "personal": "..."
}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Anthropic error:", err);
        return NextResponse.json({ error: "API request failed" }, { status: 500 });
      }

      const data = await response.json();
      const raw = data.content?.[0]?.text?.trim() || "{}";

      let tones: { apologetic?: string; professional?: string; personal?: string } = {};
      try {
        tones = JSON.parse(raw);
      } catch {
        // Try to extract JSON from text
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try { tones = JSON.parse(match[0]); } catch { /* fallback */ }
        }
      }

      return NextResponse.json({
        apologetic:   tones.apologetic   || "",
        professional: tones.professional || "",
        personal:     tones.personal     || "",
      });
    }

    // Single-tone mode (legacy)
    const systemPrompt = `You are a customer service expert helping a local service business respond to negative feedback. Write a professional, empathetic response that:
- Acknowledges the customer's experience
- Apologises sincerely without being defensive
- Offers to make it right with a specific action
- Keeps it under 100 words
- Sounds human and genuine, not corporate
- Does not mention Vomni or any software`;

    const userContent = `Business name: ${businessName || "our business"}
Customer rating: ${rating} stars
Customer feedback: ${feedbackText}

Write only the response text, nothing else.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return NextResponse.json({ error: "API request failed" }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text?.trim() || "";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Feedback reply error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
