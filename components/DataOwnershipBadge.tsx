import Link from "next/link";

const G = "#00C896";

export default function DataOwnershipBadge() {
  return (
    <Link
      href="/data-ownership"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 9999,
        background: "#F0FDF9", border: "1px solid #A7F3D0",
        textDecoration: "none", fontSize: 12, fontWeight: 600, color: G,
        fontFamily: "Inter, sans-serif",
      }}
    >
      🔒 Your data is never sold or shared
    </Link>
  );
}
