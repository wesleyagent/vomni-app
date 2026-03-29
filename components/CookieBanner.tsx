"use client";
import { useState, useEffect, useRef } from "react";

const G = "#00C896";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const choice = localStorage.getItem("vomni_cookie_choice");
    if (!choice) setVisible(true);
  }, []);

  function dismiss(choice: "all" | "essential") {
    localStorage.setItem("vomni_cookie_choice", choice);
    setVisible(false);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current !== null) {
      const delta = e.changedTouches[0].clientY - touchStartY.current;
      if (delta > 50) dismiss("essential"); // swipe down to dismiss
    }
    touchStartY.current = null;
  }

  if (!visible) return null;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#fff",
        borderTop: "1px solid #E5E7EB",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.06)",
      }}
    >
      {/* Mobile: compact single bar. Desktop: flex row */}
      <style>{`
        @media (max-width: 768px) {
          .cookie-inner { padding: 10px 14px 12px !important; }
          .cookie-text  { font-size: 12px !important; }
          .cookie-btns  { gap: 8px !important; }
          .cookie-btn   { padding: 7px 14px !important; font-size: 12px !important; }
          .cookie-hint  { display: block !important; }
        }
      `}</style>

      <div
        className="cookie-inner"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "14px 20px",
          position: "relative",
        }}
      >
        {/* Dismiss X */}
        <button
          onClick={() => dismiss("essential")}
          aria-label="Dismiss cookie banner"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#F3F4F6",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9CA3AF",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          ✕
        </button>

        {/* Text */}
        <p
          className="cookie-text"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: "#374151",
            margin: 0,
            flex: 1,
            minWidth: 200,
            paddingRight: 32, // room for the X button
            lineHeight: 1.5,
          }}
        >
          We use cookies to keep you logged in and understand how the platform is used. No advertising. No data selling. Ever.{" "}
          <a href="/cookies" style={{ color: G, textDecoration: "none" }}>Learn more</a>
        </p>

        {/* Buttons */}
        <div className="cookie-btns" style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "center" }}>
          <button
            className="cookie-btn"
            onClick={() => dismiss("essential")}
            style={{
              padding: "8px 16px",
              borderRadius: 9999,
              border: "1px solid #E5E7EB",
              background: "#fff",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Essential only
          </button>
          <button
            className="cookie-btn"
            onClick={() => dismiss("all")}
            style={{
              padding: "8px 16px",
              borderRadius: 9999,
              border: "none",
              background: G,
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Accept all
          </button>
        </div>

        {/* Swipe hint — only shown on mobile */}
        <p
          className="cookie-hint"
          style={{
            display: "none",
            width: "100%",
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            color: "#9CA3AF",
            textAlign: "center",
            margin: "4px 0 0",
          }}
        >
          Swipe down to dismiss
        </p>
      </div>
    </div>
  );
}
