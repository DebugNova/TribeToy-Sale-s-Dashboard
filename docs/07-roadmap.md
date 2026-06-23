# 07 — Roadmap, Deferred Scope & Acceptance Criteria

> The build order, what we are deliberately NOT building yet, and how we know each part works.

## Build phases

### Phase 0 — Scaffold
- Next.js (App Router) + TypeScript + Tailwind project.
- Supabase project; base schema migration (all tables from [02-data-model.md](02-data-model.md)).
- Founder auth (email/password), protected layout, base nav, `settings` row seeded.
- Deploy skeleton to Vercel; env wired.

### Phase 1 — Core operations
- Product catalog (CRUD) + inventory rows.
- Customers (CRUD).
- **Universal manual order form** with channel selector (incl. Amazon).
- Order list (filter/search) + order detail with status actions.
- Lifecycle guards + inventory reservation ([04-order-lifecycle.md](04-order-lifecycle.md)).

### Phase 2 — Labels
- A4 label generator ([05-label-spec.md](05-label-spec.md)) with QR.
- Courier + AWB fields; PDF saved to Storage; reprint + print history + traceability.

### Phase 3 — Dashboard
- KPI cards, trend charts, channel split, top SKUs, low-stock, packing backlog.
- Persistent filters; CSV export ([06-dashboard-metrics.md](06-dashboard-metrics.md)).

### Phase 4 — Website auto-import
- Secure `/api/intake/website` (HMAC), normalize → orders, dedupe via unique key.
- Optional Amazon CSV bulk import (same normalizer).

### Phase 5 — Polish
- Surface audit logs in UI, low-stock alerts, role scaffolding via RLS, perf tuning.

## Explicitly deferred (north-star, not now)

These are in the PDF but **out of v1 scope**:
- Automated Amazon/Shopify **API sync** (v1 = manual + optional CSV).
- Full **B2B CRM**: credit limits, quotations, negotiated pricing, receivables aging.
- **Finance/reconciliation**: marketplace settlement matching, margin/expense ledger, GST invoicing.
- **Notifications & automation** rules (email/SMS/WhatsApp to customers; ops alerts).
- **Demand forecasting / AI**, auto-reorder recommendations.
- **Multi-warehouse** routing; scan-to-pack hardware / mobile scanner app.
- **Full 5-role RBAC** with audit-on-everything (schema is ready; v1 = founder access).

## Acceptance criteria (from the spec, mapped to v1)

- [ ] A new order from any supported channel appears in the dashboard **without duplicates**
      (manual form + website intake; unique `(channel, source_order_id)`).
- [ ] A label can be **generated and printed** (A4) for any ready-to-ship order.
- [ ] Inventory **reserves on confirm** and **decrements on dispatch** correctly.
- [ ] Management can see **sales by channel, date, and SKU**.
- [ ] Lifecycle **guards** block illegal transitions (e.g. packed before reserved).
- [ ] Critical actions appear in **audit logs**.
- [ ] Dashboard stays responsive with **thousands of orders** (SQL aggregation + indexes).

## Open questions to confirm with the team

1. Exact sender phone digits for the label FROM block.
2. Internal `order_no` format preference (default planned: `TT-YYYY-####`).
3. Which courier(s) beyond Speed Post to template first (Delhivery?).
4. Whether COD vs prepaid split matters for the v1 dashboard KPIs.
