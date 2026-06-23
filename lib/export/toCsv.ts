// CSV export helpers used by the dashboard table "Export CSV" buttons. The page builds a
// plain headers + rows matrix (already INR-formatted where relevant) so the data crossing
// into the client button stays serializable; this module just renders + downloads it.

type Cell = string | number | null | undefined;

/** UTF-8 byte-order mark so Excel opens the file as UTF-8 (₹ + Indian grouping render). */
const BOM = "﻿";

/** Quote a cell only when it contains a comma, quote or newline (RFC 4180). */
function escapeCell(value: Cell): string {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build a CSV string from a header row + a matrix of rows. CRLF line ends for maximum
 * spreadsheet compatibility; prefixed with a UTF-8 BOM so currency renders correctly.
 */
export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return BOM + lines.join("\r\n");
}

/** Trigger a browser download of `csv` as `filename`. Client-only (uses Blob/DOM). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
