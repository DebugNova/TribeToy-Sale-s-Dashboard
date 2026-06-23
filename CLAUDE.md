# CLAUDE.md — TribeToy Commerce Dashboard

A web-based **sales & operations dashboard** for **TribeToy** (designs, 3D-prints, and sells
eco-friendly toys; incubated at **TIC, IIT Guwahati**). It captures orders from every channel
into one place, prints **A4 shipping labels** (replacing today's handwritten ones), and shows
sales analytics. Built lean now, on a schema/architecture designed to grow into the larger
"Commerce OS" vision without a rewrite.

> **Status (2026-06):** Phases **0–5 complete & verified — v1 is feature-complete**, plus a
> brand/UI redesign — lighter green, a custom `Select` replacing every native dropdown, a custom
> `DateRangePicker`, and more detailed charts (see [Frontend & UI/UX rules](#frontend--uiux-rules-read-before-any-ui-task)
> + [Design system](#design-system)). See [PROGRESS.md](PROGRESS.md) for
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
  the shell; `page.tsx` is the analytics dashboard. Its client pieces: `filter-bar.tsx`
  (filters → URL query, Apply/Reset run in a `useTransition`), `date-range-picker.tsx` (custom
  branded calendar — **not** a native date input), `dashboard-charts.tsx` (Recharts: gradients,
  branded tooltip, avg reference line, area fill, value labels), `top-skus.tsx` (sort-tab swap
  with a loading transition). Sub-routes: `orders/`, `products/`, `customers/`, `inventory/`,
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
- `form.tsx` — exports **`inputClass`**, `SubmitButton`, `TextField`, `SelectField`
  (wraps `Select`), field wrappers.
- **`select.tsx` — the one custom dropdown** (`Select` + `SelectOption`). Keyboard nav,
  optional `searchable`, click-outside/Esc, ARIA listbox; hidden `<input>` for forms.
  **Use it for every dropdown — never a native `<select>`.** Modes: controlled
  (`value`+`onValueChange`), uncontrolled (`defaultValue`), or form (`name`).
- `table.tsx` — exports **`thClass` / `tdClass` / `DataTable`**.
- `spinner.tsx` (`Spinner`, `HamburgerLoader`, `LoadingState`), `skeleton.tsx`.
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

## Frontend & UI/UX rules (read before ANY UI task)

These are hard rules, learned from real feedback on this repo. Follow them so a UI request is
done **right and in full on the first pass**.

1. **Scope it before you touch code.** Restate what "done" means for the request, then make a
   short todo list and do *all* of it. The user's UI asks are broad on purpose ("professional
   everywhere", "best UI/UX") — that means **every matching instance**, not one example. Doing
   one and stopping is the #1 mistake here; don't repeat it.
2. **Never ship a native browser control in the UI.** They look dated and are the first thing
   the user rejects. Specifically:
   - Dropdowns → **`Select` from `components/select.tsx`** (never `<select>`/`<option>`).
   - Date / date-range → **`DateRangePicker`** (`app/(dashboard)/date-range-picker.tsx`), never
     `<input type="date">`. (Two single-date filters on `orders`/`audit` are the only remaining
     native date inputs — replace them too if you touch those forms.)
   - Custom popovers must be: whole trigger clickable (not just an icon), keyboard-accessible,
     close on outside-click/Esc, animate with `.animate-fade-rise`.
3. **Apply a pattern site-wide.** Before saying a UI pattern is done, `grep` the whole repo for
   every instance (e.g. ``<select``, ``type="date"``, the class you changed) and update each
   one. "Professionalize the dropdowns" means *all* dropdowns on *all* pages.
4. **"Modernize / professionalize / make it best UI-UX" decodes to:** replace native controls
   with the custom branded components, add real detail (gradients, branded tooltips, loading
   transitions, hover/active/focus states, empty states), and keep it visually consistent —
   *not* just a colour tweak. A colour change alone will be rejected.
5. **Restyle via the shared primitives so it cascades** (see Design system). Don't hand-style
   one page; change `select.tsx` / `form.tsx` / `page-header.tsx` / `table.tsx` / `panel` /
   `kpi-card` / globals.css tokens and let every page inherit it.
6. **Green is intentionally light.** The brand ramp in `globals.css` was lightened (primary
   `brand-600 #5f9e2b`). Keep greens in this light spring-leaf range; don't darken back.
7. **Verify, then be honest.** Always `npm run build` (type-check) **and** `npm run lint` before
   claiming done. For visible UI, offer to run `npm run dev` and say plainly what you did and
   did **not** visually confirm (the dashboard is auth-gated; there's no browser tool in-session,
   so screenshots aren't available — don't claim a screenshot you didn't take).

**Definition of done for a UI change:** build clean · lint clean · every matching instance
updated · no native `<select>`/date input introduced · responsive (mobile drawer + small
screens) · keyboard + focus states intact · honest note on what was/wasn't visually checked.

## Design system

UI matches the TribeToy storefront: **light leaf-green / blush-pink / warm-cream**. Tokens live
in [app/globals.css](app/globals.css) under Tailwind v4 `@theme`, so utilities like `bg-brand-600`,
`text-blush-500`, `bg-cream-100`, `border-line` exist app-wide. The green ramp is intentionally
**light** (primary `brand-600 #5f9e2b`). Font is **Nunito** (variable, self-hosted via
`next/font`); mono kept for SKUs/AWBs. Reusable motion keyframes live in `globals.css`:
`.animate-fade-rise` (popovers), `.animate-drawer`, `.skeleton`, `.spinner`, `.hamburger-loader`
— all frozen under `prefers-reduced-motion`.

**To restyle, edit the shared primitives — they cascade to every page** (the class constants
in `page-header.tsx`, `form.tsx`, `table.tsx`, plus `panel`/`kpi-card`/`status-badge`/
`nav-links`, and the `Select` in `select.tsx`). Layout/responsiveness lives in `app-shell.tsx`.
Logo: `public/tribetoy-logo.png`. Body-text `text-gray-*` was intentionally left (reads fine on
cream); the dark code block in `settings/intake-panel.tsx` is intentional. Keep it responsive +
light for low-end devices.

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
