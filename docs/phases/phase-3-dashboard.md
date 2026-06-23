# Phase 3 — Sales Dashboard & Reporting

> **Goal:** The analytics home screen. KPI cards, trend charts, channel split, top SKUs,
> low-stock alerts, packing backlog — with **persistent filters** and **CSV export**. All
> aggregation happens in **SQL/Postgres** (fast with thousands of orders), not in the client.

**Depends on:** Phase 1 (orders/items/inventory). Best after Phase 2 (dispatch data exists).

Spec reference: [../06-dashboard-metrics.md](../06-dashboard-metrics.md).

---

## 3.1 Scope
**In scope:** dashboard page with KPI cards, revenue/orders trend, channel split, top SKUs,
low-stock + packing backlog panels; filters (date/channel/city/customer-type/category) in URL
params; CSV export of tables.

**NOT in scope:** PDF export of the whole dashboard (stretch), fulfillment-SLA deep metrics
(basic version only), B2B receivables (needs CRM — deferred), scheduled email reports.

---

## 3.2 Prerequisites
Phase 1 (and ideally Phase 2). `recharts` already installed. Seed/realistic data helps —
create several orders across channels/dates to see charts.

---

## 3.3 BACKEND — Supabase (SQL aggregation)

All metrics are computed in Postgres via **SQL views and/or RPC functions**, called from
server components. This keeps the dashboard fast and the definitions in one place.

### 3.3.1 Migration `0005_analytics.sql`

```sql
-- Revenue counts EXCLUDE cancelled & refunded (see metrics doc).
-- Daily sales rollup
create or replace view public.v_daily_sales as
select
  (created_at at time zone 'Asia/Kolkata')::date as day,
  count(*)                                        as orders,
  coalesce(sum(total),0)                          as revenue
from public.orders
where status not in ('cancelled','refunded')
group by 1;

-- Channel split
create or replace view public.v_channel_split as
select channel,
       count(*)               as orders,
       coalesce(sum(total),0) as revenue
from public.orders
where status not in ('cancelled','refunded')
group by channel;

-- Top SKUs (qty, revenue, margin). Margin = (price - cost) * qty from product snapshot.
create or replace view public.v_top_skus as
select oi.product_id, oi.sku, oi.name,
       sum(oi.qty)                              as qty,
       sum(oi.line_total)                       as revenue,
       sum( (coalesce(p.price,oi.unit_price) - coalesce(p.cost,0)) * oi.qty ) as margin
from public.order_items oi
join public.orders o on o.id = oi.order_id and o.status not in ('cancelled','refunded')
left join public.products p on p.id = oi.product_id
group by oi.product_id, oi.sku, oi.name;

-- KPI summary for an arbitrary date range (RPC so the UI can pass filters)
create or replace function public.dashboard_kpis(p_from timestamptz, p_to timestamptz)
returns table (
  revenue numeric, orders bigint, aov numeric,
  returns bigint, pending_fulfillment bigint, shipments_today bigint
) language sql stable as $$
  select
    coalesce(sum(total) filter (where status not in ('cancelled','refunded')),0) as revenue,
    count(*) filter (where status not in ('cancelled','refunded'))               as orders,
    case when count(*) filter (where status not in ('cancelled','refunded')) = 0 then 0
         else coalesce(sum(total) filter (where status not in ('cancelled','refunded')),0)
              / count(*) filter (where status not in ('cancelled','refunded')) end as aov,
    count(*) filter (where status in ('returned','refunded'))                    as returns,
    count(*) filter (where status in
      ('created','validated','payment_confirmed','cod_approved','reserved','packed','label_generated'))
                                                                                 as pending_fulfillment,
    (select count(*) from public.orders
       where status='dispatched'
         and (updated_at at time zone 'Asia/Kolkata')::date
             = (now() at time zone 'Asia/Kolkata')::date)                        as shipments_today
  from public.orders
  where created_at >= p_from and created_at < p_to;
$$;
```

Apply via MCP `apply_migration` (`0005_analytics`) + save the file. Re-gen types if used.

> Indexes from Phase 0 (`orders(created_at)`, `orders(channel)`, `orders(status)`) back these
> queries. If volume grows, convert hot views to **materialized views** + refresh job.

---

## 3.4 BACKEND/LOGIC — `lib/analytics/`
Server-only query helpers that call the views/RPC and apply UI filters:
```ts
getKpis(filters): Promise<Kpis>                     // calls dashboard_kpis
getRevenueTrend(filters): Promise<{day,revenue,orders}[]>
getChannelSplit(filters): Promise<{channel,orders,revenue}[]>
getTopSkus(filters, sortBy): Promise<TopSku[]>      // sortBy: qty|revenue|margin
getLowStock(): Promise<...>                         // from inventory_available where available<=threshold
getPackingBacklog(): Promise<...>                   // orders reserved/packed/label_generated
```
`filters` = `{ from, to, channel?, city?, customerType?, category? }`. Apply channel/city/
category/customerType by joining/filtering in these helpers (or extend the RPC).

---

## 3.5 FRONTEND — `app/(dashboard)/page.tsx`
- **Filter bar** (client component): date range, channel, city, customer type, category.
  State lives in **URL query params** so it persists on refresh/return. Server component reads
  `searchParams` and fetches via `lib/analytics`.
- **KPI cards row:** Sales, Orders, AOV, Returns, Pending fulfillment, Shipments today.
- **Charts (Recharts):** revenue trend (line/bar), orders trend, channel split (bar/pie).
- **Tables:** Top SKUs (toggle qty/revenue/margin), Low-stock alerts, Packing backlog.
- **CSV export** buttons per table (`lib/export/toCsv.ts`); INR formatting (₹1,23,456).

---

## 3.6 Step-by-step checklist
1. Apply migration `0005_analytics` (views + RPC).
2. Build `lib/analytics/` query helpers.
3. Build `lib/export/toCsv.ts`.
4. Build the dashboard page: filter bar (URL params) → KPI cards → charts → tables.
5. Wire CSV export on each table.
6. Seed varied data; `npm run build` + `lint`; verify (3.8).

---

## 3.7 Acceptance criteria
- [ ] KPI cards reflect seeded orders and respect the date/channel filters.
- [ ] Revenue & orders trends and channel split render correctly (cancelled/refunded excluded).
- [ ] Top SKUs ranks by qty/revenue/margin.
- [ ] Low-stock panel lists products where available ≤ threshold.
- [ ] Filters persist in the URL across refresh/return.
- [ ] CSV export downloads correct data.
- [ ] Dashboard remains responsive (aggregation in SQL, not client).

---

## 3.8 Verification
- Create orders across ≥2 channels and ≥2 dates; set one product below its threshold.
- Load `/`: KPI numbers match a manual count; change date range → numbers update; filter by
  channel → charts/tables narrow; reload → filters stay (URL).
- MCP cross-check: `select * from dashboard_kpis(now()-interval '30 days', now());` matches
  the cards; `select * from v_channel_split;` matches the chart.
- Export a table to CSV and open it — values/format correct (INR).
