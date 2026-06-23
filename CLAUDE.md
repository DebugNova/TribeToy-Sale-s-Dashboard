# CLAUDE.md — TribeToy Commerce Dashboard

A web-based **sales & operations dashboard** for **TribeToy** (designs, 3D-prints, and sells
toys; incubated at **TIC, IIT Guwahati**). It captures orders from every channel into one
place, prints **A4 shipping labels** (replacing today's handwritten ones), and shows sales
analytics. Built lean now, with a schema/architecture designed to grow into the larger
"Commerce OS" vision without a rewrite.

---

## ⭐ Start here

1. **[docs/project.md](docs/project.md)** — the master project document. Read it first, always.
2. **[docs/phases/](docs/phases/)** — the build plan. Each phase file is fully self-contained
   (goal → Supabase migrations/RLS/storage → backend logic → frontend → checklist →
   acceptance → verification).
3. **[docs/phase-prompts.md](docs/phase-prompts.md)** — copy-paste prompt to start each phase
   in a fresh conversation.

### Detail docs (reference while building)
- [docs/01-architecture.md](docs/01-architecture.md) — stack, folder layout, conventions, env
- [docs/02-data-model.md](docs/02-data-model.md) — full Postgres schema, enums, relationships
- [docs/03-channels.md](docs/03-channels.md) — order intake (website API, Amazon, manual)
- [docs/04-order-lifecycle.md](docs/04-order-lifecycle.md) — states, transitions, guards
- [docs/05-label-spec.md](docs/05-label-spec.md) — A4 parcel label
- [docs/06-dashboard-metrics.md](docs/06-dashboard-metrics.md) — KPI/chart/filter definitions
- [docs/07-roadmap.md](docs/07-roadmap.md) — phases, deferred scope, acceptance criteria
- [docs/00-overview.md](docs/00-overview.md) — short orientation

---

## Stack

Next.js (App Router) + TypeScript + Tailwind · **Supabase** (Postgres / Auth / Storage) ·
Recharts · @react-pdf/renderer + qrcode (labels) · Zod (validation) · deployed on **Vercel**.

## Build order

Phases **0 → 5** (see [docs/phases/README.md](docs/phases/README.md)). Don't start a phase
until the previous one's acceptance criteria pass.

> **Status (2026-06-23):** Phases **0–5 are all complete & verified — v1 is feature-complete**
> — see [PROGRESS.md](PROGRESS.md) for the per-phase ledger and [AUDIT.md](AUDIT.md) for the
> latest full A–Z re-verification (build/lint clean, live DB matches code, no critical
> advisors). Migrations **0001–0010** are applied. Before go-live, see AUDIT.md §3.3 chores
> (rotate keys, remove the `*.test@tribetoy.test` users, change the founder password, optional
> demo-data cleanup, Vercel deploy, backups). Note: the phase docs' later migration labels
> (e.g. `0004_inventory_rpcs`, `0005_analytics`) are off by the Phase-0 offset — the saved
> folder is monotonic 0001–0010 instead.

| # | Builds |
|---|---|
| 0 | Scaffold: app + Supabase schema + auth + nav + deploy |
| 1 | Core ops: products, customers, manual orders, lifecycle, inventory |
| 2 | Labels: A4 PDF + QR + courier/AWB + storage + reprint |
| 3 | Dashboard: KPIs, charts, filters, CSV |
| 4 | Website auto-import API (+ optional Amazon CSV) |
| 5 | Polish: audit-log UI, alerts, role RLS, performance |

---

## Commands

```bash
npm install            # install deps
npm run dev            # local dev (http://localhost:3000)
npm run build          # production build
npm run lint           # eslint
```

## Working rules (important)

- The supplied "Tribetoy Commerce OS" PDF is the **north star, NOT the v1 scope**. Build only
  what the phase docs specify; everything else is deferred (see project.md §11).
- **Supabase is the backend.** Schema changes = a **new SQL migration** applied via the
  Supabase MCP (`apply_migration`) **and** saved in `supabase/migrations/`. Never hand-edit
  the DB. Re-generate `lib/supabase/database.types.ts` after schema changes.
- After any migration run `get_advisors` (security + performance) and fix findings.
- **All DB writes go through `lib/` business-logic functions** so guards + audit logging stay
  consistent. Don't write directly to tables from UI components.
- The **service-role key is server-only** (used in the Phase 4 intake API). Never ship it to
  the client.
- Money is **INR**, stored as `numeric(12,2)` — never use floats. "Today" = Asia/Kolkata.
- v1 auth is **founders only** (RLS = authenticated full access); real roles arrive in Phase 5.
- Match the style/conventions of surrounding code.
- Confirm before creating paid cloud resources or deploying.

## Open questions to confirm with the team
See [docs/project.md](docs/project.md) §13 (sender phone, order_no yearly reset, courier
templates, COD/prepaid KPI split, which Supabase project to use).
