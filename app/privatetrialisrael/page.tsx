"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PrivateTrialPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/signup?trial=privatetrialisrael");
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F8FA" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E5E7EB", borderTopColor: "#00C896", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
