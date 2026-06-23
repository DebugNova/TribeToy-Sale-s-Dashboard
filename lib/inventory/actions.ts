"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActorId, logAudit } from "@/lib/audit";
import { requiredText, signedInt } from "@/lib/validation";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import type { FormState } from "@/lib/types";

// Only manual fields are adjustable here. `reserved` is owned by the order lifecycle
// (reserve/dispatch/release RPCs) and must never be hand-edited.
const ADJUSTABLE = ["on_hand", "damaged", "low_stock_threshold"] as const;
type AdjustableField = (typeof ADJUSTABLE)[number];

const AdjustSchema = z.object({
  product_id: z.uuid("Invalid product"),
  field: z.enum(ADJUSTABLE),
  delta: signedInt,
  reason: requiredText,
});

const FIELD_LABEL: Record<AdjustableField, string> = {
  on_hand: "on-hand stock",
  damaged: "damaged stock",
  low_stock_threshold: "low-stock threshold",
};

/**
 * Manually adjust a stock field by a signed delta. A reason is mandatory and recorded in
 * the audit log (inventory.adjust, with before/after). New value cannot go negative.
 */
export async function adjustStock(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = AdjustSchema.safeParse({
    product_id: formData.get("product_id"),
    field: formData.get("field"),
    delta: formData.get("delta"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { product_id, field, delta, reason } = parsed.data;

  if (delta === 0) {
    return { ok: false, message: "Enter a non-zero change." };
  }

  const supabase = await createClient();
  const actorId = await getActorId(supabase);

  const { data: inv, error: readErr } = await supabase
    .from("inventory")
    .select("on_hand, reserved, damaged, low_stock_threshold")
    .eq("product_id", product_id)
    .single();
  if (readErr || !inv) {
    return { ok: false, message: "Inventory row not found for this product." };
  }

  const current = inv[field];
  const next = current + delta;
  if (next < 0) {
    return {
      ok: false,
      message: `${FIELD_LABEL[field]} cannot go below 0 (current ${current}).`,
    };
  }

  const updates: TablesUpdate<"inventory"> = {};
  updates[field] = next;
  const { error: upErr } = await supabase
    .from("inventory")
    .update(updates)
    .eq("product_id", product_id);
  if (upErr) return { ok: false, message: upErr.message };

  await logAudit(supabase, {
    actorId,
    action: "inventory.adjust",
    entity: "inventory",
    entityId: product_id,
    before: { [field]: current },
    after: { [field]: next, delta, reason },
  });

  revalidatePath("/inventory");
  revalidatePath("/products");
  return { ok: true, message: `Updated ${FIELD_LABEL[field]} to ${next}.` };
}
