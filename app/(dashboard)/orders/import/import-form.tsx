"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseAmazonCsv } from "@/lib/intake/amazonCsv";
import { importAmazonOrders, type ImportSummary } from "./actions";
import { buttonPrimaryClass, buttonSecondaryClass } from "@/components/page-header";
import { formatINR, round2 } from "@/lib/money";
import type { NormalizedOrder } from "@/lib/channels/types";

function orderTotal(o: NormalizedOrder): number {
  const items = o.items.reduce(
    (sum, it) => round2(sum + it.qty * it.unit_price + (it.tax ?? 0) - (it.discount ?? 0)),
    0,
  );
  return round2(items + (o.shipping_charge ?? 0) - (o.discount ?? 0));
}

export function ImportForm() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [orders, setOrders] = useState<NormalizedOrder[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setSummary(null);
    setOrders([]);
    setParseErrors([]);
    const file = e.target.files?.[0];
    if (!file) {
      setFileName(null);
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    const { orders, errors } = parseAmazonCsv(text);
    setOrders(orders);
    setParseErrors(errors);
  }

  async function onImport() {
    if (orders.length === 0) return;
    setSubmitting(true);
    const result = await importAmazonOrders(orders);
    setSubmitting(false);
    setSummary(result);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <section className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-sm shadow-black/[0.03]">
        <div>
          <label htmlFor="csv" className="mb-1.5 block text-sm font-semibold text-[#574f47]">
            Amazon order report (.csv or tab-separated .txt)
          </label>
          <input
            id="csv"
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={onFile}
            className="block w-full text-sm text-[#574f47] file:mr-4 file:cursor-pointer file:rounded-xl file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
          />
          <p className="mt-2 text-xs text-gray-400">
            We map common Amazon columns (order-id, sku, quantity-purchased, item-price,
            recipient-name, ship-city/state/postal-code…). Parsing happens in your browser;
            nothing is saved until you click Import.
          </p>
        </div>

        {parseErrors.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="font-medium">{parseErrors.length} row issue(s):</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {parseErrors.slice(0, 8).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
              {parseErrors.length > 8 && <li>…and {parseErrors.length - 8} more.</li>}
            </ul>
          </div>
        )}
      </section>

      {orders.length > 0 && !summary && (
        <section className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-sm shadow-black/[0.03]">
          <h2 className="text-sm font-bold text-[#332f29]">
            Preview — {orders.length} order(s) from {fileName}
          </h2>
          <div className="scroll-shadow-x">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4 font-medium">Amazon order id</th>
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">City</th>
                  <th className="py-2 pr-4 font-medium">Items</th>
                  <th className="py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 50).map((o) => (
                  <tr key={o.source_order_id} className="border-b border-line last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-700">
                      {o.source_order_id}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{o.customer.name}</td>
                    <td className="py-2 pr-4 text-gray-500">{o.customer.city ?? "—"}</td>
                    <td className="py-2 pr-4 text-gray-500">
                      {o.items.reduce((n, it) => n + it.qty, 0)} unit(s)
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {formatINR(orderTotal(o))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length > 50 && (
              <p className="mt-2 text-xs text-gray-400">
                Showing first 50 of {orders.length}; all will be imported.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={onImport}
              disabled={submitting}
              className={`${buttonPrimaryClass} disabled:opacity-60`}
            >
              {submitting ? "Importing…" : `Import ${orders.length} order(s)`}
            </button>
            <span className="text-xs text-gray-400">
              Duplicates (already imported) are skipped automatically.
            </span>
          </div>
        </section>
      )}

      {summary && (
        <section className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-sm shadow-black/[0.03]">
          <h2 className="text-sm font-bold text-[#332f29]">Import complete</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="rounded-lg bg-green-50 px-3 py-1 font-medium text-green-700">
              {summary.created} created
            </span>
            <span className="rounded-lg bg-amber-50 px-3 py-1 font-medium text-amber-800">
              {summary.duplicate} duplicate
            </span>
            <span className="rounded-lg bg-red-50 px-3 py-1 font-medium text-red-700">
              {summary.error} error
            </span>
          </div>

          {summary.error > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-red-700">
              {summary.rows
                .filter((r) => r.status === "error")
                .slice(0, 10)
                .map((r, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs">{r.source_order_id ?? "?"}</span>:{" "}
                    {r.message}
                  </li>
                ))}
            </ul>
          )}

          <div className="flex items-center gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => router.push("/orders")}
              className={buttonPrimaryClass}
            >
              View orders
            </button>
            <button
              type="button"
              onClick={() => {
                setSummary(null);
                setOrders([]);
                setParseErrors([]);
                setFileName(null);
              }}
              className={buttonSecondaryClass}
            >
              Import another file
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
