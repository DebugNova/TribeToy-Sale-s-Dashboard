"use server";

import { createClient } from "@/lib/supabase/server";
import { getActorId, logAudit } from "@/lib/audit";

// Keys for the masked fields the UI may reveal. Each maps to a concrete
// (entity, column) so the client never names a raw table/column.
export type RevealKey =
  | "customer.phone"
  | "order.ship_phone"
  | "payment.txn_ref"
  | "payment.settlement_ref";

/**
 * Fetch the full value of a masked sensitive field and write a `sensitive.reveal`
 * audit row (who revealed what, when). Reads go through the caller's RLS-bound
 * client, so a role that can't see the row gets nothing. Returns the value (or null).
 */
export async function revealSensitive(
  key: RevealKey,
  id: string,
): Promise<string | null> {
  const supabase = await createClient();
  const actorId = await getActorId(supabase);

  let value: string | null = null;
  let entity: string;
  let field: string;

  switch (key) {
    case "customer.phone": {
      entity = "customer";
      field = "phone";
      const { data } = await supabase
        .from("customers")
        .select("phone")
        .eq("id", id)
        .maybeSingle();
      value = data?.phone ?? null;
      break;
    }
    case "order.ship_phone": {
      entity = "order";
      field = "ship_phone";
      const { data } = await supabase
        .from("orders")
        .select("ship_phone")
        .eq("id", id)
        .maybeSingle();
      value = data?.ship_phone ?? null;
      break;
    }
    case "payment.txn_ref": {
      entity = "payment";
      field = "txn_ref";
      const { data } = await supabase
        .from("payments")
        .select("txn_ref")
        .eq("id", id)
        .maybeSingle();
      value = data?.txn_ref ?? null;
      break;
    }
    case "payment.settlement_ref": {
      entity = "payment";
      field = "settlement_ref";
      const { data } = await supabase
        .from("payments")
        .select("settlement_ref")
        .eq("id", id)
        .maybeSingle();
      value = data?.settlement_ref ?? null;
      break;
    }
    default: {
      // Exhaustiveness guard — unknown keys are rejected, never queried.
      throw new Error(`Unknown reveal key: ${key as string}`);
    }
  }

  await logAudit(supabase, {
    actorId,
    action: "sensitive.reveal",
    entity,
    entityId: id,
    after: { field },
  });

  return value;
}
