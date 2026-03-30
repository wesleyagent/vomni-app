import { NextRequest, NextResponse } from "next/server";
import { RECOVERY_SYSTEM_PROMPT } from "@/lib/knowledge-base";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { customerName, rating, feedback, businessName, businessType } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: RECOVERY_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Generate a recovery response for this negative feedback:\n\nBusiness: ${businessName} (${businessType || "service business"})\nCustomer: ${customerName}\nRating: ${rating}/5 stars\nFeedback: "${feedback}"\n\nWrite a warm, genuine response from the business owner.`,
        }],
      }),
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Unable to generate response";
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
