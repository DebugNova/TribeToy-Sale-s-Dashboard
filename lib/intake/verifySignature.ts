import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Header the website must send: hex HMAC-SHA256 of the *raw* request body, keyed with
 * INTAKE_WEBHOOK_SECRET. Verified timing-safe in app/api/intake/website/route.ts.
 */
export const SIGNATURE_HEADER = "x-tribetoy-signature";

/** Compute the expected signature for a raw body (hex HMAC-SHA256). Exposed for docs/tests. */
export function signBody(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

/**
 * Timing-safe verification of `x-tribetoy-signature` over the raw body.
 *
 * Returns false (never throws) on a missing/short/malformed signature, a length mismatch,
 * or any value mismatch — the caller maps every false to a flat 401 so an attacker learns
 * nothing about *why* it failed. The secret must be configured server-side.
 */
export function verifySignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  if (!signature) return false;

  const expected = signBody(rawBody, secret);

  // timingSafeEqual requires equal-length buffers; bail (constant work already done) if not.
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
