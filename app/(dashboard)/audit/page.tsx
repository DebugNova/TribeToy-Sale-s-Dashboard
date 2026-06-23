import { PageHeader, buttonPrimaryClass, buttonSecondaryClass } from "@/components/page-header";
import { DataTable, tdClass } from "@/components/table";
import { inputClass } from "@/components/form";
import { Select } from "@/components/select";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";
import { AuditDiff } from "./audit-diff";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Entity</label>
          <Select
            name="entity"
            defaultValue={sp.entity ?? ""}
            ariaLabel="Entity"
            className="w-48"
            options={[
              { value: "", label: "All entities" },
              ...entities.map((e) => ({ value: e, label: e })),
            ]}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Actor</label>
          <Select
            name="actor"
            defaultValue={sp.actor ?? ""}
            ariaLabel="Actor"
            searchable
            className="w-48"
            options={[
              { value: "", label: "All actors" },
              ...actors.map((a) => ({ value: a.id, label: a.name ?? a.id })),
            ]}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className={inputClass} />
        </div>
        <button type="submit" className={buttonPrimaryClass}>
          Apply
        </button>
        <Link href="/audit" className={buttonSecondaryClass}>
          Reset
        </Link>
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
