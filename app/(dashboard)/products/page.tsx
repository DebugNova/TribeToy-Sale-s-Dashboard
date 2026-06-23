import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, buttonPrimaryClass } from "@/components/page-header";
import { DataTable, tdClass } from "@/components/table";
import { inputClass } from "@/components/form";
import { Select } from "@/components/select";
import { formatINR } from "@/lib/money";
import { getCurrentRole, roleCan } from "@/lib/auth/roles";

type SearchParams = Promise<{ q?: string; active?: string }>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", active = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("id, sku, name, category, price, active")
    .order("created_at", { ascending: false });

  if (q.trim()) {
    const term = q.trim();
    query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
  }
  if (active === "true") query = query.eq("active", true);
  if (active === "false") query = query.eq("active", false);

  // Role check (button gating) is independent of the list — fetch both at once.
  const [role, { data: products }] = await Promise.all([getCurrentRole(), query]);
  const canWrite = roleCan(role, "products.write");
  const rows = products ?? [];

  const ids = rows.map((p) => p.id);
  const { data: invs } = ids.length
    ? await supabase
        .from("inventory_available")
        .select("product_id, available, low_stock_threshold")
        .in("product_id", ids)
    : { data: [] };
  const invByProduct = new Map(
    (invs ?? []).map((i) => [i.product_id, i]),
  );

  return (
    <div>
      <PageHeader
        title="Products"
        description="Catalog of SKUs with pricing, dimensions and GST tax rates."
        action={
          canWrite ? (
            <Link href="/products/new" className={buttonPrimaryClass}>
              Add product
            </Link>
          ) : null
        }
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
        <Select
          name="active"
          defaultValue={active}
          ariaLabel="Status filter"
          className="w-full sm:w-44"
          options={[
            { value: "", label: "All" },
            { value: "true", label: "Active only" },
            { value: "false", label: "Inactive only" },
          ]}
        />
        <button type="submit" className={`${buttonPrimaryClass} w-full sm:w-auto`}>
          Filter
        </button>
      </form>

      <DataTable
        columns={["SKU", "Name", "Category", "Price", "Available", "Status", ""]}
        isEmpty={rows.length === 0}
        emptyMessage="No products match. Add your first product to get started."
      >
        {rows.map((p) => {
          const inv = invByProduct.get(p.id);
          const available = inv?.available ?? 0;
          const threshold = inv?.low_stock_threshold ?? 0;
          const low = available <= threshold;
          return (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className={`${tdClass} font-mono text-xs text-gray-600`}>{p.sku}</td>
              <td className={`${tdClass} font-medium text-gray-900`}>{p.name}</td>
              <td className={tdClass}>{p.category ?? "—"}</td>
              <td className={tdClass}>{formatINR(p.price)}</td>
              <td className={`${tdClass} ${low ? "font-semibold text-red-600" : ""}`}>
                {available}
                {low && <span className="ml-1 text-xs font-normal">(low)</span>}
              </td>
              <td className={tdClass}>
                {p.active ? (
                  <span className="text-green-700">Active</span>
                ) : (
                  <span className="text-gray-400">Inactive</span>
                )}
              </td>
              <td className={`${tdClass} text-right`}>
                <Link
                  href={`/products/${p.id}`}
                  className="text-sm font-medium text-gray-900 hover:underline"
                >
                  Edit
                </Link>
              </td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}
