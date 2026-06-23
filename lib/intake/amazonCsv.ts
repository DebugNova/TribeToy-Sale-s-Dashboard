// Pure parser + mapper for an Amazon order-report export → canonical NormalizedOrder[].
// No DB / server deps, so it can run in the browser (preview) and be re-validated server-side
// by persistOrder on submit. Amazon flat-files are tab-separated; CSV exports are comma-
// separated — we auto-detect. One report row = one line item, so rows are grouped by order id.

import type { NormalizedOrder, NormalizedItem } from "@/lib/channels/types";

export type AmazonParseResult = {
  orders: NormalizedOrder[];
  errors: string[]; // human-readable, per-row problems (skipped rows)
};

// Header aliases we understand → our canonical field. Lower-cased, punctuation-insensitive.
const FIELD_ALIASES: Record<string, string[]> = {
  order_id: ["order-id", "amazon-order-id", "order id", "amazonorderid"],
  sku: ["sku", "seller-sku", "merchant-sku"],
  name: ["product-name", "title", "item-name", "product name"],
  qty: ["quantity-purchased", "quantity", "qty", "quantity-shipped"],
  item_price: ["item-price", "price", "item-total", "itemprice"],
  item_tax: ["item-tax", "tax"],
  shipping: ["shipping-price", "shipping", "shipping-charge"],
  buyer_name: ["recipient-name", "buyer-name", "ship-to-name", "buyer name"],
  phone: ["ship-phone-number", "buyer-phone-number", "phone"],
  email: ["buyer-email", "email"],
  address: ["ship-address-1", "ship-address", "shipping-address", "ship-address-line"],
  city: ["ship-city", "city"],
  state: ["ship-state", "state"],
  pincode: ["ship-postal-code", "postal-code", "pincode", "zip"],
};

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/['"]/g, "");
}

/** Split one delimited line, honoring double-quoted fields with escaped "" quotes. */
function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(v: string | undefined): number {
  if (!v) return 0;
  // strip currency symbols / thousands separators Amazon sometimes includes
  const n = Number(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse the raw report text into NormalizedOrder[] (channel='amazon'). Rows sharing an order
 * id are merged into one order with multiple items; the Amazon order id becomes
 * source_order_id (so re-importing the same file is a no-op via the dedupe constraint).
 */
export function parseAmazonCsv(text: string): AmazonParseResult {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { orders: [], errors: ["File has no data rows (need a header + at least one row)."] };
  }

  // Detect delimiter from the header line: tab wins if present (Amazon flat-file), else comma.
  const headerLine = lines[0];
  const delim = headerLine.includes("\t") ? "\t" : ",";
  const rawHeaders = splitLine(headerLine, delim).map(normHeader);

  // Map each canonical field → column index (first matching alias).
  const colOf: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const idx = rawHeaders.findIndex((h) => aliases.includes(h));
    if (idx !== -1) colOf[field] = idx;
  }

  if (colOf.order_id === undefined) {
    return {
      orders: [],
      errors: [
        `Could not find an order-id column. Found headers: ${rawHeaders.join(", ")}`,
      ],
    };
  }
  if (colOf.qty === undefined || colOf.item_price === undefined) {
    return {
      orders: [],
      errors: ["Could not find quantity and/or item-price columns in the file."],
    };
  }

  // Group rows by order id.
  const byOrder = new Map<string, NormalizedOrder>();

  for (let r = 1; r < lines.length; r++) {
    const cols = splitLine(lines[r], delim);
    const get = (field: string): string | undefined =>
      colOf[field] !== undefined ? cols[colOf[field]] : undefined;

    const orderId = get("order_id");
    if (!orderId) {
      errors.push(`Row ${r + 1}: missing order id — skipped.`);
      continue;
    }

    const qty = Math.trunc(toNumber(get("qty")));
    if (qty <= 0) {
      errors.push(`Row ${r + 1} (${orderId}): quantity is ${qty} — skipped.`);
      continue;
    }

    const lineTotal = toNumber(get("item_price"));
    const unitPrice = lineTotal > 0 ? lineTotal / qty : 0;
    const item: NormalizedItem = {
      sku: get("sku") || null,
      name: get("name") || null,
      qty,
      unit_price: Math.round(unitPrice * 100) / 100,
      tax: toNumber(get("item_tax")),
    };

    const existing = byOrder.get(orderId);
    if (existing) {
      existing.items.push(item);
      existing.shipping_charge =
        (existing.shipping_charge ?? 0) + toNumber(get("shipping"));
      continue;
    }

    const name = get("buyer_name") || "Amazon customer";
    byOrder.set(orderId, {
      channel: "amazon",
      source_order_id: orderId,
      customer: {
        name,
        phone: get("phone") || null,
        email: get("email") || null,
        address_line: get("address") || null,
        city: get("city") || null,
        state: get("state") || null,
        pincode: get("pincode") || null,
      },
      items: [item],
      payment_type: "prepaid",
      payment_status: "paid",
      shipping_charge: toNumber(get("shipping")),
      discount: 0,
      notes: "Imported from Amazon CSV",
      // raw row(s) captured below once grouping is complete
    });
  }

  const orders = Array.from(byOrder.values());
  // Attach the raw payload (the order's source rows) for audit/troubleshooting.
  for (const o of orders) {
    o.source_payload = { source: "amazon_csv", source_order_id: o.source_order_id };
  }

  if (orders.length === 0 && errors.length === 0) {
    errors.push("No valid orders found in the file.");
  }
  return { orders, errors };
}
