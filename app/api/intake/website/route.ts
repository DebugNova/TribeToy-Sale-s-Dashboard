import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { persistOrder } from "@/lib/channels/persistOrder";
import { SIGNATURE_HEADER, verifySignature } from "@/lib/intake/verifySignature";
import { WebsiteIntakeSchema, toNormalizedOrder } from "@/lib/intake/website";
import { logIntakeEvent } from "@/lib/intake/log";

// Service-role admin client + node:crypto → must run on the Node runtime, never the edge,
// and never be statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = SupabaseClient<Database>;

/**
 * POST /api/intake/website — secure, signed, idempotent intake for the custom website.
 *
 * Order of operations (so an attacker / bad request never reaches the DB and an order is
 * never silently dropped):
 *   1. Verify HMAC-SHA256 of the raw body against `x-tribetoy-signature` → 401 on fail.
 *   2. Parse + zod-validate the payload → 400 on a bad shape (logged to intake_events).
 *   3. persistOrder(admin, null, …) — idempotent on (channel, source_order_id).
 *   4. Log the outcome (created | duplicate | error) and respond with a clear status.
 *
 * The website should retry on any non-2xx; duplicate retries are safe (return `duplicate`).
 */
export async function POST(req: Request) {
  // 1. Raw body (needed verbatim for signature verification).
  const rawBody = await req.text();

  // 2. Signature — flat 401 on any failure (missing/short/mismatch), leaking no detail.
  const signature = req.headers.get(SIGNATURE_HEADER);
  const secret = process.env.INTAKE_WEBHOOK_SECRET;
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json(
      { status: "error", message: "Invalid or missing signature" },
      { status: 401 },
    );
  }

  // Admin (service-role) client — bypasses RLS for an unauthenticated server-to-server call.
  // Build it lazily so a missing key doesn't turn a malformed-body 400 into a 500; logging is
  // best-effort and skipped when the client is unavailable.
  let admin: Admin | null = null;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error(
      "intake: admin client unavailable:",
      e instanceof Error ? e.message : String(e),
    );
  }

  // 3. Parse JSON.
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    if (admin) {
      await logIntakeEvent(admin, {
        channel: "website",
        status: "error",
        message: "Malformed JSON body",
        payload: rawBody.slice(0, 2000),
      });
    }
    return NextResponse.json(
      { status: "error", message: "Malformed JSON body" },
      { status: 400 },
    );
  }

  // 4. Validate the shape with zod.
  const parsed = WebsiteIntakeSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    if (admin) {
      await logIntakeEvent(admin, {
        channel: "website",
        status: "error",
        source_order_id:
          typeof json === "object" && json !== null && "source_order_id" in json
            ? String((json as { source_order_id: unknown }).source_order_id)
            : null,
        message: `Validation failed: ${message}`,
        payload: json,
      });
    }
    return NextResponse.json(
      { status: "error", message: `Validation failed: ${message}` },
      { status: 400 },
    );
  }

  const d = parsed.data;

  // Past validation we genuinely need the DB. If the service-role key isn't configured we
  // must NOT pretend success — return a clear 500 so the website retries (no silent drop).
  if (!admin) {
    return NextResponse.json(
      {
        status: "error",
        message: "Intake is not configured (SUPABASE_SERVICE_ROLE_KEY missing)",
      },
      { status: 500 },
    );
  }

  // 5. Persist (idempotent). Wrap so any unexpected throw becomes a logged 500, never a drop.
  try {
    const normalized = toNormalizedOrder(d, json);
    const result = await persistOrder(admin, null, normalized);

    if (!result.ok) {
      await logIntakeEvent(admin, {
        channel: "website",
        status: "error",
        source_order_id: d.source_order_id,
        message: result.error,
        payload: json,
      });
      return NextResponse.json(
        { status: "error", message: result.error },
        { status: 500 },
      );
    }

    await logIntakeEvent(admin, {
      channel: "website",
      status: result.duplicate ? "duplicate" : "created",
      source_order_id: d.source_order_id,
      order_no: result.order_no,
      payload: json,
    });

    return NextResponse.json(
      {
        status: result.duplicate ? "duplicate" : "created",
        order_no: result.order_no,
      },
      { status: 200 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected intake error";
    await logIntakeEvent(admin, {
      channel: "website",
      status: "error",
      source_order_id: d.source_order_id,
      message,
      payload: json,
    });
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}

// Any non-POST method → 405 (makes accidental GETs obvious rather than a confusing 404).
export function GET() {
  return NextResponse.json(
    { status: "error", message: "Method not allowed; use POST" },
    { status: 405 },
  );
}
