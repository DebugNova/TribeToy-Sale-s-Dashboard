"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActorId, logAudit } from "@/lib/audit";
import { getNextStates, STATUS_LABEL } from "./transitions";
import type { ActionResult, OrderStatus, FulfillmentState } from "@/lib/types";

type TransitionOptions = {
  /** For `returned`: true → restock (on_hand += qty), false → write off as damaged. */
  restock?: boolean;
};

// States from which a reservation is currently held (so cancelling must release it).
const RESERVED_STATES: OrderStatus[] = ["reserved", "packed", "label_generated"];

// Mirror the order's progress onto its line items (groundwork for split dispatch later).
const FULFILLMENT_MIRROR: Partial<Record<OrderStatus, FulfillmentState>> = {
  packed: "packed",
  dispatched: "shipped",
  delivered: "delivered",
  returned: "returned",
  cancelled: "cancelled",
};

function friendly(message: string): string {
  if (message.includes("INSUFFICIENT_STOCK")) {
    return "Not enough available stock to reserve every item on this order.";
  }
  return message;
}

/**
 * The one guarded transition. Validates current→to against the lifecycle map, runs the
 * inventory side-effect (which is atomic + self-audited in Postgres), updates the order
 * status + payment mirror, and writes an order.status_change audit row.
 *
 * Inventory runs *before* the status update so a stock failure (e.g. INSUFFICIENT_STOCK)
 * blocks the transition entirely rather than leaving status and stock out of sync.
 */
export async function transition(
  orderId: string,
  to: OrderStatus,
  opts: TransitionOptions = {},
): Promise<ActionResult> {
  const supabase = await createClient();
  const actorId = await getActorId(supabase);

  const { data: order, error: loadErr } = await supabase
    .from("orders")
    .select("id, status, payment_type, payment_status")
    .eq("id", orderId)
    .single();
  if (loadErr || !order) return { ok: false, error: "Order not found." };

  const from = order.status;
  if (from === to) return { ok: false, error: `Order is already ${STATUS_LABEL[to]}.` };
  if (!getNextStates(from).includes(to)) {
    return {
      ok: false,
      error: `Cannot move from ${STATUS_LABEL[from]} to ${STATUS_LABEL[to]}.`,
    };
  }

  // ---- inventory side-effects (atomic RPCs that also write inventory.* audit rows) ----
  let rpcError: string | null = null;
  if (to === "reserved") {
    const { error } = await supabase.rpc("reserve_order_inventory", {
      p_order_id: orderId,
      p_actor: actorId,
    });
    rpcError = error?.message ?? null;
  } else if (to === "dispatched") {
    const { error } = await supabase.rpc("dispatch_order_inventory", {
      p_order_id: orderId,
      p_actor: actorId,
    });
    rpcError = error?.message ?? null;
  } else if (to === "cancelled" && RESERVED_STATES.includes(from)) {
    const { error } = await supabase.rpc("release_order_inventory", {
      p_order_id: orderId,
      p_actor: actorId,
    });
    rpcError = error?.message ?? null;
  } else if (to === "returned") {
    const { error } = await supabase.rpc("return_order_inventory", {
      p_order_id: orderId,
      p_actor: actorId,
      p_restock: opts.restock ?? true,
    });
    rpcError = error?.message ?? null;
  }
  if (rpcError) return { ok: false, error: friendly(rpcError) };

  // ---- status + payment mirror ----
  const update: { status: OrderStatus; payment_status?: "paid" | "refunded" } = {
    status: to,
  };
  if (to === "payment_confirmed") update.payment_status = "paid";
  if (to === "refunded") update.payment_status = "refunded";

  const { error: upErr } = await supabase
    .from("orders")
    .update(update)
    .eq("id", orderId);
  if (upErr) return { ok: false, error: upErr.message };

  const mirror = FULFILLMENT_MIRROR[to];
  if (mirror) {
    await supabase
      .from("order_items")
      .update({ fulfillment_status: mirror })
      .eq("order_id", orderId);
  }

  await logAudit(supabase, {
    actorId,
    action: "order.status_change",
    entity: "order",
    entityId: orderId,
    before: { status: from },
    after: { status: to },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/inventory");
  return { ok: true, data: undefined };
}

// ---- convenience wrappers used by the order-detail action buttons ----
export async function validateOrder(orderId: string) {
  return transition(orderId, "validated");
}
export async function confirmPayment(orderId: string) {
  return transition(orderId, "payment_confirmed");
}
export async function approveCod(orderId: string) {
  return transition(orderId, "cod_approved");
}
export async function reserveOrder(orderId: string) {
  return transition(orderId, "reserved");
}
export async function markPacked(orderId: string) {
  return transition(orderId, "packed");
}
export async function markLabelGenerated(orderId: string) {
  return transition(orderId, "label_generated");
}
export async function dispatchOrder(orderId: string) {
  return transition(orderId, "dispatched");
}
export async function markInTransit(orderId: string) {
  return transition(orderId, "in_transit");
}
export async function markDelivered(orderId: string) {
  return transition(orderId, "delivered");
}
export async function cancelOrder(orderId: string) {
  return transition(orderId, "cancelled");
}
export async function markReturned(orderId: string, restock = true) {
  return transition(orderId, "returned", { restock });
}
export async function refundOrder(orderId: string) {
  return transition(orderId, "refunded");
}
