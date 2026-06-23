import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, buttonPrimaryClass, buttonSecondaryClass } from "@/components/page-header";
import { DataTable, tdClass } from "@/components/table";
import { inputClass } from "@/components/form";
import { Select } from "@/components/select";
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
import { DateRangePicker } from "../date-range-picker";

// Small labeled wrapper so the filter card reads as a tidy, professional form on
// every width (captions match the dashboard filter bar + DateRangePicker).
function FilterField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8076]">
        {label}
      </span>
      {children}
    </div>
  );
}

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

  // Role check (button gating) is independent of the list — fetch both at once.
  const [role, { data: orders }] = await Promise.all([getCurrentRole(), query]);
  const canWrite = roleCan(role, "orders.write");
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

      <form
        method="get"
        className="mb-4 grid grid-cols-1 gap-x-4 gap-y-4 rounded-2xl border border-line bg-white p-4 shadow-sm shadow-black/[0.03] sm:grid-cols-2 sm:p-5 lg:grid-cols-6"
      >
        <FilterField label="Search" className="sm:col-span-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Order #, customer or phone…"
            className={inputClass}
          />
        </FilterField>
        <FilterField label="Status">
          <Select
            name="status"
            defaultValue={status}
            ariaLabel="Status"
            searchable
            options={[
              { value: "", label: "All statuses" },
              ...Constants.public.Enums.order_status.map((s) => ({
                value: s,
                label: STATUS_LABEL[s],
              })),
            ]}
          />
        </FilterField>
        <FilterField label="Channel">
          <Select
            name="channel"
            defaultValue={channel}
            ariaLabel="Channel"
            options={[
              { value: "", label: "All channels" },
              ...Constants.public.Enums.order_channel.map((c) => ({
                value: c,
                label: CHANNEL_LABEL[c],
              })),
            ]}
          />
        </FilterField>
        <DateRangePicker from={from} to={to} className="sm:col-span-2" />
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 sm:col-span-2 lg:col-span-6">
          <button type="submit" className={`${buttonPrimaryClass} w-full sm:w-auto`}>
            Filter
          </button>
          <Link href="/orders" className={`${buttonSecondaryClass} w-full sm:w-auto`}>
            Reset
          </Link>
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
