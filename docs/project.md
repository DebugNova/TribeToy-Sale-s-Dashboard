# TribeToy Commerce Dashboard — Master Project Document

> **This is the single source of truth for the whole project.** If you are an AI assistant
> or developer starting fresh, read this top to bottom, then open the phase doc you're
> working on in [`phases/`](phases/). Deep-dives live in the other files in [`docs/`](.).

---

## 1. What this is

A **web-based sales & operations dashboard** for **TribeToy** — a company that designs,
3D-prints, and sells toys, incubated at the **Technology Incubation Centre (TIC), IIT
Guwahati**. Orders ship via **India Post Speed Post** today, and **shipping labels are
written by hand**.

The dashboard does three core jobs:

1. **Capture every order** from all sales channels into one normalized place.
2. **Print clean A4 shipping labels** per order (replaces handwriting).
3. **Show the business numbers** — sales, orders, AOV, top SKUs, trends, low stock.

It is built lean now, but the schema and architecture are designed so the bigger vision
(B2B CRM, marketplace sync, finance reconciliation, forecasting) can be layered on **without
a rewrite**.

### North star vs. v1
The provided PDF, *"Tribetoy Commerce OS,"* is an **aspirational, AI-generated** 8-module
platform spec. Treat it as long-term direction, **not** the v1 build. What's deferred is
listed in §11 and [phases/README.md](phases/README.md).

---

## 2. Locked product decisions

| Topic | Decision |
|---|---|
| Scope | Orders + labels + analytics, delivered in **phases** |
| Stack | **Next.js (App Router) + TypeScript + Tailwind**, **Supabase** (Postgres/Auth/Storage), **Vercel** |
| Auth / roles | **Founders only** now (full access). Role enums exist but aren't enforced until Phase 5 |
| Website channel | **Custom-coded site** → orders auto-import via a **secure intake API** we build |
| Amazon channel | **Manual entry** by staff (optional CSV import later) |
| Other channels | **Universal manual order form** (Instagram, WhatsApp, phone, in-person, B2B) |
| Labels | **A4 layout** (normal printer); address block + items + QR + courier/AWB; multi-courier templates |
| Locale / money | India — **INR**, GST tax-rate fields. Money stored as `numeric(12,2)` (never floats) |
| Timezone | **Asia/Kolkata** for "today" boundaries |

### Default sender (label FROM block) — editable in Settings, NOT hard-coded
```
TribeToy Pvt Ltd
TIC, IIT Guwahati
Guwahati, Assam — 781039
Phone: 8003790347   (confirm exact digits)
```

---

## 3. Technology stack (with rationale)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js App Router + React + TypeScript | One framework for UI + API; SSR for fast dashboards |
| Styling | Tailwind CSS | Fast, consistent UI |
| Charts | Recharts | Lightweight declarative charts |
| Backend logic | Next.js Route Handlers + Server Actions | Co-located logic, no separate server |
| Database | Supabase Postgres | Managed Postgres, relational integrity, RLS |
| Auth | Supabase Auth | Email/password; extensible to roles |
| Storage | Supabase Storage | Label PDFs |
| Validation | Zod | Validate forms + intake payloads |
| PDF | @react-pdf/renderer | Generate A4 label PDFs |
| QR | qrcode | Encode order ref into label |
| Hosting | Vercel | First-class Next.js hosting + previews |
| Schema | Supabase SQL migrations | Versioned, migration-based changes |

---

## 4. System architecture

```
                ┌──────────────────────────────────────────────┐
  Custom site ──┤ POST /api/intake/website  (HMAC-signed)       │
                │            │                                   │
  Manual form ──┤   lib/channels/normalizeOrder.ts  (1 shape)   │
  (Amazon/IG/   │            │                                   │
   WA/phone)    │   lib/orders/lifecycle.ts (guards + inventory) │
                │            │                                   │
                │   Supabase Postgres  ── RLS ── Storage (PDFs)  │
                │            │                                   │
  Founders  ────┤   Next.js (SSR pages + Server Actions)        │
   (browser)    │   Dashboard · Orders · Products · Labels       │
                └──────────────────────────────────────────────┘
```

Principles:
- **One normalized `orders` shape**; every channel maps into it via an adapter.
- **All writes go through `lib/` business-logic functions** (guards + audit stay consistent).
- **Migration-based schema**; never hand-edit the DB.
- **RLS on from day one** (v1: authenticated founder = full access).
- **Service-role key used only server-side** in the intake API.

### Target folder structure
```
tribetoy-dashboard/
├─ app/
│  ├─ (auth)/login/
│  ├─ (dashboard)/
│  │  ├─ page.tsx                  # dashboard (KPIs + charts)
│  │  ├─ orders/{page, new, [id]}
│  │  ├─ products/  customers/  inventory/  shipments/  settings/
│  └─ api/intake/website/route.ts  # secure website intake
├─ components/                     # tables, forms, KPI cards, charts, label
├─ lib/
│  ├─ supabase/   (server.ts, browser.ts, admin.ts)
│  ├─ channels/   (normalizeOrder.ts + adapters)
│  ├─ orders/     (lifecycle.ts)
│  ├─ labels/     (label.tsx, pdf.ts, qr.ts)
│  └─ analytics/  (metric queries)
├─ supabase/migrations/           # SQL migrations
├─ docs/                          # this second brain
└─ config: next.config, tailwind.config, tsconfig, .eslintrc, .env.local
```

### Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server-only
INTAKE_WEBHOOK_SECRET=         # shared secret the website signs intake requests with
```

---

## 5. Data model (summary)

Full column-level detail: [02-data-model.md](02-data-model.md). Tables:

`profiles` · `customers` · `products` · `inventory` · `orders` · `order_items` ·
`shipments` · `payments` · `audit_logs` · `settings`, plus the `inventory_available` view.

Relationships:
```
customers 1─* orders 1─* order_items *─1 products 1─1 inventory
                   1─* shipments
                   1─* payments
profiles  1─* audit_logs / shipments(created_by)
```

Key integrity rules:
- `orders` UNIQUE `(channel, source_order_id)` → idempotent imports / dedupe.
- `products.sku` UNIQUE; `inventory.product_id` UNIQUE (single location in v1).
- Indexes on `orders(created_at)`, `orders(channel)`, `orders(status)` for dashboard speed.

---

## 6. Channels & intake

Full detail: [03-channels.md](03-channels.md).

| Channel | Entry | v1 |
|---|---|---|
| Website (custom) | Auto via `POST /api/intake/website` (HMAC) | Built in Phase 4 |
| Amazon | Manual form (`channel=amazon`) | Phase 1; CSV import optional Phase 4 |
| Instagram/WhatsApp/Phone/In-person | Manual form | Phase 1 |
| B2B/dealer | Manual form (`channel=b2b`) | Phase 1 (CRM deferred) |

Everything funnels through `lib/channels/normalizeOrder.ts` → `orders` + `order_items`,
saving the raw input to `orders.source_payload`.

---

## 7. Order lifecycle

Full detail: [04-order-lifecycle.md](04-order-lifecycle.md).

```
created → validated → (payment_confirmed | cod_approved) → reserved → packed
       → label_generated → dispatched → in_transit → delivered
side: cancelled / returned / refunded
```
Server-side guards enforce legal transitions. Inventory: `reserved += qty` on reserve;
`on_hand -= qty, reserved -= qty` on dispatch; release on cancel; restock on return. Every
status change + inventory mutation writes an `audit_logs` row.

---

## 8. Shipping label

Full detail: [05-label-spec.md](05-label-spec.md).

A4 PDF with TO (recipient), FROM (sender settings), order ref, courier + AWB, item summary,
weight, dispatch date, and a **QR code**. PDFs saved to Supabase Storage; reprintable;
traceable to the user who generated them.

**India Post note:** the Speed Post AWB (e.g. `ES016693300IN`) is issued by the post office
at booking — our label is the address+contents+QR block; the AWB is typed back into the
shipment afterward.

---

## 9. Dashboard & metrics

Full detail: [06-dashboard-metrics.md](06-dashboard-metrics.md).

KPI cards (sales, orders, AOV, returns, pending fulfillment, shipments today), trend charts
(revenue, orders, channel split), top SKUs, low-stock alerts, packing backlog. Persistent
filters (date/channel/city/customer-type/category) via URL params. CSV export.

---

## 10. Non-functional requirements

- **Performance:** dashboard fast with thousands of orders → SQL aggregation + indexes.
- **Reliability:** a failing channel must not lose orders (intake returns clearly; retries later).
- **Scalability:** channels/SKUs scale without redesigning the core model (adapter pattern).
- **Maintainability:** typed, modular, migration-based.
- **Auditability:** critical actions logged with who/what/when/before/after.
- **Security:** RLS, secrets in env, service role server-only, authenticated label/export access.

---

## 11. Phases & deferred scope

Phases (detail in [`phases/`](phases/)):

| Phase | Focus |
|---|---|
| 0 | Scaffold: app + Supabase schema + auth + nav + deploy |
| 1 | Core ops: products, customers, manual orders, lifecycle, inventory |
| 2 | Labels: A4 PDF + QR + courier/AWB + storage + reprint |
| 3 | Dashboard: KPIs, charts, filters, CSV |
| 4 | Website auto-import API (+ optional Amazon CSV) |
| 5 | Polish: audit log UI, alerts, role RLS, perf |

**Deferred (north-star, not v1):** automated Amazon/Shopify API sync, full B2B CRM (credit
limits, quotations, receivables), finance reconciliation & GST invoicing, notifications &
automation, demand forecasting / AI reorder, multi-warehouse routing, scan-to-pack hardware,
full 5-role RBAC.

---

## 12. Acceptance criteria (v1)

- [ ] Orders from any channel appear with **no duplicates**.
- [ ] An **A4 label** can be generated/printed for any ready-to-ship order.
- [ ] Inventory **reserves on confirm**, **decrements on dispatch**.
- [ ] Sales visible **by channel, date, SKU**.
- [ ] Lifecycle **guards** block illegal transitions.
- [ ] Critical actions appear in **audit logs**.
- [ ] Dashboard responsive with **thousands of orders**.

---

## 13. Open questions to confirm with the team

1. Exact sender phone digits for the label FROM block.
2. `order_no` format (planned default `TT-YYYY-####`; does it reset each year?).
3. Which courier(s) beyond Speed Post to template first (Delhivery?).
4. Whether COD vs prepaid split matters for v1 dashboard KPIs.
5. ~~Supabase project: create new vs. use an existing project/org.~~ **Resolved (Phase 0):**
   project `tribetoy-dashboard` (ref `itvjtmwteyqqakhtfajd`, org `TribeToy`, ap-south-1).
