# TribeToy Commerce Dashboard — Full A‑Z Audit

**Date:** 2026‑06‑23 · **Scope:** every file, all `lib/` business logic, all `app/` routes &
components, all 10 SQL migrations, and the **live Supabase backend** (project
`itvjtmwteyqqakhtfajd`, region `ap-south-1`) via the Supabase MCP.
**Verdict:** ✅ **PASS — v1 is feature‑complete and working end‑to‑end.** Build, lint and
TypeScript are clean; the live DB matches the code; security advisors show no critical
findings; and every phase's verification re‑ran green against the live database.

There are **no code defects**. The only open items are **operational go‑live chores**
(test users with weak passwords, demo seed data, password rotation) that were intentionally
left in place by the build and are documented below.

---

## 1. How this audit was performed

| Area | Method | Result |
|---|---|---|
| Code build | `npm run build` (Next 16 + Turbopack) | ✅ Compiled, TypeScript clean, 18 routes generated |
| Linting | `npm run lint` (ESLint 9) | ✅ Exit 0, no warnings |
| Migrations | Read all 10 `.sql` files line‑by‑line | ✅ Internally consistent |
| Live schema | MCP `list_tables` / `list_migrations` / `execute_sql` | ✅ Matches migrations exactly |
| Security | MCP `get_advisors` (security) | ✅ No criticals — only by‑design WARNs |
| Performance | MCP `get_advisors` (performance) | ✅ Only INFO `unused_index` (empty‑table noise) |
| Business logic | Read every file in `lib/` | ✅ Guards/audit/totals all correct |
| Live behaviour | Ran each phase's verification SQL on throwaway rows | ✅ All green (details §5) |
| Secrets hygiene | `git ls-files`, `.gitignore` review | ✅ No secrets tracked |

All write‑based DB tests ran on **isolated throwaway rows** (explicit `order_no`, so the
production `order_no` sequence was **not** consumed) and were **rolled back or deleted** —
production data counts were verified unchanged afterward (§5.6).

---

## 2. What was verified working

### 2.1 Code quality & build
- **Stack confirmed:** Next.js 16.2.9 (App Router, Turbopack, `proxy.ts` convention), React
  19, TypeScript, Tailwind v4, Supabase SSR, Recharts, `@react-pdf/renderer`, Zod.
- **`npm run build`** → compiled in ~4.4s, TypeScript in ~4.9s, **18 routes** including
  `/audit`, `/alerts`, `/orders/import`, and the `/api/intake/website` Node route. Proxy
  (middleware) present.
- **`npm run lint`** → clean (exit 0).
- **Conventions honoured throughout:** all DB writes go through `lib/` functions; money is
  `numeric(12,2)` with `round2()`; "today"/day‑buckets are **Asia/Kolkata**; the service‑role
  key is `server-only`.

### 2.2 Database schema (live, matches migrations)
- **11 tables**, all with **RLS enabled**: `profiles, customers, products, inventory, orders,
  order_items, shipments, payments, audit_logs, settings, intake_events`.
- **1 functional view** `inventory_available` (+ 3 analytics views `v_daily_sales`,
  `v_channel_split`, `v_top_skus`) — all `security_invoker`.
- **8 enums**, **6 public triggers** + `on_auth_user_created` on `auth.users`.
- **44 RLS policies** = **11 tables × 4 commands** (exactly **one policy per `(table, command)`**
  after the 0010 consolidation — no `multiple_permissive_policies`).
- **Key constraints present:** `orders_channel_source_uniq` (dedupe), `settings_singleton`
  (`id = 1`), `inventory_nonneg` (no negative stock), `order_items.qty > 0`.
- **10 migrations applied**, matching `supabase/migrations/` 0001–0010 (the live name of #8 is
  `intake_log`; everything else lines up with the ledger in `PROGRESS.md`).

### 2.3 Order lifecycle & inventory (live RPC test — all exact)
Ran reserve → release → re‑reserve → dispatch → return on a throwaway product (on_hand 10):

| Step | Result | Expected | ✅ |
|---|---|---|---|
| reserve(qty 3) | reserved 3, available 7 | 3 / 7 | ✅ |
| release (cancel) | reserved 0, available 10 | 0 / 10 | ✅ |
| dispatch | on_hand 7, reserved 0 | 7 / 0 | ✅ |
| return (restock) | on_hand 10, damaged 0 | 10 / 0 | ✅ |
| reserve(qty 999) | **blocked** `INSUFFICIENT_STOCK`, reserved stays 0 (atomic, no partial) | blocked | ✅ |
| dedupe insert | 2nd `(channel, source_order_id)` blocked by unique constraint | blocked | ✅ |
| self‑audit | RPCs wrote `inventory.reserve ×2 / release ×1 / dispatch ×1 / return ×1` | yes | ✅ |

The `transition()` funnel runs the inventory RPC **before** the status update, so a stock
failure blocks the whole transition (no status/stock drift). Illegal transitions are blocked
by the `TRANSITIONS` map.

### 2.4 Role‑based access control (RLS) — full matrix verified live
Impersonated each of the 5 roles via `request.jwt.claims` (Postgres role held at
`authenticated`); every write probe was rolled back via savepoints. **All cells match the
intended matrix:**

| table (write) | admin | ops | warehouse | sales | finance |
|---|:--:|:--:|:--:|:--:|:--:|
| products | ✅ | — | — | — | — |
| customers | ✅ | — | — | ✅ | — |
| inventory | ✅ | ✅ | ✅ | — | — |
| orders / order_items | ✅ | ✅ | — | ✅ | — |
| shipments | ✅ | ✅ | ✅ | — | — |
| payments | ✅ | — | — | — | ✅ |
| settings | ✅ | — | — | — | — |
| **audit_logs (read)** | ✅ | — | — | — | — |

Reads of operational tables are allowed for all roles (RLS scopes the rows); `audit_logs` is
**admin‑read / all‑insert**; `settings`, `products`, `audit` viewer are admin‑gated both in
RLS **and** in the UI (`requireCapability` redirect + hidden buttons — defense‑in‑depth).

### 2.5 Analytics (live cross‑checks — all consistent)
- `dashboard_channel_split()` **==** canonical `v_channel_split` for all 6 channels.
- `dashboard_kpis()` **==** a hand‑written recomputation: revenue **₹41,857**, orders **16**,
  AOV **₹2,616.06**, returns **2**, pending **4** (revenue correctly **excludes** cancelled +
  refunded). *(These exceed the old ledger's ₹40,658/15 by exactly the one new real order
  `TT-2026-0001`, ₹1,199 — internally consistent.)*
- `low_stock_alerts()` → `TT-PUZ-03 (3/5)`, `TT-ROBO-02 (5/10)`.
- `inventory_available` view math has **zero** mismatches.
- **Top SKUs** produce three **distinct** orderings for qty / revenue / margin.
- All RPCs are `STABLE`, pin `search_path`, and are execute‑locked to `authenticated`.

### 2.6 Secure website intake API
- `POST /api/intake/website`: raw‑body **HMAC‑SHA256** verify (timing‑safe, never throws) →
  **401** on bad/missing signature → JSON parse **400** → Zod validate **400** (logged) →
  `persistOrder(admin, null, …)` → **200** `{created|duplicate}` / **500** (logged, never a
  silent drop). `GET` → **405**. Route is correctly marked **public** in the proxy so it isn't
  redirected to `/login`, and runs on the **Node runtime** with `force-dynamic`.
- Shares the exact `persistOrder` core (guards/totals/dedupe/audit) with the manual form and
  the Amazon importer — one validated path, three callers. Unknown SKUs are stored
  (`product_id` null), not rejected. Channel is forced server‑side in the importer.

### 2.7 Labels, masking, audit, alerts
- A4 PDF via `@react-pdf/renderer` using **built‑in Helvetica** (no network fetch);
  `serverExternalPackages` keeps it out of the bundle. QR = bare `order_no`, then
  `order_no + AWB` on reprint. One shipment row per order; versioned PDF paths keep history;
  print history (who/when) comes from `audit_logs`. Storage bucket `labels` is **private** with
  3 authenticated policies (read/write/update; no delete by design).
- Sensitive fields (customer/ship phone, payment refs) are masked to last‑4; **reveal is
  audit‑logged** (`sensitive.reveal`) and reads go through the caller's RLS client.
- Alerts (low‑stock + 3‑day stuck orders) drive the nav badge and `/alerts` panel.

### 2.8 Secrets & deployment hygiene
- No `.env*` files are tracked by git; `.gitignore` covers `.env*`.
- Four env vars used: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public),
  `SUPABASE_SERVICE_ROLE_KEY` (server‑only, behind the `server-only` admin client),
  `INTAKE_WEBHOOK_SECRET` (server‑only).

---

## 3. Findings & recommendations

### 3.1 Critical / blocking
**None.** No code or schema defects were found.

### 3.2 Security advisors (live `get_advisors`)
All are **by‑design** and were already accepted in `PROGRESS.md`:
- `authenticated_security_definer_function_executable` ×5 — `current_role()` + the 4 inventory
  RPCs. They must be `SECURITY DEFINER` (read `profiles` / write `audit_logs`); execute is
  locked to `authenticated`, and those callers already have table access under RLS, so this
  grants **no escalation**. `anon` was correctly revoked in 0010.
  → *Optional future hardening:* move these helpers to a non‑exposed schema so they aren't
  reachable via `/rest/v1/rpc/...` at all. Not required for v1.
- `auth_leaked_password_protection` (WARN) — a **dashboard toggle**, not code.
  → **Action:** enable Supabase → Auth → Password security before go‑live.

Performance advisors: only `unused_index` (INFO) on a near‑empty DB — expected; clears with
real traffic. No action.

### 3.3 Go‑live chores (operational, not bugs)
These were intentionally left by the build so the app stays verifiable; clean them before the
dashboard becomes the system of record:

1. **Change the founder password** — `kaustab.borah44@gmail.com` currently has the temporary
   bootstrap password that was shared in plain text.
2. **Delete the 4 test role users** (`ops/warehouse/sales/finance.test@tribetoy.test`, shared
   weak password `Test1234!`). They exist only so you can manually verify UI role‑gating
   (Section 10 of `manual-test.md`). Remove via Auth → Users (profiles cascade) or
   `delete from auth.users where email like '%@tribetoy.test'`.
3. **Decide on the 17 `DEMO-####` seed orders** — Phase‑3 analytics sample data still in the
   DB (it's why the dashboard shows numbers). Clear with `delete from orders where order_no
   like 'DEMO-%'` (delete `order_items` first) for a clean production slate, or keep for a demo.
4. **Rotate `SUPABASE_SERVICE_ROLE_KEY`** if it was ever pasted into a chat, then update
   `.env.local` **and** Vercel.
5. **Vercel deploy** is not done yet (Phase 0 step 11) — import repo, add the 4 env vars,
   deploy, verify login on the URL.
6. **Automated backups** — Free plan has none; upgrade to Pro + enable PITR before go‑live
   (steps in `docs/backups.md`).

### 3.4 Minor observations (no action needed)
- `CLAUDE.md`'s status header still reads *"Next up: Phase 2"* while `PROGRESS.md` correctly
  shows **all phases 0–5 complete**. Cosmetic doc drift — consider syncing the header.
- Live migration #8 is named `intake_log` (not `0008_intake_log`) in Supabase's ledger; the
  saved file is `0008_intake_log.sql`. Harmless naming nuance already noted in `PROGRESS.md`.
- The manual order form intentionally does not surface per‑line GST (prices treated as final);
  the schema + `persistOrder` support tax if needed later.
- One genuine real order `TT-2026-0001` (amazon, `label_generated`, ₹1,199) exists with its
  shipment; `order_no_seq` correctly sits at 1 → the next order is `TT-2026-0002`. Healthy.

---

## 4. Open product questions (from `docs/project.md` §13 — for the team, not bugs)
- Exact sender phone for the label FROM block (currently `8003790347`).
- Should `order_no` reset yearly? (Currently a **global** sequence, no per‑year reset.)
- Courier templates beyond Speed Post (Delhivery?).
- Does a COD vs prepaid split matter for v1 dashboard KPIs?

---

## 5. Test evidence (live DB, this session)

1. **Analytics consistency** — RPC == view (6/6 channels); KPI RPC == manual recompute
   (₹41,857 / 16 / 2 / 4); low‑stock PUZ+ROBO; view math 0 mismatches; 3 distinct Top‑SKU
   orderings.
2. **Inventory lifecycle** — reserve/release/dispatch/return all exact; `INSUFFICIENT_STOCK`
   atomic block; dedupe constraint; 5 self‑audit rows; **0 leftovers after cleanup**.
3. **RLS matrix** — 5 roles × 7 representative cells, every cell matched the intended matrix
   (a first probe's two "false blocks" were diagnosed as FK artifacts of the test and
   re‑probed correctly).
4. **Schema inventory** — 6 triggers + auth trigger, 44 policies, 8 enums, 6 SECURITY DEFINER
   funcs, 3 key constraints, 4 views, private `labels` bucket + 3 policies.
5. **Residue check** — post‑test counts unchanged: products 6, customers 5, orders 18,
   payments 0, inventory 6, audit_logs 9, settings sender unchanged. **Nothing leaked.**

> A companion **`manual-test.md`** (beginner‑friendly, click‑by‑click) accompanies this report
> so a non‑technical founder can re‑confirm every feature in the browser.
