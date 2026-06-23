"use client";

// Top SKUs panel. The Quantity / Revenue / Margin toggle re-sorts in SQL on the server, so
// switching tabs is a real navigation. We run that navigation inside a transition: while it's
// pending the current rows dim under a soft spinner overlay, and the freshly-sorted rows rise
// in once they land — a smooth, professional swap instead of a hard flash. All state still
// lives in the URL (skuSort=…) so deep links and back/forward keep working.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DataTable, tdClass } from "@/components/table";
import { ExportCsvButton } from "@/components/export-csv-button";
import { Spinner } from "@/components/spinner";
import { formatINR } from "@/lib/money";
import type { TopSku, TopSkuSort } from "@/lib/analytics/types";

const SORTS: { key: TopSkuSort; label: string }[] = [
  { key: "qty", label: "Quantity" },
  { key: "revenue", label: "Revenue" },
  { key: "margin", label: "Margin" },
];

export function TopSkus({
  rows,
  sort,
  baseQuery,
  exportDate,
}: {
  rows: TopSku[];
  sort: TopSkuSort;
  /** filtersToQuery(filters) — the active filters without skuSort. */
  baseQuery: string;
  /** IST day stamped into the export filename. */
  exportDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(next: TopSkuSort) {
    if (next === sort) return;
    const query = baseQuery ? `${baseQuery}&skuSort=${next}` : `skuSort=${next}`;
    startTransition(() => router.push(`/?${query}`, { scroll: false }));
  }

  const csvRows = rows.map((s) => [
    s.sku ?? "",
    s.name ?? "",
    s.category ?? "",
    s.qty,
    formatINR(s.revenue),
    formatINR(s.margin),
  ]);

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#332f29]">Top SKUs</h2>
          {pending && <Spinner size="sm" className="text-brand-500" />}
        </div>
        <div className="flex items-center gap-3">
          <div
            role="tablist"
            aria-label="Sort top SKUs by"
            className="inline-flex overflow-hidden rounded-xl border border-line bg-cream-100/60 p-0.5 text-xs"
          >
            {SORTS.map((s) => {
              const active = s.key === sort;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={pending}
                  onClick={() => go(s.key)}
                  className={`rounded-[0.6rem] px-3 py-1.5 font-semibold transition-colors duration-200 disabled:cursor-progress ${
                    active
                      ? "bg-brand-600 text-white shadow-sm shadow-brand-600/20"
                      : "text-[#7a7066] hover:bg-white hover:text-brand-700"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <ExportCsvButton
            filename={`top-skus_${exportDate}.csv`}
            headers={["SKU", "Product", "Category", "Qty", "Revenue (INR)", "Margin (INR)"]}
            rows={csvRows}
          />
        </div>
      </div>

      <div className="relative">
        {/* Dim + lock the table while the re-sorted page is loading. */}
        <div
          className={`transition-opacity duration-200 ${
            pending ? "pointer-events-none opacity-40" : "opacity-100"
          }`}
        >
          {/* Keyed on the sort so the new rows animate in once they arrive. */}
          <div key={sort} className={pending ? "" : "animate-fade-rise"}>
            <DataTable
              columns={["SKU", "Product", "Category", "Qty", "Revenue", "Margin"]}
              isEmpty={rows.length === 0}
              emptyMessage="No sales in this range yet."
            >
              {rows.map((s) => (
                <tr key={s.productId ?? s.sku} className="transition-colors hover:bg-brand-50/50">
                  <td className={`${tdClass} font-mono text-xs text-gray-600`}>{s.sku ?? "—"}</td>
                  <td className={`${tdClass} font-medium text-gray-900`}>{s.name ?? "—"}</td>
                  <td className={tdClass}>{s.category ?? "—"}</td>
                  <td className={`${tdClass} tabular-nums`}>{s.qty}</td>
                  <td className={`${tdClass} tabular-nums`}>{formatINR(s.revenue)}</td>
                  <td className={`${tdClass} tabular-nums`}>{formatINR(s.margin)}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </div>

        {pending && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/30 backdrop-blur-[1px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-line">
              <Spinner size="sm" />
              Sorting…
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
