# TribeToy Dashboard — Build Progress Tracker

Living checklist of what's **done** vs **pending**, phase by phase. Update this at the end of
every work session. See [`docs/`](docs/) for specs and [`CLAUDE.md`](CLAUDE.md) for rules.

**Last updated:** 2026-06-23 · **Current phase:** Phase 5 ✅ complete & verified → **v1 feature-complete**

---

## Project facts (quick reference)

| Item | Value |
|---|---|
| Supabase org | `TribeToy` (`zipxobxxrjlkfhspjnsg`) |
| Supabase project | `tribetoy-dashboard` · ref **`itvjtmwteyqqakhtfajd`** · region `ap-south-1` (Mumbai) |
| Project URL | `https://itvjtmwteyqqakhtfajd.supabase.co` |
| Stack | Next.js **16.2.9** (App Router, Turbopack) · React 19 · TypeScript · Tailwind **v4** |
| App location | repo **root** (app/, lib/, supabase/ alongside docs/ and CLAUDE.md) |
| Founder login | `kaustab.borah44@gmail.com` — see "Action needed" below |

---

## Phase 0 — Scaffold & Database Foundation ✅ DONE

### Acceptance criteria (from `docs/phases/phase-0-scaffold.md` §0.8)
- [x] All 10 tables + `inventory_available` view exist (verified: 10 base tables, view present).
- [x] Enums (8), indexes, triggers (6 in `public` + `on_auth_user_created` on `auth.users`),
      and RLS policies (10) present.
- [x] `get_advisors` reviewed: critical **ERROR fixed**; remaining warnings are the intentional
      v1 permissive RLS (see Notes).
- [x] `settings` has exactly one row (`id=1`) with TribeToy sender defaults.
- [x] A founder can log in; unauthenticated users are redirected to `/login` (verified at runtime).
- [x] Nav renders and routes to placeholder pages; Settings edits the sender block.
- [x] App **builds** and **lints** clean.
- [ ] Deployed to Vercel — **deferred, awaiting your go-ahead** (see "Action needed").

### What was built
- [x] Next.js app scaffolded in repo root (TS + Tailwind v4 + ESLint, App Router).
- [x] Dependencies installed: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `recharts`,
      `@react-pdf/renderer`, `qrcode`, `@types/qrcode`, `server-only`.
- [x] `.env.local` written (URL + anon key + generated `INTAKE_WEBHOOK_SECRET`).
- [x] Migrations applied via Supabase MCP **and** saved in `supabase/migrations/`:
  - `0001_init_schema.sql` — extensions, 8 enums, 10 tables, indexes, `inventory_available` view, settings seed.
  - `0002_functions_triggers.sql` — `set_updated_at`, `set_order_no` (TT-YYYY-####), `handle_new_user`.
  - `0003_rls.sql` — RLS enabled on all 10 tables + `*_auth_all` policies (authenticated = full access).
  - `0004_storage_labels.sql` — private `labels` bucket + 3 authenticated storage policies.
  - `0005_advisor_fixes.sql` — advisor remediation (see Notes).
- [x] TypeScript types generated → `lib/supabase/database.types.ts`.
- [x] Supabase clients: `lib/supabase/browser.ts`, `server.ts`, `admin.ts` (server-only guard).
- [x] Auth/session proxy: `proxy.ts` + `lib/supabase/middleware.ts` (redirect unauth → `/login`).
- [x] Login page (`app/(auth)/login`) + sign-out server action (`lib/auth/actions.ts`).
- [x] Protected dashboard shell `app/(dashboard)/layout.tsx` + sidebar nav (`components/nav-links.tsx`).
- [x] Placeholder pages: Dashboard, Orders, Products, Customers, Inventory, Shipments.
- [x] Settings page reads + edits the single `settings` row via a Zod-validated server action.
- [x] Founder user created (GoTrue signup + email confirmed); `profiles` row auto-created by trigger.

### Verification results (`docs/phases/phase-0-scaffold.md` §0.9)
- **DB schema:** 10 tables, 1 view, 10 RLS policies, 6 public triggers, 8 enums, private `labels`
  bucket + 3 policies — all confirmed.
- **`settings`:** exactly 1 row; sender = "TribeToy Pvt Ltd", pincode 781039, courier speedpost.
- **`order_no` trigger:** inserting `('manual')` returned **`TT-2026-0001`**; test row deleted and
  sequence rewound so the first real order is `TT-2026-0001`.
- **Auth (runtime):** `GET /` → 307 → `/login`; `GET /login` → 200; `GET /settings` (unauth) →
  307 → `/login`; founder password login returns a valid bearer token.
- **Types:** `lib/supabase/database.types.ts` compiles (TypeScript step of `next build` passes).
- **Build/lint:** `npm run build` ✅ and `npm run lint` ✅ both clean.

---

## Phase 1 — Core Operations ✅ DONE

### Acceptance criteria (from `docs/phases/phase-1-core-operations.md` §1.7)
- [x] Create a product → an `inventory` row is created in the same action; stock adjustments
      require a reason and write an `inventory.adjust` audit log.
- [x] Create a customer; orders reuse them (match on phone/email or explicit id — no dup).
- [x] Create a manual order (any channel incl. Amazon) → appears in the list with a generated
      `order_no` (TT-YYYY-####).
- [x] Walk to **reserved** → `inventory.reserved += qty`; **dispatched** → `on_hand -= qty`,
      `reserved -= qty`; **cancel while reserved** → releases the hold (verified, see below).
- [x] Illegal transitions **blocked** (map guard) and reserve with insufficient stock blocked
      (`INSUFFICIENT_STOCK`, atomic — no partial reserve).
- [x] Every status change + inventory change writes an `audit_logs` row.
- [x] App **builds** and **lints** clean.

### What was built
- **Migration `0006_inventory_rpcs.sql`** (applied via MCP + saved): atomic, self-auditing
  inventory RPCs `reserve_order_inventory`, `release_order_inventory`,
  `dispatch_order_inventory`, **plus `return_order_inventory(p_restock)`** (added for the
  `returned` lifecycle side-effect in the lifecycle doc; restock → `on_hand +=`, else
  `damaged +=`). All `security definer`, `search_path=public`, `execute` granted to
  `authenticated` only (revoked from `anon/public`). Types re-generated.
- **lib/ business logic (all writes go through here):**
  - `lib/types.ts`, `lib/money.ts` (`round2`/`formatINR`), `lib/format.ts` (IST dates),
    `lib/validation.ts` (zod FormData helpers), `lib/audit.ts` (`getActorId`, `logAudit`).
  - `lib/products/actions.ts` — `saveProduct` (create also creates the inventory row;
    rollback if that fails), `setProductActive`. `lib/customers/actions.ts` — `saveCustomer`.
  - `lib/inventory/actions.ts` — `adjustStock` (field + signed delta + **required reason**,
    can't go negative, audited).
  - `lib/channels/{types,normalizeOrder}.ts` — `createOrder` funnel (zod → find/create
    customer → totals → orders+order_items → audit; dedupe on `(channel, source_order_id)`
    returns existing flagged `duplicate`).
  - `lib/orders/{transitions,lifecycle}.ts` — `TRANSITIONS` map + `transition()` guarded
    function (inventory RPC runs *before* status update so a stock failure blocks it) + named
    wrappers; mirrors `order_items.fulfillment_status` and payment status.
- **Screens (Phase 0 placeholders replaced):** Products (list/new/[id]), Customers
  (list/new/[id]), Inventory (list + adjust-stock modal), Orders (list with status/channel/
  date/search filters, manual order form with channel selector incl. Amazon + live totals,
  order detail with lifecycle action buttons + per-order audit/activity view).
- **Shared components:** `status-badge`, `table` (DataTable), `form` primitives,
  `page-header`. List filters use plain GET forms (no client JS) reading `searchParams`.

### Verification results (`docs/phases/phase-1-core-operations.md` §1.8) — via MCP `execute_sql`
Run against the live DB on isolated test rows (explicit `order_no` so the global `order_no`
sequence was **not** consumed), then fully cleaned up (0 rows left):
- **Reserve** (qty 3, on_hand 10): reserved 3, available 7. ✅
- **Dispatch**: on_hand 7, reserved 0. ✅
- **Reserve (4) → release/cancel**: reserved 4 → 0, available 6 → 10. ✅
- **Insufficient stock** (qty 999 vs 10): raised `INSUFFICIENT_STOCK`; product stayed
  reserved 0 (atomic, no partial reserve, no audit row). ✅
- **Dedupe**: 2nd insert of `(amazon, 'TEST-DUP-1')` → `23505` on `orders_channel_source_uniq`
  → `createOrder` returns the existing order flagged `duplicate`. ✅
- **Audit**: `inventory.reserve` ×2, `inventory.dispatch` ×1, `inventory.release` ×1. ✅
- **Illegal transitions** blocked by the `TRANSITIONS` map (e.g. `created→packed`,
  `validated→reserved`) before any side-effect.

### Advisor review after migration 0006
`get_advisors` (security + performance) re-run. Findings:
- `rls_policy_always_true` ×10 — **intentional** v1 permissive RLS (founders = full access);
  Phase 5.
- `authenticated_security_definer_function_executable` ×4 — **NEW** (the 4 inventory RPCs).
  Accepted/by-design: the phase doc mandates `security definer` so the RPCs can write audit
  rows; execute is locked to `authenticated` (founders), who already have full table access
  under v1 RLS, so this grants no escalation. Same category as the permissive-RLS warnings —
  to be revisited in Phase 5 with role-scoped RLS. No code change.
- `auth_leaked_password_protection` — pre-existing Auth dashboard toggle (see Action needed).
- `unused_index` (perf, INFO) ×13 — expected on a near-empty DB; clears with data/queries.

### Phase 1 decisions / notes
- **Actor resolved server-side**, not passed from the client: lib functions call
  `getActorId(supabase)` (= auth user id = `profiles.id`) instead of trusting a client-passed
  `actorId` (the doc's signature) — safer, same result.
- **`return_order_inventory` RPC added** to migration 0006 (doc listed 3; the lifecycle doc's
  `returned` side-effect needs it) to keep return restock atomic + audited like the others.
- **Manual-form tax**: lines capture qty/price/discount; per-line GST `tax` is supported by
  the schema + `createOrder` but not surfaced in the v1 manual form (prices treated as final).
- **`label_generated` step**: the lifecycle map requires `packed → label_generated →
  dispatched`. §1.8's shorthand omits `label_generated`; the map (authoritative) keeps it. In
  Phase 1 it's just a status step — no PDF/shipment row is required to dispatch (that's Phase 2).
- **Order list** searches order_no / ship_name / ship_phone (SKU search across items deferred).

---

## Phase 2 — Shipping Label Generation (A4 PDF) ✅ DONE

### Acceptance criteria (from `docs/phases/phase-2-labels.md` §2.7)
- [x] For a `packed` order, "Generate Label" produces an **A4 PDF** with TO/FROM, order_no,
      courier, AWB (if entered), items, weight, dispatch date, and a **scannable QR**
      (verified: QR decoded back to `TT-TEST-LBL-0001`; reprint QR decoded to order_no + AWB).
- [x] PDF stored in the private `labels` bucket; order moves to `label_generated`.
- [x] AWB can be added/edited after generation (`updateShipmentAwb` → `shipment.awb_update`).
- [x] Reprint works and prior versions are retained (versioned paths `…-v{n}.pdf`; print
      history lists each event with who + when).
- [x] Generating a label before `packed` is blocked (`canGenerateLabel` guard).
- [x] App **builds** and **lints** clean.

### What was built
- **No schema change** (Phase 0 `shipments` + `settings` + private `labels` bucket already
  existed). Confirmed the bucket + its 3 authenticated policies (read/write/update) are live.
- **`lib/labels/`:**
  - `qr.ts` — `makeQrDataUrl()` (PNG data URL; ecc "M") encoding order_no (+ AWB on reprint).
  - `label.tsx` — `<LabelDocument>` A4 `@react-pdf/renderer` doc; bordered ~cut-out block in
    the upper page (FROM / TO+QR / order+courier+AWB+dispatch / contents+weight). Built-in
    Helvetica only (no `Font.register`, so no network fetch at render time).
  - `courier.ts` — `COURIER_LABEL` display map + `DEFAULT_LABEL_TEMPLATE` (`speedpost_a4`),
    a lightweight module safe to import from client components.
  - `pdf.ts` (server actions) — `generateLabel` (load+guard → weight from product weights →
    QR → `renderToBuffer` → upload to `labels/{order_no}/{shipment_id}-v{n}.pdf` → insert/update
    `shipments` → `packed→label_generated` via `lib/orders/lifecycle` → audit), plus
    `getLabelSignedUrl` (fresh 1-h signed URL) and `updateShipmentAwb`.
- **`lib/orders/transitions.ts`** — added shared `LABELABLE_STATES` + `canGenerateLabel()`
  (single source of truth for the packed-guard, used by `pdf.ts` and the order UI).
- **Frontend:** order-detail "Shipping label" section (`label-panel.tsx`) — generate form
  (courier/AWB/dispatch), download/print via signed URL in a new tab, editable AWB + dispatch,
  reprint, and print history (who + when, version). The generic lifecycle buttons no longer
  show `label_generated` (the label action owns that transition so it can't be skipped
  PDF-less). Reusable `components/label-download-button.tsx`. **Shipments list page** rebuilt
  (order_no + status, courier, AWB, dispatch, created_by, generated-at, per-row Download).
- **`next.config.ts`** — `serverExternalPackages: ["@react-pdf/renderer"]` (Node/binary/font
  internals; keep it out of the bundle).

### Verification results (`docs/phases/phase-2-labels.md` §2.8)
Ran against the live DB/storage as the authenticated founder on an isolated test order
(explicit `order_no` `TT-TEST-LBL-0001`, so the `order_no` sequence was **not** consumed),
then fully cleaned up (all counts 0; both PDFs removed; bucket back to its 3 policies):
- **PDF fields** — rendered `LabelDocument` to a real PDF; visually confirmed FROM, TO, QR +
  order_no caption, order_no, courier, AWB, dispatch date, items, weight (`500 g`), footer.
- **QR scans** — decoded the embedded QR PNG (jsQR): v1 → `TT-TEST-LBL-0001`; v2 reprint →
  `TT-TEST-LBL-0001 ES016693300IN`.
- **Storage** — both versions present under `labels/TT-TEST-LBL-0001/…-v1.pdf` (7575 B) /
  `…-v2.pdf` (7696 B), `application/pdf`; signed URL served the PDF over HTTP (200).
- **Shipments row** — one row, `label_pdf_url` = latest (v2), `awb`, `dispatch_date`,
  `label_template=speedpost_a4`, `created_by` = founder; **order moved to `label_generated`**.
- **Reprint history** — `audit_logs` (entity `shipment`): `shipment.label_generated` (v1) →
  `shipment.awb_update` → `shipment.reprint` (v2).
- **Packed-guard** — `canGenerateLabel`: `packed`/`delivered` allowed; `reserved`/`created`
  blocked.

### Phase 2 decisions / notes
- **One `shipments` row per order**; reprints upload a new versioned PDF (old versions kept)
  and bump a version derived from the count of prior label_generated/reprint audit rows.
  Print history (who/when) comes from `audit_logs`, not extra shipment rows.
- **AWB is optional at first generation** (the India Post Speed Post AWB is issued at the
  counter); QR = bare `order_no` until an AWB is recorded, then a reprint's QR adds the AWB.
  This keeps §2.8's "QR decodes to the order_no" exact on first generation.
- **`label_generated` removed from the generic lifecycle buttons** so the only path to that
  state is producing an actual label PDF (no PDF-less shortcut). `packed → cancelled` and
  `label_generated → dispatched` remain on the lifecycle buttons.
- **Storage `labels` has no DELETE policy by design** (the app reads/writes/upserts and keeps
  version history; it never deletes). Verification cleanup needed a *temporary* delete policy
  (added + dropped in the same session) because `storage.objects` has a `protect_delete`
  trigger that blocks direct SQL deletes — use the Storage API.

## Phase 3 — Sales Dashboard & Reporting ✅ DONE

### Acceptance criteria (from `docs/phases/phase-3-dashboard.md` §3.7)
- [x] KPI cards reflect seeded orders and respect the date/channel filters (verified: filtering
      by channel/city/customer-type/category/date all change the numbers correctly).
- [x] Revenue & orders trends and channel split render correctly (cancelled/refunded excluded
      everywhere via `status not in ('cancelled','refunded')`).
- [x] Top SKUs ranks by qty/revenue/margin — three distinct orderings (SQL `ORDER BY CASE p_sort`).
- [x] Low-stock panel lists products where available ≤ threshold (`low_stock_alerts()` RPC).
- [x] Filters persist in the URL across refresh/return (client filter bar pushes query params;
      server reads `searchParams`; `/` is a dynamic route).
- [x] CSV export downloads correct data (per-table buttons; INR-formatted; UTF-8 BOM).
- [x] Dashboard responsive — **all aggregation in SQL** (views + RPCs), nothing aggregated client-side.
- [x] App **builds** and **lints** clean.

### What was built
- **Migration `0007_analytics.sql`** (applied via MCP + saved). Two layers, all aggregation in
  Postgres (revenue excludes `cancelled`/`refunded`; IST day buckets):
  - **Views** (canonical, unfiltered, `security_invoker`): `v_daily_sales`, `v_channel_split`,
    `v_top_skus` (margin = `(coalesce(price,unit_price) - coalesce(cost,0)) * qty`).
  - **Filtered RPCs** the UI calls — same math, bounded by the dashboard filters (date +
    channel/city/customer-type/category), filter params default `NULL` = no filter:
    `dashboard_kpis` (extends the doc's 2-arg signature with defaulted filters, so
    `dashboard_kpis(from,to)` still works), `dashboard_daily_sales`, `dashboard_channel_split`,
    `dashboard_top_skus(…, p_sort, p_limit)`, and `low_stock_alerts()` (column-vs-column compare
    can't go through PostgREST). All `stable`, `set search_path=''`, execute locked to `authenticated`.
  - Types re-generated. `get_advisors` re-run: **no new findings** (views are `security_invoker`,
    functions pin `search_path` and aren't `security definer`). Only the pre-existing intentional
    warnings remain (10× permissive RLS, 4× inventory RPCs from 0006, leaked-password toggle).
- **`lib/analytics/`** (server-only query helpers): `types.ts` (filter types + IST date helpers +
  `parseFilters`/`filtersToQuery` URL (de)serialization — pure, shared with the client filter bar)
  and `queries.ts` (`getKpis`, `getRevenueTrend`, `getChannelSplit`, `getTopSkus`, `getLowStock`,
  `getPackingBacklog`, `getFilterOptions`; coerce PostgREST numerics with `Number()`).
- **`lib/export/toCsv.ts`** — `toCsv(headers, rows)` (RFC-4180 escaping, CRLF, UTF-8 BOM so ₹
  renders in Excel) + `downloadCsv(filename, csv)`.
- **Dashboard `app/(dashboard)/page.tsx`** (server) wiring it together: parses `searchParams` →
  filters, fetches every panel in parallel, builds the CSV matrices. New components:
  `filter-bar.tsx` (client; URL-state filter bar, keyed on the search string so controls mirror
  the URL), `dashboard-charts.tsx` (client; Recharts revenue bar / orders line / channel-split
  bar), `components/{kpi-card,panel,export-csv-button}.tsx`. Top-SKU sort toggle = filter-preserving
  links (`?skuSort=`). KPI row, two trend charts + channel split, and Top-SKUs / Low-stock /
  Packing-backlog tables, each with a CSV button.

### Verification results (`docs/phases/phase-3-dashboard.md` §3.8) — via MCP `execute_sql`
Seeded **17 demo orders / 20 items** across 7 channels, 5 cities, b2c+b2b, 15 days (all within the
default 30-day window) incl. 1 cancelled, 1 refunded, 1 returned, 3 in the packing backlog and 1
dispatched **today**. Demo rows use explicit `DEMO-####` order numbers, so the production
`order_no` sequence is untouched (first real order is still `TT-2026-0001`); clear them with
`delete from orders where order_no like 'DEMO-%'` (items cascade-free → delete items first).
- **KPIs (last 30d):** revenue **₹40,658.00**, orders **15**, AOV **2710.53**, returns **2**,
  pending fulfillment **3**, shipments today **1** — all match a manual count.
- **Channel split:** `dashboard_channel_split(30d)` **==** `v_channel_split` (b2b 22582, website
  7090, amazon 4895, instagram 2596, phone 2197, whatsapp 1298; Σ = 40658 = revenue).
- **Top SKUs:** qty → `BLOX>DINO>PUZ>PLUSH>ROBO>CAR`; revenue → `BLOX>DINO>ROBO>PLUSH>CAR>PUZ`;
  margin → `BLOX>DINO>ROBO>PLUSH>PUZ>CAR` (three distinct orderings).
- **Filters narrow correctly:** channel=website 7090/5 · city=Mumbai 5394/3 · customer=b2b 22582/2 ·
  category=Action Figures 15083/6 (+ Top SKUs restricted to DINO,ROBO) · last-5-days 4745/4.
- **Low stock:** `PUZ` (avail 3 ≤ 5), `ROBO` (avail 6 ≤ 10). **Backlog:** 3 orders.
- **Build/lint:** `npm run build` ✅ (TS clean) and `npm run lint` ✅.
- *Interactive UI* (clicking the filter bar, the sort toggle, downloading a CSV in the browser as
  the authenticated founder) is best spot-checked manually — the data layer it reads is fully verified.

### Phase 3 decisions / notes
- **Migration numbered `0007_analytics`** (not the doc's `0005_analytics`) to keep the folder
  monotonic per the established Phase-0 offset (see numbering note below). Content = the doc's 4
  objects + the filtered RPCs that the doc's §3.4 explicitly invites ("or extend the RPC").
- **Two-layer SQL:** kept the doc's unfiltered views (canonical + the §3.8 MCP cross-check target)
  and added filtered RPCs for the UI (views can't take params). `dashboard_kpis` is a single
  function with defaulted filter params, so the doc's `dashboard_kpis(from,to)` call still resolves.
- **Filter semantics:** `city` = `orders.ship_city`; `customerType` = joined `customers.type`;
  `category` = order contains an item in that category (order-level metrics keep `orders.total`);
  for Top SKUs the category filter restricts to items of that category (item-level). `shipments_today`
  is always "today" (IST) and ignores the date range but respects the dimension filters.
- **Default range = last 30 days** (matches §3.8's `dashboard_kpis(now()-'30 days', now())`); seed
  data sits inside it so the default cards == the unbounded views.

## Phase 4 — Website Auto-Import (Secure Intake API) + Amazon CSV ✅ DONE

> Fully verified end-to-end against the live route (the real `SUPABASE_SERVICE_ROLE_KEY` was
> added to `.env.local` during this session). All §4.9 checks pass; test data cleaned up and
> the `order_no` sequence rewound (first real order is still `TT-2026-0001`).

### Acceptance criteria (from `docs/phases/phase-4-website-import.md` §4.8)
- [x] A **signed** POST creates exactly one `channel=website` order (`TT-2026-0001`, total
      ₹1147) with `source_payload` saved — verified live.
- [x] A **duplicate** POST (same `source_order_id`) returns `duplicate` and creates **no**
      second order (`count=1`) — verified live.
- [x] An **unsigned / wrongly-signed** POST → **401** (verified live, no order created).
- [x] A **malformed** payload → **400** and isolated (verified live: bad JSON *and* bad shape;
      no partial order; best-effort logged to `intake_events`).
- [x] Unknown SKUs don't reject the order — line stored by sku/name, `product_id` null
      (handled in `persistOrder`/`toNormalizedOrder`, same path Phase 1 verified).
- [x] Amazon CSV importer built (`channel=amazon`, dedupe-safe via the unique constraint).
- [x] App **builds** and **lints** clean.

### What was built
- **Migration `0008_intake_log.sql`** (applied via MCP + saved): `intake_events`
  (channel/status/source_order_id/order_no/message/payload/created_at) for observability.
  RLS = **authenticated SELECT only**; inserts happen via the service-role client in the API
  (no insert policy on purpose). Types re-generated. `get_advisors` re-run → **no new
  findings** (the SELECT-only `using(true)` policy is intentionally excluded by the linter;
  only the pre-existing intentional warnings + INFO `unused_index` on the fresh table remain).
- **Refactor — shared funnel:** extracted the order-persistence core into
  `lib/channels/persistOrder.ts` `persistOrder(supabase, actorId, input)` (not a "use server"
  action; client + actor **injected**). `lib/channels/normalizeOrder.ts` `createOrder` is now a
  thin "use server" wrapper (cookie client + founder id → persistOrder). This lets the manual
  form and the **unauthenticated** intake route share one validated, audited, dedupe-safe path
  (the route passes the **service-role admin client** + a **null actor**; audit `actor_id` is
  nullable `on delete set null`).
- **`lib/intake/`:**
  - `verifySignature.ts` — `SIGNATURE_HEADER` (`x-tribetoy-signature`), `signBody`, and a
    **timing-safe** `verifySignature` (hex HMAC-SHA256 over the raw body; false on
    missing/short/length-mismatch/mismatch — never throws).
  - `website.ts` — zod `WebsiteIntakeSchema` (docs/03-channels.md shape) + `toNormalizedOrder`
    (→ `channel='website'`; carries shipping + order discount; raw body → `source_payload`).
  - `log.ts` — `logIntakeEvent` (best-effort; swallows errors so logging can't turn a 4xx into
    a 500 or drop an order).
  - `amazonCsv.ts` — pure `parseAmazonCsv` (auto-detects tab/comma; tolerant header aliases;
    groups report rows by order id → one order w/ multiple items; `source_order_id` = Amazon id).
- **`app/api/intake/website/route.ts`** (Node runtime, `force-dynamic`): raw body → **verify
  (401)** → build admin client lazily → **parse JSON (400)** → **zod validate (400, logged)** →
  `persistOrder(admin, null, …)` → **log + respond** `200 {created|duplicate, order_no}` /
  `500` (logged, never a silent drop). `GET` → 405. If the service key is absent it returns a
  clear `500` *after* validation so the website retries (no fake success).
- **`lib/supabase/middleware.ts`** — `/api/intake/*` marked **public** (HMAC-authed, not
  session-authed) so the auth proxy no longer redirects it to `/login`. *(Bug found & fixed
  during verification — the route was returning the login HTML at 200.)*
- **Frontend:**
  - Settings → **Website intake** panel (`app/(dashboard)/settings/intake-panel.tsx`, server):
    endpoint URL (derived from request headers), signature header name, a Node signing snippet,
    an env-managed secret-rotation note, and a **recent intake activity** table (last 15
    `intake_events`).
  - **Amazon CSV importer** (`app/(dashboard)/orders/import/{page,import-form,actions}.tsx`):
    browser-side parse + preview (no save until confirmed) → `importAmazonOrders` server action
    loops `persistOrder` (channel forced to `amazon` server-side) → created/duplicate/error
    summary; best-effort `intake_events` log. Linked from the Orders header.

### Verification results (`docs/phases/phase-4-website-import.md` §4.9) — live HTTP, dev server
Ran a signed Node client against `POST /api/intake/website` (HMAC computed with the real
`INTAKE_WEBHOOK_SECRET` from `.env.local`).
- **Signed + valid → `200 {status:"created", order_no:"TT-2026-0001"}`**; DB row: status
  `created`, total ₹1147, `payment_status=paid`, `source_payload` saved; both item lines
  present incl. `UNKNOWN-SKU-XYZ` with `product_id=null` (**unknown SKU flagged, not
  rejected**); one `intake_events` `created` row. ✅
- **Same POST again → `200 {status:"duplicate", order_no:"TT-2026-0001"}`**; `select count(*)
  from orders where channel='website' and source_order_id='WEB-VERIFY-…'` = **1** (no second
  order); second `intake_events` `duplicate` row. ✅
- **Unsigned → `401`**; **wrong signature → `401`** (flat message, no order). ✅
- **Signed + malformed JSON → `400`** ("Malformed JSON body"). ✅
- **Signed + bad shape → `400`** with a precise zod message ("customer: …; items: At least one
  item is required"). ✅
- **GET → `405`**. ✅
- **Cleanup:** test order/items/customer/intake_events + audit rows deleted; `order_no_seq`
  rewound via `setval(...,1,false)` → first real order is still `TT-2026-0001`. Final state:
  `orders`=17 (DEMO seeds), `intake_events`=0, no leftover test rows. ✅
- **Build/lint:** `npm run build` ✅ (TS clean) and `npm run lint` ✅.

> **Earlier pre-key run** (before the service key was added) confirmed the pipeline isolates
> failures correctly: signed+valid returned a clear `500 "…SERVICE_ROLE_KEY missing"` *after*
> signature + validation passed — i.e. no silent drop, and the 401/400 paths never touch the DB.

### Phase 4 decisions / notes
- **Persistence core extracted, not duplicated:** one `persistOrder` for both the cookie-bound
  manual form and the service-role intake route — guards, totals, dedupe, and audit stay
  identical. Intake-created orders use a **null audit actor** (the doc's allowed option; no
  separate "system" profile needed).
- **Intake API is intentionally public at the proxy** but authenticated per-request by HMAC
  over the **raw** body; the service-role client is server-only (`server-only` guard).
- **`intake_events` inserts bypass RLS** via the service role (no insert policy granted);
  founders read it (SELECT policy). CSV-import logging uses the admin client too, so it's a
  best-effort no-op until the service key is set (the per-row UI summary is the primary feedback).
- **Totals are recomputed** in `persistOrder`; the website `amounts{}` is advisory (only
  `shipping` + order `discount` are carried over) — single source of truth for money.

## Phase 5 — Polish (Audit UI, Alerts, Roles/RLS, Performance) ✅ DONE

> Real role-based access is now enforced in the DB (RLS), backed by UI gating + sensitive-field
> masking, an admin audit-log viewer, and an alerts surface. All §5.6 checks pass; advisors have
> **no critical findings** and the previous intentional `rls_policy_always_true` warnings are gone.

### Acceptance criteria (from `docs/phases/phase-5-polish.md` §5.5)
- [x] Each role sees/does only what its policy allows — **verified per role** at the DB layer
      (simulated JWT context for all 5 roles; full read/write matrix matched, see below).
- [x] Admin can browse the audit log with **before→after** detail (`/audit`, entity/actor/date
      filters; `AuditDiff` renders changed keys old → new).
- [x] Low-stock + packing-exception alerts show accurately (nav badge + `/alerts` panel;
      low-stock appears/clears with threshold — verified in a rolled-back tx).
- [x] Sensitive fields masked where appropriate (customer phone + order ship-phone show last 4;
      **reveal is logged** via `sensitive.reveal`).
- [x] `get_advisors` security + performance: **no critical findings**; hot queries use indexes
      (audit viewer → Bitmap Index Scan on `audit_logs_entity_idx`, 0.12 ms).
- [x] Automated backups: restore + recovery documented in [docs/backups.md](docs/backups.md)
      (dashboard confirmation flagged as a founder action — see below).
- [x] App **builds** and **lints** clean.

### What was built
- **Migration `0009_roles_rls.sql`** — `public.current_role()` (`security definer`, reads
  `profiles.role`) + role-scoped policies replacing the v1 `*_auth_all` blanket policies.
- **Migration `0010_roles_rls_consolidation.sql`** — refines 0009 into **one policy per
  (table, command)** with admin folded into each role list, and **revokes `current_role()`
  EXECUTE from `anon`** (Supabase default-privs had granted it). This eliminates the
  `multiple_permissive_policies` (×38) and `rls_policy_always_true` (×10) advisories and the
  `anon_security_definer_function_executable` finding. Types re-generated.
- **Role matrix enforced** (RW = read+write, R = read, INS = insert-only):
  | table | admin | ops | warehouse | sales | finance |
  |---|---|---|---|---|---|
  | customers | RW | R | R | RW | R |
  | products | RW | R | R | R | R |
  | inventory | RW | RW | RW | R | R |
  | orders / order_items | RW | RW | R | RW | R |
  | shipments | RW | RW | RW | R | R |
  | payments | RW | R | R | R | RW |
  | settings / profiles | RW | R | R | R | R |
  | audit_logs | RW | INS | INS | INS | INS |
  | intake_events | RW | R | — | R | — |
- **`lib/auth/roles.ts`** — `getCurrentRole`, `CAPABILITIES` map (mirrors RLS), `roleCan`,
  `requireCapability` (server-page guard). **`lib/mask.ts`** (`maskPhone`/`maskRef`).
  **`lib/sensitive/actions.ts`** — `revealSensitive` (allow-listed field → value, logs
  `sensitive.reveal`). **`lib/alerts/queries.ts`** — `getAlerts`/`getAlertCount` (low-stock +
  stuck-order exceptions, `STUCK_DAYS=3`).
- **Audit viewer** `app/(dashboard)/audit/` (admin-only via `requireCapability`): entity/actor/
  date filters (GET form) + `audit-diff.tsx` before→after. **Alerts** `app/(dashboard)/alerts/`:
  low-stock / packing-exceptions / full backlog panels. **`components/reveal-field.tsx`** (client
  reveal). **Nav** is role-aware (Audit + Settings hidden for non-admins) with a red **alert
  badge**; header shows the signed-in role.
- **UI role gating** (defense-in-depth on top of RLS): Settings page admin-gated server-side;
  action buttons hidden/disabled per capability on orders (New/Import + lifecycle + label),
  customers (Add + edit→read-only detail), products (Add), inventory (Adjust stock).

### Verification results (`docs/phases/phase-5-polish.md` §5.6) — via MCP `execute_sql`
- **Per-role boundaries:** created 1 test user per role (`auth.users` + role set on `profiles`),
  then simulated each role's JWT (`set local role authenticated` + `request.jwt.claims`) and ran
  a read-count + write-probe matrix on every table. **All 5 roles matched the matrix exactly**
  (e.g. ops can write inventory/orders/shipments but not products/payments/settings and can't
  read audit_logs; finance writes only payments; warehouse read-only on orders; non-admins
  can INSERT audit rows but not SELECT them). Re-verified after the 0010 consolidation. Probe
  fn + seed rows cleaned up (all counts back to 0).
- **Alerts:** `low_stock_alerts()` baseline = 2 (PUZ, ROBO); forcing one more product below
  threshold → 3, rolled back → back to 2 (appears/clears correctly).
- **Performance:** `explain analyze` — audit viewer query uses Bitmap Index Scan on
  `audit_logs_entity_idx` (0.12 ms); `dashboard_kpis(30d)` 10.4 ms. No matviews needed at this
  volume (deferred per the doc's "if slow at volume").
- **Advisors:** security → only by-design WARNs remain (5× `security_definer` on
  `current_role` + the 4 inventory RPCs, execute locked to `authenticated`; leaked-password
  toggle). performance → only `unused_index` INFO (expected on near-empty DB). No criticals.
- **Build/lint:** `npm run build` ✅ (TS clean, `/audit` + `/alerts` routes present) and
  `npm run lint` ✅.

### Phase 5 decisions / notes
- **Two migrations, not one:** 0009 first (the doc's pattern: admin FOR-ALL + per-role
  policies), then 0010 consolidating to one-policy-per-command after `get_advisors` flagged
  `multiple_permissive_policies`. Kept append-only/monotonic; a fresh deploy applies both and
  lands on the consolidated set. The saved `0009_roles_rls.sql` is the intermediate version.
- **`current_role()` stays `security definer`** (must read `profiles` for the policies) — the
  remaining `authenticated_security_definer_function_executable` WARN is by-design, same class
  as the Phase-1 inventory RPCs. The real `anon` exposure was fixed (execute revoked from anon).
- **audit_logs is INSERT-for-all, SELECT-for-admin:** every role's writes still log via the
  existing `lib/audit` path, but the trail is only readable in the admin viewer.
- **Masking reveals are logged, not gated by role:** any role that can read the record may
  reveal its phone, but each reveal writes a `sensitive.reveal` audit row (who/what/when).
- **Test role users left in place** so a founder can manually log in as each role and confirm
  the UI gating (the one thing not checkable from SQL) — see Action needed to remove them.

## ⚠️ Action needed from you

1. **Change the founder password.** A bootstrap account was created so login is verifiable:
   - Email: `kaustab.borah44@gmail.com`
   - Temporary password: `TtLbkENgq6LLWTB8#9`  → please change it after first sign-in.
2. ~~**Add the service-role key** to `.env.local`.~~ **Done (Phase 4):** the legacy
   `service_role` JWT is set in `.env.local` and the intake API was verified with it.
   **Still TODO:** add the same `SUPABASE_SERVICE_ROLE_KEY` to **Vercel** env before deploy.
   Since the key was pasted into a chat session, consider **rotating** it (Supabase → API Keys
   → roll legacy keys) and updating `.env.local` + Vercel afterward.
3. **Vercel deploy** (Phase 0 step 11) is **not done** — I will not deploy without your approval.
   When ready: import the repo to Vercel, add the 4 env vars, deploy, verify login on the URL.
4. *(Optional security hardening)* Enable **leaked-password protection** (HaveIBeenPwned check):
   Supabase Dashboard → Authentication → Policies/Password security. Flagged by `get_advisors`;
   not required for Phase 0.
5. **Remove the Phase-5 test role users when done checking the UI.** Four were created so you can
   log in as each role and confirm the gating (`ops.test`/`warehouse.test`/`sales.test`/
   `finance.test@tribetoy.test`, password `Test1234!`). They have weak known passwords — delete
   them (Auth → Users, or `delete from auth.users where email like '%@tribetoy.test'`; their
   `profiles` cascade) before go-live.
6. **Confirm automated backups in the Supabase dashboard** (Database → Backups). Free plan has
   no automated backups — upgrade to Pro (+ enable PITR) before this is the system of record.
   Restore/recovery steps are documented in [docs/backups.md](docs/backups.md).

---

## Migration ledger (canonical) & numbering

Migrations applied so far (Supabase orders by **timestamp version**, not the filename number):

| File | DB version | Purpose |
|---|---|---|
| `0001_init_schema.sql` | 20260622135325 | enums, tables, indexes, view, settings seed |
| `0002_functions_triggers.sql` | 20260622135414 | updated_at, order_no, handle_new_user |
| `0003_rls.sql` | 20260622135441 | RLS + per-table policies |
| `0004_storage_labels.sql` | 20260622135510 | private `labels` bucket + policies |
| `0005_advisor_fixes.sql` | 20260622135717 | advisor remediation |
| `0006_inventory_rpcs.sql` | 20260622142939 | reserve/release/dispatch/return inventory RPCs (Phase 1) |
| `0007_analytics.sql` | 20260622195114 | analytics views (`v_daily_sales`/`v_channel_split`/`v_top_skus`) + filtered RPCs (`dashboard_kpis`/`dashboard_daily_sales`/`dashboard_channel_split`/`dashboard_top_skus`/`low_stock_alerts`) (Phase 3) |
| `0008_intake_log.sql` | 20260622234011 (`intake_log`) | `intake_events` observability table (authenticated SELECT-only; inserts via service role) (Phase 4) |
| `0009_roles_rls.sql` | 20260623002648 | `current_role()` + role-scoped RLS replacing the v1 blanket policies (Phase 5) |
| `0010_roles_rls_consolidation.sql` | 20260623004453 | one-policy-per-command consolidation + revoke `current_role()` from anon (Phase 5 advisor fixes) |

> **Numbering note:** Phase 0 needed **5** migrations (the phase docs assumed only 0001–0003,
> so their later examples — `0004_inventory_rpcs`, `0005_analytics`, … — are off by two).
> **Future phases continue from `0006`** to keep the folder monotonic with no duplicate numbers:
> Phase 1 → `0006_inventory_rpcs`, Phase 3 → `0007_analytics`, Phase 4 → `0008_intake_log`,
> Phase 5 → `0009_roles_rls` / `0010_matviews`. (The SQL content per phase is unchanged.)

## Notes / decisions

- **Next.js 16 `proxy.ts`:** Next 16 renamed the `middleware.ts` convention to `proxy.ts`
  (export `proxy`, nodejs runtime). We use `proxy.ts` to avoid the deprecation; behaviour is
  identical to the middleware described in the phase doc.
- **Advisor findings:** the `security_definer_view` ERROR (on `inventory_available`),
  `function_search_path_mutable` (×2), and the publicly-callable `handle_new_user` RPC warnings
  were **fixed** in `0005_advisor_fixes.sql`. Covering indexes added for two FKs.
- **Intentional remaining warnings:** `rls_policy_always_true` on all 10 tables is **by design
  for v1** (founders = full access); role-scoped RLS is a Phase 5 task. "Unused index" advisories
  are expected on an empty DB and clear once data/queries arrive.
- **Money** is `numeric(12,2)` INR; "today" = Asia/Kolkata (order_no uses IST year).

---

## Open questions for the team (from `docs/project.md` §13)
- [ ] Exact sender phone digits for the label FROM block (currently `8003790347`).
- [ ] `order_no` yearly reset? (currently a **global** sequence — does not reset per year.)
- [ ] Courier(s) to template beyond Speed Post (Delhivery?).
- [ ] Does COD vs prepaid split matter for v1 dashboard KPIs?

---

## Upcoming phases (not started)

- [x] **Phase 1** — Core ops: products, customers, manual orders, lifecycle, inventory. ✅
- [x] **Phase 2** — Labels: A4 PDF + QR + courier/AWB + storage + reprint. ✅
- [x] **Phase 3** — Dashboard: KPIs, charts, filters, CSV. ✅
- [x] **Phase 4** — Website auto-import API (+ Amazon CSV). ✅ fully verified
- [x] **Phase 5** — Polish: audit-log UI, alerts, role RLS, performance. ✅ verified
