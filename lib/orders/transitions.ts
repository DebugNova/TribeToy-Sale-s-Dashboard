// Pure (no I/O) lifecycle metadata — safe to import from both server and client.
// The allowed-transition map is the single source of truth enforced in lifecycle.ts.
// See docs/04-order-lifecycle.md.

import type { OrderStatus } from "@/lib/types";

export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  created: ["validated", "cancelled"],
  validated: ["payment_confirmed", "cod_approved", "cancelled"],
  payment_confirmed: ["reserved", "cancelled"],
  cod_approved: ["reserved", "cancelled"],
  reserved: ["packed", "cancelled"],
  packed: ["label_generated", "cancelled"],
  label_generated: ["dispatched", "cancelled"],
  dispatched: ["in_transit", "returned"],
  in_transit: ["delivered", "returned"],
  delivered: ["returned"],
  returned: ["refunded"],
  refunded: [],
  cancelled: [],
};

export function getNextStates(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status] ?? [];
}

// Statuses at which an A4 shipping label may be (re)generated: `packed` and every later
// fulfillment stage. Generating before `packed` is blocked (Phase 2). Single source of
// truth for both the label action (lib/labels/pdf.ts) and the order-detail UI.
export const LABELABLE_STATES: OrderStatus[] = [
  "packed",
  "label_generated",
  "dispatched",
  "in_transit",
  "delivered",
];

export function canGenerateLabel(status: OrderStatus): boolean {
  return LABELABLE_STATES.includes(status);
}

export function isTerminal(status: OrderStatus): boolean {
  return getNextStates(status).length === 0;
}

/** Human-readable label for a status. */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  created: "Created",
  validated: "Validated",
  payment_confirmed: "Payment confirmed",
  cod_approved: "COD approved",
  reserved: "Reserved",
  packed: "Packed",
  label_generated: "Label generated",
  dispatched: "Dispatched",
  in_transit: "In transit",
  delivered: "Delivered",
  returned: "Returned",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

/** Verb shown on the action button that moves an order *into* the given status. */
export const TRANSITION_LABEL: Record<OrderStatus, string> = {
  created: "Reopen",
  validated: "Validate",
  payment_confirmed: "Confirm payment",
  cod_approved: "Approve COD",
  reserved: "Reserve stock",
  packed: "Mark packed",
  label_generated: "Generate label",
  dispatched: "Dispatch",
  in_transit: "Mark in transit",
  delivered: "Mark delivered",
  returned: "Mark returned",
  refunded: "Refund",
  cancelled: "Cancel",
};
