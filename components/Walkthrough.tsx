"use client";

/**
 * Lightweight tooltip-based platform walkthrough.
 * No external libraries — built natively.
 *
 * Usage:
 *   1. Wrap dashboard in <WalkthroughProvider steps={STEPS} />
 *   2. Add data-walkthrough="step-id" to target elements
 *   3. Call startWalkthrough() from context
 *
 * Steps are defined per-page and passed as props.
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

const G = "#00C896";
const N = "#0A0F1E";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WalkthroughStep {
  id:       string;   // matches data-walkthrough="id" on target element
  title:    string;
  body:     string;
  position: "top" | "bottom" | "left" | "right";
  cta?:     string;   // optional CTA button label
  onCta?:   () => void;
}

interface WalkthroughCtx {
  active:          boolean;
  currentStep:     number;
  steps:           WalkthroughStep[];
  startWalkthrough: () => void;
  next:             () => void;
  back:             () => void;
  skip:             () => void;
}

const Ctx = createContext<WalkthroughCtx | null>(null);

export function useWalkthrough() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWalkthrough must be used inside WalkthroughProvider");
  return ctx;
}

// ── Tooltip positioning ───────────────────────────────────────────────────────

function getTooltipStyle(
  targetRect: DOMRect,
  position: WalkthroughStep["position"],
  tooltipWidth: number,
): React.CSSProperties {
  const gap    = 12;
  const scroll = { x: window.scrollX, y: window.scrollY };

  switch (position) {
    case "bottom": return {
      top:  targetRect.bottom + scroll.y + gap,
      left: targetRect.left  + scroll.x + targetRect.width / 2 - tooltipWidth / 2,
    };
    case "top": return {
      top:  targetRect.top   + scroll.y - gap,
      left: targetRect.left  + scroll.x + targetRect.width / 2 - tooltipWidth / 2,
      transform: "translateY(-100%)",
    };
    case "right": return {
      top:  targetRect.top   + scroll.y + targetRect.height / 2,
      left: targetRect.right + scroll.x + gap,
      transform: "translateY(-50%)",
    };
    case "left": return {
      top:  targetRect.top  + scroll.y + targetRect.height / 2,
      left: targetRect.left + scroll.x - tooltipWidth - gap,
      transform: "translateY(-50%)",
    };
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface Props {
  steps:      WalkthroughStep[];
  children:   React.ReactNode;
  onComplete?: () => void;  // called when walkthrough finishes
}

export function WalkthroughProvider({ steps, children, onComplete }: Props) {
  const [active, setActive]         = useState(false);
  const [current, setCurrent]       = useState(0);
  const [tooltipPos, setTooltipPos] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const TOOLTIP_W  = 300;

  const positionTooltip = useCallback(() => {
    if (!active || !steps[current]) return;
    const step   = steps[current];
    const target = document.querySelector(`[data-walkthrough="${step.id}"]`);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const rect = target.getBoundingClientRect();
    setTooltipPos(getTooltipStyle(rect, step.position, TOOLTIP_W));
  }, [active, current, steps]);

  useEffect(() => {
    if (!active) return;
    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip);
    };
  }, [active, positionTooltip]);

  const startWalkthrough = useCallback(() => { setCurrent(0); setActive(true); }, []);

  const finish = useCallback(() => {
    setActive(false);
    onComplete?.();
  }, [onComplete]);

  const next = useCallback(() => {
    if (current >= steps.length - 1) { finish(); }
    else setCurrent(c => c + 1);
  }, [current, steps.length, finish]);

  const back = useCallback(() => {
    setCurrent(c => Math.max(0, c - 1));
  }, []);

  const skip = useCallback(() => finish(), [finish]);

  const step = steps[current];

  // Highlight target element
  useEffect(() => {
    if (!active || !step) return;
    const el = document.querySelector<HTMLElement>(`[data-walkthrough="${step.id}"]`);
    if (!el) return;
    const prev = el.style.position;
    el.style.position = "relative";
    el.style.zIndex   = "10001";
    el.style.boxShadow = `0 0 0 4px ${G}, 0 0 0 8px rgba(0,200,150,0.2)`;
    el.style.borderRadius = "8px";
    return () => {
      el.style.position  = prev;
      el.style.zIndex    = "";
      el.style.boxShadow = "";
      el.style.borderRadius = "";
    };
  }, [active, step]);

  return (
    <Ctx.Provider value={{ active, currentStep: current, steps, startWalkthrough, next, back, skip }}>
      {children}

      {active && step && (
        <>
          {/* Dimmed overlay */}
          <div
            onClick={skip}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(10,15,30,0.55)",
              zIndex: 10000,
              cursor: "pointer",
            }}
          />

          {/* Tooltip */}
          <div
            ref={tooltipRef}
            style={{
              position:   "absolute",
              width:       TOOLTIP_W,
              background:  "#fff",
              borderRadius: 16,
              padding:      "20px 20px 16px",
              boxShadow:    "0 8px 40px rgba(0,0,0,0.2)",
              zIndex:       10002,
              ...tooltipPos,
            }}
          >
            {/* Progress dots */}
            <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
              {steps.map((_, i) => (
                <div key={i} style={{
                  width:        i === current ? 20 : 6,
                  height:       6,
                  borderRadius: 3,
                  background:   i === current ? G : "#E5E7EB",
                  transition:   "all 0.25s ease",
                }} />
              ))}
            </div>

            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: N, margin: "0 0 6px" }}>
              {step.title}
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: "0 0 16px", lineHeight: 1.6 }}>
              {step.body}
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={skip} style={{ background: "none", border: "none", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", cursor: "pointer", padding: 0 }}>
                Skip tour
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                {current > 0 && (
                  <button onClick={back} style={{ padding: "8px 16px", borderRadius: 9999, border: "1px solid #E5E7EB", background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: N, cursor: "pointer" }}>
                    ← Back
                  </button>
                )}
                {step.cta && step.onCta ? (
                  <button onClick={step.onCta} style={{ padding: "8px 16px", borderRadius: 9999, background: G, border: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                    {step.cta}
                  </button>
                ) : (
                  <button onClick={next} style={{ padding: "8px 16px", borderRadius: 9999, background: G, border: "none", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                    {current === steps.length - 1 ? "Done ✓" : "Next →"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </Ctx.Provider>
  );
}
