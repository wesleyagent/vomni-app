import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import bcrypt from "bcryptjs";
import { checkRateLimitAsync, getClientIP } from "@/lib/rate-limit";

// ── TOTP (RFC 6238) — native implementation, no external deps ──────────────

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const str = input.replace(/=+$/, "").toUpperCase();
  let bits = 0, value = 0;
  const output: number[] = [];
  for (const char of str) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateTOTP(secret: string, timeStep?: number): string {
  const step = timeStep ?? Math.floor(Date.now() / 1000 / 30);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(step / 0x100000000), 0);
  counter.writeUInt32BE(step >>> 0, 4);
  const key = base32Decode(secret);
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset]     & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) <<  8) |
     (hmac[offset + 3] & 0xff)
  ) % 1_000_000;
  return code.toString().padStart(6, "0");
}

function verifyTOTP(token: string, secret: string): boolean {
  const step = Math.floor(Date.now() / 1000 / 30);
  // Accept current step ± 1 (30-second window on each side)
  for (const delta of [-1, 0, 1]) {
    if (generateTOTP(secret, step + delta) === token) return true;
  }
  return false;
}

// ── Route handlers ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes per IP
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`admin:${ip}`, "adminLogin");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const { password, totp } = await req.json().catch(() => ({}));

  if (!password || !totp) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Support both hashed (ADMIN_PASSWORD_HASH) and legacy plaintext (ADMIN_PASSWORD)
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const legacyPlain = process.env.ADMIN_PASSWORD;

  let passwordValid = false;
  if (hash) {
    passwordValid = await bcrypt.compare(password, hash);
  } else if (legacyPlain) {
    // Fallback for migration period — log a warning
    console.warn("[admin/auth] Using plaintext ADMIN_PASSWORD — migrate to ADMIN_PASSWORD_HASH");
    passwordValid = password === legacyPlain;
  }

  if (!passwordValid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "2FA not configured" }, { status: 500 });
  }

  if (!verifyTOTP(String(totp), secret)) {
    return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 });
  }

  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret) {
    return NextResponse.json({ error: "Session secret not configured" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", sessionSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_session");
  return res;
}
