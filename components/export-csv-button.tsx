"use client";

// Client button that turns a pre-built headers + rows matrix into a CSV download. The page
// builds the matrix (already INR-formatted) and passes plain serializable data here. After a
// download it briefly flips to a "Saved" confirmation so the action feels acknowledged.

import { useEffect, useRef, useState } from "react";
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
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onExport() {
    downloadCsv(filename, toCsv(headers, rows));
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1800);
  }

  return (
    <button
      type="button"
      disabled={empty}
      onClick={onExport}
      title={empty ? "Nothing to export" : `Download ${rows.length} row${rows.length === 1 ? "" : "s"} as CSV`}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
        done
          ? "border-brand-200 bg-brand-50 text-brand-700"
          : "border-line bg-white text-[#5a524a] hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
      }`}
    >
      {done ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
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
      )}
      {done ? "Saved" : label}
    </button>
  );
}
