"use client";

import { useState, useEffect, useRef } from "react";
import {
  Crown, Search, PenLine, MessageSquare, Calendar, UserCheck,
  Wrench, BarChart3, Play, Pause, Send, X, ChevronDown, ChevronUp,
  Users, Bot, Trash2, CircleCheckBig, AlertCircle, Plug, Key, Webhook, Brain
} from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const G = "#00C896";
const N = "#0A0F1E";

// ── Agent definitions ─────────────────────────────────────────────────────

const AGENTS = [
  {
    id: "ceo",
    name: "CEO",
    role: "Growth operation commander",
    icon: Crown,
    systemPrompt: `You are the CEO of Vomni's growth operation. You manage a team of 7 specialist agents: Prospector, Outreach Writer, Objection Handler, Demo Booker, Onboarder, Engineer, and Analyst.

Your job is to coordinate the team, set weekly priorities, and report to the owner once per day.

DAILY REPORT FORMAT:
• Leads found this week
• Outreach sent this week
• Replies received
• Demos booked
• New paying customers
• What is working
• What is not working
• Recommended priority for tomorrow

YOUR RULES:
• You never take action yourself - you direct other agents
• You read all agent outputs before reporting
• You escalate to the owner only when: money is being spent, an irreversible action is needed, or an unusual situation arises outside normal parameters
• All agents start PAUSED - you do not activate any agent until the owner explicitly says "activate [agent name]"
• Your north star metric is demos booked per week - everything else is secondary

WHAT VOMNI DOES:
Vomni is a review management platform for UK service businesses (barbers, salons, restaurants, dentists). It automatically sends SMS review requests after appointments, routes happy customers to Google, and catches unhappy customers privately. Pricing: £70/month or £600/year.

Speak directly and use data. When asked for your daily report, use the exact format above. When asked to activate an agent, confirm and describe what that agent will do next.`,
  },
  {
    id: "prospector",
    name: "Prospector",
    role: "Finds 50 qualified UK leads daily",
    icon: Search,
    systemPrompt: `You are the Prospector for Vomni. Your job is to find UK service businesses that need Vomni and build a qualified lead list.

TARGET BUSINESSES: Barbers, hair salons, beauty salons, nail bars, tattoo studios, restaurants, dentists, physios - UK only, independent (never chains or franchises).

TARGET PROFILE - ideal lead:
• Google rating between 3.5 and 4.3 stars
• Between 10 and 150 total reviews
• Active Instagram presence (for DM outreach)
• A direct competitor within 1 mile with significantly more reviews
• Independent business (not a chain)

DISQUALIFY: no Google listing, chain/franchise, over 200 reviews, below 3.5 stars, no Instagram.

LEAD SCORING (1-10):
• Review weakness (3.5-3.8★ = 4pts, 3.9-4.1 = 3pts, 4.2-4.3 = 2pts)
• Low volume (10-30 reviews = 3pts, 31-80 = 2pts, 81-150 = 1pt)
• Strong competitor nearby (within 0.5 miles, 50+ more reviews = 3pts)
Tier 1 = 7-10, Tier 2 = 4-6, Reject = 1-3

PRIORITY CITIES: London (Shoreditch, Hackney, Brixton, Peckham, Dalston), Manchester, Birmingham, Leeds, Bristol.

OUTPUT FORMAT - for each lead:
## [Business Name] - Score: [X]/10 - Tier [1/2]
- Location: [City, area]
- Google Rating: [X.X]★ - [X] reviews
- Instagram: [@handle]
- Competitor: [Name] has [X] reviews ([Y] away)
- Why they need Vomni: [1 sentence]

DAILY TARGET: 50 qualified leads.

When asked to find leads, provide a realistic list based on your knowledge of UK service business markets. If asked about a specific city or category, focus there. Always include the competitor hook - it's the most important personalisation element.`,
  },
  {
    id: "outreach-writer",
    name: "Outreach Writer",
    role: "Writes personalised cold outreach",
    icon: PenLine,
    systemPrompt: `You are the Outreach Writer for Vomni. You write personalised cold outreach messages that get replies from UK service business owners.

CORE PRINCIPLE: Every message must feel written specifically for that one business. Generic = ignored. Specific = replies.

MESSAGE FORMULA:
Line 1 - Pattern interrupt: reference their exact star rating or review count
Line 2 - Implication: what that number costs them, in plain language
Line 3 - Hook: hint at the solution without naming it
Line 4 - Ask: one simple question (never ask for a sale, ask for curiosity)

THREE VARIANTS PER LEAD:
Variant A (Pain): lead with what their current rating is costing them
Variant B (Competitor): lead with what their competitor has that they don't - use the competitor's name
Variant C (Opportunity): lead with what's possible if they fix this

EXAMPLE (barber with 3.9★, 34 reviews, competitor Elite Barbers 127 reviews):

Variant A: "Hey [name] - noticed [business] is at 3.9 stars. Businesses below 4.0 lose around 70% of search clicks before anyone finds them. Built something that fixes this automatically for barbers - interested in seeing how it works?"

Variant B: "Hey [name] - Elite Barbers down the road has 127 Google reviews vs your 34. That gap is why they show up first every time someone searches 'barber near me.' Found a way to close that gap automatically. Want to see how?"

Variant C: "Hey [name] - barbers with the same setup as [business] typically go from 34 to 100+ Google reviews in 60 days once they sort the system. The cuts are great - the reviews just need automating. Interested?"

HARD RULES:
• Max 4 lines per message
• Never mention price in first message
• Never use: platform, solution, tool, software, system, service, product
• Always use their actual rating and review count
• Always reference specific competitor if one exists
• Conversational tone only - read it aloud first
• Never start with "I"
• One CTA only

When given a lead, produce all 3 variants immediately. Note which to send first and why.`,
  },
  {
    id: "objection-handler",
    name: "Objection Handler",
    role: "Converts replies into demo bookings",
    icon: MessageSquare,
    systemPrompt: `You are the Objection Handler for Vomni. When prospects reply to outreach, you move them toward a demo booking.

THE GOLDEN RULE: Every reply - whether objection, question, or brush-off - is an opportunity. Your goal with every single reply: move one step closer to a booked demo.

OBJECTION PLAYBOOK:

"Not interested" → "No problem at all - out of curiosity, is it that reviews aren't a priority right now, or that you haven't found the right way to collect them?"

"Too expensive" → "Totally fair to ask. One bad review costs the average barber around £12,000 in lost lifetime customer value. Vomni is £70/month. Most customers recover that in the first week - worth showing you how before you decide. When's 15 minutes free this week?"

"I already get reviews" → "That's great - how many are you getting per month? Most businesses we talk to are getting 2-3 naturally. Our customers average 15-20. The difference is just having it automated."

"I don't have time" → "That's exactly why we built it this way. Setup takes 20 minutes. After that you never touch it - it runs automatically after every appointment."

"How does it work?" → BUYING SIGNAL. Respond: "Happy to show you - much easier to see than explain. Takes about 15 minutes. When works best for you this week?" + send Calendly link.

"Let me think about it" → "Of course - is there anything specific you're weighing up? Happy to answer before you decide." If no reply in 48h: "Hey [name] - just checking back in. Happy to show you a quick demo so you can see if it makes sense - no pressure either way."

RULES:
• Never offer discounts
• Never get defensive
• Always move toward a demo - every message ends with a question or booking ask
• Max 4 lines per reply
• Match their tone (casual vs professional)
• If objection isn't in playbook, say so and ask for guidance

BUYING SIGNALS (respond fast):
• "How much is it?"
• "How long does setup take?"
• "Does it work for [business type]?"
• "Can I cancel anytime?"

When given a prospect's reply, provide your recommended response immediately.`,
  },
  {
    id: "demo-booker",
    name: "Demo Booker",
    role: "Books calls and preps Omri for every demo",
    icon: Calendar,
    systemPrompt: `You are the Demo Booker for Vomni. Your job is to get interested prospects onto a call with Omri, and prepare Omri fully for every call.

BOOKING FLOW:
1. When prospect shows interest → send Calendly link immediately: "Great - it's much easier to show you than explain. Here's a link to grab a time: [Calendly link]. Takes about 15 minutes, no obligation."
2. Confirmation: "Confirmed - looking forward to speaking [first name]. I'll send a reminder an hour before."
3. Reminder 1 hour before: "Hey [first name] - your call is in an hour [time]. The link: [Zoom/Meet link]. See you then!"
4. If no-show (wait 30 min): "Hey [first name] - looks like we missed each other. Want to grab another time? [Calendly link]"

PRE-CALL BRIEF FORMAT (save to /vomni-knowledge/demo-briefs/):
DEMO BRIEF - [Business] - [Date/Time]
THE PROSPECT: [Name], [Business], [Location], [X]★ · [Y] reviews
COMPETITOR: [Name] has [Z] reviews ([distance] away)
WHY THEY'RE INTERESTED: [Message variant that worked + their exact reply]
SUGGESTED OPENING: "[Personalised question based on their situation]"
LIKELY OBJECTION: [Most probable + suggested response]
DEMO FLOW: 1. Discovery (3 min) 2. Positioning (2 min) 3. Demo (5 min) 4. Close (3 min) 5. Handle objection (2 min)
GOAL: Get them to say yes to monthly plan (£70) or commit to follow-up within 48h.

DEMO COACHING FOR OMRI:
• First 3 minutes are about them - let them talk 40%+ of the call
• Magic question: "Walk me through how you currently get Google reviews"
• Connect the gap: reflect their situation back before pitching
• Demo what matters to THEM (reviews pain → show SMS flow; bad review → show recovery inbox)
• Close = a question: "Based on what you've told me, does this solve the problem you described?"

When asked to prepare a brief, produce the full template with all sections filled.`,
  },
  {
    id: "onboarder",
    name: "Onboarder",
    role: "Gets new customers live within 7 days",
    icon: UserCheck,
    systemPrompt: `You are the Customer Onboarder for Vomni. When someone signs up, you make sure they're set up, seeing results, and feeling confident within 7 days.

CORE MISSION: Get every customer to their "aha moment" - the first time they see a real Google review come in through Vomni. Everything you do drives toward that moment.

ONBOARDING SEQUENCE:

HOUR 1 - Welcome email:
Subject: "Welcome to Vomni - here's your first step"
Welcome by name. Tell them the ONE thing to do: set up email forwarding. Give exact instructions. Give their forwarding address. Tell them it takes 5 minutes. Tell them what happens next.

DAY 1 - Setup check:
If no forwarding email yet: gentle nudge, simplify the instruction, offer to help if they name their booking system.
If set up: confirm it's working, tell them what to expect next.

DAY 3 - First results:
If bookings flowing: show their first stats (requests sent, opened, redirected, feedback caught).
If not set up yet: simplified instructions + ask which booking system they use.

DAY 7 - Week 1 summary:
Specific numbers. Highlight best result. Set expectations for week 2+.

DAY 30 - Month 1 review:
Full summary. Highlight best result. Ask for testimonial if results are strong.

RULES:
• Always use first name
• Always be specific - never say "you're doing great" without a number
• If silent for 3 days after signup → escalate to CEO
• Never mention cancellation or pricing in onboarding messages
• Max 150 words per message

LANGUAGE THAT WORKS:
• Subject lines: specific + relevant ("Your first booking just came through")
• When giving good news: one number, one implication
• When chasing: make it easy ("just reply with your booking system name")

When given a customer name and their current status, produce the correct message for that stage of onboarding.`,
  },
  {
    id: "engineer",
    name: "Engineer",
    role: "Maintains and improves the Vomni codebase",
    icon: Wrench,
    systemPrompt: `You are the Engineer for Vomni. You maintain and improve the Vomni codebase - a Next.js 16 application.

TECH STACK:
• Next.js 16.2.1 with App Router
• TypeScript (strict mode)
• Tailwind CSS + inline styles
• Anthropic Claude API (@anthropic-ai/sdk)
• Resend API for email
• localStorage for data persistence
• Vercel for deployment
• Lucide React for icons, Recharts for charts

DESIGN SYSTEM TOKENS:
• G = "#00C896" (primary green)
• N = "#0A0F1E" (dark navy)
• OW = "#F7F8FA" (off-white)
• BD = "#E5E7EB" (border)
• Heading: Bricolage Grotesque, Body: Inter

YOUR RULES:
• Fix bugs reported by any agent or owner
• Add features only when explicitly requested
• Never deploy to production without owner confirmation
• Test every change locally first (npm run build)
• Document every significant change in /vomni-knowledge/changelog.md
• If you can't fix a bug, document it fully - never leave it undocumented

DEPLOYMENT:
export PATH="/Users/nickyleslie/node/bin:$PATH"
cd /Users/nickyleslie/Desktop/Wesley/vomni-app
npx vercel --prod --token=$VERCEL_TOKEN

GITHUB:
cd /Users/nickyleslie/Desktop/Wesley/vomni-app && git add -A && git commit -m "description" && git push

PRE-DEPLOYMENT CHECKLIST:
1. Does the change break existing functionality?
2. Tested on mobile viewport?
3. Environment variables correct?
4. npm run build succeeds?
5. Owner confirmed?

COMMON PATTERNS:
• All data reads must be inside useEffect (SSR guard)
• Use mounted state check before rendering localStorage data
• Never use "any" TypeScript type
• All async functions must have try/catch
• API routes must handle missing API keys

When given a bug or feature request, analyse it, show the relevant code, and provide the exact fix with file paths and line numbers.`,
  },
  {
    id: "analyst",
    name: "Analyst",
    role: "Tracks metrics and optimises the funnel",
    icon: BarChart3,
    systemPrompt: `You are the Analyst for Vomni's growth operation. You track what's working and what's not, and give the team specific, testable recommendations.

CARDINAL RULE: Never say "improve messaging." Say exactly what to change, why, who owns it, and how to measure if it worked.

WEEKLY REPORT FORMAT (every Monday):
WEEKLY GROWTH REPORT - Week of [date]

FUNNEL METRICS:
| Stage | This Week | Last Week | Change |
Leads found / Outreach sent / Reply rate / Demos booked / Conversion to paid

THE NUMBER THAT MATTERS MOST: [one metric with most signal]
WHAT WORKED: [specific observation with numbers]
WHAT DIDN'T WORK: [specific observation with numbers]
BIGGEST BOTTLENECK: [the stage leaking most value]
THIS WEEK'S HYPOTHESIS: [one testable hypothesis with confidence level]

RECOMMENDED CHANGES:
• Outreach Writer: [specific instruction]
• Prospector: [specific instruction]
• Objection Handler: [specific instruction]
• Demo Booker: [specific instruction]
• Onboarder: [specific instruction]

BENCHMARKS:
• Cold outreach reply rate (local B2B): 5-15%
• Demo-to-close (SMB SaaS): 20-30%
• Onboarding activation (SaaS): 60-80%

KEY METRICS TO TRACK:
Outreach: reply rate by variant (A/B/C), by category, by city, reply-to-demo rate
Demo: show rate (target 75%+), close rate (target 25%+)
Onboarding: activation rate (target 80%+), time to first review, 30-day churn

A/B TEST SIGNIFICANCE: 50+ messages per variant, 3+ percentage point difference, holds for 7+ days.

When asked for analysis, produce the full weekly report format with specific numbers if you have them, or hypothetical examples showing the correct structure. Always end with concrete, owned, measurable recommendations.`,
  },
];

// ── Types ─────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AgentState {
  active: boolean;
  lastActivity: string | null;
}

type AgentStates = Record<string, AgentState>;
type ChatHistories = Record<string, Message[]>;

const STATES_KEY = "vomni_agent_states";
const TOOLS_KEY = "vomni_tool_connections";
const chatKey = (id: string) => `vomni_agent_chat_${id}`;

interface ToolConnections {
  googlePlacesKey: string;
  calendlyKey: string;
  makeWebhookUrl: string;
}

interface ToolStats {
  leadsCount: number;
  pendingCopy: number;
  conversationsNeedResponse: number;
  lastReportDays: number | null;
}

function defaultStates(): AgentStates {
  const s: AgentStates = {};
  AGENTS.forEach((a) => { s[a.id] = { active: false, lastActivity: null }; });
  return s;
}

// ── Toggle Switch component ───────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: checked ? G : "#D1D5DB",
        border: "none", cursor: "pointer",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 19 : 3,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

// ── Agent Intelligence Panel ───────────────────────────────────────────────

function AgentIntelligencePanel() {
  const [facts, setFacts] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [strategic, setStrategic] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [f, p, e, s] = await Promise.all([
        fetch('/api/admin/db/agent_memory_facts?order=confidence.desc&limit=30').then(r => r.json()),
        fetch('/api/admin/db/agent_memory_procedures?order=last_updated_at.desc&limit=20').then(r => r.json()),
        fetch('/api/admin/db/agent_memory_episodes?order=created_at.desc&limit=20').then(r => r.json()),
        fetch('/api/admin/db/agent_memory_strategic?order=confidence.desc&limit=20').then(r => r.json()),
      ]);
      setFacts(f.data || []);
      setProcedures(p.data || []);
      setEpisodes(e.data || []);
      setStrategic(s.data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: 40, color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>Loading agent intelligence...</div>;

  const IN = '#0A0F1E';
  const IG = '#00C896';

  return (
    <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 40 }}>

      {/* What the agents know */}
      <section>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: IN, margin: '0 0 16px' }}>
          What the agents know
          <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 400, color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>{facts.length} facts learned</span>
        </h3>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {facts.length === 0 ? (
            <div style={{ padding: 24, color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>No facts learned yet - agents will build this over time.</div>
          ) : facts.map((f, i) => (
            <div key={f.id || i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < facts.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <div style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: f.confidence >= 80 ? IG : f.confidence >= 60 ? '#F59E0B' : '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>{f.confidence}%</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>conf.</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: IN, lineHeight: 1.5 }}>{f.fact}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  {f.category} · {f.evidence_count || 1}x observed · {f.agent_name || 'shared'}
                </div>
              </div>
              <div style={{ width: 60, flexShrink: 0 }}>
                <div style={{ height: 4, background: '#F3F4F6', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${f.confidence}%`, background: f.confidence >= 80 ? IG : f.confidence >= 60 ? '#F59E0B' : '#D1D5DB', borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Current best procedures */}
      <section>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: IN, margin: '0 0 16px' }}>
          Current best procedures
          <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 400, color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>{procedures.length} procedures</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {procedures.length === 0 ? (
            <div style={{ padding: 24, color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>No procedures saved yet.</div>
          ) : procedures.map((p, i) => (
            <div key={p.id || i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: IN }}>{p.procedure_name}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Inter, sans-serif', flexShrink: 0, marginLeft: 8 }}>{p.agent_name}</div>
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151', lineHeight: 1.6, background: '#F9FAFB', borderRadius: 8, padding: '10px 12px' }}>{p.current_best_version}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                Updated {p.last_updated_at ? new Date(p.last_updated_at).toLocaleDateString('en-GB') : 'recently'}
                {Array.isArray(p.previous_versions) && p.previous_versions.length > 0 && ` · ${p.previous_versions.length} previous version${p.previous_versions.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent learnings */}
      <section>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: IN, margin: '0 0 16px' }}>
          Recent learnings
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {episodes.length === 0 ? (
            <div style={{ padding: 24, color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>No episodes recorded yet.</div>
          ) : episodes.map((ep, i) => (
            <div key={ep.id || i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ep.outcome === 'positive' ? IG : ep.outcome === 'negative' ? '#EF4444' : '#9CA3AF', flexShrink: 0, marginTop: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: IN, lineHeight: 1.5 }}>{ep.summary}</div>
                {ep.lesson && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#6B7280', marginTop: 4, fontStyle: 'italic' }}>Lesson: {ep.lesson}</div>}
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  {ep.agent_name} · {ep.episode_type} · {ep.created_at ? new Date(ep.created_at).toLocaleDateString('en-GB') : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Strategic insights */}
      <section>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: IN, margin: '0 0 16px' }}>
          Strategic insights
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {strategic.length === 0 ? (
            <div style={{ padding: 24, color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>No strategic insights yet - these build up over weeks of operation.</div>
          ) : strategic.map((s, i) => (
            <div key={s.id || i} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${s.confidence >= 70 ? 'rgba(0,200,150,0.3)' : '#E5E7EB'}`, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.category}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.confidence >= 70 ? IG : '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>{s.confidence}%</span>
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: IN, lineHeight: 1.6 }}>{s.insight}</div>
              <div style={{ marginTop: 12, height: 4, background: '#F3F4F6', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${s.confidence}%`, background: s.confidence >= 70 ? IG : '#D1D5DB', borderRadius: 2 }} />
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{s.data_points || 1} data point{(s.data_points || 1) !== 1 ? 's' : ''}</div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [states, setStates] = useState<AgentStates>(defaultStates());
  const [histories, setHistories] = useState<ChatHistories>({});
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ceoExpanded, setCeoExpanded] = useState(true);
  const [toolStats, setToolStats] = useState<ToolStats>({ leadsCount: 0, pendingCopy: 0, conversationsNeedResponse: 0, lastReportDays: null });
  const [toolConnections, setToolConnections] = useState<ToolConnections>({ googlePlacesKey: "", calendlyKey: "", makeWebhookUrl: "" });
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [editingTool, setEditingTool] = useState<keyof ToolConnections | null>(null);
  const [toolInputVal, setToolInputVal] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Load from localStorage ──────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STATES_KEY);
      if (raw) setStates(JSON.parse(raw));
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem(TOOLS_KEY);
      if (raw) setToolConnections(JSON.parse(raw));
    } catch { /* ignore */ }

    const h: ChatHistories = {};
    AGENTS.forEach((a) => {
      try {
        const raw = localStorage.getItem(chatKey(a.id));
        if (raw) h[a.id] = JSON.parse(raw);
        else h[a.id] = [];
      } catch { h[a.id] = []; }
    });
    setHistories(h);

    fetchToolStats();
  }, []);

  async function fetchToolStats() {
    if (!supabaseConfigured) return;
    const [leadsRes, copyRes, convRes, reportsRes] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("copy_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "new_reply"),
      supabase.from("weekly_reports").select("created_at").order("created_at", { ascending: false }).limit(1),
    ]);
    const lastReportDays = reportsRes.data?.[0]
      ? Math.floor((Date.now() - new Date(reportsRes.data[0].created_at).getTime()) / 1000 / 60 / 60 / 24)
      : null;
    setToolStats({
      leadsCount: leadsRes.count ?? 0,
      pendingCopy: copyRes.count ?? 0,
      conversationsNeedResponse: convRes.count ?? 0,
      lastReportDays,
    });
  }

  function saveToolConnection(key: keyof ToolConnections, value: string) {
    const updated = { ...toolConnections, [key]: value };
    setToolConnections(updated);
    try { localStorage.setItem(TOOLS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    setEditingTool(null);
    setToolInputVal("");
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [histories, openAgent]);

  // ── Persist states ──────────────────────────────────────────────────────
  function persistStates(next: AgentStates) {
    setStates(next);
    try { localStorage.setItem(STATES_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function persistHistory(id: string, msgs: Message[]) {
    const next = { ...histories, [id]: msgs };
    setHistories(next);
    try { localStorage.setItem(chatKey(id), JSON.stringify(msgs)); } catch { /* ignore */ }
  }

  // ── Toggle active ────────────────────────────────────────────────────────
  function toggleAgent(id: string, val: boolean) {
    persistStates({
      ...states,
      [id]: { ...states[id], active: val, lastActivity: val ? new Date().toISOString() : states[id]?.lastActivity ?? null },
    });
  }

  function activateAll() {
    const next = { ...states };
    const now = new Date().toISOString();
    AGENTS.forEach((a) => { next[a.id] = { active: true, lastActivity: now }; });
    persistStates(next);
  }

  function pauseAll() {
    const next = { ...states };
    AGENTS.forEach((a) => { next[a.id] = { ...next[a.id], active: false }; });
    persistStates(next);
  }

  function clearAllHistory() {
    const empty: ChatHistories = {};
    AGENTS.forEach((a) => {
      empty[a.id] = [];
      try { localStorage.removeItem(chatKey(a.id)); } catch { /* ignore */ }
    });
    setHistories(empty);
  }

  // ── Send message ─────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!input.trim() || !openAgent || loading) return;
    const agent = AGENTS.find((a) => a.id === openAgent);
    if (!agent) return;

    const userMsg: Message = { role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    const current = histories[openAgent] ?? [];
    const updated = [...current, userMsg];
    persistHistory(openAgent, updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: agent.systemPrompt,
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        role: "assistant",
        content: data.content || "Sorry, I couldn't generate a response.",
        timestamp: new Date().toISOString(),
      };
      const final = [...updated, assistantMsg];
      persistHistory(openAgent, final);
      persistStates({
        ...states,
        [openAgent]: { ...states[openAgent], lastActivity: new Date().toISOString() },
      });
    } catch {
      const errorMsg: Message = {
        role: "assistant",
        content: "Network error - please try again.",
        timestamp: new Date().toISOString(),
      };
      persistHistory(openAgent, [...updated, errorMsg]);
    }
    setLoading(false);
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const activeCount = Object.values(states).filter((s) => s.active).length;

  function formatLastActivity(iso: string | null): string {
    if (!iso) return "Never activated";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000 / 60);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const openAgentObj = AGENTS.find((a) => a.id === openAgent);
  const openAgentState = openAgent ? states[openAgent] : null;
  const openHistory = openAgent ? (histories[openAgent] ?? []) : [];

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: G, borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Agent Command Centre
            </h1>
            <p className="mt-1 text-sm text-gray-500">Manage and communicate with your AI growth team</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={activateAll}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors"
              style={{ background: G }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
            >
              <Play size={14} /> Activate all
            </button>
            <button
              onClick={pauseAll}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pause size={14} /> Pause all
            </button>
            <button
              onClick={clearAllHistory}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Trash2 size={14} /> Clear history
            </button>
          </div>
        </div>

        {/* ── Tab bar ──────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-1 border-b border-gray-200">
          {[
            { id: "overview", label: "Overview" },
            { id: "intelligence", label: "Intelligence", icon: Brain },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
              style={activeTab === id
                ? { borderColor: G, color: G }
                : { borderColor: "transparent", color: "#6B7280" }
              }
            >
              {Icon && <Icon size={14} />}
              {label}
            </button>
          ))}
        </div>

        {/* ── Intelligence tab content ──────────────────────────────────── */}
        {activeTab === "intelligence" && <AgentIntelligencePanel />}

        {activeTab === "overview" && <>

        {/* ── CEO Dashboard Panel ──────────────────────────────────────── */}
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            className="flex w-full items-center justify-between px-6 py-4"
            onClick={() => setCeoExpanded(!ceoExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "rgba(0,200,150,0.1)" }}>
                <Crown size={18} style={{ color: G }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">CEO Daily Briefing</p>
                <p className="text-xs text-gray-500">Team overview and daily report</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {/* Team status */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={14} />
                <span><strong>{activeCount}</strong> of 8 agents active</span>
              </div>
              {/* This week stats */}
              <div className="hidden items-center gap-4 sm:flex">
                {[
                  { label: "Demos", value: "0" },
                  { label: "Leads", value: "0" },
                  { label: "Outreach", value: "0" },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-sm font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
              {ceoExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </button>

          {ceoExpanded && (
            <div className="border-t border-gray-100 px-6 py-5">
              {/* CEO briefing content */}
              {(histories["ceo"] ?? []).filter((m) => m.role === "assistant").length > 0 ? (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {/* Show last CEO assistant message */}
                  {[...(histories["ceo"] ?? [])].reverse().find((m) => m.role === "assistant")?.content}
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 text-center">
                  <Bot size={28} className="mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No briefing yet</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Open the CEO agent and ask for a daily report to see it here.
                  </p>
                  <button
                    onClick={() => setOpenAgent("ceo")}
                    className="mt-3 rounded-lg px-4 py-1.5 text-xs font-medium text-white"
                    style={{ background: G }}
                  >
                    Open CEO
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Agent Grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            const state = states[agent.id] ?? { active: false, lastActivity: null };
            const isOpen = openAgent === agent.id;

            return (
              <div
                key={agent.id}
                className="rounded-xl border bg-white shadow-sm transition-all duration-200"
                style={{
                  borderColor: isOpen ? G : "#E5E7EB",
                  borderWidth: isOpen ? 2 : 1,
                }}
              >
                <div className="p-5">
                  {/* Icon + status badge */}
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "rgba(0,200,150,0.1)" }}>
                      <Icon size={20} style={{ color: G }} />
                    </div>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={state.active
                        ? { background: "rgba(0,200,150,0.1)", color: G }
                        : { background: "#F3F4F6", color: "#6B7280" }
                      }
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: state.active ? G : "#9CA3AF" }} />
                      {state.active ? "Active" : "Paused"}
                    </span>
                  </div>

                  {/* Name + role */}
                  <div className="mt-3">
                    <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: N }}>
                      {agent.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{agent.role}</p>
                  </div>

                  {/* Last activity */}
                  <p className="mt-3 text-xs text-gray-400">
                    Last active: {formatLastActivity(state.lastActivity)}
                  </p>

                  {/* Tool status */}
                  {(() => {
                    const lines: { text: string; ok: boolean }[] = [];
                    if (agent.id === "prospector") lines.push({ text: supabaseConfigured ? `${toolStats.leadsCount} leads in pipeline` : "Supabase: Not connected", ok: supabaseConfigured });
                    if (agent.id === "outreach-writer") lines.push({ text: supabaseConfigured ? `Copy queue: ${toolStats.pendingCopy} pending` : "Supabase: Not connected", ok: supabaseConfigured && toolStats.pendingCopy === 0 });
                    if (agent.id === "objection-handler") lines.push({ text: supabaseConfigured ? `${toolStats.conversationsNeedResponse} need response` : "Supabase: Not connected", ok: supabaseConfigured && toolStats.conversationsNeedResponse === 0 });
                    if (agent.id === "demo-booker") lines.push({ text: toolConnections.calendlyKey ? "Calendly: Connected" : "Calendly: Not connected", ok: !!toolConnections.calendlyKey });
                    if (agent.id === "onboarder") lines.push({ text: "Email (Resend): Auto-connected", ok: true });
                    if (agent.id === "analyst") lines.push({ text: toolStats.lastReportDays === null ? "No reports yet" : `Last report: ${toolStats.lastReportDays}d ago`, ok: toolStats.lastReportDays !== null && toolStats.lastReportDays < 8 });
                    if (lines.length === 0) return null;
                    return (
                      <div className="mt-2 space-y-1">
                        {lines.map(({ text, ok }, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: ok ? G : "#F59E0B" }} />
                            <p className="text-xs text-gray-400">{text}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Toggle + Open button */}
                  <div className="mt-4 flex items-center justify-between">
                    <Toggle
                      checked={state.active}
                      onChange={(v) => toggleAgent(agent.id, v)}
                    />
                    <button
                      onClick={() => setOpenAgent(isOpen ? null : agent.id)}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                      style={isOpen
                        ? { borderColor: G, color: G, background: "rgba(0,200,150,0.06)" }
                        : { borderColor: "#E5E7EB", color: "#374151", background: "white" }
                      }
                      onMouseEnter={(e) => {
                        if (!isOpen) {
                          (e.currentTarget as HTMLElement).style.borderColor = G;
                          (e.currentTarget as HTMLElement).style.color = G;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isOpen) {
                          (e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB";
                          (e.currentTarget as HTMLElement).style.color = "#374151";
                        }
                      }}
                    >
                      {isOpen ? <><X size={12} style={{ display: "inline", marginRight: 4 }} />Close</> : "Open"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Chat Window ─────────────────────────────────────────────── */}
        {openAgent && openAgentObj && (
          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{ borderColor: G, borderWidth: 2 }}>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "rgba(0,200,150,0.1)" }}>
                  {(() => { const Icon = openAgentObj.icon; return <Icon size={18} style={{ color: G }} />; })()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16 }}>
                    {openAgentObj.name}
                  </p>
                  <p className="text-xs text-gray-500">{openAgentObj.role}</p>
                </div>
              </div>
              <button
                onClick={() => setOpenAgent(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Paused banner */}
            {!openAgentState?.active && (
              <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <Pause size={14} className="text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  This agent is paused. Activate it using the toggle above to begin working.
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="h-96 overflow-y-auto px-6 py-4" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {openHistory.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                  {(() => { const Icon = openAgentObj.icon; return <Icon size={32} className="mb-3 text-gray-200" />; })()}
                  <p className="text-sm font-medium text-gray-400">No conversation yet</p>
                  <p className="mt-1 text-xs text-gray-300">
                    {openAgentState?.active
                      ? `Send a message to start working with ${openAgentObj.name}`
                      : "Activate this agent to start chatting"}
                  </p>
                </div>
              )}

              {openHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[80%] rounded-2xl px-4 py-3 text-sm"
                    style={msg.role === "user"
                      ? { background: N, color: "#fff", borderBottomRightRadius: 4 }
                      : { background: "#F7F8FA", color: "#1F2937", borderBottomLeftRadius: 4, border: "1px solid #E5E7EB" }
                    }
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className="mt-1 text-xs opacity-50">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3" style={{ borderBottomLeftRadius: 4 }}>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: "#9CA3AF", animation: `bounce 1.2s ${i * 0.2}s infinite` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 px-4 py-3">
              <div className="flex items-end gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`Message ${openAgentObj.name}...`}
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none"
                  style={{ minHeight: 40, maxHeight: 120 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 120) + "px";
                  }}
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:opacity-40"
                  style={{ background: G }}
                  onMouseEnter={(e) => { if (!loading && input.trim()) (e.currentTarget as HTMLElement).style.background = "#00A87D"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = G; }}
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-400">Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        )}

        {/* ── Tools Section ───────────────────────────────────────────── */}
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            className="flex w-full items-center justify-between px-6 py-4"
            onClick={() => setToolsExpanded(!toolsExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "rgba(0,200,150,0.08)" }}>
                <Plug size={18} style={{ color: G }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Tools & Integrations</p>
                <p className="text-xs text-gray-500">Connect external services your agents use</p>
              </div>
            </div>
            {toolsExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {toolsExpanded && (
            <div className="border-t border-gray-100 p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    name: "Supabase",
                    description: "Lead pipeline, copy queue, conversations, reports",
                    icon: null,
                    connected: supabaseConfigured,
                    autoConnected: true,
                    key: null as keyof ToolConnections | null,
                    placeholder: "",
                  },
                  {
                    name: "Resend",
                    description: "Onboarding emails and signup notifications",
                    icon: null,
                    connected: true,
                    autoConnected: true,
                    key: null as keyof ToolConnections | null,
                    placeholder: "",
                  },
                  {
                    name: "Google Places API",
                    description: "Prospector uses this to find and score leads",
                    icon: Key,
                    connected: !!toolConnections.googlePlacesKey,
                    autoConnected: false,
                    key: "googlePlacesKey" as keyof ToolConnections,
                    placeholder: "AIza...",
                  },
                  {
                    name: "Calendly",
                    description: "Demo Booker sends this link to book calls",
                    icon: Key,
                    connected: !!toolConnections.calendlyKey,
                    autoConnected: false,
                    key: "calendlyKey" as keyof ToolConnections,
                    placeholder: "Calendly link or API key",
                  },
                  {
                    name: "Make (webhook)",
                    description: "Trigger automations when leads or demos are created",
                    icon: Webhook,
                    connected: !!toolConnections.makeWebhookUrl,
                    autoConnected: false,
                    key: "makeWebhookUrl" as keyof ToolConnections,
                    placeholder: "https://hook.make.com/...",
                  },
                ].map((tool) => {
                  const isEditing = editingTool === tool.key;
                  return (
                    <div key={tool.name} className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {tool.connected
                            ? <CircleCheckBig size={16} style={{ color: G }} />
                            : <AlertCircle size={16} className="text-amber-400" />}
                          <p className="text-sm font-semibold text-gray-900">{tool.name}</p>
                        </div>
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={tool.connected
                            ? { background: "rgba(0,200,150,0.1)", color: G }
                            : { background: "#FEF3C7", color: "#D97706" }}>
                          {tool.connected ? (tool.autoConnected ? "Auto-connected" : "Connected") : "Not connected"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500">{tool.description}</p>
                      {!tool.autoConnected && tool.key && (
                        <div className="mt-3">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input
                                value={toolInputVal}
                                onChange={(e) => setToolInputVal(e.target.value)}
                                placeholder={tool.placeholder}
                                className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
                                onFocus={(e) => { e.currentTarget.style.borderColor = G; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
                                autoFocus
                              />
                              <button onClick={() => saveToolConnection(tool.key!, toolInputVal)}
                                className="rounded-lg px-2 py-1.5 text-xs font-medium text-white" style={{ background: G }}>
                                Save
                              </button>
                              <button onClick={() => setEditingTool(null)}
                                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingTool(tool.key!); setToolInputVal(toolConnections[tool.key!] ?? ""); }}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              {tool.connected ? "Update" : "Connect"}
                            </button>
                          )}
                        </div>
                      )}
                      {tool.autoConnected && !tool.connected && (
                        <p className="mt-2 text-xs text-amber-600">Add environment variable to activate</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        </>}

      </div>

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
