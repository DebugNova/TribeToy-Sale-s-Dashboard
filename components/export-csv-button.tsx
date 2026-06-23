"use client";

// Client button that turns a pre-built headers + rows matrix into a CSV download. The page
// builds the matrix (already INR-formatted) and passes plain serializable data here.

import { toCsv, downloadCsv } from "@/lib/export/toCsv";

type Cell = string | number | null | undefined;

export function ExportCsvButton({
  filename,
  headers,
  rows,
  label = "Export CSV",
}: {
  filename: string;
  headers: string[];
  rows: Cell[][];
  label?: string;
}) {
  const empty = rows.length === 0;
  return (
    <button
      type="button"
      disabled={empty}
      onClick={() => downloadCsv(filename, toCsv(headers, rows))}
      className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
