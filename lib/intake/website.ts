import { z } from "zod";
import type { NormalizedOrder } from "@/lib/channels/types";

/**
 * Validation + mapping for the website intake payload (docs/03-channels.md). The custom site
 * POSTs this shape to /api/intake/website; we validate it with zod (→ 400 on a bad shape) and
 * map it onto the canonical NormalizedOrder (channel='website'). Totals are recomputed by
 * persistOrder, so `amounts` here is advisory — we only carry over shipping + order discount.
 */

const WebItemSchema = z.object({
  sku: z.string().trim().min(1).nullish(),
  name: z.string().trim().min(1).nullish(),
  qty: z.number().int().positive("Quantity must be at least 1"),
  unit_price: z.number().nonnegative("Unit price cannot be negative"),
  discount: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
});

const WebCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required"),
  phone: z.string().trim().min(1).nullish(),
  email: z.string().trim().email("Invalid email").nullish(),
  address_line: z.string().trim().nullish(),
  city: z.string().trim().nullish(),
  state: z.string().trim().nullish(),
  pincode: z.string().trim().nullish(),
});

const WebAmountsSchema = z
  .object({
    subtotal: z.number().nonnegative().optional(),
    discount: z.number().nonnegative().optional(),
    tax: z.number().nonnegative().optional(),
    shipping: z.number().nonnegative().optional(),
    total: z.number().nonnegative().optional(),
  })
  .optional();

export const WebsiteIntakeSchema = z.object({
  source_order_id: z.string().trim().min(1, "source_order_id is required"),
  placed_at: z.string().trim().nullish(),
  customer: WebCustomerSchema,
  items: z.array(WebItemSchema).min(1, "At least one item is required"),
  payment: z
    .object({
      type: z.enum(["prepaid", "cod", "pending"]).optional(),
      status: z.enum(["unpaid", "paid", "partially_paid", "refunded"]).optional(),
    })
    .optional(),
  amounts: WebAmountsSchema,
  notes: z.string().trim().nullish(),
});

export type WebsiteIntakeInput = z.infer<typeof WebsiteIntakeSchema>;

/** Map the validated website payload → the canonical NormalizedOrder (channel='website'). */
export function toNormalizedOrder(
  d: WebsiteIntakeInput,
  rawPayload: unknown,
): NormalizedOrder {
  return {
    channel: "website",
    source_order_id: d.source_order_id,
    customer: {
      name: d.customer.name,
      phone: d.customer.phone ?? null,
      email: d.customer.email ?? null,
      address_line: d.customer.address_line ?? null,
      city: d.customer.city ?? null,
      state: d.customer.state ?? null,
      pincode: d.customer.pincode ?? null,
    },
    items: d.items.map((it) => ({
      // The website ships SKUs/prices, not our product UUIDs. persistOrder stores the line by
      // sku/name; an unknown SKU still creates the line (product_id stays null) — flagged for
      // review rather than rejecting the whole order (Phase 4 §4.4).
      sku: it.sku ?? null,
      name: it.name ?? null,
      qty: it.qty,
      unit_price: it.unit_price,
      discount: it.discount ?? 0,
      tax: it.tax ?? 0,
    })),
    payment_type: d.payment?.type ?? "prepaid",
    payment_status: d.payment?.status ?? "unpaid",
    shipping_charge: d.amounts?.shipping ?? 0,
    discount: d.amounts?.discount ?? 0,
    notes: d.notes ?? null,
    source_payload: rawPayload,
  };
}
