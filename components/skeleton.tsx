// "Ghost block" placeholders shown while server components fetch. Each composed
// skeleton intentionally mirrors the real component it stands in for (KpiCard,
// DataTable, Panel, PageHeader, …) so the layout doesn't jump when data lands.
//
// These are pure/presentational and used from route-level loading.tsx files.
// The shimmer + reduced-motion handling live in app/globals.css (.skeleton).

/** Base shimmering tile. Size/shape it with Tailwind utilities via className. */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div aria-hidden="true" className={`skeleton ${className}`} style={style} />;
}

/** A run of text lines; the last line is shortened like real wrapped copy. */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** Mirrors components/page-header.tsx (title + description, optional action). */
export function PageHeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 space-y-2.5">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {action && <Skeleton className="h-10 w-32 rounded-xl" />}
    </div>
  );
}

/** Stand-in for the search/filter form above list pages. */
export function FilterBarSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <Skeleton className="h-10 grow rounded-xl" />
      {Array.from({ length: fields }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-28 rounded-xl" />
      ))}
    </div>
  );
}

/** Mirrors components/kpi-card.tsx, including the brand accent bar on top. */
export function KpiCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-sm shadow-black/[0.03]">
      <span className="absolute inset-x-0 top-0 h-1 bg-cream-300" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-7 w-24" />
    </div>
  );
}

export function KpiGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Mirrors components/panel.tsx with a chart-shaped body (faux bars + axis). */
export function ChartPanelSkeleton({ height = 256 }: { height?: number }) {
  // Varied bar heights so the placeholder reads as a chart, not a flat block.
  const bars = [55, 80, 40, 95, 65, 75, 50, 88, 60, 70];
  return (
    <section className="rounded-2xl border border-line bg-white shadow-sm shadow-black/[0.03]">
      <div className="border-b border-line px-4 py-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-1.5 h-3 w-24" />
      </div>
      <div className="p-4">
        <div
          className="flex items-end justify-between gap-2"
          style={{ height }}
        >
          {bars.map((h, i) => (
            <Skeleton
              key={i}
              className="w-full rounded-t-md rounded-b-none"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Mirrors components/table.tsx: same card frame, header row and dividers, with
 * shimmering cells. `columns` should match the real table's column count.
 */
export function TableSkeleton({
  columns = 5,
  rows = 8,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm shadow-black/[0.03]">
      <table className="w-full border-collapse">
        <thead className="border-b border-line bg-cream-100/70">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-4 py-3.5">
                  <Skeleton
                    className={`h-3.5 ${c === 0 ? "w-20" : c === columns - 1 ? "w-12" : "w-24"}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A titled table block (matches the "heading + DataTable" pattern on pages). */
export function TableSectionSkeleton({
  columns = 5,
  rows = 6,
  withAction = false,
}: {
  columns?: number;
  rows?: number;
  withAction?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        {withAction && <Skeleton className="h-8 w-24 rounded-xl" />}
      </div>
      <TableSkeleton columns={columns} rows={rows} />
    </div>
  );
}

/** Generic two-column form card, for create/edit/settings routes. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="max-w-2xl rounded-2xl border border-line bg-white p-5 shadow-sm shadow-black/[0.03]">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-20 rounded-xl" />
      </div>
    </div>
  );
}

/** Detail-page layout: a couple of info panels side by side. */
export function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm shadow-black/[0.03]">
          <Skeleton className="mb-4 h-4 w-32" />
          <SkeletonText lines={4} />
        </div>
        <TableSkeleton columns={4} rows={4} />
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm shadow-black/[0.03]">
          <Skeleton className="mb-4 h-4 w-24" />
          <SkeletonText lines={5} />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
