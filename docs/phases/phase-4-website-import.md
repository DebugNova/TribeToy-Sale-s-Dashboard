# Phase 4 — Website Auto-Import (Secure Intake API) + Amazon CSV

> **Goal:** Let the **custom-coded website** push every new order into the dashboard
> automatically through a **secure, signed, idempotent intake API**, normalized into the same
> `orders` shape as manual orders. Plus an optional **Amazon CSV bulk import**.

**Depends on:** Phase 1 (`normalizeOrder.createOrder`, dedupe). Spec: [../03-channels.md](../03-channels.md).

---

## 4.1 Scope
**In scope:** `POST /api/intake/website` (HMAC-signed, idempotent), payload validation +
normalization, customer upsert, raw-payload storage, clear responses + error isolation; a
Settings panel to view/rotate the intake secret + see recent intake activity; optional Amazon
CSV importer screen.

**NOT in scope:** Amazon **API** sync, Shopify/marketplace adapters, retry queue infra
(documented as a future hardening step), outbound notifications.

---

## 4.2 Prerequisites
Phase 1 complete (esp. `createOrder` returning `{order_no, duplicate}` on the unique
`(channel, source_order_id)` violation). `INTAKE_WEBHOOK_SECRET` set in env (Phase 0).

---

## 4.3 BACKEND — Supabase
No schema change required — orders/customers/order_items already exist, and the unique
`(channel, source_order_id)` constraint provides dedupe.

Optional (recommended) migration `0006_intake_log.sql` for observability:
```sql
create table public.intake_events (
  id          uuid primary key default gen_random_uuid(),
  channel     order_channel not null,
  source_order_id text,
  status      text not null,           -- 'created' | 'duplicate' | 'error'
  message     text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index intake_events_created_idx on public.intake_events (created_at desc);
alter table public.intake_events enable row level security;
create policy intake_events_auth_read on public.intake_events
  for select to authenticated using (true);
-- inserts happen via service role (bypasses RLS) in the API route.
```

---

## 4.4 BACKEND — the intake API route

`app/api/intake/website/route.ts` (Node runtime; uses the **service-role** admin client):

**Security (HMAC):**
- Read the **raw** request body (needed for signature verification).
- Compute `HMAC-SHA256(rawBody, INTAKE_WEBHOOK_SECRET)`; compare (timing-safe) to header
  `x-tribetoy-signature`. Mismatch/missing → **401**.

**Validation:** parse JSON, validate with **zod** (shape in [../03-channels.md](../03-channels.md)):
`source_order_id`, `customer{...}`, `items[]`, `payment{}`, `amounts{}`, `notes`. On invalid
shape → **400** + log an `intake_events` error.

**Processing:**
1. Map payload → `NormalizedOrder` (`channel='website'`).
2. Call `lib/channels/normalizeOrder.createOrder(normalized, systemActorId)`.
   - Unknown SKU → still create the line (by sku/name), flag for review (don't reject the order).
   - On unique-violation → treat as **duplicate** (don't double-create).
3. Insert an `intake_events` row (`created` | `duplicate` | `error`) with the raw payload.
4. **Respond:**
   - `200 { status:'created', order_no }`
   - `200 { status:'duplicate', order_no }` (idempotent retries are safe)
   - `400`/`401`/`500` with a short message (and logged).

**Reliability:** wrap processing so a thrown error returns a clear `500` and is logged to
`intake_events` (never a silent drop). A durable retry **queue** is a future hardening item —
note it; for v1 the website should retry on non-2xx.

**`systemActorId`:** use a dedicated "system" profile id (seed one) or allow null actor in
audit logs for intake-created orders.

---

## 4.5 Amazon CSV import (optional in this phase)
- `app/(dashboard)/orders/import/page.tsx`: upload an Amazon order-report CSV.
- Parse client/server-side, map columns → `NormalizedOrder` (`channel='amazon'`,
  `source_order_id` = Amazon order id), preview, then call `createOrder` per row.
- Same dedupe via the unique constraint → re-importing the same file is safe.

---

## 4.6 FRONTEND — Settings + activity
- Settings: show the intake **endpoint URL**, the **signature header name**, and how to sign
  (docs snippet for the website dev). Optionally support **secret rotation** (env-managed;
  document the process).
- Intake activity panel: recent `intake_events` (status, source_order_id, time) for debugging.

---

## 4.7 Step-by-step checklist
1. (Optional) apply `0006_intake_log` migration.
2. Build the HMAC verify helper (`lib/intake/verifySignature.ts`).
3. Build `app/api/intake/website/route.ts` (verify → validate → createOrder → log → respond).
4. Seed a "system" profile (or allow null actor).
5. (Optional) build the Amazon CSV importer.
6. Add Settings intake panel + activity list.
7. `npm run build` + `lint`; verify (4.9).

---

## 4.8 Acceptance criteria
- [ ] A correctly **signed** POST creates exactly one order (`channel=website`), visible in
      Orders, with `source_payload` saved.
- [ ] A **duplicate** POST (same `source_order_id`) does **not** create a second order →
      returns `duplicate`.
- [ ] An **unsigned/wrongly-signed** POST is rejected with **401**.
- [ ] A malformed payload returns **400** and is logged (no partial/garbage order).
- [ ] Unknown SKUs don't reject the order (line flagged for review).
- [ ] (If built) Amazon CSV import creates `channel=amazon` orders, dedup-safe.

---

## 4.9 Verification
- **Signed create:** compute HMAC of a sample body with `INTAKE_WEBHOOK_SECRET`, POST it
  (curl/Postman) → `200 created`; order appears in the UI.
- **Idempotency:** repeat the same POST → `200 duplicate`; `select count(*) from orders
  where channel='website' and source_order_id='WEB-...';` returns 1.
- **Auth:** POST with a bad/missing signature → `401`; no order created.
- **Bad body:** POST malformed JSON → `400`; `select * from intake_events order by created_at
  desc limit 5;` shows the error.
- End-to-end: take a website-imported order through the Phase 1 lifecycle + Phase 2 label.
