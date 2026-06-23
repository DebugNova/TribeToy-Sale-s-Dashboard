import { PageHeader, buttonPrimaryClass, buttonSecondaryClass } from "@/components/page-header";
import { DataTable, tdClass } from "@/components/table";
import { Select } from "@/components/select";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";
import { AuditDiff } from "./audit-diff";
import { DateRangePicker } from "../date-range-picker";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Labeled filter-field wrapper so the audit filter card matches the dashboard +
// orders filters and stacks cleanly on phones.
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

const PAGE_SIZE = 200;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type SearchParams = Promise<{
  entity?: string;
  actor?: string;
  from?: string;
  to?: string;
}>;

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requireCapability("audit.view"); // admin-only; non-admins redirected to /
  const sp = await searchParams;
  const supabase = await createClient();

  // Filter options: who can be an actor (profiles) and which entities exist in the log.
  const [{ data: profiles }, { data: entityRows }] = await Promise.all([
    supabase.from("profiles").select("id, name").order("name"),
    supabase.from("audit_logs").select("entity").limit(1000),
  ]);
  const actors = profiles ?? [];
  const entities = [...new Set((entityRows ?? []).map((r) => r.entity))].sort();

  let query = supabase
    .from("audit_logs")
    .select("id, action, entity, entity_id, actor_id, before, after, created_at")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (sp.entity) query = query.eq("entity", sp.entity);
  if (sp.actor) query = query.eq("actor_id", sp.actor);
  if (sp.from && ISO_DATE.test(sp.from)) query = query.gte("created_at", `${sp.from}T00:00:00+05:30`);
  if (sp.to && ISO_DATE.test(sp.to)) query = query.lt("created_at", `${nextDay(sp.to)}T00:00:00+05:30`);

  const { data: rows } = await query;
  const logs = rows ?? [];
  const nameById = new Map(actors.map((a) => [a.id, a.name ?? "Unknown"]));

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Every status change, stock movement, label event and sensitive-field reveal — who, when, and what changed."
      />

      <form
        method="get"
        className="mb-4 grid grid-cols-1 gap-x-4 gap-y-4 rounded-2xl border border-line bg-white p-4 shadow-sm shadow-black/[0.03] sm:grid-cols-2 sm:p-5 lg:grid-cols-4"
      >
        <FilterField label="Entity">
          <Select
            name="entity"
            defaultValue={sp.entity ?? ""}
            ariaLabel="Entity"
            options={[
              { value: "", label: "All entities" },
              ...entities.map((e) => ({ value: e, label: e })),
            ]}
          />
        </FilterField>
        <FilterField label="Actor">
          <Select
            name="actor"
            defaultValue={sp.actor ?? ""}
            ariaLabel="Actor"
            searchable
            options={[
              { value: "", label: "All actors" },
              ...actors.map((a) => ({ value: a.id, label: a.name ?? a.id })),
            ]}
          />
        </FilterField>
        <DateRangePicker
          from={sp.from ?? ""}
          to={sp.to ?? ""}
          className="sm:col-span-2 lg:col-span-2"
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 sm:col-span-2 lg:col-span-4">
          <button type="submit" className={`${buttonPrimaryClass} w-full sm:w-auto`}>
            Apply
          </button>
          <Link href="/audit" className={`${buttonSecondaryClass} w-full sm:w-auto`}>
            Reset
          </Link>
        </div>
      </form>

      <DataTable
        columns={["When", "Actor", "Action", "Entity", "Change (before → after)"]}
        isEmpty={logs.length === 0}
        emptyMessage="No audit entries match these filters."
      >
        {logs.map((row) => (
          <tr key={row.id} className="align-top hover:bg-gray-50">
            <td className={`${tdClass} whitespace-nowrap text-gray-500`}>
              {formatDateTime(row.created_at)}
            </td>
            <td className={tdClass}>
              {row.actor_id ? nameById.get(row.actor_id) ?? "Unknown" : "System"}
            </td>
            <td className={`${tdClass} font-mono text-xs text-gray-700`}>{row.action}</td>
            <td className={tdClass}>
              <span className="text-gray-700">{row.entity}</span>
              {row.entity_id && (
                <span className="block font-mono text-[11px] text-gray-400">
                  {row.entity_id.slice(0, 8)}…
                </span>
              )}
            </td>
            <td className={`${tdClass} min-w-64`}>
              <AuditDiff before={row.before} after={row.after} />
            </td>
          </tr>
        ))}
      </DataTable>

      {logs.length === PAGE_SIZE && (
        <p className="mt-3 text-xs text-gray-400">
          Showing the {PAGE_SIZE} most recent entries. Narrow the filters to see older activity.
        </p>
      )}
    </div>
  );
}

/** Day after `dateStr` (YYYY-MM-DD), used as the exclusive upper bound. */
function nextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}
