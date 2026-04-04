/**
 * AES-256-GCM encryption helpers for sensitive DB fields (calendar tokens etc.)
 *
 * Requires CALENDAR_TOKEN_SECRET env var — 32-byte hex string (64 chars).
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG        = "aes-256-gcm";
const IV_BYTES   = 12;  // 96-bit IV recommended for GCM
const TAG_BYTES  = 16;

function getKey(): Buffer {
  const secret = process.env.CALENDAR_TOKEN_SECRET ?? "";
  if (secret.length !== 64) {
    // Fallback — derive 32 bytes from whatever is set (dev only)
    // In production this MUST be a 64-char hex string
    const padded = secret.padEnd(64, "0").slice(0, 64);
    return Buffer.from(padded, "hex");
  }
  return Buffer.from(secret, "hex");
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns a base64 string: iv(12) + ciphertext + authTag(16)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack: iv(12) | ciphertext | authTag(16) — IV is randomly generated per call,
  // never hardcoded, and stored alongside the ciphertext in every encrypted value.
  const packed = Buffer.concat([iv, encrypted, tag]);
  return packed.toString("base64");
}

/**
 * Decrypt a value produced by encrypt().
 * Returns null if decryption fails (bad key, tampered data).
 */
export function decrypt(ciphertext: string): string | null {
  try {
    const key    = getKey();
    const packed = Buffer.from(ciphertext, "base64");

    const iv         = packed.subarray(0, IV_BYTES);
    const tag        = packed.subarray(packed.length - TAG_BYTES);
    const encrypted  = packed.subarray(IV_BYTES, packed.length - TAG_BYTES);

    const decipher = createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
