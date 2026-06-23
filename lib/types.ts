// Shared domain type aliases derived from the generated Supabase types, plus the standard
// result shape returned by every lib/ business-logic function (so UI can branch on ok/error).

import type { Enums, Tables } from "@/lib/supabase/database.types";

export type OrderStatus = Enums<"order_status">;
export type OrderChannel = Enums<"order_channel">;
export type PaymentType = Enums<"payment_type">;
export type PaymentStatus = Enums<"payment_status">;
export type CustomerType = Enums<"customer_type">;
export type FulfillmentState = Enums<"fulfillment_state">;
export type CourierType = Enums<"courier_type">;

export type Product = Tables<"products">;
export type Customer = Tables<"customers">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type Inventory = Tables<"inventory">;
export type InventoryAvailable = Tables<"inventory_available">;
export type AuditLog = Tables<"audit_logs">;

/** Discriminated result every server action returns. Never throw across the UI boundary. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Shape used by forms wired to `useActionState`. */
export type FormState = { ok: boolean; message: string };
