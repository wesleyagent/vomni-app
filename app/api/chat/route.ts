import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseConfigured } from "@/lib/supabase";

// ── System prompt ─────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are Vomni's support assistant. You are friendly, helpful, and concise. You represent a premium product and your tone should reflect that — warm but professional, direct but never cold.

WHAT YOU KNOW ABOUT VOMNI:
Vomni is a review management platform for service businesses. It automatically sends review requests to customers after every appointment, routes happy customers (4-5 stars) to Google, and catches unhappy customers (1-3 stars) privately before they reach Google.

Setup takes 5 minutes — just one email forward from their booking system.

Pricing:
- Monthly: £70/month — cancel anytime, unlimited review requests, full dashboard, recovery inbox with AI replies, 24/7 support, 14-day money back guarantee
- Annual: £600/year (£50/month) — 2 months free, everything in monthly, priority support, 14-day money back guarantee

Key facts:
- 98% SMS open rate
- Customers average 15-20 reviews per month vs 2-3 without Vomni
- 73% of unhappy customers give a second chance when responded to well
- Works with any booking system — no integration needed
- 14-day money back guarantee — no questions asked

HOW TO HANDLE QUESTIONS:
- Answer pricing questions directly and confidently
- Answer setup questions with simple clear steps
- Answer product questions based on the information above
- If asked how the technical system works behind the scenes, say "I am not able to share the technical details of how our system works but I am happy to connect you with our team who can walk you through everything"
- Never mention Make, Twilio, Typeform, Zapier, or any third party tools
- Never reveal internal architecture or automation details
- Never make up features that do not exist

LEAD COLLECTION:
Early in every conversation with a new visitor, after answering their first question, naturally ask for their name and email. Do not ask for both at once. Ask for name first, then email. Example: "By the way, what is your name?" then after they answer "Thanks [name] — what is your email so I can follow up if needed?"

Store name and email once collected. Use their name in all subsequent messages.

ESCALATION:
If someone asks something you cannot answer confidently, say: "That is a great question — let me connect you with a member of our team who can give you the best answer. I have flagged this conversation and someone will be with you shortly."

If someone is angry or frustrated, say: "I completely understand and I am sorry you are having this experience. I am flagging this for our team right now and someone will be in touch very shortly to sort this out for you."

If someone asks to speak to a human, say: "Of course — I am connecting you now. Someone from our team will be with you shortly."

After any escalation trigger, set conversation status to NEEDS_HUMAN in the database.

NEVER:
- Offer discounts
- Make promises about results that are not backed by the stated statistics
- Reveal anything about internal tools or architecture
- Be robotic or use corporate language
- Say "As an AI language model"
- Use the word "absolutely" or "certainly" or "great question"
- Use markdown formatting like **bold** or bullet points starting with * or - (use plain conversational prose)
- Use numbered lists (write steps naturally in sentences)

KEEP MESSAGES SHORT: 2-4 sentences max unless a detailed explanation is truly needed. One idea per message.

SIGNAL INSTRUCTIONS (these tags are stripped from visible output — always put them on a new line at the very end of your response):
- After collecting the visitor's name, append: [NAME:FirstName]
- After collecting the visitor's email, append: [EMAIL:email@example.com]
- When escalation to a human is needed, append: [ESCALATE]`;

function buildSystemPrompt(
  businessName?: string | null,
  ownerFirstName?: string | null
): string {
  let prompt = BASE_SYSTEM_PROMPT;
  if (businessName && ownerFirstName) {
    prompt += `\n\nCONTEXT: This is a logged-in customer. Their name is ${ownerFirstName} and their business is ${businessName}. You already know who they are — greet them warmly but do not ask for their name or email again.`;
  }
  return prompt;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      sessionId,
      businessId,
      source,
      visitorName,
      visitorEmail,
      conversationId,
      businessName,
      ownerFirstName,
    } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    // Call Claude
    const claudeMessages = messages
      .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }));

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: buildSystemPrompt(businessName, ownerFirstName),
        messages: claudeMessages,
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error("Anthropic error:", err);
      return NextResponse.json({ error: "API request failed" }, { status: 500 });
    }

    const claudeData = await claudeRes.json();
    const rawContent: string = claudeData.content?.[0]?.text || "";

    // Parse signals
    const needsHuman = /\[ESCALATE\]/i.test(rawContent);
    const nameMatch = rawContent.match(/\[NAME:([^\]]+)\]/i);
    const emailMatch = rawContent.match(/\[EMAIL:([^\]]+)\]/i);
    const extractedName = nameMatch?.[1]?.trim() || null;
    const extractedEmail = emailMatch?.[1]?.trim() || null;

    // Clean response
    const cleanContent = rawContent
      .replace(/\[ESCALATE\]/gi, "")
      .replace(/\[NAME:[^\]]+\]/gi, "")
      .replace(/\[EMAIL:[^\]]+\]/gi, "")
      .trim();

    const now = new Date().toISOString();
    const assistantMsg = {
      id: randomId(),
      role: "assistant",
      content: cleanContent,
      timestamp: now,
      isAgent: false,
    };

    // Upsert to Supabase
    let finalConversationId = conversationId || null;

    if (supabaseConfigured && sessionId) {
      const finalName = extractedName || visitorName || null;
      const finalEmail = extractedEmail || visitorEmail || null;

      if (conversationId) {
        // Fetch existing to preserve agent messages
        const { data: existing } = await supabase
          .from("chat_conversations")
          .select("messages, status")
          .eq("id", conversationId)
          .single();

        const existingMsgs: unknown[] = existing?.messages || [];
        const agentMsgs = (existingMsgs as { role: string }[]).filter((m) => m.role === "agent");

        // Build updated message list: all user/assistant messages + new assistant + existing agent msgs
        const updatedMsgs = [
          ...messages
            .filter((m: { role: string }) => m.role !== "agent")
            .map((m: { role: string; content: string; id?: string; timestamp?: string }, i: number) => ({
              id: m.id || randomId(),
              role: m.role,
              content: m.content,
              timestamp: m.timestamp || new Date(Date.now() - (messages.length - i) * 200).toISOString(),
              isAgent: false,
            })),
          assistantMsg,
          ...agentMsgs,
        ];

        const currentStatus = existing?.status || "active";
        const newStatus = needsHuman ? "needs_human" : currentStatus === "resolved" ? "resolved" : "active";

        await supabase
          .from("chat_conversations")
          .update({
            messages: updatedMsgs,
            status: newStatus,
            visitor_name: finalName,
            visitor_email: finalEmail,
            updated_at: now,
          })
          .eq("id", conversationId);
      } else {
        // New conversation
        const allMsgs = [
          ...messages
            .filter((m: { role: string }) => m.role !== "agent")
            .map((m: { role: string; content: string; id?: string; timestamp?: string }, i: number) => ({
              id: m.id || randomId(),
              role: m.role,
              content: m.content,
              timestamp: m.timestamp || new Date(Date.now() - (messages.length - i) * 200).toISOString(),
              isAgent: false,
            })),
          assistantMsg,
        ];

        const { data: newConv } = await supabase
          .from("chat_conversations")
          .insert({
            session_id: sessionId,
            business_id: businessId || null,
            source: source || "landing_page",
            status: needsHuman ? "needs_human" : "active",
            visitor_name: finalName,
            visitor_email: finalEmail,
            messages: allMsgs,
            created_at: now,
            updated_at: now,
          })
          .select("id")
          .single();

        finalConversationId = newConv?.id || null;
      }
    }

    return NextResponse.json({
      response: cleanContent,
      conversationId: finalConversationId,
      status: needsHuman ? "needs_human" : "active",
      visitorName: extractedName || visitorName || null,
      visitorEmail: extractedEmail || visitorEmail || null,
    });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
