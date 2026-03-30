import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side admin guard. Call at the top of every /api/admin/* route.
 * Returns a 401 NextResponse if the request is not authenticated,
 * or null if it is fine to proceed.
 *
 * Authentication uses an HttpOnly cookie set by POST /api/admin/auth.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const session = req.cookies.get("admin_session")?.value;
  if (!session || session !== process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
