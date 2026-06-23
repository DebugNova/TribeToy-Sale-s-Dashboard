"use server";

import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActorId, logAudit } from "@/lib/audit";
import { transition } from "@/lib/orders/lifecycle";
import { STATUS_LABEL, canGenerateLabel } from "@/lib/orders/transitions";
import { formatDate } from "@/lib/format";
import { makeQrDataUrl } from "./qr";
import { LabelDocument, type LabelItem } from "./label";
import { COURIER_LABEL, DEFAULT_LABEL_TEMPLATE } from "./courier";
import type { ActionResult, CourierType } from "@/lib/types";

const BUCKET = "labels";

export type GenerateLabelInput = {
  courier?: CourierType;
  awb?: string | null;
  dispatchDate?: string | null; // YYYY-MM-DD
};

export type GenerateLabelData = {
  shipmentId: string;
  path: string;
  version: number;
  signedUrl: string | null;
  reprint: boolean;
};

/**
 * Generate (or reprint) the A4 PDF shipping label for an order.
 *
 *  1. Load order + items + settings; guard that the order is `packed` or beyond.
 *  2. Resolve the one shipment row for the order (insert on first generation; the
 *     reprint path bumps a version number so prior PDFs are retained as history).
 *  3. Build the QR (order_no, plus AWB once recorded) and render the PDF to a buffer.
 *  4. Upload to the private `labels` bucket at {order_no}/{shipment_id}-v{n}.pdf and store
 *     the path in shipments.label_pdf_url.
 *  5. Transition `packed` → `label_generated` (no-op on a reprint of an already-advanced order).
 *  6. Write a shipment.label_generated / shipment.reprint audit row.
 *
 * Returns the storage path + a fresh signed URL for immediate download/print.
 */
export async function generateLabel(
  orderId: string,
  input: GenerateLabelInput = {},
): Promise<ActionResult<GenerateLabelData>> {
  const supabase = await createClient();
  const actorId = await getActorId(supabase);

  // ---- 1. load order + guard ----
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr || !order) return { ok: false, error: "Order not found." };

  if (!canGenerateLabel(order.status)) {
    return {
      ok: false,
      error: `Order must be packed before a label can be generated (currently ${STATUS_LABEL[order.status]}).`,
    };
  }

  const [{ data: items }, { data: settings }, { data: existingShipment }] =
    await Promise.all([
      supabase.from("order_items").select("*").eq("order_id", orderId),
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase
        .from("shipments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!settings) return { ok: false, error: "Sender settings are not configured." };

  const orderItems = items ?? [];

  // ---- total weight from product weights (order_items don't store weight) ----
  const productIds = [
    ...new Set(orderItems.map((it) => it.product_id).filter(Boolean) as string[]),
  ];
  const weightById = new Map<string, number | null>();
  if (productIds.length) {
    const { data: products } = await supabase
      .from("products")
      .select("id, weight_g")
      .in("id", productIds);
    for (const p of products ?? []) weightById.set(p.id, p.weight_g);
  }
  let totalWeightG = 0;
  let haveWeight = false;
  for (const it of orderItems) {
    const w = it.product_id ? weightById.get(it.product_id) : null;
    if (w != null) {
      totalWeightG += w * it.qty;
      haveWeight = true;
    }
  }
  const weight = haveWeight ? `${totalWeightG} g` : null;

  // ---- 2. resolve shipment (insert on first generation, version on reprint) ----
  const reprint = !!existingShipment;
  const courier: CourierType =
    input.courier ?? existingShipment?.courier ?? settings.default_courier;
  const awb =
    (input.awb?.trim() || null) ?? existingShipment?.awb ?? null;
  const dispatchDate =
    input.dispatchDate || existingShipment?.dispatch_date || null;

  let shipmentId: string;
  let version: number;
  if (existingShipment) {
    shipmentId = existingShipment.id;
    const { count } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("entity", "shipment")
      .eq("entity_id", shipmentId)
      .in("action", ["shipment.label_generated", "shipment.reprint"]);
    version = (count ?? 1) + 1;
  } else {
    shipmentId = crypto.randomUUID();
    version = 1;
  }

  const path = `${order.order_no}/${shipmentId}-v${version}.pdf`;

  // ---- 3. QR + render PDF ----
  const qrText = awb ? `${order.order_no} ${awb}` : order.order_no;
  const qrDataUrl = await makeQrDataUrl(qrText);

  const labelItems: LabelItem[] = orderItems.map((it) => ({
    sku: it.sku,
    name: it.name,
    qty: it.qty,
  }));

  // @react-pdf's renderToBuffer is typed for a <Document> element; our LabelDocument wraps
  // one but its props don't overlap DocumentProps, so cast the component element through.
  const labelElement = createElement(LabelDocument, {
    sender: {
      name: settings.sender_name,
      address: settings.sender_address,
      city: settings.sender_city,
      state: settings.sender_state,
      pincode: settings.sender_pincode,
      phone: settings.sender_phone,
    },
    recipient: {
      name: order.ship_name ?? "—",
      address: order.ship_address,
      city: order.ship_city,
      state: order.ship_state,
      pincode: order.ship_pincode,
      phone: order.ship_phone,
    },
    orderNo: order.order_no,
    courierLabel: COURIER_LABEL[courier],
    awb,
    items: labelItems,
    weight,
    dispatchDate: dispatchDate ? formatDate(dispatchDate) : null,
    qrDataUrl,
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(labelElement);
  } catch (e) {
    return {
      ok: false,
      error: `Could not render the label PDF: ${e instanceof Error ? e.message : "unknown error"}`,
    };
  }

  // ---- 4. upload + persist shipment ----
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadErr) {
    return { ok: false, error: `Could not upload the label: ${uploadErr.message}` };
  }

  if (existingShipment) {
    const { error: upErr } = await supabase
      .from("shipments")
      .update({ label_pdf_url: path, courier, awb, dispatch_date: dispatchDate })
      .eq("id", shipmentId);
    if (upErr) return { ok: false, error: upErr.message };
  } else {
    const { error: insErr } = await supabase.from("shipments").insert({
      id: shipmentId,
      order_id: orderId,
      courier,
      label_template: DEFAULT_LABEL_TEMPLATE,
      created_by: actorId,
      awb,
      dispatch_date: dispatchDate,
      label_pdf_url: path,
    });
    if (insErr) return { ok: false, error: insErr.message };
  }

  // ---- 5. advance the order (packed -> label_generated); no-op once already advanced ----
  if (order.status === "packed") {
    const res = await transition(orderId, "label_generated");
    if (!res.ok) return { ok: false, error: res.error };
  }

  // ---- 6. audit ----
  await logAudit(supabase, {
    actorId,
    action: reprint ? "shipment.reprint" : "shipment.label_generated",
    entity: "shipment",
    entityId: shipmentId,
    after: { order_no: order.order_no, courier, awb, version, path },
  });

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/shipments");
  return {
    ok: true,
    data: { shipmentId, path, version, signedUrl: signed?.signedUrl ?? null, reprint },
  };
}

/** Fresh 1-hour signed URL for a shipment's current label PDF (download / print). */
export async function getLabelSignedUrl(
  shipmentId: string,
): Promise<ActionResult<string>> {
  const supabase = await createClient();
  await getActorId(supabase); // ensure authenticated

  const { data: shipment, error } = await supabase
    .from("shipments")
    .select("label_pdf_url")
    .eq("id", shipmentId)
    .maybeSingle();
  if (error || !shipment) return { ok: false, error: "Shipment not found." };
  if (!shipment.label_pdf_url) {
    return { ok: false, error: "No label has been generated for this shipment yet." };
  }

  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(shipment.label_pdf_url, 3600);
  if (signErr || !data) {
    return { ok: false, error: signErr?.message ?? "Could not create a download link." };
  }
  return { ok: true, data: data.signedUrl };
}

/** Add or correct the AWB / dispatch date on a shipment after the label was generated. */
export async function updateShipmentAwb(
  shipmentId: string,
  awb: string | null,
  dispatchDate?: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const actorId = await getActorId(supabase);

  const { data: before, error: loadErr } = await supabase
    .from("shipments")
    .select("id, order_id, awb, dispatch_date")
    .eq("id", shipmentId)
    .maybeSingle();
  if (loadErr || !before) return { ok: false, error: "Shipment not found." };

  const nextAwb = awb?.trim() || null;
  const update: { awb: string | null; dispatch_date?: string | null } = { awb: nextAwb };
  if (dispatchDate !== undefined) update.dispatch_date = dispatchDate || null;

  const { error } = await supabase.from("shipments").update(update).eq("id", shipmentId);
  if (error) return { ok: false, error: error.message };

  await logAudit(supabase, {
    actorId,
    action: "shipment.awb_update",
    entity: "shipment",
    entityId: shipmentId,
    before: { awb: before.awb, dispatch_date: before.dispatch_date },
    after: { awb: nextAwb, dispatch_date: update.dispatch_date ?? before.dispatch_date },
  });

  revalidatePath(`/orders/${before.order_id}`);
  revalidatePath("/shipments");
  return { ok: true, data: undefined };
}
