import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, buttonPrimaryClass, buttonSecondaryClass } from "@/components/page-header";
import { DataTable, tdClass } from "@/components/table";
import { inputClass } from "@/components/form";
import {
  StatusBadge,
  PaymentStatusBadge,
  ChannelBadge,
  CHANNEL_LABEL,
} from "@/components/status-badge";
import { STATUS_LABEL } from "@/lib/orders/transitions";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { Constants } from "@/lib/supabase/database.types";
import { getCurrentRole, roleCan } from "@/lib/auth/roles";
import type { OrderStatus, OrderChannel } from "@/lib/types";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  channel?: string;
  from?: string;
  to?: string;
}>;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", status = "", channel = "", from = "", to = "" } = await searchParams;
  const supabase = await createClient();
  const canWrite = roleCan(await getCurrentRole(), "orders.write");

  let query = supabase
    .from("orders")
    .select(
      "id, order_no, created_at, channel, ship_name, total, status, payment_status",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (q.trim()) {
    const term = q.trim();
    query = query.or(
      `order_no.ilike.%${term}%,ship_name.ilike.%${term}%,ship_phone.ilike.%${term}%`,
    );
  }
  if (status) query = query.eq("status", status as OrderStatus);
  if (channel) query = query.eq("channel", channel as OrderChannel);
  if (from) query = query.gte("created_at", `${from}T00:00:00+05:30`);
  if (to) query = query.lte("created_at", `${to}T23:59:59+05:30`);

  const { data: orders } = await query;
  const rows = orders ?? [];

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order from every channel in one place."
        action={
          canWrite ? (
            <div className="flex items-center gap-2">
              <Link href="/orders/import" className={buttonSecondaryClass}>
                Import Amazon CSV
              </Link>
              <Link href="/orders/new" className={buttonPrimaryClass}>
                New order
              </Link>
            </div>
          ) : null
        }
      />

      <form method="get" className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Order #, customer or phone…"
          className={`${inputClass} sm:col-span-2`}
        />
        <select name="status" defaultValue={status} className={inputClass}>
          <option value="">All statuses</option>
          {Constants.public.Enums.order_status.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select name="channel" defaultValue={channel} className={inputClass}>
          <option value="">All channels</option>
          {Constants.public.Enums.order_channel.map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABEL[c]}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={from} className={inputClass} />
        <input type="date" name="to" defaultValue={to} className={inputClass} />
        <div className="sm:col-span-6">
          <button type="submit" className={buttonPrimaryClass}>
            Filter
          </button>
        </div>
      </form>

      <DataTable
        columns={["Order #", "Date", "Channel", "Customer", "Total", "Status", "Payment"]}
        isEmpty={rows.length === 0}
        emptyMessage="No orders match. Create one with “New order”."
      >
        {rows.map((o) => (
          <tr key={o.id} className="hover:bg-gray-50">
            <td className={tdClass}>
              <Link
                href={`/orders/${o.id}`}
                className="font-mono text-xs font-semibold text-gray-900 hover:underline"
              >
                {o.order_no}
              </Link>
            </td>
            <td className={tdClass}>{formatDate(o.created_at)}</td>
            <td className={tdClass}>
              <ChannelBadge channel={o.channel} />
            </td>
            <td className={tdClass}>{o.ship_name ?? "—"}</td>
            <td className={tdClass}>{formatINR(o.total)}</td>
            <td className={tdClass}>
              <StatusBadge status={o.status} />
            </td>
            <td className={tdClass}>
              <PaymentStatusBadge status={o.payment_status} />
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
