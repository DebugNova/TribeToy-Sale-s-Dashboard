import "server-only";
import { getLowStock, getPackingBacklog } from "@/lib/analytics/queries";
import type { LowStockRow, PackingBacklogRow } from "@/lib/analytics/types";

// Orders sitting in a pre-dispatch state longer than this are treated as a packing
// exception ("stuck") and surfaced as an alert.
export const STUCK_DAYS = 3;

export type Alerts = {
  lowStock: LowStockRow[];
  backlog: PackingBacklogRow[];
  /** Backlog orders older than STUCK_DAYS — the "packing exceptions". */
  stuck: PackingBacklogRow[];
  /** Badge total: things needing attention (low stock + stuck orders). */
  count: number;
};

/**
 * One place that computes everything the alerts badge + panel need. Both the
 * low-stock RPC and the backlog query aggregate in Postgres / read under RLS, so
 * every role sees the alerts for the data it's allowed to read.
 */
export async function getAlerts(): Promise<Alerts> {
  const [lowStock, backlog] = await Promise.all([
    getLowStock(),
    getPackingBacklog(),
  ]);
  const stuck = backlog.filter((o) => o.ageDays >= STUCK_DAYS);
  return {
    lowStock,
    backlog,
    stuck,
    count: lowStock.length + stuck.length,
  };
}

/** Lightweight badge count for the nav (avoids shipping full rows to the layout). */
export async function getAlertCount(): Promise<number> {
  const { count } = await getAlerts();
  return count;
}
