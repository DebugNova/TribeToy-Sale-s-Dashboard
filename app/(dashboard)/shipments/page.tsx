import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DataTable, tdClass } from "@/components/table";
import { StatusBadge } from "@/components/status-badge";
import { LabelDownloadButton } from "@/components/label-download-button";
import { COURIER_LABEL } from "@/lib/labels/courier";
import { formatDate, formatDateTime } from "@/lib/format";
import type { CourierType, OrderStatus } from "@/lib/types";

type ShipmentRow = {
  id: string;
  courier: CourierType;
  awb: string | null;
  dispatch_date: string | null;
  label_pdf_url: string | null;
  created_at: string;
  order_id: string;
  orders: { order_no: string; status: OrderStatus } | null;
  profiles: { name: string | null } | null;
};

export default async function ShipmentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select(
      "id, courier, awb, dispatch_date, label_pdf_url, created_at, order_id, orders(order_no, status), profiles(name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as ShipmentRow[];

  return (
    <div>
      <PageHeader
        title="Shipments"
        description="Every generated shipping label, its courier and AWB."
      />

      <DataTable
        columns={[
          "Order #",
          "Courier",
          "AWB / tracking",
          "Dispatch",
          "Created by",
          "Generated",
          "Label",
        ]}
        isEmpty={rows.length === 0}
        emptyMessage="No labels generated yet. Open a packed order to generate one."
      >
        {rows.map((s) => (
          <tr key={s.id} className="hover:bg-gray-50">
            <td className={tdClass}>
              <Link
                href={`/orders/${s.order_id}`}
                className="font-mono text-xs font-semibold text-gray-900 hover:underline"
              >
                {s.orders?.order_no ?? "—"}
              </Link>
              {s.orders ? (
                <span className="ml-2 align-middle">
                  <StatusBadge status={s.orders.status} />
                </span>
              ) : null}
            </td>
            <td className={tdClass}>{COURIER_LABEL[s.courier]}</td>
            <td className={`${tdClass} font-mono text-xs`}>{s.awb ?? "—"}</td>
            <td className={tdClass}>
              {s.dispatch_date ? formatDate(s.dispatch_date) : "—"}
            </td>
            <td className={tdClass}>{s.profiles?.name ?? "—"}</td>
            <td className={tdClass}>{formatDateTime(s.created_at)}</td>
            <td className={tdClass}>
              <LabelDownloadButton
                shipmentId={s.id}
                hasLabel={!!s.label_pdf_url}
                className="text-sm font-medium text-gray-900 hover:underline"
              >
                Download
              </LabelDownloadButton>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
