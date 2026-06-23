import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rangeBounds } from "./types";
import type {
  DashboardFilters,
  Kpis,
  TrendPoint,
  ChannelSlice,
  TopSku,
  TopSkuSort,
  LowStockRow,
  PackingBacklogRow,
  FilterOptions,
} from "./types";

// All metrics are aggregated in Postgres (views/RPCs from migration 0007) so the dashboard
// stays fast with thousands of orders — these helpers only call the SQL and shape the result.
// Numeric columns can arrive as strings over PostgREST, so coerce every number with Number().

const num = (v: unknown): number => Number(v ?? 0);

/** Common RPC args shared by the date-bounded + filtered helpers. */
function args(f: DashboardFilters) {
  const { pFrom, pTo } = rangeBounds(f);
  return {
    p_from: pFrom,
    p_to: pTo,
    p_channel: f.channel,
    p_city: f.city,
    p_customer_type: f.customerType,
    p_category: f.category,
  };
}

export async function getKpis(f: DashboardFilters): Promise<Kpis> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_kpis", args(f));
  if (error) {
    console.error("dashboard_kpis failed:", error.message);
    return { revenue: 0, orders: 0, aov: 0, returns: 0, pendingFulfillment: 0, shipmentsToday: 0 };
  }
  const row = data?.[0];
  return {
    revenue: num(row?.revenue),
    orders: num(row?.orders),
    aov: num(row?.aov),
    returns: num(row?.returns),
    pendingFulfillment: num(row?.pending_fulfillment),
    shipmentsToday: num(row?.shipments_today),
  };
}

export async function getRevenueTrend(f: DashboardFilters): Promise<TrendPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_daily_sales", args(f));
  if (error) {
    console.error("dashboard_daily_sales failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    day: r.day,
    orders: num(r.orders),
    revenue: num(r.revenue),
  }));
}

export async function getChannelSplit(f: DashboardFilters): Promise<ChannelSlice[]> {
  const supabase = await createClient();
  // Channel split groups BY channel, so it never takes a channel filter.
  const { pFrom, pTo } = rangeBounds(f);
  const { data, error } = await supabase.rpc("dashboard_channel_split", {
    p_from: pFrom,
    p_to: pTo,
    p_city: f.city,
    p_customer_type: f.customerType,
    p_category: f.category,
  });
  if (error) {
    console.error("dashboard_channel_split failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    channel: r.channel,
    orders: num(r.orders),
    revenue: num(r.revenue),
  }));
}

export async function getTopSkus(
  f: DashboardFilters,
  sortBy: TopSkuSort = "qty",
  limit = 10,
): Promise<TopSku[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_top_skus", {
    ...args(f),
    p_sort: sortBy,
    p_limit: limit,
  });
  if (error) {
    console.error("dashboard_top_skus failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    productId: r.product_id,
    sku: r.sku,
    name: r.name,
    category: r.category,
    qty: num(r.qty),
    revenue: num(r.revenue),
    margin: num(r.margin),
  }));
}

export async function getLowStock(): Promise<LowStockRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("low_stock_alerts");
  if (error) {
    console.error("low_stock_alerts failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    productId: r.product_id,
    sku: r.sku,
    name: r.name,
    category: r.category,
    onHand: num(r.on_hand),
    reserved: num(r.reserved),
    available: num(r.available),
    threshold: num(r.low_stock_threshold),
  }));
}

const BACKLOG_STATES = ["reserved", "packed", "label_generated"] as const;

export async function getPackingBacklog(): Promise<PackingBacklogRow[]> {
  const supabase = await createClient();
  // A filtered list (not an aggregate): orders awaiting dispatch, oldest first.
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_no, status, channel, ship_name, total, created_at")
    .in("status", BACKLOG_STATES)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) {
    console.error("packing backlog query failed:", error.message);
    return [];
  }
  const now = Date.now();
  return (data ?? []).map((o) => ({
    id: o.id,
    orderNo: o.order_no,
    status: o.status,
    channel: o.channel,
    customer: o.ship_name,
    total: num(o.total),
    createdAt: o.created_at,
    ageDays: Math.floor((now - new Date(o.created_at).getTime()) / 86_400_000),
  }));
}

/** Distinct cities (from order shipping addresses) + product categories for the filter bar.
 *  Both columns are small text projections; deduped here for the dropdowns. */
export async function getFilterOptions(): Promise<FilterOptions> {
  const supabase = await createClient();
  const [cityRes, catRes] = await Promise.all([
    supabase.from("orders").select("ship_city").not("ship_city", "is", null).limit(5000),
    supabase.from("products").select("category").not("category", "is", null),
  ]);
  const cities = [...new Set((cityRes.data ?? []).map((r) => r.ship_city).filter(Boolean) as string[])].sort();
  const categories = [...new Set((catRes.data ?? []).map((r) => r.category).filter(Boolean) as string[])].sort();
  return { cities, categories };
}
