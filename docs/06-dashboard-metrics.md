# 06 — Dashboard & Metrics

> What the main dashboard shows and exactly how each number is defined. Metric queries live
> in `lib/analytics/`. Charts render with Recharts.

## Layout

- **Top row — KPI cards** (today / selected range).
- **Middle — trend charts** (revenue & orders over time, channel split).
- **Bottom — tables** (top SKUs, low stock, pending fulfillment).
- **Global filters** persist across visits (URL query params): date range, channel, city,
  customer type, product category.

## KPI cards

| KPI | Definition |
|---|---|
| Sales (revenue) | Σ `orders.total` for orders in range, excluding `cancelled`/`refunded` |
| Orders | Count of orders in range (excluding cancelled) |
| Avg order value (AOV) | Sales ÷ Orders |
| Returns | Count of orders with status `returned`/`refunded` in range |
| Pending fulfillment | Orders in `created…label_generated` (not yet dispatched) |
| Shipments today | Orders moved to `dispatched` today |

## Charts

| Chart | Definition |
|---|---|
| Revenue trend | `orders.total` summed by day/week/month over the range |
| Orders trend | Order count by day/week/month |
| Channel split | Revenue & order count grouped by `orders.channel` |
| Top products | Top N by qty / revenue / margin (margin = (price − cost) × qty) from `order_items` |

## Tables / panels

| Panel | Content |
|---|---|
| Top SKUs | Rank by quantity, revenue, margin (toggle) |
| Low stock alerts | Products where `available <= low_stock_threshold` |
| Packing backlog | Orders stuck in reserved/packed awaiting action + exceptions |
| (Phase 3+) Fulfillment SLA | Avg time from order → dispatch |
| (Deferred) B2B receivables | Outstanding/overdue B2B payments (needs CRM) |

## Filters

`date range` · `channel` · `city` · `customer type` (b2c/b2b) · `product category`.
Stored in the URL so a refresh/return keeps the same view.

## Exports

- **CSV** export for any table/report.
- **PDF** export for the dashboard view (Phase 3+).

## Performance

- Dashboard must stay fast with thousands of orders → push aggregation into SQL
  (Postgres views / RPC), index `orders(created_at, channel, status)`, avoid loading raw
  rows into the client. Consider materialized views if needed later.

## Definitions to keep consistent

- "Revenue" always excludes cancelled & refunded unless a panel explicitly says gross.
- All money in INR; format with Indian digit grouping (₹1,23,456).
- "Today" = store/local timezone (Asia/Kolkata).
