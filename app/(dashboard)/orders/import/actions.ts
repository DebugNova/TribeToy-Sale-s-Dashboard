"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActorId } from "@/lib/audit";
import { persistOrder } from "@/lib/channels/persistOrder";
import { logIntakeEvent } from "@/lib/intake/log";
import type { NormalizedOrder } from "@/lib/channels/types";

export type ImportRowResult = {
  source_order_id: string | null;
  status: "created" | "duplicate" | "error";
  order_no?: string;
  message?: string;
};

export type ImportSummary = {
  created: number;
  duplicate: number;
  error: number;
  rows: ImportRowResult[];
};

/**
 * Bulk-create Amazon CSV orders through the same persistOrder funnel + dedupe as the website
 * intake (so re-importing a file is safe). Runs as the authenticated founder (cookie client);
 * each outcome is also best-effort logged to intake_events via the admin client for the
 * Settings → intake activity panel.
 */
export async function importAmazonOrders(
  orders: NormalizedOrder[],
): Promise<ImportSummary> {
  const supabase = await createClient();
  const actorId = await getActorId(supabase);

  // Admin client is only for the observability log; never block the import if it's missing.
  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const rows: ImportRowResult[] = [];
  let created = 0;
  let duplicate = 0;
  let error = 0;

  for (const order of orders) {
    // Force the channel server-side — never trust the client to set it to something else.
    const normalized: NormalizedOrder = { ...order, channel: "amazon" };
    const result = await persistOrder(supabase, actorId, normalized);

    if (!result.ok) {
      error++;
      rows.push({
        source_order_id: normalized.source_order_id ?? null,
        status: "error",
        message: result.error,
      });
      if (admin) {
        await logIntakeEvent(admin, {
          channel: "amazon",
          status: "error",
          source_order_id: normalized.source_order_id,
          message: result.error,
        });
      }
      continue;
    }

    if (result.duplicate) duplicate++;
    else created++;
    rows.push({
      source_order_id: normalized.source_order_id ?? null,
      status: result.duplicate ? "duplicate" : "created",
      order_no: result.order_no,
    });
    if (admin) {
      await logIntakeEvent(admin, {
        channel: "amazon",
        status: result.duplicate ? "duplicate" : "created",
        source_order_id: normalized.source_order_id,
        order_no: result.order_no,
      });
    }
  }

  if (created > 0) revalidatePath("/orders");
  return { created, duplicate, error, rows };
}
