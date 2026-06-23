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
      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-[#5a524a] shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
      {label}
    </button>
  );
}
