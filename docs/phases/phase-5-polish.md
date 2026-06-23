# Phase 5 — Polish (Audit UI, Alerts, Roles/RLS, Performance)

> **Goal:** Harden and round off v1: surface the audit trail in the UI, add low-stock/ops
> alerts, introduce **real role-based access** (scoped RLS for the 5 roles), and tune
> performance. After this, v1 is production-solid.

**Depends on:** Phases 0–4.

---

## 5.1 Scope
**In scope:** audit-log viewer, low-stock + packing-exception alerts, role enforcement
(RLS policies per role + UI gating), performance tuning (indexes/materialized views as
needed), backup verification, masking of sensitive fields.

**NOT in scope (still deferred):** B2B CRM, finance reconciliation, marketplace API sync,
demand forecasting, multi-warehouse, scan hardware, customer-facing notifications.

---

## 5.2 BACKEND — Supabase

### 5.2.1 Roles & scoped RLS (`0007_roles_rls.sql`)
Replace the v1 "authenticated = full access" policies with role-aware ones. Use a helper that
reads the caller's role from `profiles`:

```sql
create or replace function public.current_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Example: drop the blanket policy and add scoped ones per table.
-- ADMIN: everything. Others: scoped to their function (illustrative — expand per table).
drop policy if exists orders_auth_all on public.orders;

create policy orders_admin_all on public.orders for all to authenticated
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy orders_ops_rw on public.orders for all to authenticated
  using (public.current_role() in ('ops','sales'))
  with check (public.current_role() in ('ops','sales'));

create policy orders_warehouse_read on public.orders for select to authenticated
  using (public.current_role() = 'warehouse');

create policy orders_finance_read on public.orders for select to authenticated
  using (public.current_role() = 'finance');
```
Repeat the pattern for `products`, `inventory`, `customers`, `shipments`, `payments`,
`settings`, `audit_logs` per the role matrix in [../../docs/project.md](../project.md) §2 and
the PDF's role table (Admin full; Ops orders/warehouse/dispatch; Warehouse packing/scan;
Sales customers/orders; Finance payments/invoices). Keep policies in one migration; test each
role with a user.

> Sensitive writes (address edits, payment status, refunds, stock corrections) remain logged
> via `audit_logs` (already wired in earlier phases) — confirm coverage here.

### 5.2.2 Performance
- Review `get_advisors` (performance) → add any suggested indexes.
- If dashboard views are slow at volume, convert `v_daily_sales` / `v_channel_split` to
  **materialized views** + a refresh (cron or on-write) — migration `0008_matviews.sql`.
- Confirm the Phase 0 indexes are used (`explain analyze` on hot queries via `execute_sql`).

### 5.2.3 Backups
- Confirm Supabase automated DB backups are on; document restore steps. Storage bucket
  (`labels`) retention noted.

---

## 5.3 FRONTEND
- **Audit log viewer** (`app/(dashboard)/audit/page.tsx`, admin-only): filter by entity/
  actor/date; show action, who, when, before→after diff.
- **Alerts:** low-stock badge/count in nav + an alerts panel (products ≤ threshold; orders
  with packing exceptions / stuck states). Optional: a daily summary.
- **Role gating in UI:** hide/disable actions a role can't perform (defense-in-depth on top
  of RLS). Read `current_role` server-side.
- **Masking:** mask customer phone / payment refs in views where full visibility isn't needed
  (show last 4; reveal on explicit action, logged).

---

## 5.4 Step-by-step checklist
1. Apply `0007_roles_rls`; create one test user per role; verify access boundaries.
2. Build the audit-log viewer (admin-only).
3. Add low-stock + packing-exception alerts (nav badge + panel).
4. Add UI role gating + sensitive-field masking.
5. Run `get_advisors`; add indexes / materialized views if needed (`0008`).
6. Verify backups; document restore.
7. `npm run build` + `lint`; full regression (5.6).

---

## 5.5 Acceptance criteria
- [ ] Each role sees/does only what its policy allows (verified per role).
- [ ] Admin can browse the audit log with before→after detail.
- [ ] Low-stock and packing-exception alerts show accurately.
- [ ] Sensitive fields are masked where appropriate (and reveals are logged).
- [ ] `get_advisors` security + performance are clean; hot queries use indexes.
- [ ] Automated backups confirmed.

---

## 5.6 Verification
- Log in as each role → confirm allowed/denied screens + actions (and RLS blocks direct
  queries: `execute_sql` as a non-admin context fails the disallowed op).
- Edit an address/payment status → appears in the audit viewer with before/after.
- Drop a product below threshold → alert appears; clear it → alert disappears.
- `get_advisors(type:security)` and `(type:performance)` → no critical findings.
- `explain analyze` a dashboard query → index scans, acceptable timing at seeded volume.
