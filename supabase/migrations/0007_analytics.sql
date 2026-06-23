-- Phase 3 — analytics (SQL aggregation for the dashboard).
-- All dashboard numbers are computed in Postgres so the page stays fast with thousands of
-- orders (see docs/06-dashboard-metrics.md). Revenue/order counts EXCLUDE cancelled & refunded.
-- "Today" and daily buckets use Asia/Kolkata. Money is numeric(12,2) INR.
--
-- Two layers:
--   1. Unfiltered convenience VIEWS (v_daily_sales / v_channel_split / v_top_skus) — the
--      canonical metric definitions, used for ad-hoc/MCP cross-checks.
--   2. Filtered RPCs (dashboard_*) the UI calls — same math, but bounded by the dashboard
--      filters (date range + channel/city/customer-type/category). Filter params default to
--      NULL = "no filter", so e.g. dashboard_kpis(from, to) works with just a date range.
-- Views run security_invoker (the founder's RLS); functions are plain STABLE SQL with a
-- pinned search_path (advisor: function_search_path_mutable).

-- ============== VIEWS (unfiltered, canonical definitions) ==============

-- Daily sales rollup (IST day).
create or replace view public.v_daily_sales
with (security_invoker = true) as
select
  (created_at at time zone 'Asia/Kolkata')::date as day,
  count(*)                                        as orders,
  coalesce(sum(total),0)                          as revenue
from public.orders
where status not in ('cancelled','refunded')
group by 1;

-- Channel split.
create or replace view public.v_channel_split
with (security_invoker = true) as
select channel,
       count(*)               as orders,
       coalesce(sum(total),0) as revenue
from public.orders
where status not in ('cancelled','refunded')
group by channel;

-- Top SKUs (qty, revenue, margin). Margin = (price - cost) * qty from the product snapshot,
-- falling back to the line's unit_price if the product was deleted.
create or replace view public.v_top_skus
with (security_invoker = true) as
select oi.product_id, oi.sku, oi.name,
       sum(oi.qty)                              as qty,
       sum(oi.line_total)                       as revenue,
       sum( (coalesce(p.price,oi.unit_price) - coalesce(p.cost,0)) * oi.qty ) as margin
from public.order_items oi
join public.orders o   on o.id = oi.order_id and o.status not in ('cancelled','refunded')
left join public.products p on p.id = oi.product_id
group by oi.product_id, oi.sku, oi.name;

grant select on public.v_daily_sales, public.v_channel_split, public.v_top_skus to authenticated;

-- ============== FILTERED RPCs (what the dashboard UI calls) ==============

-- KPI summary for a date range + dashboard filters. Filter params default NULL (= no filter),
-- so dashboard_kpis(p_from, p_to) keeps working. Shipments-today is always "today" in IST and
-- ignores the date range, but respects the dimension filters.
create or replace function public.dashboard_kpis(
  p_from          timestamptz,
  p_to            timestamptz,
  p_channel       public.order_channel default null,
  p_city          text                 default null,
  p_customer_type public.customer_type default null,
  p_category      text                 default null
)
returns table (
  revenue numeric, orders bigint, aov numeric,
  returns bigint, pending_fulfillment bigint, shipments_today bigint
) language sql stable set search_path = '' as $$
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
    (select count(*) from public.orders sd
       where sd.status = 'dispatched'
         and (sd.updated_at at time zone 'Asia/Kolkata')::date
             = (now() at time zone 'Asia/Kolkata')::date
         and (p_channel is null or sd.channel = p_channel)
         and (p_city is null or sd.ship_city = p_city)
         and (p_customer_type is null or exists (
               select 1 from public.customers c
                where c.id = sd.customer_id and c.type = p_customer_type))
         and (p_category is null or exists (
               select 1 from public.order_items oi
                 join public.products p on p.id = oi.product_id
                where oi.order_id = sd.id and p.category = p_category))
    )                                                                            as shipments_today
  from public.orders o
  where o.created_at >= p_from and o.created_at < p_to
    and (p_channel is null or o.channel = p_channel)
    and (p_city is null or o.ship_city = p_city)
    and (p_customer_type is null or exists (
          select 1 from public.customers c
           where c.id = o.customer_id and c.type = p_customer_type))
    and (p_category is null or exists (
          select 1 from public.order_items oi
            join public.products p on p.id = oi.product_id
           where oi.order_id = o.id and p.category = p_category));
$$;

-- Daily revenue & orders trend (IST day) over the range + filters.
create or replace function public.dashboard_daily_sales(
  p_from          timestamptz,
  p_to            timestamptz,
  p_channel       public.order_channel default null,
  p_city          text                 default null,
  p_customer_type public.customer_type default null,
  p_category      text                 default null
)
returns table (day date, orders bigint, revenue numeric)
language sql stable set search_path = '' as $$
  select (o.created_at at time zone 'Asia/Kolkata')::date as day,
         count(*)               as orders,
         coalesce(sum(o.total),0) as revenue
  from public.orders o
  where o.status not in ('cancelled','refunded')
    and o.created_at >= p_from and o.created_at < p_to
    and (p_channel is null or o.channel = p_channel)
    and (p_city is null or o.ship_city = p_city)
    and (p_customer_type is null or exists (
          select 1 from public.customers c
           where c.id = o.customer_id and c.type = p_customer_type))
    and (p_category is null or exists (
          select 1 from public.order_items oi
            join public.products p on p.id = oi.product_id
           where oi.order_id = o.id and p.category = p_category))
  group by 1
  order by 1;
$$;

-- Channel split over the range + filters. (No channel filter here — it splits BY channel.)
create or replace function public.dashboard_channel_split(
  p_from          timestamptz,
  p_to            timestamptz,
  p_city          text                 default null,
  p_customer_type public.customer_type default null,
  p_category      text                 default null
)
returns table (channel public.order_channel, orders bigint, revenue numeric)
language sql stable set search_path = '' as $$
  select o.channel,
         count(*)               as orders,
         coalesce(sum(o.total),0) as revenue
  from public.orders o
  where o.status not in ('cancelled','refunded')
    and o.created_at >= p_from and o.created_at < p_to
    and (p_city is null or o.ship_city = p_city)
    and (p_customer_type is null or exists (
          select 1 from public.customers c
           where c.id = o.customer_id and c.type = p_customer_type))
    and (p_category is null or exists (
          select 1 from public.order_items oi
            join public.products p on p.id = oi.product_id
           where oi.order_id = o.id and p.category = p_category))
  group by o.channel
  order by revenue desc;
$$;

-- Top SKUs over the range + filters, ranked by qty | revenue | margin (p_sort). The category
-- filter restricts to items in that category (item-level); other filters are order-level.
create or replace function public.dashboard_top_skus(
  p_from          timestamptz,
  p_to            timestamptz,
  p_channel       public.order_channel default null,
  p_city          text                 default null,
  p_customer_type public.customer_type default null,
  p_category      text                 default null,
  p_sort          text                 default 'qty',
  p_limit         int                  default 10
)
returns table (
  product_id uuid, sku text, name text, category text,
  qty bigint, revenue numeric, margin numeric
)
language sql stable set search_path = '' as $$
  select oi.product_id, oi.sku, oi.name, p.category,
         sum(oi.qty)        as qty,
         sum(oi.line_total) as revenue,
         sum( (coalesce(p.price,oi.unit_price) - coalesce(p.cost,0)) * oi.qty ) as margin
  from public.order_items oi
  join public.orders o    on o.id = oi.order_id and o.status not in ('cancelled','refunded')
  left join public.products p  on p.id = oi.product_id
  left join public.customers c on c.id = o.customer_id
  where o.created_at >= p_from and o.created_at < p_to
    and (p_channel is null or o.channel = p_channel)
    and (p_city is null or o.ship_city = p_city)
    and (p_customer_type is null or c.type = p_customer_type)
    and (p_category is null or p.category = p_category)
  group by oi.product_id, oi.sku, oi.name, p.category
  order by case p_sort
             when 'revenue' then sum(oi.line_total)
             when 'margin'  then sum( (coalesce(p.price,oi.unit_price) - coalesce(p.cost,0)) * oi.qty )
             else                sum(oi.qty)::numeric
           end desc
  limit p_limit;
$$;

-- Low-stock alerts: products at/under their threshold. Column-vs-column comparison can't go
-- through PostgREST, so it lives here. Joins the product for sku/name/category.
create or replace function public.low_stock_alerts()
returns table (
  product_id uuid, sku text, name text, category text,
  on_hand int, reserved int, available int, low_stock_threshold int
)
language sql stable set search_path = '' as $$
  select i.product_id, p.sku, p.name, p.category,
         i.on_hand, i.reserved, (i.on_hand - i.reserved) as available, i.low_stock_threshold
  from public.inventory i
  join public.products p on p.id = i.product_id
  where (i.on_hand - i.reserved) <= i.low_stock_threshold
  order by (i.on_hand - i.reserved) asc, p.name asc;
$$;

-- These analytics RPCs are read-only and respect RLS, but lock execution to authenticated
-- (founders) to match the privilege hygiene of the inventory RPCs in 0006.
revoke execute on function
  public.dashboard_kpis(timestamptz, timestamptz, public.order_channel, text, public.customer_type, text),
  public.dashboard_daily_sales(timestamptz, timestamptz, public.order_channel, text, public.customer_type, text),
  public.dashboard_channel_split(timestamptz, timestamptz, text, public.customer_type, text),
  public.dashboard_top_skus(timestamptz, timestamptz, public.order_channel, text, public.customer_type, text, text, int),
  public.low_stock_alerts()
  from anon, public;
grant execute on function
  public.dashboard_kpis(timestamptz, timestamptz, public.order_channel, text, public.customer_type, text),
  public.dashboard_daily_sales(timestamptz, timestamptz, public.order_channel, text, public.customer_type, text),
  public.dashboard_channel_split(timestamptz, timestamptz, text, public.customer_type, text),
  public.dashboard_top_skus(timestamptz, timestamptz, public.order_channel, text, public.customer_type, text, text, int),
  public.low_stock_alerts()
  to authenticated;
