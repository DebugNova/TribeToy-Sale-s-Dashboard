// The shared persistence core every order source funnels through. Validates → resolves
// customer → computes totals → inserts orders (status `created`) + order_items → audits.
//
// It is deliberately *not* a "use server" action and takes the Supabase client + actor id
// as parameters, so two very different callers can reuse the exact same logic + guards:
//   - the manual order form  → cookie-bound client + the founder's id (lib/channels/normalizeOrder)
//   - the website intake API → service-role admin client + null actor (app/api/intake/website)
//
// Inventory is reserved later, at the `reserved` lifecycle transition (lib/orders/lifecycle.ts).

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Constants, type Database, type Json } from "@/lib/supabase/database.types";
import { logAudit } from "@/lib/audit";
import { round2 } from "@/lib/money";
import type { NormalizedCustomer, NormalizedOrder, CreateOrderResult } from "./types";

type DB = SupabaseClient<Database>;

const ItemSchema = z.object({
  product_id: z.uuid().nullish(),
  sku: z.string().trim().nullish(),
  name: z.string().trim().nullish(),
  qty: z.number().int().positive("Quantity must be at least 1"),
  unit_price: z.number().nonnegative("Unit price cannot be negative"),
  discount: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
});

const CustomerSchema = z.object({
  id: z.uuid().nullish(),
  name: z.string().trim().min(1, "Customer name is required"),
  phone: z.string().trim().nullish(),
  email: z.string().trim().nullish(),
  type: z.enum(Constants.public.Enums.customer_type).optional(),
  gstin: z.string().trim().nullish(),
  address_line: z.string().trim().nullish(),
  city: z.string().trim().nullish(),
  state: z.string().trim().nullish(),
  pincode: z.string().trim().nullish(),
});

const OrderSchema = z.object({
  channel: z.enum(Constants.public.Enums.order_channel),
  source_order_id: z.string().trim().nullish(),
  customer: CustomerSchema,
  items: z.array(ItemSchema).min(1, "Add at least one item"),
  payment_type: z.enum(Constants.public.Enums.payment_type),
  payment_status: z.enum(Constants.public.Enums.payment_status).optional(),
  shipping_charge: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  notes: z.string().trim().nullish(),
  source_payload: z.unknown().optional(),
});

/** Find a customer by id, else by phone, else by email, else create a new one. */
async function findOrCreateCustomer(
  supabase: DB,
  c: NormalizedCustomer,
  actorId: string | null,
): Promise<string> {
  if (c.id) return c.id;

  if (c.phone) {
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", c.phone)
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }
  if (c.email) {
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("email", c.email)
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      name: c.name,
      phone: c.phone ?? null,
      email: c.email ?? null,
      type: c.type ?? "b2c",
      gstin: c.gstin ?? null,
      address_line: c.address_line ?? null,
      city: c.city ?? null,
      state: c.state ?? null,
      pincode: c.pincode ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not save customer: ${error.message}`);

  await logAudit(supabase, {
    actorId,
    action: "customer.create",
    entity: "customer",
    entityId: created.id,
    after: { name: c.name, phone: c.phone ?? null, email: c.email ?? null },
  });
  return created.id;
}

/**
 * Persist a NormalizedOrder. Idempotent on (channel, source_order_id): a duplicate import
 * returns the existing order flagged `duplicate` instead of creating a second one.
 * (source_order_id is null for manual orders, which Postgres treats as distinct — so manual
 * orders never falsely dedupe.)
 *
 * Never throws across the boundary: every failure becomes `{ ok: false, error }` so callers
 * (UI + intake API) can branch and log cleanly.
 */
export async function persistOrder(
  supabase: DB,
  actorId: string | null,
  input: NormalizedOrder,
): Promise<CreateOrderResult> {
  const parsed = OrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order" };
  }
  const d = parsed.data;

  let customerId: string;
  try {
    customerId = await findOrCreateCustomer(supabase, d.customer, actorId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Customer error" };
  }

  // ---- line + order totals (all rounded to 2dp; INR numeric(12,2)) ----
  let subtotal = 0;
  let taxTotal = 0;
  let itemDiscountTotal = 0;
  const itemRows = d.items.map((it) => {
    const gross = round2(it.qty * it.unit_price);
    const disc = round2(it.discount ?? 0);
    const tax = round2(it.tax ?? 0);
    const line_total = round2(gross - disc + tax);
    subtotal = round2(subtotal + gross);
    taxTotal = round2(taxTotal + tax);
    itemDiscountTotal = round2(itemDiscountTotal + disc);
    return {
      product_id: it.product_id ?? null,
      sku: it.sku ?? null,
      name: it.name ?? null,
      qty: it.qty,
      unit_price: round2(it.unit_price),
      discount: disc,
      tax,
      line_total,
    };
  });
  const orderDiscount = round2(d.discount ?? 0);
  const discountTotal = round2(orderDiscount + itemDiscountTotal);
  const shipping = round2(d.shipping_charge ?? 0);
  const total = round2(subtotal - discountTotal + taxTotal + shipping);

  const sourceOrderId = d.source_order_id || null;

  // order_no is filled by the set_order_no trigger when inserted blank.
  const { data: orderRow, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_no: "",
      channel: d.channel,
      source_order_id: sourceOrderId,
      customer_id: customerId,
      ship_name: d.customer.name,
      ship_phone: d.customer.phone ?? null,
      ship_address: d.customer.address_line ?? null,
      ship_city: d.customer.city ?? null,
      ship_state: d.customer.state ?? null,
      ship_pincode: d.customer.pincode ?? null,
      status: "created",
      payment_type: d.payment_type,
      payment_status: d.payment_status ?? "unpaid",
      subtotal,
      discount: discountTotal,
      tax: taxTotal,
      shipping_charge: shipping,
      total,
      notes: d.notes ?? null,
      source_payload: (input.source_payload ?? input) as Json,
    })
    .select("id, order_no")
    .single();

  if (orderErr) {
    // Unique (channel, source_order_id) violation → return the existing order (dedupe).
    if (orderErr.code === "23505" && sourceOrderId) {
      const { data: existing } = await supabase
        .from("orders")
        .select("id, order_no")
        .eq("channel", d.channel)
        .eq("source_order_id", sourceOrderId)
        .maybeSingle();
      if (existing) {
        return {
          ok: true,
          order_id: existing.id,
          order_no: existing.order_no,
          duplicate: true,
        };
      }
    }
    return { ok: false, error: orderErr.message };
  }

  const { error: itemsErr } = await supabase.from("order_items").insert(
    itemRows.map((r) => ({ ...r, order_id: orderRow.id })),
  );
  if (itemsErr) {
    // avoid an order with no lines
    await supabase.from("orders").delete().eq("id", orderRow.id);
    return { ok: false, error: `Could not save items: ${itemsErr.message}` };
  }

  await logAudit(supabase, {
    actorId,
    action: "order.create",
    entity: "order",
    entityId: orderRow.id,
    after: {
      order_no: orderRow.order_no,
      channel: d.channel,
      source_order_id: sourceOrderId,
      total,
    },
  });

  return {
    ok: true,
    order_id: orderRow.id,
    order_no: orderRow.order_no,
    duplicate: false,
  };
}
