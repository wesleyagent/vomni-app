/**
 * Phone number utilities — normalisation, encryption, masking, fingerprinting.
 * Uses a SEPARATE key (PHONE_ENCRYPTION_KEY) from CALENDAR_TOKEN_SECRET.
 * Raw or decrypted phone numbers must never appear in logs or console output.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALG       = "aes-256-gcm";
const IV_BYTES  = 12;
const TAG_BYTES = 16;

// ── Key management ───────────────────────────────────────────────────────────

function getPhoneKey(): Buffer {
  const secret = process.env.PHONE_ENCRYPTION_KEY ?? "";
  if (secret.length !== 64) {
    // Dev fallback — must be 64-char hex string in production
    const padded = secret.padEnd(64, "0").slice(0, 64);
    return Buffer.from(padded, "hex");
  }
  return Buffer.from(secret, "hex");
}

// ── Normalisation ────────────────────────────────────────────────────────────

/**
 * Normalise any phone format to E.164.
 *
 * Israeli examples:
 *   "0521234567"  → "+972521234567"
 *   "05-21234567" → "+972521234567"
 *   "972521234567"→ "+972521234567"
 *
 * UK examples:
 *   "07911123456" → "+447911123456"
 *
 * Already E.164: unchanged.
 * Throws if the number cannot be normalised.
 */
export function normaliseToE164(raw: string, defaultCountry: "IL" | "GB" = "IL"): string {
  // Strip formatting characters (spaces, dashes, parens, dots, NBSP)
  const cleaned = raw.replace(/[\s\-().\u00A0]/g, "");

  // Already E.164
  if (cleaned.startsWith("+")) {
    if (/^\+\d{7,15}$/.test(cleaned)) return cleaned;
    throw new Error("Invalid E.164 format");
  }

  const digits = cleaned.replace(/\D/g, "");

  if (defaultCountry === "IL") {
    // 0XXXXXXXXX — 10 digits, Israeli landline or mobile
    if (/^0\d{9}$/.test(digits)) return `+972${digits.slice(1)}`;
    // 972XXXXXXXXX — 12 digits with country code, no +
    if (/^972\d{9}$/.test(digits)) return `+${digits}`;
    // XXXXXXXXX — 9 digits, no leading 0 and no country code
    if (/^\d{9}$/.test(digits)) return `+972${digits}`;
  }

  if (defaultCountry === "GB") {
    // 07XXXXXXXXX — 11 digits, UK mobile
    if (/^07\d{9}$/.test(digits)) return `+44${digits.slice(1)}`;
    // 44XXXXXXXXXX — 12 digits with country code, no +
    if (/^44\d{10}$/.test(digits)) return `+${digits}`;
    // 7XXXXXXXXX — 10 digits, UK without leading 0
    if (/^7\d{9}$/.test(digits)) return `+44${digits}`;
  }

  throw new Error(`Cannot normalise phone to E.164 (country: ${defaultCountry})`);
}

// ── Encryption ───────────────────────────────────────────────────────────────

/**
 * Encrypt an E.164 phone number using AES-256-GCM.
 * Returns base64: iv(12) | ciphertext | authTag(16)
 */
export function encryptPhone(e164: string): string {
  const key     = getPhoneKey();
  const iv      = randomBytes(IV_BYTES);
  const cipher  = createCipheriv(ALG, key, iv);
  const enc     = Buffer.concat([cipher.update(e164, "utf8"), cipher.final()]);
  const tag     = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64");
}

/**
 * Decrypt a value produced by encryptPhone().
 * For use with Twilio only — never log the result.
 */
export function decryptPhone(encrypted: string): string {
  const key    = getPhoneKey();
  const packed = Buffer.from(encrypted, "base64");
  const iv     = packed.subarray(0, IV_BYTES);
  const tag    = packed.subarray(packed.length - TAG_BYTES);
  const data   = packed.subarray(IV_BYTES, packed.length - TAG_BYTES);
  const dec    = createDecipheriv(ALG, key, iv);
  dec.setAuthTag(tag);
  return Buffer.concat([dec.update(data), dec.final()]).toString("utf8");
}

// ── Masking ──────────────────────────────────────────────────────────────────

/**
 * Mask a phone number for display — last 3 digits visible only.
 * "+972521234567" → "+972 *** *** 567"
 */
export function maskPhone(e164: string): string {
  if (e164.length < 3) return "***";
  const last3 = e164.slice(-3);
  if (e164.startsWith("+972")) return `+972 *** *** ${last3}`;
  if (e164.startsWith("+44"))  return `+44 *** *** ${last3}`;
  return `+*** *** *** ${last3}`;
}

// ── Validation ───────────────────────────────────────────────────────────────

/** Validate E.164 format. */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

// ── Fingerprinting ───────────────────────────────────────────────────────────

/**
 * SHA-256 fingerprint for deduplication.
 * Deterministic — same phone + same businessId → same fingerprint.
 * Safe to store in DB (not reversible to phone).
 */
export function fingerprintPhone(e164: string, businessId: string): string {
  return createHash("sha256")
    .update(`${e164}:${businessId}`)
    .digest("hex");
}
