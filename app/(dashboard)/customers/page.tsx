import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, buttonPrimaryClass } from "@/components/page-header";
import { DataTable, tdClass } from "@/components/table";
import { inputClass } from "@/components/form";
import { RevealField } from "@/components/reveal-field";
import { maskPhone } from "@/lib/mask";
import { getCurrentRole, roleCan } from "@/lib/auth/roles";

type SearchParams = Promise<{ q?: string }>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("id, name, phone, email, type, city")
    .order("created_at", { ascending: false });

  if (q.trim()) {
    const term = q.trim();
    query = query.or(
      `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }

  // Role check (button gating) is independent of the list — fetch both at once.
  const [role, { data: customers }] = await Promise.all([getCurrentRole(), query]);
  const canWrite = roleCan(role, "customers.write");
  const rows = customers ?? [];

  return (
    <div>
      <PageHeader
        title="Customers"
        description="People and dealers you sell to. Reused automatically when creating orders."
        action={
          canWrite ? (
            <Link href="/customers/new" className={buttonPrimaryClass}>
              Add customer
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
            placeholder="Search by name, phone or email…"
            className={inputClass}
          />
        </div>
        <button type="submit" className={`${buttonPrimaryClass} w-full sm:w-auto`}>
          Search
        </button>
      </form>

      <DataTable
        columns={["Name", "Phone", "Email", "Type", "City", ""]}
        isEmpty={rows.length === 0}
        emptyMessage="No customers match yet."
      >
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className={`${tdClass} font-medium text-gray-900`}>{c.name}</td>
            <td className={tdClass}>
              <RevealField masked={maskPhone(c.phone)} revealKey="customer.phone" id={c.id} />
            </td>
            <td className={tdClass}>{c.email ?? "—"}</td>
            <td className={`${tdClass} uppercase`}>{c.type}</td>
            <td className={tdClass}>{c.city ?? "—"}</td>
            <td className={`${tdClass} text-right`}>
              <Link
                href={`/customers/${c.id}`}
                className="text-sm font-medium text-gray-900 hover:underline"
              >
                {canWrite ? "Edit" : "View"}
              </Link>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
