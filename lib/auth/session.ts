import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "./roles";

/**
 * Identity + profile for the current request, resolved once and shared across the
 * whole render (layout + page + nested server components) via React `cache()`.
 *
 * Why this exists: the dashboard used to call `auth.getUser()` in the middleware,
 * the layout AND `getCurrentRole()` — three network round-trips to the Auth server
 * per navigation — plus two duplicate `profiles` queries. `getClaims()` verifies the
 * access token LOCALLY (cached JWKS + WebCrypto; the project uses asymmetric ES256
 * signing keys), so there is no per-request network call, and `cache()` collapses the
 * duplicate profile reads into one.
 *
 * Trade-off (matches Supabase's recommended Next.js pattern): `getClaims()` validates
 * the JWT signature + expiry locally, so a server-side sign-out/ban is not seen until
 * the access token expires (≤ 1h). RLS still validates every query independently, so
 * data access stays correct. Use `getUser()` only where server-confirmed freshness is
 * required (e.g. write-path audit actor in `lib/audit.ts`).
 */

export type SessionClaims = { sub: string; email: string | null };

/** Verified JWT claims for the current request, or null when unauthenticated. */
export const getClaims = cache(async (): Promise<SessionClaims | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return {
    sub: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
});

export type Profile = { name: string | null; role: Role | null };

/** The current user's profile (display name + app role), deduped per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const claims = await getClaims();
  if (!claims) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", claims.sub)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});
