import {
  PageHeaderSkeleton,
  FilterBarSkeleton,
  KpiGridSkeleton,
  ChartPanelSkeleton,
  TableSectionSkeleton,
} from "@/components/skeleton";

// Shown while the dashboard (index) streams its SQL-aggregated panels. Mirrors
// app/(dashboard)/page.tsx so the layout holds steady when the data lands.
// Also the fallback for any dashboard route without its own loading.tsx.
export default function DashboardLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton action={false} />
      <FilterBarSkeleton fields={3} />

      <KpiGridSkeleton count={6} />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanelSkeleton />
        <ChartPanelSkeleton />
      </div>

      <div className="mb-6">
        <ChartPanelSkeleton />
      </div>

      <div className="mb-6">
        <TableSectionSkeleton columns={6} rows={6} withAction />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TableSectionSkeleton columns={4} rows={5} withAction />
        <TableSectionSkeleton columns={4} rows={5} withAction />
      </div>
    </div>
  );
}
