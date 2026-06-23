import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { KpiCard } from "@/components/kpi-card";
import { DataTable, tdClass } from "@/components/table";
import { ExportCsvButton } from "@/components/export-csv-button";
import { StatusBadge, ChannelBadge, CHANNEL_LABEL } from "@/components/status-badge";
import { STATUS_LABEL } from "@/lib/orders/transitions";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import {
  getKpis,
  getRevenueTrend,
  getChannelSplit,
  getTopSkus,
  getLowStock,
  getPackingBacklog,
  getFilterOptions,
} from "@/lib/analytics/queries";
import {
  parseFilters,
  isTopSkuSort,
  filtersToQuery,
  type TopSkuSort,
} from "@/lib/analytics/types";
import { FilterBar } from "./filter-bar";
import {
  RevenueTrendChart,
  OrdersTrendChart,
  ChannelSplitChart,
} from "./dashboard-charts";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SKU_SORTS: { key: TopSkuSort; label: string }[] = [
  { key: "qty", label: "Quantity" },
  { key: "revenue", label: "Revenue" },
  { key: "margin", label: "Margin" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = Array.isArray(v) ? v[0] : v;

  const filters = parseFilters(flat);
  const skuSort: TopSkuSort = isTopSkuSort(flat.skuSort) ? flat.skuSort : "qty";

  // All aggregation runs in SQL (migration 0007); fetch every panel in parallel.
  const [kpis, revenueTrend, channelSplit, topSkus, lowStock, backlog, options] =
    await Promise.all([
      getKpis(filters),
      getRevenueTrend(filters),
      getChannelSplit(filters),
      getTopSkus(filters, skuSort),
      getLowStock(),
      getPackingBacklog(),
      getFilterOptions(),
    ]);

  // CSV matrices (money pre-formatted as INR so the export reads correctly).
  const topSkuCsv = topSkus.map((s) => [
    s.sku ?? "",
    s.name ?? "",
    s.category ?? "",
    s.qty,
    formatINR(s.revenue),
    formatINR(s.margin),
  ]);
  const lowStockCsv = lowStock.map((r) => [
    r.sku,
    r.name,
    r.category ?? "",
    r.onHand,
    r.reserved,
    r.available,
    r.threshold,
  ]);
  const backlogCsv = backlog.map((b) => [
    b.orderNo,
    STATUS_LABEL[b.status],
    CHANNEL_LABEL[b.channel],
    b.customer ?? "",
    formatINR(b.total),
    b.ageDays,
    formatDate(b.createdAt),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Sales for ${formatDate(filters.from)} – ${formatDate(filters.to)} (IST). Cancelled & refunded orders are excluded from revenue.`}
      />

      <FilterBar
        cities={options.cities}
        categories={options.categories}
        defaults={{ from: filters.from, to: filters.to }}
      />

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Sales" value={formatINR(kpis.revenue)} />
        <KpiCard label="Orders" value={String(kpis.orders)} />
        <KpiCard label="Avg order value" value={formatINR(kpis.aov)} />
        <KpiCard label="Returns" value={String(kpis.returns)} />
        <KpiCard
          label="Pending fulfillment"
          value={String(kpis.pendingFulfillment)}
          emphasis={kpis.pendingFulfillment > 0}
        />
        <KpiCard label="Shipments today" value={String(kpis.shipmentsToday)} hint="Dispatched (IST)" />
      </div>

      {/* Trend charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Revenue trend" description="Daily revenue (IST)">
          <RevenueTrendChart data={revenueTrend} />
        </Panel>
        <Panel title="Orders trend" description="Daily order count (IST)">
          <OrdersTrendChart data={revenueTrend} />
        </Panel>
      </div>

      <div className="mb-6">
        <Panel title="Channel split" description="Revenue by channel for the selected range">
          <ChannelSplitChart data={channelSplit} />
        </Panel>
      </div>

      {/* Top SKUs */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#332f29]">Top SKUs</h2>
          <div className="flex items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-xl border border-line text-xs">
              {SKU_SORTS.map((s) => {
                const active = s.key === skuSort;
                return (
                  <Link
                    key={s.key}
                    href={`/?${filtersToQuery(filters, { skuSort: s.key })}`}
                    className={`px-3 py-1.5 font-semibold transition ${
                      active
                        ? "bg-brand-600 text-white"
                        : "bg-white text-[#7a7066] hover:bg-brand-50 hover:text-brand-700"
                    }`}
                    scroll={false}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
            <ExportCsvButton
              filename="top-skus.csv"
              headers={["SKU", "Product", "Category", "Qty", "Revenue (INR)", "Margin (INR)"]}
              rows={topSkuCsv}
            />
          </div>
        </div>
        <DataTable
          columns={["SKU", "Product", "Category", "Qty", "Revenue", "Margin"]}
          isEmpty={topSkus.length === 0}
          emptyMessage="No sales in this range yet."
        >
          {topSkus.map((s) => (
            <tr key={s.productId ?? s.sku} className="hover:bg-gray-50">
              <td className={`${tdClass} font-mono text-xs text-gray-600`}>{s.sku ?? "—"}</td>
              <td className={`${tdClass} font-medium text-gray-900`}>{s.name ?? "—"}</td>
              <td className={tdClass}>{s.category ?? "—"}</td>
              <td className={tdClass}>{s.qty}</td>
              <td className={tdClass}>{formatINR(s.revenue)}</td>
              <td className={tdClass}>{formatINR(s.margin)}</td>
            </tr>
          ))}
        </DataTable>
      </div>

      {/* Low stock + packing backlog */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[#332f29]">Low-stock alerts</h2>
            <ExportCsvButton
              filename="low-stock.csv"
              headers={["SKU", "Product", "Category", "On hand", "Reserved", "Available", "Threshold"]}
              rows={lowStockCsv}
            />
          </div>
          <DataTable
            columns={["SKU", "Product", "Available", "Threshold"]}
            isEmpty={lowStock.length === 0}
            emptyMessage="All products are above their low-stock threshold."
          >
            {lowStock.map((r) => (
              <tr key={r.productId} className="bg-red-50/40 hover:bg-red-50">
                <td className={`${tdClass} font-mono text-xs text-gray-600`}>{r.sku}</td>
                <td className={`${tdClass} font-medium text-gray-900`}>{r.name}</td>
                <td className={`${tdClass} font-semibold text-red-600`}>{r.available}</td>
                <td className={tdClass}>{r.threshold}</td>
              </tr>
            ))}
          </DataTable>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[#332f29]">Packing backlog</h2>
            <ExportCsvButton
              filename="packing-backlog.csv"
              headers={["Order #", "Status", "Channel", "Customer", "Total (INR)", "Age (days)", "Created"]}
              rows={backlogCsv}
            />
          </div>
          <DataTable
            columns={["Order #", "Status", "Channel", "Age"]}
            isEmpty={backlog.length === 0}
            emptyMessage="Nothing waiting to be dispatched."
          >
            {backlog.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className={tdClass}>
                  <Link
                    href={`/orders/${b.id}`}
                    className="font-mono text-xs font-semibold text-gray-900 hover:underline"
                  >
                    {b.orderNo}
                  </Link>
                </td>
                <td className={tdClass}>
                  <StatusBadge status={b.status} />
                </td>
                <td className={tdClass}>
                  <ChannelBadge channel={b.channel} />
                </td>
                <td className={tdClass}>
                  {b.ageDays === 0 ? "Today" : `${b.ageDays}d`}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      </div>
    </div>
  );
}
