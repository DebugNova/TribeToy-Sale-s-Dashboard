# 00 — Overview

> **Second brain entry point.** Read this first. It explains what we're building, why,
> what's in scope vs. deferred, and how the work is phased. Every other doc in `docs/`
> drills into one area.

## What is TribeToy?

TribeToy is a company that **designs, 3D-prints, and sells toys**. It is incubated at the
**Technology Incubation Centre (TIC), IIT Guwahati**. Orders are currently shipped via
**India Post Speed Post**, and **shipping labels are written by hand** today.

## The problem

Operations are fragmented:
- Orders arrive across multiple channels (a custom website, Amazon, Instagram/WhatsApp DMs, phone, in-person) and get tracked in spreadsheets/chats.
- Shipping labels are handwritten → slow, inconsistent, error-prone.
- No single place to see what sold, what's pending, what shipped, and the business numbers.

## What we're building (v1)

A **web-based sales & operations dashboard** that does three things well:

1. **Capture every order** — one normalized place for all channels.
2. **Print clean labels** — auto-generate an A4 parcel label per order (replaces handwriting).
3. **See the numbers** — a real dashboard of sales, orders, top SKUs, trends, low stock.

It is built lean now, but the **data model and architecture are designed so the bigger
vision can be added later without a rewrite.**

## North star (NOT v1)

The provided PDF, "Tribetoy Commerce OS," is an **aspirational, AI-generated spec** for a
full 8-module commerce platform. We treat it as the long-term direction, not the v1 build.
See [07-roadmap.md](07-roadmap.md) for what's explicitly deferred (B2B CRM, automated
marketplace sync, finance reconciliation, demand forecasting, multi-warehouse, full RBAC).

## Locked decisions (from product discussion)

| Topic | Decision |
|---|---|
| Scope | Orders + labels + analytics, built in **phases** |
| Stack | Next.js (App Router) + Supabase (Postgres/Auth/Storage) + Tailwind, on Vercel |
| Auth/roles | **Founders only** now (full access); role enums reserved for later |
| Website | **Custom-coded** → auto-import via a secure intake API we build |
| Amazon | **Manual entry** by staff |
| Other channels | **Universal manual order form** (IG, WhatsApp, phone, in-person, Amazon) |
| Labels | **A4 layout** (normal printer); supports address block + courier/AWB + multiple templates |
| Locale | India — **INR** currency, **GST** tax-rate fields (full GST invoicing deferred) |

## Default sender (for label header)

Pulled from the actual parcel photo; stored as **editable settings**, not hard-coded:

```
TribeToy Pvt Ltd
TIC, IIT Guwahati
Guwahati, Assam — 781039
Phone: ~8003790347  (confirm exact number)
```

## Phase map (build order)

| Phase | Focus |
|---|---|
| 0 | Scaffold: Next.js + Tailwind + Supabase + founder auth + base nav + deploy |
| 1 | Core ops: products, customers, manual order form, order list/detail, status, basic inventory |
| 2 | Labels: A4 generator (TO/FROM, items, order ID, QR), courier/AWB, PDF storage, reprint |
| 3 | Dashboard: KPI cards, trends, channel split, top SKUs, low-stock, filters, CSV export |
| 4 | Website auto-import: secure intake API, normalize, dedupe; optional Amazon CSV import |
| 5 | Polish: audit logs, low-stock flags, role scaffolding (RLS), refinements |

## How the docs fit together

- [01-architecture.md](01-architecture.md) — stack, folder layout, conventions, env vars
- [02-data-model.md](02-data-model.md) — tables, columns, enums, relationships
- [03-channels.md](03-channels.md) — how orders get in (intake API, Amazon, manual)
- [04-order-lifecycle.md](04-order-lifecycle.md) — states, transitions, guard rules
- [05-label-spec.md](05-label-spec.md) — the A4 parcel label
- [06-dashboard-metrics.md](06-dashboard-metrics.md) — KPI/chart/filter definitions
- [07-roadmap.md](07-roadmap.md) — phases, deferred features, acceptance criteria
