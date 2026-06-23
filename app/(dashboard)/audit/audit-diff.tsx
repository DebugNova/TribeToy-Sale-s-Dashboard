// Renders the before → after change for an audit row. Computes the set of keys that
// differ (or were added/removed) and shows each as `key: before → after`. Pure display.

import type { Json } from "@/lib/supabase/database.types";

type Obj = Record<string, unknown>;

function asObj(v: Json | null): Obj {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
}

function fmt(v: unknown): string {
  if (v === undefined) return "∅";
  if (v === null) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function AuditDiff({ before, after }: { before: Json | null; after: Json | null }) {
  const b = asObj(before);
  const a = asObj(after);
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort();
  const changed = keys.filter((k) => fmt(b[k]) !== fmt(a[k]));

  // Nothing structured to diff — show whatever payload exists, if any.
  if (changed.length === 0) {
    const raw = after ?? before;
    if (raw == null) return <span className="text-gray-400">—</span>;
    return (
      <code className="block whitespace-pre-wrap break-all text-xs text-gray-600">
        {JSON.stringify(raw)}
      </code>
    );
  }

  return (
    <ul className="space-y-1">
      {changed.map((k) => (
        <li key={k} className="text-xs">
          <span className="font-medium text-gray-700">{k}</span>{" "}
          <span className="rounded bg-red-50 px-1 text-red-700 line-through">{fmt(b[k])}</span>{" "}
          <span className="text-gray-400">→</span>{" "}
          <span className="rounded bg-green-50 px-1 text-green-700">{fmt(a[k])}</span>
        </li>
      ))}
    </ul>
  );
}
