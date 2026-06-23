import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;
type OrderChannel = Database["public"]["Enums"]["order_channel"];

export type IntakeEventStatus = "created" | "duplicate" | "error";

type IntakeEventInput = {
  channel: OrderChannel;
  status: IntakeEventStatus;
  source_order_id?: string | null;
  order_no?: string | null;
  message?: string | null;
  payload?: unknown;
};

/**
 * Append an observability row to intake_events (Settings → intake activity). Inserts via the
 * service-role client (RLS has no insert policy by design). Best-effort: a logging failure is
 * console-warned but never bubbles up, so it can't turn a clean 4xx into a 500 or drop an order.
 */
export async function logIntakeEvent(
  supabase: DB,
  input: IntakeEventInput,
): Promise<void> {
  try {
    const { error } = await supabase.from("intake_events").insert({
      channel: input.channel,
      status: input.status,
      source_order_id: input.source_order_id ?? null,
      order_no: input.order_no ?? null,
      message: input.message ?? null,
      payload: (input.payload ?? null) as Json,
    });
    if (error) {
      console.error("intake_events insert failed:", error.message, input.status);
    }
  } catch (e) {
    console.error(
      "intake_events insert threw:",
      e instanceof Error ? e.message : String(e),
    );
  }
}
