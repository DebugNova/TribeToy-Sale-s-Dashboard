# Phase Prompts — copy-paste to start each phase in a new conversation

> How to use: open a fresh conversation in this project, paste the **one prompt** for the
> phase you want to build, and send. Each prompt tells the assistant exactly which docs to
> read first so it has full context. Build phases **in order** (0 → 5); don't start a phase
> until the previous one's acceptance criteria pass.
>
> Tip: also have the assistant update `docs/phases/README.md` status checkboxes and the
> "Open questions" in `docs/project.md` as it goes.

---

## Before you start (every phase)
The assistant should always:
1. Read [`docs/project.md`](project.md) (master doc) first.
2. Read the specific phase file in [`docs/phases/`](phases/) and the detail docs it references.
3. Apply Supabase migrations via the Supabase MCP **and** save them to `supabase/migrations/`.
4. Run `npm run build` + `npm run lint` and the phase's Verification section before finishing.

---

## Phase 0 — Scaffold & Database Foundation

```
We're building the TribeToy Commerce Dashboard. Start Phase 0.

First read docs/project.md, then docs/phases/phase-0-scaffold.md and docs/02-data-model.md.

Execute Phase 0 end to end:
- Scaffold the Next.js (App Router) + TypeScript + Tailwind app and install the dependencies
  listed in the phase doc.
- Create/confirm the Supabase project, then apply migrations 0001_init_schema,
  0002_functions_triggers, 0003_rls via the Supabase MCP AND save them in
  supabase/migrations/. Create the private `labels` storage bucket + policies.
- Generate TypeScript types to lib/supabase/database.types.ts.
- Add the Supabase clients (browser/server/admin), middleware auth redirect, email/password
  login, the protected dashboard layout + nav with placeholder pages, and a minimal Settings
  page that edits the single settings row.
- Run build + lint, then run the Phase 0 Verification steps and report results.

Follow the data model exactly. Don't start Phase 1. Ask me before creating any paid Supabase
resources or deploying to Vercel.
```

---

## Phase 1 — Core Operations

```
Continue the TribeToy Commerce Dashboard. Start Phase 1 (Phase 0 is done).

First read docs/project.md, then docs/phases/phase-1-core-operations.md,
docs/04-order-lifecycle.md, and docs/03-channels.md.

Execute Phase 1 end to end:
- Apply migration 0004_inventory_rpcs (reserve/release/dispatch inventory functions) via the
  Supabase MCP and save it; re-generate types.
- Build lib/products, lib/customers, lib/inventory server actions (creating a product also
  creates its inventory row; stock adjustments require a reason and write audit logs).
- Build lib/channels/normalizeOrder.ts (createOrder) and lib/orders/lifecycle.ts (guarded
  transitions + inventory side-effects + audit logging) exactly per the lifecycle doc.
- Build the Products, Customers, Inventory screens and the Orders list + manual order form
  (channel selector incl. Amazon) + order detail with lifecycle action buttons and an audit
  view.
- Run build + lint, then run the Phase 1 Verification (reserve/dispatch/cancel math, blocked
  illegal transitions, dedupe) and report results.
```

---

## Phase 2 — Shipping Labels (A4 PDF)

```
Continue the TribeToy Commerce Dashboard. Start Phase 2 (Phases 0–1 done).

First read docs/project.md, then docs/phases/phase-2-labels.md and docs/05-label-spec.md.

Execute Phase 2 end to end:
- Confirm the `labels` storage bucket + policies exist (create if missing).
- Build lib/labels/qr.ts, lib/labels/label.tsx (A4 @react-pdf/renderer document per the label
  spec), and lib/labels/pdf.ts (generateLabel + getLabelSignedUrl): generate the PDF, upload
  to the private bucket, create/update the shipment row, transition the order to
  label_generated, and write audit logs.
- Wire the order-detail "Generate Label" flow (courier/AWB/dispatch date), download/print via
  signed URL, editable AWB, and print history. Build the Shipments list page.
- Run build + lint, then run the Phase 2 Verification (PDF fields, QR scans to order_no,
  storage object exists, reprint history, packed-guard) and report results.
```

---

## Phase 3 — Sales Dashboard & Reporting

```
Continue the TribeToy Commerce Dashboard. Start Phase 3 (Phases 0–2 done).

First read docs/project.md, then docs/phases/phase-3-dashboard.md and
docs/06-dashboard-metrics.md.

Execute Phase 3 end to end:
- Apply migration 0005_analytics (v_daily_sales, v_channel_split, v_top_skus, dashboard_kpis
  RPC) via the Supabase MCP and save it.
- Build lib/analytics/ query helpers and lib/export/toCsv.ts.
- Build the dashboard page: filter bar with state in URL params (date/channel/city/customer
  type/category), KPI cards, revenue & orders trends + channel split (Recharts), and Top SKUs
  / Low-stock / Packing-backlog tables, each with CSV export. Use INR formatting; do all
  aggregation in SQL.
- Seed varied data; run build + lint; run the Phase 3 Verification (numbers match SQL,
  filters persist) and report results.
```

---

## Phase 4 — Website Auto-Import (Secure Intake API) + Amazon CSV

```
Continue the TribeToy Commerce Dashboard. Start Phase 4 (Phase 1 done; 2–3 recommended).

First read docs/project.md, then docs/phases/phase-4-website-import.md and docs/03-channels.md.

Execute Phase 4 end to end:
- (Optional) apply migration 0006_intake_log for observability.
- Build lib/intake/verifySignature.ts (timing-safe HMAC-SHA256 over the raw body using
  INTAKE_WEBHOOK_SECRET) and app/api/intake/website/route.ts: verify signature (401 on fail),
  validate the payload with zod (400 on bad), normalize to channel='website', call
  createOrder (idempotent via the unique (channel, source_order_id) constraint), log to
  intake_events, and return created/duplicate/error clearly. Never silently drop an order.
- Add the Settings intake panel (endpoint, header, signing snippet) + recent intake activity.
- (Optional) build the Amazon CSV importer (channel='amazon', dedupe-safe).
- Run build + lint, then run the Phase 4 Verification (signed create, idempotent duplicate,
  401 unsigned, 400 malformed) and report results.
```

---

## Phase 5 — Polish (Audit UI, Alerts, Roles/RLS, Performance)

```
Continue the TribeToy Commerce Dashboard. Start Phase 5 (Phases 0–4 done).

First read docs/project.md, then docs/phases/phase-5-polish.md.

Execute Phase 5 end to end:
- Apply migration 0007_roles_rls: add current_role() and replace the blanket
  "authenticated = full access" policies with role-scoped policies for all tables per the role
  matrix. Create one test user per role and verify boundaries.
- Build the admin-only audit-log viewer (entity/actor/date filters, before→after diff),
  low-stock + packing-exception alerts (nav badge + panel), UI role gating, and masking of
  sensitive fields (phone/payment refs).
- Run get_advisors (security + performance); add indexes / materialized views (0008) if
  needed; confirm automated backups and document restore.
- Run build + lint, then run the Phase 5 Verification (per-role access, audit detail, alerts,
  advisors clean) and report results.
```

---

## Handy follow-up prompts (any phase)

- "Run get_advisors (security and performance) and fix the findings."
- "Re-generate the Supabase TypeScript types and fix any type errors."
- "Update docs/phases/README.md status and docs/project.md open questions to reflect what we
  just finished."
- "Run /code-review on the current diff."
