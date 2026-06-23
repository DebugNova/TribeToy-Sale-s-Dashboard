# Phases — Index & How to Use

> Each phase doc is **fully self-contained and A-Z**: goal, prerequisites, npm packages,
> env vars, **all Supabase/backend work (SQL migrations, RLS, storage, server logic)**,
> frontend, a step-by-step task checklist, acceptance criteria, and verification. You should
> be able to open one phase in a brand-new conversation and execute it end to end.

## Read order for a fresh conversation

1. [../project.md](../project.md) — the master project document (always read first).
2. The relevant detail docs in [`../`](../) (data model, channels, lifecycle, label, metrics).
3. The phase file below you're building.
4. The matching prompt in [../phase-prompts.md](../phase-prompts.md).

## Phases

| # | File | Builds | Depends on |
|---|---|---|---|
| 0 | [phase-0-scaffold.md](phase-0-scaffold.md) | App + Supabase project + **full schema** + auth + nav + deploy | — |
| 1 | [phase-1-core-operations.md](phase-1-core-operations.md) | Products, customers, manual orders, lifecycle, inventory | 0 |
| 2 | [phase-2-labels.md](phase-2-labels.md) | A4 label PDF + QR + courier/AWB + storage + reprint | 1 |
| 3 | [phase-3-dashboard.md](phase-3-dashboard.md) | KPIs, charts, filters, CSV export | 1 (better after 2) |
| 4 | [phase-4-website-import.md](phase-4-website-import.md) | Secure website intake API + optional Amazon CSV | 1 |
| 5 | [phase-5-polish.md](phase-5-polish.md) | Audit-log UI, alerts, role RLS, perf | 1–4 |

## Conventions used in every phase doc

- **Backend first, then frontend.** Migrations are applied via the **Supabase MCP**
  (`apply_migration`) and also saved as files in `supabase/migrations/`.
- SQL blocks are **copy-paste ready** Postgres. Apply them in order.
- File paths are relative to the app root (`tribetoy-dashboard/`).
- After each phase: run `npm run build` + `npm run lint`, click through the UI, and run the
  phase's **Verification** section before moving on.
- Don't start a later phase until the previous phase's **Acceptance criteria** pass.

## Status tracker (update as you go)

- [x] Phase 0 — Scaffold ✅
- [x] Phase 1 — Core operations ✅
- [ ] Phase 2 — Labels
- [ ] Phase 3 — Dashboard
- [ ] Phase 4 — Website import
- [ ] Phase 5 — Polish
