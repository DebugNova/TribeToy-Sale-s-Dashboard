import { createClient } from "@/lib/supabase/server";
import { PageHeader, buttonPrimaryClass } from "@/components/page-header";
import { DataTable, tdClass } from "@/components/table";
import { inputClass } from "@/components/form";
import { AdjustStockButton } from "./adjust-stock";
import { getCurrentRole, roleCan } from "@/lib/auth/roles";

type SearchParams = Promise<{ q?: string; low?: string }>;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", low = "" } = await searchParams;
  const supabase = await createClient();
  const canWrite = roleCan(await getCurrentRole(), "inventory.write");

  let pQuery = supabase
    .from("products")
    .select("id, sku, name, active")
    .order("name", { ascending: true });
  if (q.trim()) {
    const term = q.trim();
    pQuery = pQuery.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
  }
  const { data: products } = await pQuery;
  const productList = products ?? [];

  const ids = productList.map((p) => p.id);
  const { data: invs } = ids.length
    ? await supabase
        .from("inventory_available")
        .select(
          "product_id, on_hand, reserved, available, damaged, low_stock_threshold",
        )
        .in("product_id", ids)
    : { data: [] };
  const invByProduct = new Map((invs ?? []).map((i) => [i.product_id, i]));

  let rows = productList.map((p) => ({ product: p, inv: invByProduct.get(p.id) }));
  if (low === "true") {
    rows = rows.filter(
      (r) => (r.inv?.available ?? 0) <= (r.inv?.low_stock_threshold ?? 0),
    );
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="On-hand, reserved and available stock. Reserved is managed by the order lifecycle."
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grow">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by SKU or name…"
            className={inputClass}
          />
        </div>
        <select name="low" defaultValue={low} className={`${inputClass} w-auto`}>
          <option value="">All stock</option>
          <option value="true">Low stock only</option>
        </select>
        <button type="submit" className={buttonPrimaryClass}>
          Filter
        </button>
      </form>

      <DataTable
        columns={[
          "SKU",
          "Product",
          "On hand",
          "Reserved",
          "Available",
          "Damaged",
          "Threshold",
          "",
        ]}
        isEmpty={rows.length === 0}
        emptyMessage="No products yet. Add a product to start tracking stock."
      >
        {rows.map(({ product, inv }) => {
          const onHand = inv?.on_hand ?? 0;
          const reserved = inv?.reserved ?? 0;
          const available = inv?.available ?? 0;
          const damaged = inv?.damaged ?? 0;
          const threshold = inv?.low_stock_threshold ?? 0;
          const lowStock = available <= threshold;
          return (
            <tr key={product.id} className={lowStock ? "bg-red-50/50" : "hover:bg-gray-50"}>
              <td className={`${tdClass} font-mono text-xs text-gray-600`}>
                {product.sku}
              </td>
              <td className={`${tdClass} font-medium text-gray-900`}>
                {product.name}
                {!product.active && (
                  <span className="ml-2 text-xs text-gray-400">(inactive)</span>
                )}
              </td>
              <td className={tdClass}>{onHand}</td>
              <td className={tdClass}>{reserved}</td>
              <td className={`${tdClass} ${lowStock ? "font-semibold text-red-600" : ""}`}>
                {available}
                {lowStock && <span className="ml-1 text-xs font-normal">(low)</span>}
              </td>
              <td className={tdClass}>{damaged}</td>
              <td className={tdClass}>{threshold}</td>
              <td className={`${tdClass} text-right`}>
                {inv ? (
                  canWrite ? (
                    <AdjustStockButton
                      productId={product.id}
                      productName={product.name}
                      current={{
                        on_hand: onHand,
                        damaged,
                        low_stock_threshold: threshold,
                      }}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">read-only</span>
                  )
                ) : (
                  <span className="text-xs text-gray-400">no row</span>
                )}
              </td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}
