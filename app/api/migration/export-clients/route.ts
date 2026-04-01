import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) return NextResponse.json({ error: "Missing business_id" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("clients")
    .select("name, email, phone, notes, source, imported_at, last_visited_at, total_visits")
    .eq("business_id", businessId)
    .order("name");

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No clients found" }, { status: 404 });
  }

  // Build CSV
  const headers = ["Name", "Email", "Phone", "Notes", "Source", "Imported At", "Last Visited", "Total Visits"];
  const rows = data.map((c: {
    name: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    source: string | null;
    imported_at: string | null;
    last_visited_at: string | null;
    total_visits: number | null;
  }) => [
    `"${(c.name ?? "").replace(/"/g, '""')}"`,
    `"${(c.email ?? "").replace(/"/g, '""')}"`,
    `"${(c.phone ?? "").replace(/"/g, '""')}"`,
    `"${(c.notes ?? "").replace(/"/g, '""')}"`,
    c.source ?? "",
    c.imported_at ? new Date(c.imported_at).toLocaleDateString("en-GB") : "",
    c.last_visited_at ? new Date(c.last_visited_at).toLocaleDateString("en-GB") : "",
    String(c.total_visits ?? 0),
  ].join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vomni-clients-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
