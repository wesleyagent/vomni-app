"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const ChatWidget = dynamic(() => import("./ChatWidget"), { ssr: false });

const HIDDEN_PREFIXES = ["/admin", "/dashboard", "/onboarding", "/signup", "/demo", "/review"];

export default function LandingChatWidget() {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return <ChatWidget context="landing" />;
}
