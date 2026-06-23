import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { DataTable, tdClass } from "@/components/table";
import { StatusBadge, ChannelBadge } from "@/components/status-badge";
import { formatINR } from "@/lib/money";
import { getAlerts, STUCK_DAYS } from "@/lib/alerts/queries";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const { lowStock, backlog, stuck } = await getAlerts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Stock running low and orders stuck before dispatch — things that need attention."
      />

      <Panel
        title="Low stock"
        description="Products at or below their low-stock threshold (available = on hand − reserved)."
        bodyClassName="p-0"
      >
        <DataTable
          columns={["SKU", "Product", "Category", "On hand", "Reserved", "Available", "Threshold"]}
          isEmpty={lowStock.length === 0}
          emptyMessage="No products are low on stock. 🎉"
        >
          {lowStock.map((r) => (
            <tr key={r.productId} className="hover:bg-gray-50">
              <td className={`${tdClass} font-mono text-xs text-gray-600`}>{r.sku}</td>
              <td className={`${tdClass} font-medium text-gray-900`}>
                <Link href={`/products/${r.productId}`} className="hover:underline">
                  {r.name}
                </Link>
              </td>
              <td className={tdClass}>{r.category ?? "—"}</td>
              <td className={tdClass}>{r.onHand}</td>
              <td className={tdClass}>{r.reserved}</td>
              <td className={`${tdClass} font-semibold text-red-700`}>{r.available}</td>
              <td className={tdClass}>{r.threshold}</td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      <Panel
        title="Packing exceptions"
        description={`Orders waiting to dispatch for ${STUCK_DAYS}+ days.`}
        bodyClassName="p-0"
      >
        <DataTable
          columns={["Order", "Status", "Channel", "Customer", "Total", "Age"]}
          isEmpty={stuck.length === 0}
          emptyMessage="No stuck orders. Backlog is moving."
        >
          {stuck.map((o) => (
            <tr key={o.id} className="hover:bg-gray-50">
              <td className={`${tdClass} font-medium text-gray-900`}>
                <Link href={`/orders/${o.id}`} className="hover:underline">
                  {o.orderNo}
                </Link>
              </td>
              <td className={tdClass}>
                <StatusBadge status={o.status} />
              </td>
              <td className={tdClass}>
                <ChannelBadge channel={o.channel} />
              </td>
              <td className={tdClass}>{o.customer ?? "—"}</td>
              <td className={tdClass}>{formatINR(o.total)}</td>
              <td className={`${tdClass} font-semibold text-amber-700`}>{o.ageDays}d</td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      <Panel
        title="Packing backlog"
        description="All orders reserved/packed but not yet dispatched, oldest first."
        bodyClassName="p-0"
      >
        <DataTable
          columns={["Order", "Status", "Channel", "Customer", "Total", "Age"]}
          isEmpty={backlog.length === 0}
          emptyMessage="Nothing awaiting dispatch."
        >
          {backlog.map((o) => (
            <tr key={o.id} className="hover:bg-gray-50">
              <td className={`${tdClass} font-medium text-gray-900`}>
                <Link href={`/orders/${o.id}`} className="hover:underline">
                  {o.orderNo}
                </Link>
              </td>
              <td className={tdClass}>
                <StatusBadge status={o.status} />
              </td>
              <td className={tdClass}>
                <ChannelBadge channel={o.channel} />
              </td>
              <td className={tdClass}>{o.customer ?? "—"}</td>
              <td className={tdClass}>{formatINR(o.total)}</td>
              <td className={tdClass}>{o.ageDays}d</td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}
