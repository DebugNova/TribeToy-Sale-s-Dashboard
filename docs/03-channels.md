# 03 — Channels & Order Intake

> How orders get into the system. Every channel funnels into **one normalized `orders`
> shape** via the adapter pattern, so new channels can be added without touching core logic.

## The adapter pattern

```
 website payload ─┐
 amazon (manual) ─┤
 IG/WhatsApp     ─┼──►  lib/channels/normalizeOrder.ts  ──►  orders + order_items
 phone           ─┤            (one canonical shape)
 in-person       ─┘
```

- Each source has (or will have) an **adapter** that maps its raw fields → the canonical
  `NormalizedOrder` object.
- `normalizeOrder.ts` validates the canonical object and writes `orders` + `order_items`
  (and reserves inventory per [04-order-lifecycle.md](04-order-lifecycle.md)).
- The **raw input is saved** to `orders.source_payload` for audit/troubleshooting.

## Channel handling in v1

| Channel | How it enters | v1 implementation |
|---|---|---|
| **Website** (custom-coded) | **Auto** — site POSTs each order to our intake API | `POST /api/intake/website` adapter |
| **Amazon** | **Manual** — staff key in order details | Manual order form, `channel = amazon` |
| Instagram / WhatsApp | Manual | Manual order form |
| Phone / In-person | Manual | Manual order form |
| B2B / dealer | Manual | Manual order form, `channel = b2b` (CRM features later) |

> The **manual order form** is itself an "adapter": it produces the same `NormalizedOrder`.
> A channel dropdown tags where it came from so analytics can split by channel.

## Website auto-import — intake API

**Endpoint:** `POST /api/intake/website`

**Security:** the custom website signs each request with a shared secret.
- Header `x-tribetoy-signature` = HMAC-SHA256 of the raw body using `INTAKE_WEBHOOK_SECRET`.
- Reject if the signature is missing/invalid (401).
- Uses the Supabase **service-role** client (server-only) to insert.

**Idempotency / dedupe:** the body carries a stable `source_order_id`. We rely on the
`orders` UNIQUE `(channel, source_order_id)` constraint:
- First POST → creates the order.
- Duplicate/retry POST → constraint hit → return `200 {status: "duplicate"}` (no double-create).

**Expected request body (canonical-ish):**
```jsonc
{
  "source_order_id": "WEB-10231",
  "placed_at": "2026-06-22T10:15:00Z",
  "customer": {
    "name": "...", "phone": "...", "email": "...",
    "address_line": "...", "city": "...", "state": "...", "pincode": "..."
  },
  "items": [
    { "sku": "TOY-DRAGON-01", "qty": 2, "unit_price": 499 }
  ],
  "payment": { "type": "prepaid", "status": "paid" },
  "amounts": { "subtotal": 998, "discount": 0, "tax": 0, "shipping": 49, "total": 1047 },
  "notes": ""
}
```

**Flow:**
1. Verify signature → 401 if bad.
2. Parse + validate body (zod). Unknown SKU → still accept, flag for review.
3. Upsert customer (match on phone/email), snapshot ship-to onto the order.
4. `normalizeOrder()` → insert `orders` + `order_items`; reserve inventory.
5. Save raw body to `source_payload`. Return `{ status: "created" | "duplicate", order_no }`.

**Failure isolation:** a failing/slow website must never lose orders — the endpoint returns
clearly and (later phase) can push to a retry queue. For v1, errors are logged and surfaced.

## Amazon (and optional bulk import)

- v1: keyed in via the manual form (`channel = amazon`), preserving the marketplace order id
  in `source_order_id`.
- Optional (Phase 4): a **CSV bulk import** for Amazon order reports → same `normalizeOrder()`
  path, same dedupe key. Automated Amazon API sync stays deferred (see
  [07-roadmap.md](07-roadmap.md)).

## Adding a new channel later (e.g. Shopify)

1. Add the channel value to the `order_channel` enum (migration).
2. Write `lib/channels/shopify.ts` mapping its webhook → `NormalizedOrder`.
3. Add a route (or reuse intake) + secret. Core order/inventory/label logic is untouched.
