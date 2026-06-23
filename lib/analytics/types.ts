// Shared analytics types + filter parsing. Pure (no I/O), so both the server query helpers
// (lib/analytics/queries.ts) and the client filter bar can import it. The dashboard filters
// live entirely in the URL query string so a refresh/return keeps the same view.

import { Constants } from "@/lib/supabase/database.types";
import type { OrderChannel, OrderStatus, CustomerType } from "@/lib/types";

/** The five dashboard filters (date range + dimensions). `from`/`to` are IST calendar days. */
export type DashboardFilters = {
  from: string; // YYYY-MM-DD (IST), inclusive
  to: string; // YYYY-MM-DD (IST), inclusive
  channel?: OrderChannel;
  city?: string;
  customerType?: CustomerType;
  category?: string;
};

export type Kpis = {
  revenue: number;
  orders: number;
  aov: number;
  returns: number;
  pendingFulfillment: number;
  shipmentsToday: number;
};

export type TrendPoint = { day: string; orders: number; revenue: number };
export type ChannelSlice = { channel: OrderChannel; orders: number; revenue: number };

export type TopSkuSort = "qty" | "revenue" | "margin";
export type TopSku = {
  productId: string | null;
  sku: string | null;
  name: string | null;
  category: string | null;
  qty: number;
  revenue: number;
  margin: number;
};

export type LowStockRow = {
  productId: string;
  sku: string;
  name: string;
  category: string | null;
  onHand: number;
  reserved: number;
  available: number;
  threshold: number;
};

export type PackingBacklogRow = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  channel: OrderChannel;
  customer: string | null;
  total: number;
  createdAt: string;
  ageDays: number;
};

export type FilterOptions = { cities: string[]; categories: string[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Format a Date as a YYYY-MM-DD calendar day in Asia/Kolkata. */
function istDay(d: Date): string {
  // en-CA gives ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Today's IST calendar day (the default end of the dashboard range). */
export function istToday(): string {
  return istDay(new Date());
}

/** The IST calendar day `n` days before today (default start of the range). */
export function istDaysAgo(n: number): string {
  return istDay(new Date(Date.now() - n * 86_400_000));
}

/** The day after `dateStr` (YYYY-MM-DD), used as the exclusive upper bound of a range. */
function nextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

/** Convert the inclusive IST day range into the half-open [from, to) timestamptz bounds the
 *  RPCs expect: `created_at >= p_from and created_at < p_to`. */
export function rangeBounds(f: DashboardFilters): { pFrom: string; pTo: string } {
  return {
    pFrom: `${f.from}T00:00:00+05:30`,
    pTo: `${nextDay(f.to)}T00:00:00+05:30`,
  };
}

function isChannel(v: string | undefined): v is OrderChannel {
  return !!v && (Constants.public.Enums.order_channel as readonly string[]).includes(v);
}

function isCustomerType(v: string | undefined): v is CustomerType {
  return !!v && (Constants.public.Enums.customer_type as readonly string[]).includes(v);
}

export function isTopSkuSort(v: string | undefined): v is TopSkuSort {
  return v === "qty" || v === "revenue" || v === "margin";
}

/** Parse raw URL search params into validated filters, applying the default 30-day range. */
export function parseFilters(sp: Record<string, string | undefined>): DashboardFilters {
  return {
    from: sp.from && ISO_DATE.test(sp.from) ? sp.from : istDaysAgo(30),
    to: sp.to && ISO_DATE.test(sp.to) ? sp.to : istToday(),
    channel: isChannel(sp.channel) ? sp.channel : undefined,
    city: sp.city?.trim() || undefined,
    customerType: isCustomerType(sp.customerType) ? sp.customerType : undefined,
    category: sp.category?.trim() || undefined,
  };
}

/** Serialize filters (+ optional extra keys like skuSort) back into a URLSearchParams string,
 *  dropping empty values. Used to build sort-toggle links that preserve the active filters. */
export function filtersToQuery(
  f: DashboardFilters,
  extra: Record<string, string | undefined> = {},
): string {
  const params = new URLSearchParams();
  params.set("from", f.from);
  params.set("to", f.to);
  if (f.channel) params.set("channel", f.channel);
  if (f.city) params.set("city", f.city);
  if (f.customerType) params.set("customerType", f.customerType);
  if (f.category) params.set("category", f.category);
  for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
  return params.toString();
}
