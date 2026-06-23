import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DataTable, tdClass } from "@/components/table";
import {
  StatusBadge,
  PaymentStatusBadge,
  ChannelBadge,
  FulfillmentBadge,
} from "@/components/status-badge";
import { getNextStates, STATUS_LABEL, canGenerateLabel } from "@/lib/orders/transitions";
import { formatINR } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { LifecycleActions } from "../lifecycle-actions";
import { LabelPanel, type LabelHistoryEntry } from "../label-panel";
import { LabelDownloadButton } from "@/components/label-download-button";
import { RevealField } from "@/components/reveal-field";
import { maskPhone } from "@/lib/mask";
import { getCurrentRole, roleCan } from "@/lib/auth/roles";
import type { OrderStatus } from "@/lib/types";

function describeAudit(action: string, before: unknown, after: unknown): string {
  const a = (after ?? {}) as Record<string, unknown>;
  const b = (before ?? {}) as Record<string, unknown>;
  if (action === "order.create") return "Order created";
  if (action === "order.status_change") {
    const from = b.status as OrderStatus | undefined;
    const to = a.status as OrderStatus | undefined;
    return `Status: ${from ? STATUS_LABEL[from] : "?"} → ${to ? STATUS_LABEL[to] : "?"}`;
  }
  return action;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const role = await getCurrentRole();
  const canWriteOrders = roleCan(role, "orders.write");
  const canManageShipments = roleCan(role, "shipments.write");

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const [{ data: items }, { data: customer }, { data: audit }, { data: settings }, { data: shipment }] =
    await Promise.all([
      supabase.from("order_items").select("*").eq("order_id", id),
      order.customer_id
        ? supabase.from("customers").select("*").eq("id", order.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("audit_logs")
        .select("*")
        .eq("entity", "order")
        .eq("entity_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("settings").select("default_courier").eq("id", 1).maybeSingle(),
      supabase
        .from("shipments")
        .select("id, courier, awb, dispatch_date, label_pdf_url")
        .eq("order_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const itemRows = items ?? [];
  const auditRows = audit ?? [];
  // The label action owns the packed → label_generated transition (it must produce a PDF),
  // so drop that step from the generic status buttons to avoid a PDF-less shortcut.
  const allowed = getNextStates(order.status).filter((s) => s !== "label_generated");

  // Print history for the order's shipment: label generations, reprints and AWB edits,
  // each with who (profile name) + when, newest first.
  let labelHistory: LabelHistoryEntry[] = [];
  if (shipment) {
    const { data: events } = await supabase
      .from("audit_logs")
      .select("id, action, actor_id, created_at, after")
      .eq("entity", "shipment")
      .eq("entity_id", shipment.id)
      .order("created_at", { ascending: false });

    const actorIds = [
      ...new Set((events ?? []).map((e) => e.actor_id).filter(Boolean) as string[]),
    ];
    const nameById = new Map<string, string>();
    if (actorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", actorIds);
      for (const p of profs ?? []) nameById.set(p.id, p.name ?? "Unknown");
    }

    labelHistory = (events ?? []).map((e) => {
      const after = (e.after ?? {}) as { version?: number };
      return {
        id: e.id,
        action: e.action,
        who: e.actor_id ? nameById.get(e.actor_id) ?? "Unknown" : "System",
        when: formatDateTime(e.created_at),
        version: typeof after.version === "number" ? after.version : null,
      };
    });
  }

  return (
    <div>
      <PageHeader
        title={order.order_no}
        description={`Created ${formatDateTime(order.created_at)}`}
        action={
          <Link href="/orders" className="text-sm font-medium text-gray-600 hover:underline">
            ← Back to orders
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} />
        <ChannelBadge channel={order.channel} />
        <PaymentStatusBadge status={order.payment_status} />
        <span className="text-xs text-gray-400">
          {order.payment_type} · {order.source_order_id ? `src ${order.source_order_id}` : "no source id"}
        </span>
      </div>

      {/* Lifecycle actions */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Actions</h2>
        {canWriteOrders ? (
          <LifecycleActions orderId={order.id} allowed={allowed} />
        ) : (
          <p className="text-sm text-gray-400">
            Your role has read-only access to orders — lifecycle actions are disabled.
          </p>
        )}
      </section>

      {/* Shipping label */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Shipping label</h2>
        {canManageShipments ? (
          <LabelPanel
            orderId={order.id}
            canGenerate={canGenerateLabel(order.status)}
            defaultCourier={settings?.default_courier ?? "speedpost"}
            shipment={shipment ?? null}
            history={labelHistory}
          />
        ) : shipment ? (
          <div className="flex flex-wrap items-center gap-3">
            <LabelDownloadButton
              shipmentId={shipment.id}
              hasLabel={!!shipment.label_pdf_url}
            />
            <span className="text-xs text-gray-400">
              Read-only — label management is disabled for your role.
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No label yet. Your role can&apos;t generate shipping labels.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Customer + ship-to */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Customer</h2>
          {customer ? (
            <p className="text-sm text-gray-700">
              <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                {customer.name}
              </Link>
              <span className="ml-2 text-xs uppercase text-gray-400">{customer.type}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400">No linked customer.</p>
          )}
          <h3 className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Ship to
          </h3>
          <address className="text-sm not-italic text-gray-700">
            {order.ship_name ?? "—"}
            <br />
            {order.ship_phone && (
              <>
                <RevealField
                  masked={maskPhone(order.ship_phone)}
                  revealKey="order.ship_phone"
                  id={order.id}
                />
                <br />
              </>
            )}
            {order.ship_address && (
              <>
                {order.ship_address}
                <br />
              </>
            )}
            {[order.ship_city, order.ship_state, order.ship_pincode]
              .filter(Boolean)
              .join(", ") || ""}
          </address>
        </section>

        {/* Totals */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Totals</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>Subtotal</dt>
              <dd>{formatINR(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Discount</dt>
              <dd>−{formatINR(order.discount)}</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Tax</dt>
              <dd>{formatINR(order.tax)}</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Shipping</dt>
              <dd>{formatINR(order.shipping_charge)}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-1 text-base font-semibold text-gray-900">
              <dt>Total</dt>
              <dd>{formatINR(order.total)}</dd>
            </div>
          </dl>
          {order.notes && (
            <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
              {order.notes}
            </p>
          )}
        </section>

        {/* Activity / audit */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Activity</h2>
          {auditRows.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : (
            <ol className="space-y-3">
              {auditRows.map((row) => (
                <li key={row.id} className="text-sm">
                  <p className="text-gray-800">
                    {describeAudit(row.action, row.before, row.after)}
                  </p>
                  <p className="text-xs text-gray-400">{formatDateTime(row.created_at)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Items */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Items</h2>
        <DataTable
          columns={["SKU", "Item", "Qty", "Unit price", "Discount", "Line total", "Fulfillment"]}
          isEmpty={itemRows.length === 0}
          emptyMessage="No items on this order."
        >
          {itemRows.map((it) => (
            <tr key={it.id}>
              <td className={`${tdClass} font-mono text-xs text-gray-600`}>
                {it.sku ?? "—"}
              </td>
              <td className={`${tdClass} text-gray-900`}>{it.name ?? "—"}</td>
              <td className={tdClass}>{it.qty}</td>
              <td className={tdClass}>{formatINR(it.unit_price)}</td>
              <td className={tdClass}>{formatINR(it.discount)}</td>
              <td className={tdClass}>{formatINR(it.line_total)}</td>
              <td className={tdClass}>
                <FulfillmentBadge status={it.fulfillment_status} />
              </td>
            </tr>
          ))}
        </DataTable>
      </section>
    </div>
  );
}
