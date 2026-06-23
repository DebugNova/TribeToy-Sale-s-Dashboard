// Shared table chrome so every list screen looks the same. Pages map their own rows; this
// just supplies the card, header row, dividers and an empty state.

export const thClass =
  "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#9a9084] whitespace-nowrap";
export const tdClass = "px-4 py-3 text-sm text-[#574f47] align-middle";

export function DataTable({
  columns,
  isEmpty,
  emptyMessage = "Nothing here yet.",
  children,
}: {
  columns: string[];
  isEmpty: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm shadow-black/[0.03]">
      <table className="w-full border-collapse">
        <thead className="border-b border-line bg-cream-100/70">
          <tr>
            {columns.map((c) => (
              <th key={c} className={thClass}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {isEmpty ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-14 text-center text-sm text-[#a89e90]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
