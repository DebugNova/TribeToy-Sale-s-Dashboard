# CLAUDE.md — TribeToy Commerce Dashboard

A web-based **sales & operations dashboard** for **TribeToy** (designs, 3D-prints, and sells
eco-friendly toys; incubated at **TIC, IIT Guwahati**). It captures orders from every channel
into one place, prints **A4 shipping labels** (replacing today's handwritten ones), and shows
sales analytics. Built lean now, on a schema/architecture designed to grow into the larger
"Commerce OS" vision without a rewrite.

> **Status (2026-06):** Phases **0–5 complete & verified — v1 is feature-complete**, plus a
> brand/UI redesign (see [Design system](#design-system)). See [PROGRESS.md](PROGRESS.md) for
> the per-phase ledger and [AUDIT.md](AUDIT.md) for the last A–Z re-verification (build/lint
> clean, live DB matches code). Migrations **0001–0010** are applied. Before go-live, see
> AUDIT.md §3.3 chores (rotate keys, remove `*.test@tribetoy.test` users, change the founder
> password, optional demo-data cleanup, Vercel deploy, backups).

---

## Stack

Next.js **16** (App Router, Turbopack) + React 19 + TypeScript + **Tailwind v4** ·
**Supabase** (Postgres / Auth / Storage) · Recharts (charts) · @react-pdf/renderer + qrcode
(labels) · Zod (validation) · deployed on **Vercel**. The app lives at the **repo root** (no
`src/`). Path alias `@/*` → repo root.

## Commands

```bash
npm install      # install deps
npm run dev      # local dev (http://localhost:3000)
npm run build    # production build (also type-checks)
npm run lint     # eslint
```

Env vars live in `.env.local` (not committed): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable), `SUPABASE_SERVICE_ROLE_KEY` (**server-only**),
`INTAKE_WEBHOOK_SECRET` (HMAC for the website intake API).

---

## Repo map

### `app/` — routes (App Router)
- `(auth)/login/` — sign-in screen (client; Supabase password auth).
- `(dashboard)/` — the authenticated app. `layout.tsx` checks auth + loads role and renders
  the shell; `page.tsx` is the analytics dashboard; `dashboard-charts.tsx` + `filter-bar.tsx`
  are its client pieces. Sub-routes: `orders/`, `products/`, `customers/`, `inventory/`,
  `shipments/`, `alerts/`, `audit/`, `settings/` (each has `page.tsx` + local `*-form` /
  panel client components).
- `api/intake/website/route.ts` — signed (HMAC) webhook that ingests website orders.
- `layout.tsx` (root: fonts + metadata), `globals.css` (theme), `favicon.ico`.
- `proxy.ts` (**repo root**, not `app/`) — Next 16's renamed middleware; refreshes the
  Supabase session and protects `(dashboard)` routes via `lib/supabase/middleware.ts`.

### `lib/` — business logic (**all DB writes go through here**)
- `supabase/` — clients: `server.ts` (cookie-based, RSC/actions), `browser.ts` (client),
  `admin.ts` (**service-role, server-only**), `middleware.ts` (session refresh for `proxy.ts`),
  `database.types.ts` (generated — regenerate after schema changes).
- `auth/` — `actions.ts` (`signOut`), `roles.ts` (`roleCan`, `ROLE_LABEL`, `Role`).
- `orders/` — `transitions.ts` (state machine: statuses, allowed transitions, labels) +
  `lifecycle.ts` (guarded `transition()` that moves an order and writes audit/inventory).
- `products/`, `customers/`, `inventory/` — `actions.ts` CRUD + stock adjustments.
- `channels/` — `normalizeOrder.ts` / `persistOrder.ts` / `types.ts`: turn any channel's
  payload into a saved order.
- `intake/` — `website.ts`, `verifySignature.ts` (HMAC), `amazonCsv.ts` (CSV parser),
  `log.ts` (intake-event log).
- `labels/` — `label.tsx` (react-pdf A4 layout), `pdf.ts` (generate/reprint + signed URLs),
  `qr.ts`, `courier.ts`.
- `analytics/queries.ts` + `types.ts` — KPIs/charts/filters (**aggregation runs in SQL**).
- `alerts/queries.ts` — low-stock + packing-backlog (drives the nav badge).
- `sensitive/actions.ts` — reveal masked PII (audit-logged). `audit.ts` — audit helper.
- Utilities: `money.ts` (INR — `formatINR`, `round2`), `format.ts` (IST dates),
  `mask.ts` (PII), `validation.ts` (Zod), `types.ts` (shared enums/types), `export/toCsv.ts`.

### `components/` — shared, presentational UI (no direct DB access)
- `app-shell.tsx` — responsive chrome: sidebar on desktop, slide-in drawer on mobile.
- `brand-logo.tsx`, `nav-links.tsx` (route icons + active states).
- `page-header.tsx` — exports **`buttonPrimaryClass` / `buttonSecondaryClass`**.
- `form.tsx` — exports **`inputClass`**, `SubmitButton`, field wrappers.
- `table.tsx` — exports **`thClass` / `tdClass` / `DataTable`**.
- `panel.tsx`, `kpi-card.tsx`, `status-badge.tsx`, `export-csv-button.tsx`,
  `label-download-button.tsx`, `reveal-field.tsx`, `page-placeholder.tsx`.

### `supabase/migrations/` — `0001`–`0010` (init schema → triggers → RLS → storage → advisor
fixes → inventory RPCs → analytics → intake log → roles RLS). Folder numbering is monotonic;
the phase docs' later labels are offset by Phase 0 — trust the folder.

### Root config & top-level docs
`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs` ·
`README.md`, `GETTING-STARTED.md`, `DEPLOYMENT.md`, `PROGRESS.md`, `AUDIT.md`,
`manual-test.md`.

---

## Architecture & conventions (important)

- **Supabase is the backend.** Schema changes = a **new SQL migration** applied via the
  Supabase MCP (`apply_migration`) **and** saved in `supabase/migrations/`. Never hand-edit
  the DB. Regenerate `lib/supabase/database.types.ts` after schema changes.
- After any migration run `get_advisors` (security + performance) and fix findings.
- **All DB writes go through `lib/` functions** so guards + audit logging stay consistent.
  Don't write to tables directly from UI components.
- The **service-role key is server-only** (`lib/supabase/admin.ts`, used by the intake API).
  Never ship it to the client.
- Money is **INR**, stored as `numeric(12,2)` — never floats. "Today" = **Asia/Kolkata**.
- Auth: v1 was founders-only; **Phase 5 added real roles** (admin / staff …) enforced by RLS
  and surfaced via `lib/auth/roles.ts`. The shell hides admin-only nav (audit, settings).
- Order lifecycle is a guarded state machine — change states via `lib/orders/lifecycle.ts`,
  never by writing `status` directly.
- Match the style/conventions of surrounding code. Confirm before creating paid cloud
  resources or deploying.

## Design system

UI matches the TribeToy storefront: **leaf-green / blush-pink / warm-cream**. Tokens live in
[app/globals.css](app/globals.css) under Tailwind v4 `@theme`, so utilities like `bg-brand-600`,
`text-blush-500`, `bg-cream-100`, `border-line` exist app-wide. Font is **Nunito** (variable,
self-hosted via `next/font`); mono kept for SKUs/AWBs.

**To restyle, edit the shared primitives — they cascade to every page** (the class constants
in `page-header.tsx`, `form.tsx`, `table.tsx`, plus `panel`/`kpi-card`/`status-badge`/
`nav-links`). Layout/responsiveness lives in `app-shell.tsx`. Logo: `public/tribetoy-logo.png`.
Body-text `text-gray-*` was intentionally left (reads fine on cream); the dark code block in
`settings/intake-panel.tsx` is intentional. Keep it responsive + light for low-end devices.

---

## Docs — start here

1. **[docs/project.md](docs/project.md)** — master project document. Read first.
2. **[docs/phases/](docs/phases/)** — self-contained build plan per phase (goal → migrations →
   backend → frontend → acceptance → verification). [docs/phase-prompts.md](docs/phase-prompts.md)
   has copy-paste prompts.
3. Reference: [01-architecture](docs/01-architecture.md), [02-data-model](docs/02-data-model.md),
   [03-channels](docs/03-channels.md), [04-order-lifecycle](docs/04-order-lifecycle.md),
   [05-label-spec](docs/05-label-spec.md), [06-dashboard-metrics](docs/06-dashboard-metrics.md),
   [07-roadmap](docs/07-roadmap.md), [00-overview](docs/00-overview.md), [backups](docs/backups.md).

> The supplied "Tribetoy Commerce OS" PDF is the **north star, NOT the v1 scope.** Build only
> what the phase docs specify; everything else is deferred (project.md §11).

## Open questions to confirm with the team
See [docs/project.md](docs/project.md) §13 (sender phone, order_no yearly reset, courier
templates, COD/prepaid KPI split, which Supabase project to use).
