// Shared table chrome so every list screen looks the same. Pages map their own rows; this
// just supplies the card, header row, dividers and an empty state.

export const thClass =
  "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500";
export const tdClass = "px-4 py-3 text-sm text-gray-700 align-middle";

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
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full border-collapse">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            {columns.map((c) => (
              <th key={c} className={thClass}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isEmpty ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-gray-400"
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
