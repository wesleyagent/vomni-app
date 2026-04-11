import { NextRequest, NextResponse } from "next/server";
import { INSIGHTS_SYSTEM_PROMPT } from "@/lib/knowledge-base";
import { requireAuth, requirePlanByEmail } from "@/lib/require-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const planErr = await requirePlanByEmail(auth.email, "growth", supabaseAdmin);
  if (planErr) return planErr;

  try {
    const { businessName, businessType, analytics, completionRate, avgRating, totalReviews } =
      await req.json();
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
        max_tokens: 1000,
        system: INSIGHTS_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Generate analytics insights for this business:\n\nBusiness: ${businessName} (${businessType || "service business"})\nCompletion Rate: ${completionRate}%\nAverage Rating: ${avgRating}\nTotal Google Reviews This Month: ${totalReviews}\n\nMonthly Trend Data:\n${JSON.stringify(analytics, null, 2)}\n\nReturn a JSON array of 3-5 insights.`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "[]";

    // Parse the JSON array from the response
    let insights;
    try {
      // Try to extract JSON from the response (it may be wrapped in markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      insights = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      insights = [];
    }

    return NextResponse.json({ insights });
  } catch {
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
